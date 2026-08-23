import { useRef, useEffect, useCallback } from 'react';
import { Detection } from '../lib/tracker';
import { useModelInitStore } from '../store/modelInitStore';

interface TrackResult {
  id: number;
  bbox: [number, number, number, number];
  score: number;
  className: string;
  state: number;
  status: number;
  center: [number, number];
  velocity: [number, number];
}

interface TrackerWorkerMessage {
  type: 'INIT' | 'UPDATE' | 'RESET' | 'GET_CONFIG';
  payload?: any;
  msgId: number;
}

interface TrackerWorkerResponse {
  type: 'READY' | 'TRACKS' | 'RESET_DONE' | 'CONFIG' | 'ERROR' | 'PROGRESS';
  msgId: number;
  payload?: any;
}

let msgIdCounter = 0;

interface PendingRequest {
  resolve: (payload: any) => void;
  timeoutId: any;
}

export function useTrackerWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const readyRef = useRef(false);

  useEffect(() => {
    useModelInitStore.getState().updateSubsystem('tracker', {
      status: 'downloading',
      percent: 30,
      message: 'Initializing ByteTrack Kalman worker...'
    });
    useModelInitStore.getState().addLog('ByteTrack', 'Spawning tracker worker thread...', 'info');

    const worker = new Worker(new URL('../workers/trackerWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onerror = (err) => {
      console.error('Tracker worker error:', err);
      useModelInitStore.getState().addLog('ByteTrack', `Worker error: ${err.message}`, 'error');
      
      // Resolve all pending gracefully to avoid blocking
      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve([]);
      });
      pendingRef.current.clear();
    };

    worker.onmessage = (event: MessageEvent<TrackerWorkerResponse>) => {
      const { type, msgId, payload } = event.data;
      if (msgId && pendingRef.current.has(msgId)) {
        const pending = pendingRef.current.get(msgId)!;
        clearTimeout(pending.timeoutId);
        pendingRef.current.delete(msgId);
        if (type === 'ERROR') {
          pending.resolve({ error: payload?.error });
        } else {
          pending.resolve(payload ?? { status: 'ready' });
        }
      }
      if (type === 'READY') {
        readyRef.current = true;
        useModelInitStore.getState().updateSubsystem('tracker', {
          status: 'ready',
          percent: 100,
          message: 'ByteTrack association & Kalman filters ready'
        });
        useModelInitStore.getState().addLog('ByteTrack', 'Tracker initialized with Hungarian matcher', 'success');
      }
      if (type === 'PROGRESS' && payload) {
        useModelInitStore.getState().updateSubsystem('tracker', {
          status: payload.stage === 'ready' ? 'ready' : 'compiling',
          percent: payload.percent ?? 100,
          message: payload.message || 'Configuring ByteTrack...'
        });
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
      pendingRef.current.forEach(({ resolve, timeoutId }) => {
        clearTimeout(timeoutId);
        resolve({ status: 'ready' });
      });
      pendingRef.current.clear();
    };
  }, []);

  const sendMessage = useCallback(<T,>(type: TrackerWorkerMessage['type'], payload?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        // Worker is tearing down or restarting (e.g. StrictMode remount).
        // Resolve gracefully so the frame loop drops this frame instead of
        // throwing — mirrors the timeout behavior below.
        if (type === 'INIT') {
          resolve({ status: 'ready' } as T);
        } else if (type === 'UPDATE') {
          // update() unwraps result.tracks — must match the worker's response shape
          resolve({ tracks: [] } as unknown as T);
        } else {
          resolve(null as T);
        }
        return;
      }
      const msgId = ++msgIdCounter;
      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(msgId)) {
          pendingRef.current.delete(msgId);
          console.warn('Tracker worker timeout for type:', type);
          if (type === 'INIT') {
            resolve({ status: 'ready' } as T);
          } else if (type === 'UPDATE') {
            resolve({ tracks: [] } as unknown as T);
          } else {
            resolve(null as T);
          }
        }
      }, 5000);

      pendingRef.current.set(msgId, { resolve, timeoutId });
      worker.postMessage({ type, payload, msgId });
    });
  }, []);

  const initialize = useCallback(async (config?: {
    trackThresh?: number;
    matchThresh?: number;
    maxTimeLost?: number;
    useHungarian?: boolean;
    embeddingWeight?: number;
  }) => {
    await sendMessage('INIT', { config });
  }, [sendMessage]);

  const update = useCallback(async (detections: Detection[]): Promise<TrackResult[]> => {
    const result = await sendMessage<{ tracks: TrackResult[] } | { error: string }>('UPDATE', { detections });
    if ('error' in result) throw new Error(result.error);
    return result.tracks;
  }, [sendMessage]);

  const reset = useCallback(async () => {
    await sendMessage('RESET');
  }, [sendMessage]);

  const getConfig = useCallback(async () => {
    return sendMessage('GET_CONFIG');
  }, [sendMessage]);

  const isReady = readyRef.current;

  return { initialize, update, reset, getConfig, isReady };
}