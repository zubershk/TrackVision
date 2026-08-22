export type BBox = [number, number, number, number];

export interface GroundTruthTrack {
  id: number;
  bbox: BBox;
  frameId: number;
  classId?: number;
}

export interface PredictedTrack {
  id: number;
  bbox: BBox;
  frameId: number;
  classId?: number;
  score?: number;
}

export interface TrackingMetrics {
  mota: number;
  motp: number;
  idf1: number;
  precision: number;
  recall: number;
  fp: number;
  fn: number;
  idSwaps: number;
  mostlyTracked: number;
  mostlyLost: number;
  partiallyTracked: number;
  fps: number;
  totalFrames: number;
  totalObjects: number;
}

interface Match {
  gtId: number;
  predId: number;
  iou: number;
  frameId: number;
}

export class MOTEvaluator {
  private groundTruth: Map<number, GroundTruthTrack[]> = new Map();
  private predictions: Map<number, PredictedTrack[]> = new Map();
  private idMatches: Map<number, Map<number, number>> = new Map();
  private gtTrajectories: Map<number, Set<number>> = new Map();
  private predTrajectories: Map<number, Set<number>> = new Map();
  private frameIds: Set<number> = new Set();
  private gtIds: Set<number> = new Set();
  private predIds: Set<number> = new Set();

  addGroundTruth(frameId: number, tracks: GroundTruthTrack[]): void {
    this.groundTruth.set(frameId, tracks);
    this.frameIds.add(frameId);
    for (const track of tracks) {
      this.gtIds.add(track.id);
      if (!this.gtTrajectories.has(track.id)) {
        this.gtTrajectories.set(track.id, new Set());
      }
      this.gtTrajectories.get(track.id)!.add(frameId);
    }
  }

  addPredictions(frameId: number, tracks: PredictedTrack[]): void {
    this.predictions.set(frameId, tracks);
    this.frameIds.add(frameId);
    for (const track of tracks) {
      this.predIds.add(track.id);
      if (!this.predTrajectories.has(track.id)) {
        this.predTrajectories.set(track.id, new Set());
      }
      this.predTrajectories.get(track.id)!.add(frameId);
    }
  }

  private computeIoU(box1: BBox, box2: BBox): number {
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

  private hungarianMatch(costMatrix: number[][], threshold: number): Map<number, number> {
    const n = costMatrix.length;
    const m = costMatrix[0]?.length || 0;
    if (n === 0 || m === 0) return new Map();

    const size = Math.max(n, m);
    const padded = Array.from({ length: size }, (_, i) => 
      Array.from({ length: size }, (_, j) => {
        if (i < n && j < m) return costMatrix[i][j] > threshold ? 1e6 : costMatrix[i][j];
        return 1e6;
      })
    );

    const u = new Array(size + 1).fill(0);
    const v = new Array(size + 1).fill(0);
    const p = new Array(size + 1).fill(0);
    const way = new Array(size + 1).fill(0);

    for (let i = 1; i <= size; i++) {
      p[0] = i;
      const minv = new Array(size + 1).fill(Infinity);
      const used = new Array(size + 1).fill(false);
      let j0 = 0;
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= size; j++) {
          if (!used[j]) {
            const cur = padded[i0 - 1][j - 1] - u[i0] - v[j];
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
        for (let j = 0; j <= size; j++) {
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

    const matches = new Map<number, number>();
    for (let j = 1; j <= size; j++) {
      if (p[j] !== 0 && p[j] <= n && j <= m) {
        const cost = costMatrix[p[j] - 1][j - 1];
        if (cost <= threshold) {
          matches.set(p[j] - 1, j - 1);
        }
      }
    }
    return matches;
  }

  computeMetrics(): TrackingMetrics {
    let totalFP = 0;
    let totalFN = 0;
    let totalIDSwaps = 0;
    let totalMatches = 0;
    let totalGT = 0;
    let sumIoU = 0;

    const gtIdToFrames = new Map<number, Set<number>>();
    const predIdToFrames = new Map<number, Set<number>>();

    for (const [frameId, gts] of this.groundTruth) {
      const preds = this.predictions.get(frameId) || [];
      totalGT += gts.length;

      if (gts.length === 0 && preds.length === 0) continue;
      if (gts.length === 0) {
        totalFP += preds.length;
        continue;
      }
      if (preds.length === 0) {
        totalFN += gts.length;
        continue;
      }

      const costMatrix: number[][] = [];
      for (const gt of gts) {
        const row: number[] = [];
        for (const pred of preds) {
          const iou = this.computeIoU(gt.bbox, pred.bbox);
          row.push(1 - iou);
        }
        costMatrix.push(row);
      }

      const matches = this.hungarianMatch(costMatrix, 0.5);
      totalMatches += matches.size;

      const matchedGT = new Set<number>();
      const matchedPred = new Set<number>();

      for (const [gtIdx, predIdx] of matches) {
        const gt = gts[gtIdx];
        const pred = preds[predIdx];
        const iou = this.computeIoU(gt.bbox, pred.bbox);
        sumIoU += iou;

        matchedGT.add(gt.id);
        matchedPred.add(pred.id);

        if (!this.idMatches.has(gt.id)) {
          this.idMatches.set(gt.id, new Map());
        }
        const predMap = this.idMatches.get(gt.id)!;
        const prevCount = predMap.get(pred.id) || 0;
        predMap.set(pred.id, prevCount + 1);
      }

      totalFP += preds.length - matchedPred.size;
      totalFN += gts.length - matchedGT.size;

      for (const gt of gts) {
        if (!gtIdToFrames.has(gt.id)) gtIdToFrames.set(gt.id, new Set());
        gtIdToFrames.get(gt.id)!.add(frameId);
      }
      for (const pred of preds) {
        if (!predIdToFrames.has(pred.id)) predIdToFrames.set(pred.id, new Set());
        predIdToFrames.get(pred.id)!.add(frameId);
      }
    }

    for (const [gtId, predMap] of this.idMatches) {
      let maxCount = 0;
      let bestPredId = -1;
      for (const [predId, count] of predMap) {
        if (count > maxCount) {
          maxCount = count;
          bestPredId = predId;
        }
      }
      for (const [predId, count] of predMap) {
        if (predId !== bestPredId) {
          totalIDSwaps += count;
        }
      }
    }

    const mota = totalGT > 0 ? 1 - (totalFP + totalFN + totalIDSwaps) / totalGT : 0;
    const motp = totalMatches > 0 ? sumIoU / totalMatches : 0;
    const precision = (totalMatches + totalFP) > 0 ? totalMatches / (totalMatches + totalFP) : 0;
    const recall = totalGT > 0 ? totalMatches / totalGT : 0;

    let idf1Numerator = 0;
    let idf1Denominator = 0;

    for (const [gtId, frames] of gtIdToFrames) {
      const bestPredId = this.findBestPredMatch(gtId);
      if (bestPredId === -1) continue;
      
      const predFrames = predIdToFrames.get(bestPredId) || new Set();
      const intersection = new Set([...frames].filter(x => predFrames.has(x)));
      const union = new Set([...frames, ...predFrames]);
      
      idf1Numerator += intersection.size;
      idf1Denominator += union.size;
    }

    const idf1 = idf1Denominator > 0 ? idf1Numerator / idf1Denominator : 0;

    let mostlyTracked = 0;
    let mostlyLost = 0;
    let partiallyTracked = 0;

    for (const [gtId, frames] of gtIdToFrames) {
      const bestPredId = this.findBestPredMatch(gtId);
      if (bestPredId === -1) {
        mostlyLost++;
        continue;
      }
      const predFrames = predIdToFrames.get(bestPredId) || new Set();
      const intersection = new Set([...frames].filter(x => predFrames.has(x)));
      const coverage = intersection.size / frames.size;
      
      if (coverage >= 0.8) mostlyTracked++;
      else if (coverage < 0.2) mostlyLost++;
      else partiallyTracked++;
    }

    const totalFrames = this.frameIds.size;
    const totalObjects = this.gtIds.size;

    return {
      mota: Math.max(0, mota),
      motp,
      idf1,
      precision,
      recall,
      fp: totalFP,
      fn: totalFN,
      idSwaps: totalIDSwaps,
      mostlyTracked,
      mostlyLost,
      partiallyTracked,
      fps: 0,
      totalFrames,
      totalObjects
    };
  }

  private findBestPredMatch(gtId: number): number {
    const predMap = this.idMatches.get(gtId);
    if (!predMap) return -1;
    let maxCount = 0;
    let bestPredId = -1;
    for (const [predId, count] of predMap) {
      if (count > maxCount) {
        maxCount = count;
        bestPredId = predId;
      }
    }
    return bestPredId;
  }

  reset(): void {
    this.groundTruth.clear();
    this.predictions.clear();
    this.idMatches.clear();
    this.gtTrajectories.clear();
    this.predTrajectories.clear();
    this.frameIds.clear();
    this.gtIds.clear();
    this.predIds.clear();
  }
}

export function createMOTEvaluator(): MOTEvaluator {
  return new MOTEvaluator();
}