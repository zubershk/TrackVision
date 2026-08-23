import type { BBox, Detection } from '../types';
import { KalmanFilter } from './kalman';
import { getIoU, hungarianMatch, MatchResult } from './matching';

export type { BBox, Detection };

export enum TrackState {
  TENTATIVE = 0,
  CONFIRMED = 1,
  DELETED = 2
}

export enum TrackStatus {
  NEW = 0,
  TRACKED = 1,
  LOST = 2,
  REMOVED = 3
}

export interface TrackData {
  id: number;
  bbox: BBox;
  score: number;
  className: string;
  state: TrackState;
  status: TrackStatus;
  timeSinceUpdate: number;
  hits: number;
  confirmedHits: number;
  labelHistory: string[];
  embedding?: Float32Array;
  smoothedBBox?: BBox;
  velocity?: [number, number];
  interpolationFrames?: number;
}

export class Track {
  id: number;
  bbox: BBox;
  smoothedBBox: BBox;
  score: number;
  className: string;
  state: TrackState;
  status: TrackStatus;
  timeSinceUpdate: number;
  hits: number;
  confirmedHits: number;
  labelHistory: string[];
  embedding?: Float32Array;
  kalman: KalmanFilter;
  lastEmbeddingUpdate: number = 0;
  velocity: [number, number] = [0, 0];
  prevCenter: [number, number] = [0, 0];
  interpolationFrames: number = 0;
  maxInterpolationFrames: number = 5;
  bboxEMAAlpha: number = 0.7;
  centerEMAAlpha: number = 0.8;
  age: number = 0;

  constructor(id: number, detection: Detection, kalmanFilter: KalmanFilter) {
    this.id = id;
    this.bbox = detection.bbox;
    this.smoothedBBox = [...detection.bbox] as BBox;
    this.score = detection.score;
    this.className = detection.class;
    this.state = TrackState.TENTATIVE;
    this.status = TrackStatus.NEW;
    this.timeSinceUpdate = 0;
    this.hits = 1;
    this.confirmedHits = detection.score >= 0.7 ? 1 : 0;
    this.labelHistory = [detection.class];
    this.embedding = detection.embedding;
    this.kalman = kalmanFilter;
    const [x, y, w, h] = detection.bbox;
    this.prevCenter = [x + w / 2, y + h / 2];
    if (detection.embedding) {
      this.lastEmbeddingUpdate = Date.now();
    }
  }

  predict(): BBox {
    const predicted = this.kalman.predict();
    this.bbox = predicted;
    return predicted;
  }

  getSmoothedBBox(): BBox {
    if (this.interpolationFrames > 0) {
      return this.smoothedBBox;
    }
    return this.bbox;
  }

  update(detection: Detection): void {
    this.kalman.update(detection.bbox);
    this.bbox = this.kalman.stateToBBox();
    
    this.smoothedBBox = [
      this.smoothedBBox[0] * this.bboxEMAAlpha + this.bbox[0] * (1 - this.bboxEMAAlpha),
      this.smoothedBBox[1] * this.bboxEMAAlpha + this.bbox[1] * (1 - this.bboxEMAAlpha),
      this.smoothedBBox[2] * this.bboxEMAAlpha + this.bbox[2] * (1 - this.bboxEMAAlpha),
      this.smoothedBBox[3] * this.bboxEMAAlpha + this.bbox[3] * (1 - this.bboxEMAAlpha),
    ] as BBox;

    this.score = this.score * 0.7 + detection.score * 0.3;
    
    this.labelHistory.push(detection.class);
    if (this.labelHistory.length > 10) {
      this.labelHistory.shift();
    }
    
    const counts = new Map<string, number>();
    let maxCount = 0;
    let stableLabel = this.className;
    
    for (const label of this.labelHistory) {
      const c = (counts.get(label) || 0) + 1;
      counts.set(label, c);
      if (c > maxCount) {
        maxCount = c;
        stableLabel = label;
      }
    }
    
    this.className = stableLabel;
    
    if (detection.embedding) {
      if (this.embedding) {
        this.embedding = this.updateEmbedding(this.embedding, detection.embedding, 0.3);
      } else {
        this.embedding = detection.embedding;
      }
      this.lastEmbeddingUpdate = Date.now();
    }
    
    const currentCenter = this.getCenter();
    this.velocity = [
      currentCenter[0] - this.prevCenter[0],
      currentCenter[1] - this.prevCenter[1]
    ];
    this.prevCenter = currentCenter;
    
    this.timeSinceUpdate = 0;
    this.hits += 1;
    this.age += 1;
    if (detection.score >= 0.7) {
      this.confirmedHits += 1;
    }
    this.interpolationFrames = 0;
    
    if (this.state === TrackState.TENTATIVE && (this.hits >= 3 || this.confirmedHits >= 2)) {
      this.state = TrackState.CONFIRMED;
      this.status = TrackStatus.TRACKED;
    } else if (this.state === TrackState.DELETED) {
      this.state = TrackState.TENTATIVE;
      this.status = TrackStatus.NEW;
      this.hits = 1;
      this.confirmedHits = detection.score >= 0.7 ? 1 : 0;
    } else if (this.status === TrackStatus.LOST) {
      this.status = TrackStatus.TRACKED;
    }
  }

  private updateEmbedding(oldEmb: Float32Array, newEmb: Float32Array, alpha: number): Float32Array {
    const updated = new Float32Array(oldEmb.length);
    for (let i = 0; i < oldEmb.length; i++) {
      updated[i] = oldEmb[i] * (1 - alpha) + newEmb[i] * alpha;
    }
    const norm = Math.sqrt(updated.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < updated.length; i++) {
        updated[i] /= norm;
      }
    }
    return updated;
  }

  markMissed(): void {
    this.timeSinceUpdate += 1;
    this.interpolationFrames = Math.min(this.interpolationFrames + 1, this.maxInterpolationFrames);
    
    if (this.interpolationFrames > 0) {
      const predicted = this.kalman.getPredictedBBox();
      this.smoothedBBox = [
        this.smoothedBBox[0] * 0.5 + predicted[0] * 0.5,
        this.smoothedBBox[1] * 0.5 + predicted[1] * 0.5,
        this.smoothedBBox[2] * 0.5 + predicted[2] * 0.5,
        this.smoothedBBox[3] * 0.5 + predicted[3] * 0.5,
      ] as BBox;
    }
    
    if (this.state === TrackState.CONFIRMED) {
      if (this.timeSinceUpdate > 5 && this.status === TrackStatus.TRACKED) {
        this.status = TrackStatus.LOST;
      }
      if (this.timeSinceUpdate > 30) {
        this.state = TrackState.DELETED;
        this.status = TrackStatus.REMOVED;
      }
    }
  }

  interpolate(): BBox | null {
    if (this.interpolationFrames > 0 && this.interpolationFrames <= this.maxInterpolationFrames) {
      const predicted = this.kalman.getPredictedBBox();
      const alpha = 1 - (this.interpolationFrames / this.maxInterpolationFrames);
      return [
        this.smoothedBBox[0] * alpha + predicted[0] * (1 - alpha),
        this.smoothedBBox[1] * alpha + predicted[1] * (1 - alpha),
        this.smoothedBBox[2] * alpha + predicted[2] * (1 - alpha),
        this.smoothedBBox[3] * alpha + predicted[3] * (1 - alpha),
      ] as BBox;
    }
    return null;
  }

  getPredictedBBox(): BBox {
    return this.kalman.getPredictedBBox();
  }

  getCenter(): [number, number] {
    return this.kalman.getCenter();
  }

  getVelocity(): [number, number] {
    return this.velocity;
  }

  cosineSimilarity(otherEmb: Float32Array | undefined): number {
    if (!this.embedding || !otherEmb) return 0;
    let dot = 0;
    for (let i = 0; i < this.embedding.length; i++) {
      dot += this.embedding[i] * otherEmb[i];
    }
    return dot;
  }

  isActive(): boolean {
    return this.state === TrackState.CONFIRMED && this.timeSinceUpdate === 0;
  }

  isTentative(): boolean {
    return this.state === TrackState.TENTATIVE;
  }

  isDeleted(): boolean {
    return this.state === TrackState.DELETED;
  }

  shouldDelete(maxTimeLost: number): boolean {
    return this.state === TrackState.DELETED || this.timeSinceUpdate > maxTimeLost;
  }

  getDisplayBBox(): BBox {
    const interpolated = this.interpolate();
    return interpolated || this.getSmoothedBBox();
  }

  getStatus(): number {
    return this.status;
  }
}

export class ByteTracker {
  tracks: Track[] = [];
  nextId: number = 1;
  trackThresh: number = 0.4;
  matchThresh: number = 0.7; // Maximum matching cost (0.7 corresponds to IoU >= 0.3)
  maxTimeLost: number = 30;
  useHungarian: boolean = true;
  appearanceThresh: number = 0.3;
  embeddingWeight: number = 0.3;
  iouWeight: number = 0.6;
  classWeight: number = 0.1;
  mergeThresh: number = 0.5;

  update(detections: Detection[]): Track[] {
    for (const track of this.tracks) {
      track.predict();
    }

    const highScores: Detection[] = [];
    const lowScores: Detection[] = [];

    for (const det of detections) {
      if (det.score >= this.trackThresh) {
        highScores.push(det);
      } else if (det.score > 0.1) {
        lowScores.push(det);
      }
    }

    const unmatchedTracks = [...this.tracks];
    const newTracks: Track[] = [];

    // Stage 1: Match high score detections with all existing tracks
    const highScoreResult = this.matchDetections(unmatchedTracks, highScores, this.matchThresh);
    for (const match of highScoreResult.matched) {
      unmatchedTracks[match.trackIdx].update(highScores[match.detIdx]);
    }

    // Remaining tracks after stage 1
    const remainingTracksStage1 = highScoreResult.unmatchedTracks.map(idx => unmatchedTracks[idx]);

    // Stage 2: Match low score detections with remaining tracks
    const lowScoreResult = this.matchDetections(
      remainingTracksStage1,
      lowScores,
      this.matchThresh
    );
    for (const match of lowScoreResult.matched) {
      const origTrackIdx = highScoreResult.unmatchedTracks[match.trackIdx];
      unmatchedTracks[origTrackIdx].update(lowScores[match.detIdx]);
    }

    // Stage 3: Create new tracks for unmatched high score detections
    for (const detIdx of highScoreResult.unmatchedDetections) {
      const det = highScores[detIdx];
      if (det) {
        const kalman = new KalmanFilter(det.bbox);
        const newTrack = new Track(this.nextId++, det, kalman);
        newTracks.push(newTrack);
      }
    }

    // Stage 4: Mark remaining unmatched tracks as missed
    for (const subIdx of lowScoreResult.unmatchedTracks) {
      const origTrackIdx = highScoreResult.unmatchedTracks[subIdx];
      if (unmatchedTracks[origTrackIdx]) {
        unmatchedTracks[origTrackIdx].markMissed();
      }
    }

    this.mergeSimilarTracks();

    // Collect all updated tracks
    const matchedHighTracks = highScoreResult.matched.map(m => unmatchedTracks[m.trackIdx]);
    const matchedLowTracks = lowScoreResult.matched.map(m => {
      const origTrackIdx = highScoreResult.unmatchedTracks[m.trackIdx];
      return unmatchedTracks[origTrackIdx];
    });
    const missedTracks = lowScoreResult.unmatchedTracks.map(subIdx => {
      const origTrackIdx = highScoreResult.unmatchedTracks[subIdx];
      return unmatchedTracks[origTrackIdx];
    });

    const allTracks = [
      ...matchedHighTracks,
      ...matchedLowTracks,
      ...newTracks,
      ...missedTracks
    ];

    this.tracks = allTracks.filter(t => t && !t.shouldDelete(this.maxTimeLost));

    return this.tracks.filter(t => t.status !== TrackStatus.REMOVED);
  }

  private mergeSimilarTracks(): void {
    const merged = new Set<number>();
    
    for (let i = 0; i < this.tracks.length; i++) {
      if (merged.has(i)) continue;
      const trackA = this.tracks[i];
      if (!trackA || trackA.isDeleted()) continue;
      
      for (let j = i + 1; j < this.tracks.length; j++) {
        if (merged.has(j)) continue;
        const trackB = this.tracks[j];
        if (!trackB || trackB.isDeleted()) continue;
        
        const iou = getIoU(trackA.getDisplayBBox(), trackB.getDisplayBBox());
        const sameClass = trackA.className === trackB.className;
        const appearanceSim = trackA.embedding && trackB.embedding ? trackA.cosineSimilarity(trackB.embedding) : 0;
        
        if (iou > this.mergeThresh && sameClass && appearanceSim > 0.7) {
          if (trackA.age > trackB.age) {
            trackA.update({
              bbox: trackB.bbox,
              score: trackB.score,
              class: trackB.className,
              classId: 0,
              embedding: trackB.embedding
            });
            trackB.markMissed();
            trackB.markMissed();
            merged.add(j);
          } else {
            trackB.update({
              bbox: trackA.bbox,
              score: trackA.score,
              class: trackA.className,
              classId: 0,
              embedding: trackA.embedding
            });
            trackA.markMissed();
            trackA.markMissed();
            merged.add(i);
            break;
          }
        }
      }
    }
  }

  private matchDetections(tracks: Track[], detections: Detection[], maxCost: number): MatchResult {
    if (tracks.length === 0 || detections.length === 0) {
      return {
        matched: [],
        unmatchedTracks: Array.from({ length: tracks.length }, (_, i) => i),
        unmatchedDetections: Array.from({ length: detections.length }, (_, i) => i)
      };
    }

    const costMatrix: number[][] = [];
    for (let i = 0; i < tracks.length; i++) {
      const row: number[] = [];
      const predBBox = tracks[i].getPredictedBBox();
      for (let j = 0; j < detections.length; j++) {
        const iou = getIoU(predBBox, detections[j].bbox);
        const iouCost = 1 - iou;
        
        const hasEmbeddings = Boolean(tracks[i].embedding && detections[j].embedding);
        let appearanceCost = 0;
        if (hasEmbeddings) {
          const sim = tracks[i].cosineSimilarity(detections[j].embedding);
          appearanceCost = 1 - Math.max(0, sim);
        }
        
        const classCost = tracks[i].className === detections[j].class ? 0 : 0.4;
        const centerDist = this.getCenterDistance(predBBox, detections[j].bbox);
        const maxDim = Math.max(predBBox[2], predBBox[3], detections[j].bbox[2], detections[j].bbox[3], 1);
        const centerCost = Math.min(1, centerDist / (maxDim * 2));
        
        let combinedCost: number;
        if (hasEmbeddings) {
          combinedCost = iouCost * this.iouWeight 
            + appearanceCost * this.embeddingWeight 
            + classCost * this.classWeight
            + centerCost * 0.1;
        } else {
          // Robust IoU + Center + Class matching when embeddings are not available
          combinedCost = iouCost * 0.8 + centerCost * 0.15 + classCost * 0.05;
        }
        
        row.push(combinedCost);
      }
      costMatrix.push(row);
    }

    if (this.useHungarian) {
      return hungarianMatch(costMatrix, maxCost);
    } else {
      return { 
        matched: [], 
        unmatchedTracks: Array.from({ length: tracks.length }, (_, i) => i),
        unmatchedDetections: Array.from({ length: detections.length }, (_, i) => i)
      };
    }
  }

  private getCenterDistance(box1: BBox, box2: BBox): number {
    const cx1 = box1[0] + box1[2] / 2;
    const cy1 = box1[1] + box1[3] / 2;
    const cx2 = box2[0] + box2[2] / 2;
    const cy2 = box2[1] + box2[3] / 2;
    return Math.hypot(cx1 - cx2, cy1 - cy2);
  }

  reset(): void {
    this.tracks = [];
    this.nextId = 1;
  }

  getTrackCount(): number {
    return this.tracks.filter(t => t.state !== TrackState.DELETED).length;
  }

  getConfirmedTracks(): Track[] {
    return this.tracks.filter(t => t.state === TrackState.CONFIRMED);
  }

  getAllTracks(): Track[] {
    return [...this.tracks];
  }

  setConfig(config: Partial<ByteTracker>): void {
    Object.assign(this, config);
  }
}