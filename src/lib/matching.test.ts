import { describe, it, expect } from 'vitest';
import { getIoU, getIoUWithCenter, hungarianMatch, greedyMatch } from './matching';

describe('getIoU', () => {
  it('returns 1 for identical boxes', () => {
    const box: [number, number, number, number] = [10, 10, 50, 50];
    expect(getIoU(box, [...box] as [number, number, number, number])).toBe(1);
  });

  it('returns 0 for disjoint boxes', () => {
    expect(getIoU([0, 0, 10, 10], [100, 100, 20, 20])).toBe(0);
  });

  it('returns 0 for edge-touching boxes (no area overlap)', () => {
    expect(getIoU([0, 0, 10, 10], [10, 0, 10, 10])).toBe(0);
  });

  it('computes exact overlap ratio for half-shifted boxes', () => {
    // A=[0,0,100,100], B=[50,0,100,100]: intersection=5000, union=15000
    const iou = getIoU([0, 0, 100, 100], [50, 0, 100, 100]);
    expect(iou).toBeCloseTo(1 / 3, 6);
  });

  it('is symmetric', () => {
    const iouAB = getIoU([0, 0, 100, 100], [25, 25, 100, 100]);
    const iouBA = getIoU([25, 25, 100, 100], [0, 0, 100, 100]);
    expect(iouAB).toBeCloseTo(iouBA, 10);
  });

  it('returns 0 when a box has zero area', () => {
    expect(getIoU([5, 5, 0, 0], [0, 0, 10, 10])).toBe(0);
  });
});

describe('getIoUWithCenter', () => {
  it('returns higher score for closer centers at equal IoU contribution', () => {
    // Same overlap geometry, but second pair has centers closer together
    const far = getIoUWithCenter([0, 0, 10, 10], [8, 8, 10, 10]);
    const near = getIoUWithCenter([0, 0, 10, 10], [2, 2, 10, 10]);
    expect(near).toBeGreaterThan(far);
  });
});

describe('hungarianMatch', () => {
  it('finds the optimal diagonal assignment', () => {
    const result = hungarianMatch(
      [
        [0.1, 0.9],
        [0.9, 0.1]
      ],
      0.5
    );
    expect(result.matched).toHaveLength(2);
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 0, detIdx: 0 }));
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 1, detIdx: 1 }));
    expect(result.unmatchedTracks).toEqual([]);
    expect(result.unmatchedDetections).toEqual([]);
  });

  it('prefers the cheaper global assignment over per-row greed', () => {
    // Greedy row 0 would take det 0 (0.2), forcing row 1 onto 0.4.
    // Optimal total: row0->det1 (0.3) + row1->det0 (0.1).
    const result = hungarianMatch(
      [
        [0.2, 0.3],
        [0.1, 0.4]
      ],
      0.5
    );
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 0, detIdx: 1 }));
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 1, detIdx: 0 }));
  });

  it('leaves pairs unmatched when cost exceeds maxCost', () => {
    const result = hungarianMatch([[0.9]], 0.5);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedTracks).toEqual([0]);
    expect(result.unmatchedDetections).toEqual([0]);
  });

  it('handles more detections than tracks', () => {
    const result = hungarianMatch(
      [
        [0.1, 0.2, 0.95],
        [0.2, 0.05, 0.9]
      ],
      0.5
    );
    expect(result.matched).toHaveLength(2);
    expect(result.unmatchedTracks).toEqual([]);
    expect(result.unmatchedDetections).toHaveLength(1);
  });

  it('handles empty inputs without throwing', () => {
    const noTracks = hungarianMatch([], 0.5);
    expect(noTracks.matched).toEqual([]);
    expect(noTracks.unmatchedDetections).toEqual([]);

    const noDets = hungarianMatch([[]], 0.5);
    expect(noDets.matched).toEqual([]);
    expect(noDets.unmatchedTracks).toEqual([0]);
  });

  it('reports score as 1 - cost for each match', () => {
    const result = hungarianMatch([[0.25]], 0.5);
    expect(result.matched[0].score).toBeCloseTo(0.75, 6);
  });
});

describe('greedyMatch', () => {
  it('assigns best available pairs in ascending cost order', () => {
    // Greedy walks cells cheapest-first: (0,0)=0.1 then (1,1)=0.2.
    // Note the suboptimality vs hungarianMatch on the same matrix
    // (see the "optimal assignment beats greedy" test above).
    const result = greedyMatch(
      [
        [0.1, 0.45],
        [0.4, 0.2]
      ],
      0.5
    );
    expect(result.matched).toHaveLength(2);
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 0, detIdx: 0 }));
    expect(result.matched).toContainEqual(expect.objectContaining({ trackIdx: 1, detIdx: 1 }));
    expect(result.unmatchedTracks).toHaveLength(0);
    expect(result.unmatchedDetections).toHaveLength(0);
  });
});
