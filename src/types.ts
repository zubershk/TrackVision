export type BBox = [number, number, number, number];

export interface Detection {
  bbox: BBox;
  score: number;
  class: string;
  classId: number;
  embedding?: Float32Array;
}

export interface CapturedFrame {
  buffer: ArrayBuffer;
  data: Uint8ClampedArray;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}
