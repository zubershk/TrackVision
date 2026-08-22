import { useRef, useEffect, useCallback, useState } from 'react';
import { useModelInitStore } from '../store/modelInitStore';

interface ReIDMessage {
  type: 'INIT' | 'EXTRACT' | 'EXTRACT_BATCH';
  payload?: any;
  msgId: number;
}

interface ReIDResponse {
  type: 'READY' | 'EMBEDDING' | 'EMBEDDINGS_BATCH' | 'ERROR' | 'PROGRESS' | 'FALLBACK';
  msgId: number;
  payload?: any;
}

let msgIdCounter = 0;

interface PendingRequest {
  resolve: (payload: any) => void;
  timeoutId: any;
}

export function useReIDWorker(modelUrl?: string) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const batchPendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useReIDWorker] Creating worker');
    useModelInitStore.getState().updateSubsystem('reid', {
      status: 'downloading',
      percent: 15,
      message: 'Initializing OSNet ReID worker thread...'
    });
    useModelInitStore.getState().addLog('OSNet ReID', 'Spawning ReID feature extraction worker thread...', 'info');

    const worker = new Worker(new URL('../workers/reidWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onerror = (err) => {
      console.error('[useReIDWorker] Worker error:', err);
      setError(`Worker error: ${err.message}`);
      setReady(false);
      useModelInitStore.getState().updateSubsystem('reid', {
        status: 'fallback',
        percent: 100,
        message: 'ReID spatial embedding fallback active'
      });
      useModelInitStore.getState().addLog('OSNet ReID', 'Worker using spatial color embedding fallback', 'warn');

      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve(new Float32Array(512));
      });
      pendingRef.current.clear();
      batchPendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve([]);
      });
      batchPendingRef.current.clear();
    };

    worker.onmessage = (event: MessageEvent<{ type: string; msgId: number; payload?: any }>) => {
      const { type, msgId, payload } = event.data;
      
      if (type === 'READY') {
        console.log('[useReIDWorker] Worker READY, lazy:', payload?.lazy);
        setReady(true);
        setLoading(false);
        useModelInitStore.getState().updateSubsystem('reid', {
          status: 'ready',
          percent: 100,
          message: 'OSNet ReID appearance embedding engine active'
        });
        useModelInitStore.getState().addLog('OSNet ReID', 'Appearance feature extractor ready', 'success');

        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(payload);
        }
        return;
      }

      if (type === 'FALLBACK') {
        console.log('[useReIDWorker] Worker using fallback');
        setReady(true);
        setLoading(false);
        useModelInitStore.getState().updateSubsystem('reid', {
          status: 'fallback',
          percent: 100,
          message: 'Spatial appearance embedding fallback active'
        });
        useModelInitStore.getState().addLog('OSNet ReID', 'ReID appearance fallback ready', 'info');

        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(payload);
        }
        return;
      }

      if (type === 'PROGRESS') {
        if (payload) {
          useModelInitStore.getState().updateSubsystem('reid', {
            status: payload.stage === 'ready' ? 'ready' : payload.stage === 'fallback' ? 'fallback' : payload.stage === 'compiling' ? 'compiling' : 'downloading',
            percent: payload.percent ?? 60,
            message: payload.message || 'Processing ReID model...'
          });
          if (payload.message) {
            useModelInitStore.getState().addLog('OSNet ReID', payload.message, payload.stage === 'ready' ? 'success' : 'info');
          }
        }
        return;
      }

      if (type === 'EMBEDDING') {
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(payload.embedding);
        }
        return;
      }

      if (type === 'EMBEDDINGS_BATCH') {
        if (msgId && batchPendingRef.current.has(msgId)) {
          const pending = batchPendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          batchPendingRef.current.delete(msgId);
          pending.resolve(payload.embeddings);
        }
        return;
      }

      if (type === 'ERROR') {
        if (msgId && pendingRef.current.has(msgId)) {
          const pending = pendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msgId);
          pending.resolve(new Float32Array(512));
        }
        if (msgId && batchPendingRef.current.has(msgId)) {
          const pending = batchPendingRef.current.get(msgId)!;
          clearTimeout(pending.timeoutId);
          batchPendingRef.current.delete(msgId);
          pending.resolve([]);
        }
        setError(payload?.error || 'ReID worker error');
        useModelInitStore.getState().updateSubsystem('reid', {
          status: 'fallback',
          percent: 100,
          message: 'Fallback embedding mode'
        });
        return;
      }
    };

    const initMsgId = ++msgIdCounter;
    worker.postMessage({ type: 'INIT', payload: { modelUrl: modelUrl || '/models/osnet_x1_0.onnx' }, msgId: initMsgId });

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve(new Float32Array(512));
      });
      pendingRef.current.clear();
      batchPendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve([]);
      });
      batchPendingRef.current.clear();
    };
  }, [modelUrl]);

  const extract = useCallback(async (imageData: ImageData, bbox: [number, number, number, number]): Promise<Float32Array> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready) {
        resolve(new Float32Array(512));
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('[useReIDWorker] Extraction timeout');
          resolve(new Float32Array(512));
        }
      }, 8000);

      pendingRef.current.set(msgId, { resolve, timeoutId });
      worker.postMessage({ type: 'EXTRACT', payload: { imageData, bbox }, msgId });
    });
  }, [ready]);

  const extractBatch = useCallback(async (imageData: ImageData, bboxes: [number, number, number, number][]): Promise<Float32Array[]> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker || !ready || bboxes.length === 0) {
        resolve(bboxes.map(() => new Float32Array(512)));
        return;
      }
      const msgId = ++msgIdCounter;

      const timeoutId = setTimeout(() => {
        if (batchPendingRef.current.has(msgId)) {
          batchPendingRef.current.delete(msgId);
          console.warn('[useReIDWorker] Batch extraction timeout');
          resolve(bboxes.map(() => new Float32Array(512)));
        }
      }, 8000);

      batchPendingRef.current.set(msgId, { resolve, timeoutId });
      worker.postMessage({ type: 'EXTRACT_BATCH', payload: { imageData, bboxes }, msgId });
    });
  }, [ready]);

  return { extract, extractBatch, ready, loading, error };
}