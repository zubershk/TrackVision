import type * as ortType from 'onnxruntime-web';

export type BBox = [number, number, number, number];

export type ExecutionProviderType = 'webgpu' | 'webnn' | 'webgl' | 'wasm';

export interface HardwareAccelerationReport {
  webgpuSupported: boolean;
  webnnSupported: boolean;
  webglSupported: boolean;
  wasmSimdSupported: boolean;
  hardwareConcurrency: number;
  activeProvider: ExecutionProviderType;
  providerDescription: string;
}

export interface Detection {
  bbox: BBox;
  score: number;
  class: string;
  classId: number;
}

export interface YOLOMessage {
  type: 'INIT' | 'DETECT' | 'SET_CONCEPTS' | 'PROBE_PROVIDERS';
  payload?: any;
  msgId: number;
}

export interface YOLOResponse {
  type: 'READY' | 'DETECTION_RESULT' | 'ERROR' | 'PROGRESS' | 'PROBE_RESULT';
  msgId: number;
  payload?: any;
}

export interface YOLOConfig {
  modelUrl: string;
  inputSize: [number, number];
  confidenceThreshold: number;
  iouThreshold: number;
  classNames: string[];
  useWebGPU?: boolean;
  preferredProvider?: ExecutionProviderType;
}

export interface YOLOWorldMessage {
  type: 'INIT' | 'DETECT' | 'SET_CONCEPTS';
  payload?: any;
  msgId: number;
}

export interface YOLOWorldResponse {
  type: 'READY' | 'DETECTION_RESULT' | 'ERROR' | 'PROGRESS';
  msgId: number;
  payload?: any;
}

export interface YOLOWorldConfig {
  modelUrl: string;
  inputSize: [number, number];
  confidenceThreshold: number;
  iouThreshold: number;
  useWebGPU: boolean;
  clipModelUrl?: string;
  classNames?: string[];
}

export interface ReIDMessage {
  type: 'INIT' | 'EXTRACT' | 'EXTRACT_BATCH';
  payload?: any;
  msgId: number;
}

export interface ReIDResponse {
  type: 'READY' | 'EMBEDDING' | 'EMBEDDINGS_BATCH' | 'ERROR' | 'PROGRESS' | 'FALLBACK';
  msgId: number;
  payload?: any;
}

export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

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

export function applyNMS(detections: { bbox: BBox; score: number }[], iouThreshold: number) {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const finalDetections: typeof detections = [];
  
  for (const det of sorted) {
    let keep = true;
    for (const finalDet of finalDetections) {
      if (getIoU(det.bbox, finalDet.bbox) > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) finalDetections.push(det);
  }
  return finalDetections;
}

export function applyNMSWithClass(detections: Detection[], iouThreshold: number): Detection[] {
  const byClass = new Map<string, Detection[]>();
  for (const det of detections) {
    const arr = byClass.get(det.class) || [];
    arr.push(det);
    byClass.set(det.class, arr);
  }

  const finalDetections: Detection[] = [];
  for (const [, classDets] of byClass) {
    const sorted = [...classDets].sort((a, b) => b.score - a.score);
    for (const det of sorted) {
      let keep = true;
      for (const finalDet of finalDetections) {
        if (finalDet.class === det.class && getIoU(det.bbox, finalDet.bbox) > iouThreshold) {
          keep = false;
          break;
        }
      }
      if (keep) finalDetections.push(det);
    }
  }
  return finalDetections;
}

export function preprocessImage(imageData: ImageData, targetSize: [number, number]): Float32Array {
  const [srcW, srcH] = [imageData.width, imageData.height];
  const [dstW, dstH] = targetSize;
  
  const canvas = new OffscreenCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d')!;
  
  const sourceCanvas = new OffscreenCanvas(srcW, srcH);
  const sourceCtx = sourceCanvas.getContext('2d')!;
  sourceCtx.putImageData(imageData, 0, 0);
  
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const offsetX = Math.floor((dstW - newW) / 2);
  const offsetY = Math.floor((dstH - newH) / 2);
  
  ctx.fillStyle = '#777777';
  ctx.fillRect(0, 0, dstW, dstH);
  ctx.drawImage(sourceCanvas, offsetX, offsetY, newW, newH);
  
  const resizedData = ctx.getImageData(0, 0, dstW, dstH);
  const data = resizedData.data;
  const floatData = new Float32Array(3 * dstW * dstH);
  
  let idx = 0;
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < dstW * dstH; i++) {
      const pixelIdx = i * 4 + c;
      floatData[idx++] = data[pixelIdx] / 255;
    }
  }
  
  return floatData;
}

export function cropImage(imageData: ImageData, bbox: BBox, targetSize: [number, number] = [128, 256]): Float32Array {
  const [dstW, dstH] = targetSize;
  const [x, y, w, h] = bbox;
  
  const canvas = new OffscreenCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d')!;
  
  const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext('2d')!;
  sourceCtx.putImageData(imageData, 0, 0);
  
  ctx.fillStyle = '#777777';
  ctx.fillRect(0, 0, dstW, dstH);
  ctx.drawImage(sourceCanvas, Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)), 0, 0, dstW, dstH);
  
  const resizedData = ctx.getImageData(0, 0, dstW, dstH);
  const data = resizedData.data;
  const floatData = new Float32Array(3 * dstW * dstH);
  
  let idx = 0;
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < dstW * dstH; i++) {
      const pixelIdx = i * 4 + c;
      floatData[idx++] = data[pixelIdx] / 255;
    }
  }
  
  return floatData;
}

export function generateFallbackEmbedding(dim = 512): Float32Array {
  const embedding = new Float32Array(dim);
  let seed = 1337;
  for (let i = 0; i < dim; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    embedding[i] = (seed / 233280) * 2 - 1;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += embedding[i] * embedding[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dim; i++) embedding[i] /= norm;
  return embedding;
}

export function detectExecutionProviderSupport() {
  const isBrowser = typeof navigator !== 'undefined';
  const threads = isBrowser ? (navigator.hardwareConcurrency || 2) : 2;
  const webgpu = isBrowser && 'gpu' in navigator;
  const webnn = isBrowser && ('ml' in navigator || 'webnn' in (navigator as any));
  let webgl = false;
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(1, 1);
      webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    }
  } catch {
    webgl = false;
  }

  return {
    webgpu,
    webnn,
    webgl,
    wasm: true,
    threads: Math.min(4, threads)
  };
}

export async function createAcceleratedSession(
  ort: typeof ortType,
  modelSource: ArrayBuffer | string,
  baseOptions: ortType.InferenceSession.SessionOptions = {},
  workerTag = 'Worker',
  preferredProvider?: ExecutionProviderType
): Promise<{
  session: ortType.InferenceSession;
  provider: ExecutionProviderType;
  description: string;
  initTimeMs: number;
}> {
  const support = detectExecutionProviderSupport();
  const start = performance.now();

  const candidateConfigs: Array<{
    provider: ExecutionProviderType;
    providers: (string | Record<string, any>)[];
    description: string;
  }> = [];

  if (preferredProvider === 'webnn' || (!preferredProvider && support.webnn)) {
    candidateConfigs.push({
      provider: 'webnn',
      providers: ['webnn', 'wasm'],
      description: 'WebNN (Neural Processing Unit / DirectML NPU)'
    });
  }

  if (preferredProvider === 'webgpu' || (!preferredProvider && support.webgpu)) {
    candidateConfigs.push({
      provider: 'webgpu',
      providers: ['webgpu', 'wasm'],
      description: 'WebGPU (Hardware Compute Shader Pipeline)'
    });
  }

  if (preferredProvider === 'webgl' || (!preferredProvider && support.webgl)) {
    candidateConfigs.push({
      provider: 'webgl',
      providers: ['webgl', 'wasm'],
      description: 'WebGL 2.0 (Mobile GPU Shader Acceleration)'
    });
  }

  // Always append WASM SIMD as robust universal fallback
  candidateConfigs.push({
    provider: 'wasm',
    providers: ['wasm'],
    description: `WASM SIMD (Vectorized CPU Multi-threaded ${support.threads}T)`
  });

  let lastError: Error | null = null;

  for (let i = 0; i < candidateConfigs.length; i++) {
    const candidate = candidateConfigs[i];
    try {
      console.log(`[${workerTag}] Attempting session creation with [${candidate.provider}] providers:`, candidate.providers);
      
      // If modelSource is an ArrayBuffer, pass a slice or Uint8Array copy so subsequent fallbacks don't receive a detached buffer
      const inputSource = typeof modelSource === 'string' 
        ? modelSource 
        : (i === candidateConfigs.length - 1 ? modelSource : modelSource.slice(0));

      const session = await (ort.InferenceSession as any).create(inputSource, {
        ...baseOptions,
        executionProviders: candidate.providers
      });
      const initTimeMs = performance.now() - start;
      console.log(`[${workerTag}] Successfully initialized session with [${candidate.provider}] in ${initTimeMs.toFixed(1)}ms`);
      return {
        session,
        provider: candidate.provider,
        description: candidate.description,
        initTimeMs
      };
    } catch (err) {
      console.warn(`[${workerTag}] Provider [${candidate.provider}] initialization failed, trying next fallback:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`[${workerTag}] Failed to initialize ONNX session with any execution provider`);
}