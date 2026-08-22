export type BBox = [number, number, number, number];

export function getIoU(box1: BBox, box2: BBox): number {
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

export function getIoUWithCenter(box1: BBox, box2: BBox): number {
  const iou = getIoU(box1, box2);
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  
  const cx1 = x1 + w1/2;
  const cy1 = y1 + h1/2;
  const cx2 = x2 + w2/2;
  const cy2 = y2 + h2/2;
  
  const centerDist = Math.hypot(cx1 - cx2, cy1 - cy2);
  const maxDim = Math.max(w1, h1, w2, h2);
  
  const centerPenalty = Math.exp(-centerDist / (maxDim * 2));
  
  return iou * 0.7 + centerPenalty * 0.3;
}

export interface MatchResult {
  matched: { trackIdx: number; detIdx: number; score: number }[];
  unmatchedTracks: number[];
  unmatchedDetections: number[];
}

export function hungarianMatch(
  costMatrix: number[][],
  maxCost: number = 0.5
): MatchResult {
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

  const unmatchedTracks = Array.from({ length: nTracks }, (_, i) => i)
    .filter(i => !matchedTracks.has(i));
  const unmatchedDetections = Array.from({ length: nDets }, (_, i) => i)
    .filter(i => !matchedDets.has(i));

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

export function greedyMatch(
  costMatrix: number[][],
  maxCost: number = 0.5
): MatchResult {
  const nTracks = costMatrix.length;
  const nDets = costMatrix[0]?.length || 0;
  
  if (nTracks === 0 || nDets === 0) {
    return {
      matched: [],
      unmatchedTracks: Array.from({ length: nTracks }, (_, i) => i),
      unmatchedDetections: Array.from({ length: nDets }, (_, i) => i)
    };
  }

  const candidates: { trackIdx: number; detIdx: number; cost: number }[] = [];
  for (let i = 0; i < nTracks; i++) {
    for (let j = 0; j < nDets; j++) {
      if (costMatrix[i][j] <= maxCost) {
        candidates.push({ trackIdx: i, detIdx: j, cost: costMatrix[i][j] });
      }
    }
  }

  candidates.sort((a, b) => a.cost - b.cost);

  const matched: MatchResult['matched'] = [];
  const matchedTracks = new Set<number>();
  const matchedDets = new Set<number>();

  for (const c of candidates) {
    if (!matchedTracks.has(c.trackIdx) && !matchedDets.has(c.detIdx)) {
      matched.push({ trackIdx: c.trackIdx, detIdx: c.detIdx, score: 1 - c.cost });
      matchedTracks.add(c.trackIdx);
      matchedDets.add(c.detIdx);
    }
  }

  const unmatchedTracks = Array.from({ length: nTracks }, (_, i) => i)
    .filter(i => !matchedTracks.has(i));
  const unmatchedDetections = Array.from({ length: nDets }, (_, i) => i)
    .filter(i => !matchedDets.has(i));

  return { matched, unmatchedTracks, unmatchedDetections };
}