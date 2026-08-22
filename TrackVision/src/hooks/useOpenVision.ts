import { useEffect, useRef, useState } from 'react';

export function useOpenVision() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const resolveMapRef = useRef<Map<number, (res: any) => void>>(new Map());
  const msgIdRef = useRef<number>(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/openVisionWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'STATUS') {
        setStatus(payload.status);
        if (payload.error) setError(payload.error);
      } else if (type === 'DETECTION_RESULT' || type === 'ERROR') {
        const { msgId } = payload;
        const resolve = resolveMapRef.current.get(msgId);
        if (resolve) {
          resolve(payload);
          resolveMapRef.current.delete(msgId);
        }
      }
    };

    worker.postMessage({ type: 'INITIALIZE', payload: {} });

    return () => {
      worker.terminate();
    };
  }, []);

  const detect = async (imageBlob: Blob, concepts: string[], threshold: number) => {
    if (!workerRef.current || status !== 'ready') return null;
    return new Promise<any>((resolve) => {
      const msgId = msgIdRef.current++;
      resolveMapRef.current.set(msgId, resolve);
      workerRef.current!.postMessage({ 
        type: 'DETECT', 
        payload: { imageBlob, concepts, threshold, msgId } 
      });
    });
  };

  return { status, error, detect };
}
