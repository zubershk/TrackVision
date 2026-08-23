import { describe, it, expect } from 'vitest';
import { applyNMSWithClass, applyNMS, getIoU as workerGetIoU, COCO_CLASSES } from './workerUtils';
import type { Detection } from '../types';

function det(
  bbox: [number, number, number, number],
  score: number,
  className = 'person'
): Detection {
  return { bbox, score, class: className, classId: 0 };
}

describe('applyNMSWithClass', () => {
  it('returns empty output for empty input', () => {
    expect(applyNMSWithClass([], 0.45)).toEqual([]);
  });

  it('keeps the higher-score box and suppresses heavily overlapping same-class boxes', () => {
    const dets = [
      det([10, 10, 50, 50], 0.9),
      det([12, 12, 50, 50], 0.6) // near-duplicate of the first
    ];
    const kept = applyNMSWithClass(dets, 0.45);
    expect(kept).toHaveLength(1);
    expect(kept[0].score).toBe(0.9);
  });

  it('keeps overlapping boxes from different classes (class-aware)', () => {
    const dets = [
      det([10, 10, 50, 50], 0.9, 'person'),
      det([11, 11, 50, 50], 0.7, 'car') // same region, different class
    ];
    const kept = applyNMSWithClass(dets, 0.45);
    expect(kept.map(d => d.class).sort()).toEqual(['car', 'person']);
  });

  it('keeps spatially separated same-class boxes', () => {
    const dets = [
      det([0, 0, 30, 30], 0.9),
      det([500, 500, 30, 30], 0.8)
    ];
    expect(applyNMSWithClass(dets, 0.45)).toHaveLength(2);
  });

  it('does not suppress when IoU is exactly at the threshold (strict >)', () => {
    // Half-shift: IoU = 1/3 < 0.5 threshold, must be kept even at tight thresholds
    const dets = [
      det([0, 0, 100, 100], 0.9),
      det([50, 0, 100, 100], 0.8)
    ];
    expect(applyNMSWithClass(dets, 1 / 3)).toHaveLength(2);
  });

  it('processes greedily by descending score', () => {
    const dets = [
      det([0, 0, 40, 40], 0.5),
      det([1, 1, 40, 40], 0.95), // highest score arrives second
      det([2, 2, 40, 40], 0.7)
    ];
    const kept = applyNMSWithClass(dets, 0.45);
    expect(kept).toHaveLength(1);
    expect(kept[0].score).toBe(0.95);
  });
});

describe('applyNMS (class-agnostic)', () => {
  it('suppresses any overlapping box regardless of class', () => {
    const dets = [
      { bbox: [0, 0, 40, 40] as [number, number, number, number], score: 0.9 },
      { bbox: [1, 1, 40, 40] as [number, number, number, number], score: 0.6 }
    ];
    expect(applyNMS(dets, 0.45)).toHaveLength(1);
  });
});

describe('workerUtils shared logic', () => {
  it('exposes the full COCO-80 label set', () => {
    expect(COCO_CLASSES).toHaveLength(80);
    expect(COCO_CLASSES[0]).toBe('person');
  });

  it('getIoU agrees with lib/matching semantics', () => {
    const iou = workerGetIoU([0, 0, 100, 100], [50, 0, 100, 100]);
    expect(iou).toBeCloseTo(1 / 3, 6);
  });
});
