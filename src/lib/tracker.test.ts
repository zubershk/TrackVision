import { describe, it, expect, beforeEach } from 'vitest';
import { ByteTracker, TrackState, TrackStatus } from './tracker';
import type { Detection } from '../types';

function det(
  bbox: [number, number, number, number],
  score = 0.8,
  className = 'person',
  embedding?: Float32Array
): Detection {
  return { bbox, score, class: className, classId: 0, embedding };
}

function makeTracker(): ByteTracker {
  const tracker = new ByteTracker();
  tracker.trackThresh = 0.4;
  tracker.matchThresh = 0.7;
  tracker.maxTimeLost = 30;
  return tracker;
}

describe('ByteTrack lifecycle', () => {
  let tracker: ByteTracker;

  beforeEach(() => {
    tracker = makeTracker();
  });

  it('starts new tracks as TENTATIVE with a fresh ID', () => {
    const tracks = tracker.update([det([100, 100, 50, 50])]);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe(1);
    expect(tracks[0].state).toBe(TrackState.TENTATIVE);
  });

  it('confirms a track after hits >= 3', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    tracker.update([det(box)]);
    tracker.update([det(box)]);
    const tracks = tracker.update([det(box)]);

    expect(tracks[0].state).toBe(TrackState.CONFIRMED);
    expect(tracks[0].status).toBe(TrackStatus.TRACKED);
  });

  it('confirms immediately after two detections scoring >= 0.7', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    tracker.update([det(box, 0.9)]);
    const tracks = tracker.update([det(box, 0.85)]);

    expect(tracks[0].state).toBe(TrackState.CONFIRMED);
  });

  it('does not confirm from two low-confidence detections', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    tracker.update([det(box, 0.5)]);
    const tracks = tracker.update([det(box, 0.5)]);

    expect(tracks[0].state).toBe(TrackState.TENTATIVE);
  });

  it('keeps the same track ID while the object moves smoothly', () => {
    for (let i = 0; i < 5; i++) {
      const tracks = tracker.update([det([100 + i * 4, 100, 50, 50])]);
      expect(tracks[0].id).toBe(1);
    }
  });

  it('re-associates the same object to the same ID after a brief occlusion', () => {
    const box: [number, number, number, number] = [200, 150, 60, 120];

    // Build up a confirmed track
    for (let i = 0; i < 3; i++) tracker.update([det(box, 0.9)]);
    const beforeId = tracker.tracks[0].id;

    // Object disappears for a few frames
    for (let i = 0; i < 3; i++) tracker.update([]);

    // Reappears at the same spot — must reattach, not spawn a new ID
    const tracks = tracker.update([det(box, 0.9)]);
    expect(tracks.map(t => t.id)).toContain(beforeId);
  });

  it('marks a track LOST after more than 5 missed frames', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    for (let i = 0; i < 3; i++) tracker.update([det(box, 0.9)]);
    expect(tracker.tracks[0].getStatus()).toBe(TrackStatus.TRACKED);

    for (let i = 0; i < 6; i++) tracker.update([]);
    expect(tracker.tracks[0].status).toBe(TrackStatus.LOST);
  });

  it('removes a track after exceeding maxTimeLost missed frames', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    for (let i = 0; i < 3; i++) tracker.update([det(box, 0.9)]);

    for (let i = 0; i < 31; i++) tracker.update([]);
    expect(tracker.tracks.filter(t => t.id === 1)).toHaveLength(0);
    expect(tracker.getTrackCount()).toBe(0);
  });

  it('spawns separate IDs for spatially distinct objects', () => {
    const first = tracker.update([det([0, 0, 40, 40])]);
    const both = tracker.update([
      det([0, 0, 40, 40]),
      det([500, 500, 40, 40])
    ]);

    expect(first[0].id).toBe(1);
    expect(both.map(t => t.id).sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('ignores very low-score detections entirely (< 0.1)', () => {
    const tracks = tracker.update([det([100, 100, 50, 50], 0.05)]);
    expect(tracks).toHaveLength(0);
    expect(tracker.getTrackCount()).toBe(0);
  });

  it('uses low-score detections only for matching existing tracks, never new tracks', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    for (let i = 0; i < 3; i++) tracker.update([det(box, 0.9)]);
    const countBefore = tracker.getTrackCount();

    // Low-score detection far away must not create a new track
    const tracks = tracker.update([det([600, 600, 50, 50], 0.25)]);
    expect(tracker.getTrackCount()).toBe(countBefore);
    expect(tracks.every(t => t.id === 1)).toBe(true);
  });

  it('stabilizes the class label via majority vote over recent history', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    tracker.update([det(box, 0.9, 'person')]);

    // A few noisy frames flip label briefly...
    tracker.update([det(box, 0.9, 'tv')]);
    tracker.update([det(box, 0.9, 'tv')]);
    // ...but sustained correct labels win the vote
    for (let i = 0; i < 5; i++) tracker.update([det(box, 0.9, 'person')]);

    const tracks = tracker.update([det(box, 0.9, 'person')]);
    expect(tracks[0].className).toBe('person');
  });
});

describe('ByteTrack appearance fusion', () => {
  beforeEach(() => {
    // Deterministic unit-normal embeddings
    const e1 = new Float32Array([1, 0, 0, 0]);
    const e2 = new Float32Array([0, 1, 0, 0]);
    makeFixtures(e1, e2);
  });

  let tracker!: ByteTracker;
  let e1!: Float32Array;
  let e2!: Float32Array;

  function makeFixtures(a: Float32Array, b: Float32Array) {
    e1 = a;
    e2 = b;
    tracker = makeTracker();
  }

  function cosine(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  it('stores the first embedding on creation and EMA-blends subsequent ones', () => {
    const box: [number, number, number, number] = [100, 100, 50, 50];
    tracker.update([det(box, 0.9, 'person', e1)]);
    tracker.update([det(box, 0.9, 'person', e2)]);

    const emb = tracker.tracks[0].embedding!;
    // Blend alpha=0.3 toward e2 gives [0.7, 0.3, 0, 0]; updateEmbedding then
    // re-normalizes to unit length: divide by sqrt(0.58)
    const norm = Math.sqrt(emb.reduce((s: number, v: number) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 4);
    expect(emb[0]).toBeCloseTo(0.7 / Math.sqrt(0.58), 4);
    expect(emb[1]).toBeCloseTo(0.3 / Math.sqrt(0.58), 4);

    // Still closer in appearance space to the original identity
    expect(cosine(emb, e1)).toBeGreaterThan(cosine(emb, e2));
  });

  it('prefers appearance when IoU is ambiguous during crossing paths', () => {
    // Appearance-dominant tuning: validates the fusion wiring itself.
    // (Under default weights a full-frame teleport is won by the motion
    // terms by design — real crossings are gradual and IoU stays nonzero.)
    tracker.iouWeight = 0.1;
    tracker.embeddingWeight = 0.8;

    const leftBox: [number, number, number, number] = [80, 100, 60, 120];
    const rightBox: [number, number, number, number] = [160, 100, 60, 120];

    // Seed identities with three static frames each
    for (let i = 0; i < 3; i++) {
      tracker.update([det(leftBox, 0.9, 'person', e1), det(rightBox, 0.9, 'person', e2)]);
    }
    expect(tracker.getTrackCount()).toBe(2);

    // Both objects teleport across (IoU 0 against both predictions, center
    // distances symmetric) — only appearance can disambiguate the pairing:
    // track seeded with e1 must follow the detection carrying e1.
    const tracks = tracker.update([det(rightBox, 0.9, 'person', e1), det(leftBox, 0.9, 'person', e2)]);

    const trackA = tracks.find(t => t.id === 1)!;
    const trackB = tracks.find(t => t.id === 2)!;
    expect(trackA).toBeDefined();
    expect(trackB).toBeDefined();

    // Track 1's embedding should remain dominated by e1 (not e2)
    expect(Math.abs(cosine(trackA.embedding!, e1))).toBeGreaterThan(
      Math.abs(cosine(trackA.embedding!, e2))
    );
    expect(Math.abs(cosine(trackB.embedding!, e2))).toBeGreaterThan(
      Math.abs(cosine(trackB.embedding!, e1))
    );
  });
});
