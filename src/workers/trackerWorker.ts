type BBox = [number, number, number, number];

interface Detection {
  bbox: BBox;
  score: number;
  class: string;
  embedding?: Float32Array;
}

enum TrackState {
  TENTATIVE = 0,
  CONFIRMED = 1,
  DELETED = 2
}

enum TrackStatus {
  NEW = 0,
  TRACKED = 1,
  LOST = 2,
  REMOVED = 3
}

interface KalmanState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
}

class KalmanFilter {
  private state: KalmanState;
  private covariance: number[][];
  private readonly dt: number;
  private readonly processNoise: number;
  private readonly measurementNoise: number;

  constructor(initialBBox: BBox, dt: number = 1/30, processNoise: number = 0.1, measurementNoise: number = 1.0) {
    const [x, y, w, h] = initialBBox;
    this.state = { x: x + w/2, y: y + h/2, vx: 0, vy: 0, w, h };
    this.covariance = this.identity(6);
    this.dt = dt;
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
  }

  private identity(n: number): number[][] {
    return Array.from({ length: n }, (_, i) => 
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
  }

  predict(): BBox {
    this.state.x += this.state.vx * this.dt;
    this.state.y += this.state.vy * this.dt;
    for (let i = 0; i < 6; i++) {
      this.covariance[i][i] += this.processNoise;
    }
    return this.stateToBBox();
  }

  update(measurement: BBox): BBox {
    const [x, y, w, h] = measurement;
    const mx = x + w/2;
    const my = y + h/2;
    const mw = w;
    const mh = h;

    const kx = this.covariance[0][0] / (this.covariance[0][0] + this.measurementNoise);
    const ky = this.covariance[1][1] / (this.covariance[1][1] + this.measurementNoise);
    const kvx = this.covariance[2][2] / (this.covariance[2][2] + this.measurementNoise);
    const kvy = this.covariance[3][3] / (this.covariance[3][3] + this.measurementNoise);
    const kw = this.covariance[4][4] / (this.covariance[4][4] + this.measurementNoise);
    const kh = this.covariance[5][5] / (this.covariance[5][5] + this.measurementNoise);

    this.state.x += kx * (mx - this.state.x);
    this.state.y += ky * (my - this.state.y);
    this.state.vx += kvx * ((mx - this.state.x) / this.dt - this.state.vx);
    this.state.vy += kvy * ((my - this.state.y) / this.dt - this.state.vy);
    this.state.w += kw * (mw - this.state.w);
    this.state.h += kh * (mh - this.state.h);

    this.covariance[0][0] *= (1 - kx);
    this.covariance[1][1] *= (1 - ky);
    this.covariance[2][2] *= (1 - kvx);
    this.covariance[3][3] *= (1 - kvy);
    this.covariance[4][4] *= (1 - kw);
    this.covariance[5][5] *= (1 - kh);

    return this.stateToBBox();
  }

  public stateToBBox(): BBox {
    return [
      this.state.x - this.state.w/2,
      this.state.y - this.state.h/2,
      this.state.w,
      this.state.h
    ];
  }

  getPredictedBBox(): BBox {
    const predicted = { ...this.state };
    predicted.x += predicted.vx * this.dt;
    predicted.y += predicted.vy * this.dt;
    return [
      predicted.x - predicted.w/2,
      predicted.y - predicted.h/2,
      predicted.w,
      predicted.h
    ];
  }

  getState(): Readonly<KalmanState> {
    return { ...this.state };
  }

  getCenter(): [number, number] {
    return [this.state.x, this.state.y];
  }

  getVelocity(): [number, number] {
    return [this.state.vx, this.state.vy];
  }

  reset(initialBBox: BBox): void {
    const [x, y, w, h] = initialBBox;
    this.state = { x: x + w/2, y: y + h/2, vx: 0, vy: 0, w, h };
    this.covariance = this.identity(6);
  }
}

class Track {
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
    return this.kalman.predict();
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

function getIoU(box1: BBox, box2: BBox): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  const left = Math.max(x1, x2);
  const right = Math.min(x1 + w1, x2 + w2);
  const top = Math.max(y1, y2);
  const bottom = Math.min(y1 + h1, y2 + h2);
  if (left < right && top < bottom) {
    const intersection = (right - left) * (bottom - top);
    const area1 = w1 * h1;
    const area2 = w2 * h2;
    const union = area1 + area2 - intersection;
    return intersection / union;
  }
  return 0;
}

function getCenterDistance(box1: BBox, box2: BBox): number {
  const cx1 = box1[0] + box1[2] / 2;
  const cy1 = box1[1] + box1[3] / 2;
  const cx2 = box2[0] + box2[2] / 2;
  const cy2 = box2[1] + box2[3] / 2;
  return Math.hypot(cx1 - cx2, cy1 - cy2);
}

interface MatchResult {
  matched: { trackIdx: number; detIdx: number; score: number }[];
  unmatchedTracks: number[];
  unmatchedDetections: number[];
}

function hungarianMatch(costMatrix: number[][], maxCost: number): MatchResult {
  const nTracks = costMatrix.length;
  const nDets = costMatrix[0]?.length || 0;
  if (nTracks === 0 || nDets === 0) {
    return {
      matched: [],
      unmatchedTracks: Array.from({ length: nTracks }, (_, i) => i),
      unmatchedDetections: Array.from({ length: nDets }, (_, i) => i)
    };
  }
  const size = Math.max(nTracks, nDets);
  const padded = Array.from({ length: size }, (_, i) => 
    Array.from({ length: size }, (_, j) => {
      if (i < nTracks && j < nDets) {
        return costMatrix[i][j] > maxCost ? 1e6 : costMatrix[i][j];
      }
      return 1e6;
    })
  );
  const assignment = hungarianAlgorithm(padded, maxCost);
  const matched: MatchResult['matched'] = [];
  const matchedTracks = new Set<number>();
  const matchedDets = new Set<number>();
  for (const { row, col, cost } of assignment) {
    if (row < nTracks && col < nDets && cost <= maxCost) {
      matched.push({ trackIdx: row, detIdx: col, score: 1 - cost });
      matchedTracks.add(row);
      matchedDets.add(col);
    }
  }
  const unmatchedTracks = Array.from({ length: nTracks }, (_, i) => i).filter(i => !matchedTracks.has(i));
  const unmatchedDetections = Array.from({ length: nDets }, (_, i) => i).filter(i => !matchedDets.has(i));
  return { matched, unmatchedTracks, unmatchedDetections };
}

function hungarianAlgorithm(costMatrix: number[][], maxCost: number): { row: number; col: number; cost: number }[] {
  const n = costMatrix.length;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    const minv = new Array(n + 1).fill(Infinity);
    const used = new Array(n + 1).fill(false);
    let j0 = 0;
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assignment: { row: number; col: number; cost: number }[] = [];
  for (let j = 1; j <= n; j++) {
    if (p[j] !== 0 && p[j] <= costMatrix.length && j <= costMatrix[0].length) {
      const cost = costMatrix[p[j] - 1][j - 1];
      if (cost <= maxCost) {
        assignment.push({ row: p[j] - 1, col: j - 1, cost });
      }
    }
  }
  return assignment;
}

class ByteTrackerWorker {
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

  setConfig(config: Partial<ByteTrackerWorker>): void {
    Object.assign(this, config);
  }

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
        const centerDist = getCenterDistance(predBBox, detections[j].bbox);
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

  reset(): void {
    this.tracks = [];
    this.nextId = 1;
  }
}

const tracker = new ByteTrackerWorker();

// Notify main thread immediately that worker runtime is ready
try {
  self.postMessage({
    type: 'PROGRESS',
    msgId: 0,
    payload: {
      worker: 'tracker',
      stage: 'ready',
      percent: 100,
      message: 'ByteTrack Kalman association engine initialized'
    }
  });
  self.postMessage({ type: 'READY', msgId: 0, payload: { status: 'ready' } });
} catch (e) {
  // Ignored if posting not ready
}

self.onmessage = (event) => {
  const { type, payload, msgId } = event.data;

  if (type === 'INIT') {
    if (payload?.config) {
      tracker.setConfig(payload.config);
    }
    self.postMessage({
      type: 'PROGRESS',
      msgId: 0,
      payload: {
        worker: 'tracker',
        stage: 'ready',
        percent: 100,
        message: 'ByteTrack Kalman filters & Hungarian association engine initialized'
      }
    });
    self.postMessage({ type: 'READY', msgId, payload: { status: 'ready' } });
    return;
  }

  if (type === 'UPDATE') {
    const { detections } = payload;
    const tracks = tracker.update(detections);
    self.postMessage({
      type: 'TRACKS',
      msgId,
      payload: {
        tracks: tracks.map(t => ({
          id: t.id,
          bbox: t.getDisplayBBox(),
          score: t.score,
          className: t.className,
          state: t.state,
          status: t.getStatus(),
          center: t.getCenter(),
          velocity: t.getVelocity()
        }))
      }
    });
  }

  if (type === 'RESET') {
    tracker.reset();
    self.postMessage({ type: 'RESET_DONE', msgId });
  }

  if (type === 'GET_CONFIG') {
    self.postMessage({
      type: 'CONFIG',
      msgId,
      payload: {
        trackThresh: tracker.trackThresh,
        matchThresh: tracker.matchThresh,
        maxTimeLost: tracker.maxTimeLost,
        useHungarian: tracker.useHungarian,
        appearanceThresh: tracker.appearanceThresh,
        embeddingWeight: tracker.embeddingWeight,
        iouWeight: tracker.iouWeight,
        classWeight: tracker.classWeight
      }
    });
  }
};