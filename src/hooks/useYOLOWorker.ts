import { useRef, useEffect, useCallback, useState } from 'react';
import { useModelInitStore } from '../store/modelInitStore';
import { useVisionStore, type ExecutionProviderType } from '../store';
import type { Detection, CapturedFrame } from '../types';

interface YOLOMessage {
  type: 'INIT' | 'DETECT' | 'SET_CONCEPTS';
  payload?: any;
  msgId: number;
}

interface YOLOResponse {
  type: 'READY' | 'DETECTION_RESULT' | 'ERROR' | 'PROGRESS';
  msgId: number;
  payload?: any;
}

export interface DetectionResultPayload {
  results: Detection[];
  inferenceMs: number;
  preprocessMs?: number;
  postprocessMs?: number;
  executionProvider?: ExecutionProviderType;
  deviceAcceleration?: string;
  error?: string;
}

let msgIdCounter = 0;

interface PendingRequest {
  resolve: (payload: any) => void;
  reject?: (reason: any) => void;
  timeoutId: any;
}

export function useYOLOWorker(modelUrl?: string, concepts?: string[]) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useYOLOWorker] Creating worker for:', modelUrl);
    useModelInitStore.getState().updateSubsystem('yolo', {
      status: 'downloading',
      percent: 5,
      message: 'Initializing YOLOv8 worker thread...'
    });
    useModelInitStore.getState().addLog('YOLOv8', 'Spawning dedicated ONNX Web Worker thread...', 'info');

    const worker = new Worker(new URL('../workers/yoloDetectionWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onerror = (err) => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      console.error('[useYOLOWorker] Worker error:', err);
      setInitError(`Worker error: ${err.message}`);
      setError(`Worker error: ${err.message}`);
      setReady(false);
      useModelInitStore.getState().updateSubsystem('yolo', {
        status: 'error',
        message: `Worker failure: ${err.message}`
      });
      useModelInitStore.getState().addLog('YOLOv8', `Worker error: ${err.message}`, 'error');

      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve({ results: [], inferenceMs: 0, error: err.message });
      });
      pendingRef.current.clear();
    };

    worker.onmessage = (event: MessageEvent<{ type: string; msgId: number; payload?: any }>) => {
      const { type, msgId, payload } = event.data;
      
      if (type === 'READY') {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        console.log('[useYOLOWorker] Worker READY:', payload);
        setReady(true);
        setError(null);
        setInitError(null);

        const ep: ExecutionProviderType = payload?.executionProvider || 'wasm';
        const desc: string = payload?.deviceAcceleration || 'WASM SIMD';
        
        useVisionStore.getState().setHardwareInfo({
          executionProvider: ep,
          deviceAcceleration: desc
        });

        useModelInitStore.getState().updateSubsystem('yolo', {
          status: 'ready',
          percent: 100,
          message: `YOLOv8 detector ready (${desc})`
        });
        useModelInitStore.getState().addLog('YOLOv8', `YOLOv8 initialized with [${ep.toUpperCase()}]: ${desc}`, 'success');

        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(payload);
        }
        return;
      }

      if (type === 'DETECTION_RESULT') {
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          if (payload?.error) {
            pending.resolve({ results: [], inferenceMs: 0, error: payload.error });
          } else {
            pending.resolve({ 
              results: payload.results || [], 
              inferenceMs: payload.inferenceMs || 0,
              preprocessMs: payload.preprocessMs,
              postprocessMs: payload.postprocessMs,
              executionProvider: payload.executionProvider,
              deviceAcceleration: payload.deviceAcceleration
            });
          }
        }
        return;
      }

      if (type === 'ERROR') {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          setError(payload?.error || 'YOLO worker error');
          setInitError(payload?.error || 'YOLO worker error');
          useModelInitStore.getState().updateSubsystem('yolo', {
            status: 'error',
            message: payload?.error || 'YOLO worker error'
          });
          useModelInitStore.getState().addLog('YOLOv8', `Error: ${payload?.error}`, 'error');
          pending.resolve({ results: [], inferenceMs: 0, error: payload?.error });
        }
        return;
      }

      if (type === 'PROGRESS') {
        if (payload) {
          useModelInitStore.getState().updateSubsystem('yolo', {
            status: payload.stage === 'ready' ? 'ready' : payload.stage === 'fallback' ? 'fallback' : payload.stage === 'compiling' ? 'compiling' : 'downloading',
            percent: payload.percent ?? 50,
            loadedBytes: payload.loadedBytes,
            totalBytes: payload.totalBytes,
            message: payload.message || 'Processing model...'
          });
          if (payload.message) {
            useModelInitStore.getState().addLog('YOLOv8', payload.message, payload.stage === 'ready' ? 'success' : 'info');
          }
        }
      }
    };

    console.log('[useYOLOWorker] Sending INIT to worker');
    const initMsgId = ++msgIdCounter;
    worker.postMessage({ 
      type: 'INIT', 
      payload: { 
        modelUrl: modelUrl || '/models/yolov8n.onnx',
        confidenceThreshold: 0.5,
        iouThreshold: 0.45,
        classNames: concepts || undefined
      }, 
      msgId: initMsgId
    });

    initTimeoutRef.current = setTimeout(() => {
      if (!workerRef.current) return;
      console.warn('[useYOLOWorker] Worker initialization timeout fallback');
      setInitError('Model initialization timeout - model may not be accessible');
      setError('Model initialization timeout');
      setReady(false);
    }, 60000);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve({ results: [], inferenceMs: 0 });
      });
      pendingRef.current.clear();
    };
  }, [modelUrl, concepts]);

  const detect = useCallback(async (
    frameInput: CapturedFrame | ImageData, 
    confidenceThreshold?: number, 
    iouThreshold?: number
  ): Promise<DetectionResultPayload> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready) {
        resolve({ results: [], inferenceMs: 0, error: 'YOLO worker not ready' });
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('[useYOLOWorker] YOLO detection request timed out, continuing gracefully');
          resolve({ results: [], inferenceMs: 0, error: 'YOLO detection timeout' });
        }
      }, 8000);

      pendingRef.current.set(msgId, {
        resolve,
        timeoutId
      });

      const isCapturedFrame = 'buffer' in frameInput && frameInput.buffer instanceof ArrayBuffer;
      const payload = isCapturedFrame 
        ? {
            buffer: frameInput.buffer,
            width: frameInput.width,
            height: frameInput.height,
            originalWidth: frameInput.originalWidth,
            originalHeight: frameInput.originalHeight,
            scale: frameInput.scale,
            offsetX: frameInput.offsetX,
            offsetY: frameInput.offsetY,
            confidenceThreshold,
            iouThreshold
          }
        : {
            imageData: frameInput,
            confidenceThreshold,
            iouThreshold
          };

      const transferables = (isCapturedFrame && frameInput.buffer) ? [frameInput.buffer] : [];

      worker.postMessage({ 
        type: 'DETECT', 
        payload, 
        msgId 
      }, transferables);
    });
  }, [ready]);

  const setConcepts = useCallback(async (concepts: string[]) => {
    return new Promise<void>((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready) {
        resolve();
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('[useYOLOWorker] Set concepts timeout');
          resolve();
        }
      }, 5000);

      pendingRef.current.set(msgId, {
        resolve: () => resolve(),
        timeoutId
      });

      worker.postMessage({ type: 'SET_CONCEPTS', payload: { concepts }, msgId });
    });
  }, [ready]);

  return { detect, setConcepts, ready, error: error || initError };
}

export function useYOLOWorldWorker(modelUrl?: string, concepts?: string[]) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useYOLOWorldWorker] Creating worker for:', modelUrl);
    const worker = new Worker(new URL('../workers/yoloWorldWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onerror = (err) => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      console.error('[useYOLOWorldWorker] Worker error:', err);
      setInitError(`Worker error: ${err.message}`);
      setError(`Worker error: ${err.message}`);
      setReady(false);

      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve({ results: [], inferenceMs: 0, error: err.message });
      });
      pendingRef.current.clear();
    };

    worker.onmessage = (event: MessageEvent<{ type: string; msgId: number; payload?: any }>) => {
      const { type, msgId, payload } = event.data;
      
      if (type === 'READY') {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        console.log('[useYOLOWorldWorker] Worker READY, clipLoaded:', payload?.clipLoaded);
        setReady(true);
        setError(null);
        setInitError(null);
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(payload);
        }
        return;
      }

      if (type === 'DETECTION_RESULT') {
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          if (payload?.error) {
            pending.resolve({ results: [], inferenceMs: 0, error: payload.error });
          } else {
            pending.resolve({ results: payload.results || [], inferenceMs: payload.inferenceMs || 0 });
          }
        }
        return;
      }

      if (type === 'ERROR') {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          const errMsg = payload?.error || 'YOLO-World worker error';
          setError(errMsg);
          setInitError(errMsg);
          pending.resolve({ results: [], inferenceMs: 0, error: errMsg });
        }
        return;
      }

      if (type === 'PROGRESS') {
        console.log('[YOLO-World Worker] Progress:', payload);
      }
    };

    console.log('[useYOLOWorldWorker] Sending INIT to worker');
    const initMsgId = ++msgIdCounter;
    worker.postMessage({ 
      type: 'INIT', 
      payload: { 
        modelUrl: modelUrl || '/models/yoloworld.onnx',
        confidenceThreshold: 0.3,
        iouThreshold: 0.45,
        concepts: concepts || undefined,
        clipModelUrl: '/models/clip_text_encoder.onnx'
      }, 
      msgId: initMsgId
    });

    initTimeoutRef.current = setTimeout(() => {
      if (!workerRef.current) return;
      console.warn('[useYOLOWorldWorker] Worker initialization timeout fallback');
      setInitError('Model initialization timeout - model may not be accessible');
      setError('Model initialization timeout');
      setReady(false);
    }, 60000);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve({ results: [], inferenceMs: 0 });
      });
      pendingRef.current.clear();
    };
  }, [modelUrl, concepts]);

  const detect = useCallback(async (
    frameInput: CapturedFrame | ImageData, 
    confidenceThreshold?: number, 
    iouThreshold?: number
  ): Promise<DetectionResultPayload> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready) {
        resolve({ results: [], inferenceMs: 0, error: 'YOLO-World worker not ready' });
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('[useYOLOWorldWorker] Detection timeout, continuing gracefully');
          resolve({ results: [], inferenceMs: 0, error: 'YOLO-World detection timeout' });
        }
      }, 10000);

      pendingRef.current.set(msgId, {
        resolve,
        timeoutId
      });

      const isCapturedFrame = 'buffer' in frameInput && frameInput.buffer instanceof ArrayBuffer;
      const payload = isCapturedFrame 
        ? {
            buffer: frameInput.buffer,
            width: frameInput.width,
            height: frameInput.height,
            originalWidth: frameInput.originalWidth,
            originalHeight: frameInput.originalHeight,
            scale: frameInput.scale,
            offsetX: frameInput.offsetX,
            offsetY: frameInput.offsetY,
            confidenceThreshold,
            iouThreshold
          }
        : {
            imageData: frameInput,
            confidenceThreshold,
            iouThreshold
          };

      const transferables = (isCapturedFrame && frameInput.buffer) ? [frameInput.buffer] : [];

      worker.postMessage({ 
        type: 'DETECT', 
        payload, 
        msgId 
      }, transferables);
    });
  }, [ready]);

  const setConcepts = useCallback(async (concepts: string[]) => {
    return new Promise<void>((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready) {
        resolve();
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('[useYOLOWorldWorker] Set concepts timeout');
          resolve();
        }
      }, 8000);

      pendingRef.current.set(msgId, {
        resolve: () => resolve(),
        timeoutId
      });

      worker.postMessage({ type: 'SET_CONCEPTS', payload: { concepts }, msgId });
    });
  }, [ready]);

  return { detect, setConcepts, ready, error: error || initError };
}

