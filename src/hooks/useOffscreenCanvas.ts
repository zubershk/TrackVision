import { useRef, useEffect, useCallback, useState } from 'react';

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

export function useOffscreenCanvas(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      canvasRef.current = canvas;
      contextRef.current = canvas.getContext('2d', { willReadFrequently: true });
      setReady(true);
    } catch (err) {
      setError('Canvas creation failed: ' + String(err));
    }
  }, []);

  const captureFrame = useCallback((targetW = 640, targetH = 640): CapturedFrame | null => {
    const videoEl = videoRef.current;
    if (!ready || !contextRef.current || !canvasRef.current || !videoEl) return null;
    if (videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return null;

    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const srcW = videoEl.videoWidth;
    const srcH = videoEl.videoHeight;
    const scale = Math.min(targetW / srcW, targetH / srcH);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const offsetX = Math.floor((targetW - drawW) / 2);
    const offsetY = Math.floor((targetH - drawH) / 2);

    // Fill letterbox border with standard neutral padding (114/255)
    ctx.fillStyle = '#727272';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(videoEl, 0, 0, srcW, srcH, offsetX, offsetY, drawW, drawH);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);

    return {
      buffer: imgData.data.buffer as ArrayBuffer,
      data: imgData.data,
      width: targetW,
      height: targetH,
      originalWidth: srcW,
      originalHeight: srcH,
      scale,
      offsetX,
      offsetY
    };
  }, [ready, videoRef]);

  return { ready, error, captureFrame };
}
