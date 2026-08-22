import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Detection, TrackState, TrackStatus } from '../lib/tracker';
import { useVisionStore, TrackStateType } from '../store';
import { useYOLOWorker } from './useYOLOWorker';
import { useYOLOWorldWorker } from './useYOLOWorker';
import { useReIDWorker } from './useReIDWorker';
import { useTrackerWorker } from './useTrackerWorker';
import { useOffscreenCanvas } from './useOffscreenCanvas';
import { getIoU } from '../lib/matching';
import { useModelInitStore } from '../store/modelInitStore';

function applyClassAwareNMS(detections: Detection[], iouThreshold: number = 0.45): Detection[] {
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

export function useVisionEngine(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState('');
  const [clipModelLoading, setClipModelLoading] = useState(false);
  const [reidModelLoading, setReidModelLoading] = useState(false);
  
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const trackerInitializedRef = useRef(false);
  const lastFrameRef = useRef<ImageData | null>(null);
  const clipModelInitializedRef = useRef(false);
  const reidModelInitializedRef = useRef(false);

  const { 
    detect: yoloDetect, 
    ready: yoloReady, 
    error: yoloError,
    setConcepts: setYOLOConcepts 
  } = useYOLOWorker('/models/yolov8n.onnx');
  
  const { 
    detect: yoloWorldDetect, 
    ready: yoloWorldReady, 
    error: yoloWorldError,
    setConcepts: setYOLOWorldConcepts 
  } = useYOLOWorldWorker('/models/yoloworld.onnx');
  
  const { extractBatch, ready: reidReady } = useReIDWorker();
  const { ready: canvasReady, captureFrame } = useOffscreenCanvas(videoRef);
  const { initialize: initTracker, update: updateTracker, reset: resetTracker } = useTrackerWorker();
  const isDetectingRef = useRef(false);

  const isTracking = useVisionStore(s => s.isTracking);
  const isReplay = useVisionStore(s => s.isReplay);
  const confidenceThreshold = useVisionStore(s => s.confidenceThreshold);
  const sessionStartTime = useVisionStore(s => s.sessionStartTime);
  const addFrameData = useVisionStore(s => s.addFrameData);
  const visionMode = useVisionStore(s => s.visionMode);
  const openConcepts = useVisionStore(s => s.openConcepts);

  useEffect(() => {
    if (canvasReady) {
      useModelInitStore.getState().updateSubsystem('pipeline', {
        status: 'ready',
        percent: 100,
        message: 'Offscreen video rendering & canvas buffer ready'
      });
      useModelInitStore.getState().addLog('Pipeline', 'Hardware offscreen canvas stream bound', 'success');
    } else {
      useModelInitStore.getState().updateSubsystem('pipeline', {
        status: 'downloading',
        percent: 60,
        message: 'Awaiting video element stream binding...'
      });
    }
  }, [canvasReady]);

  useEffect(() => {
    async function loadModel() {
      try {
        useModelInitStore.getState().updateSubsystem('tracker', {
          status: 'compiling',
          percent: 50,
          message: 'Configuring tracker parameters...'
        });
        await initTracker({
          trackThresh: Math.min(confidenceThreshold, 0.4),
          matchThresh: 0.7,
          maxTimeLost: 30,
          useHungarian: true,
          embeddingWeight: 0.3
        });
        trackerInitializedRef.current = true;
        setIsModelLoading(false);
        useModelInitStore.getState().updateSubsystem('tracker', {
          status: 'ready',
          percent: 100,
          message: 'ByteTrack association & Kalman filters ready'
        });
      } catch (err) {
        console.error('Error loading model:', err);
        setModelError('Failed to initialize computer vision model.');
        useModelInitStore.getState().updateSubsystem('tracker', {
          status: 'error',
          message: 'Tracker initialization error'
        });
        useModelInitStore.getState().addLog('ByteTrack', `Tracker initialization error: ${String(err)}`, 'error');
      }
    }
    loadModel();
  }, [initTracker, confidenceThreshold]);

  useEffect(() => {
    if (trackerInitializedRef.current) {
      initTracker({ trackThresh: Math.min(confidenceThreshold, 0.4), matchThresh: 0.7 });
    }
  }, [confidenceThreshold, initTracker]);

  // Lazy load CLIP model when open mode is activated with concepts
  useEffect(() => {
    if (visionMode === 'open' && openConcepts.length > 0 && !clipModelInitializedRef.current) {
      clipModelInitializedRef.current = true;
      setClipModelLoading(true);
      setYOLOWorldConcepts(openConcepts).finally(() => {
        setClipModelLoading(false);
      });
    }
  }, [visionMode, openConcepts, setYOLOWorldConcepts]);

  const processFrame = useCallback(async () => {
    const state = useVisionStore.getState();
    if (!state.isTracking || state.isReplay || !videoRef.current || !trackerInitializedRef.current) return;
    
    if (state.visionMode === 'fast' && !yoloReady) return;
    if (state.visionMode === 'open' && !yoloWorldReady) return;
    if (isDetectingRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      if (state.isTracking && !state.isReplay) {
        requestRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const frame = captureFrame(640, 640);
    if (!frame) {
      if (state.isTracking && !state.isReplay) {
        requestRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    isDetectingRef.current = true;
    const frameStart = performance.now();
    let detections: Detection[] = [];
    let inferenceMs = 0;
    let preprocessMs = 0;
    let postprocessMs = 0;
    let executionProvider = useVisionStore.getState().hardwareInfo.executionProvider;
    let deviceAcceleration = useVisionStore.getState().hardwareInfo.deviceAcceleration;

    try {
      if (state.visionMode === 'fast') {
        const result = await yoloDetect(frame, confidenceThreshold);
        inferenceMs = result.inferenceMs;
        preprocessMs = result.preprocessMs || 0;
        postprocessMs = result.postprocessMs || 0;
        if (result.executionProvider) executionProvider = result.executionProvider;
        if (result.deviceAcceleration) deviceAcceleration = result.deviceAcceleration;
        detections = result.results;
      } else {
        const result = await yoloWorldDetect(
          frame as any, 
          confidenceThreshold
        );
        inferenceMs = result.inferenceMs;
        preprocessMs = result.preprocessMs || 0;
        postprocessMs = result.postprocessMs || 0;
        if (result.executionProvider) executionProvider = result.executionProvider;
        if (result.deviceAcceleration) deviceAcceleration = result.deviceAcceleration;
        detections = result.results;
      }

      detections = applyClassAwareNMS(detections);

      const trackingStart = performance.now();
      const activeTracks = await updateTracker(detections);
      const trackingMs = performance.now() - trackingStart;

      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      let fps = useVisionStore.getState().telemetry.fps;

      if (elapsed >= 500) {
        fps = parseFloat(((frameCountRef.current * 1000) / elapsed).toFixed(1));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const frameMs = performance.now() - frameStart;
      const timestamp = now - sessionStartTime;
      
      const stateToString = (state: number): TrackStateType => {
        switch (state) {
          case 0: return 'TENTATIVE';
          case 1: return 'CONFIRMED';
          case 2: return 'DELETED';
          default: return 'TENTATIVE';
        }
      };

      const statusToString = (status: number): 'NEW' | 'TRACKED' | 'LOST' | 'REMOVED' => {
        switch (status) {
          case 0: return 'NEW';
          case 1: return 'TRACKED';
          case 2: return 'LOST';
          case 3: return 'REMOVED';
          default: return 'NEW';
        }
      };
      
      const tracksData = activeTracks.map(t => ({
        id: t.id,
        className: t.className,
        score: t.score,
        bbox: t.bbox,
        state: stateToString(t.state),
        status: statusToString(t.status)
      }));

      const activeTracksInfo = activeTracks.map(t => ({
        id: t.id,
        className: t.className,
        center: t.center,
        status: 'ACTIVE' as const,
        state: stateToString(t.state),
        statusTrack: statusToString(t.status)
      }));

      addFrameData(
        { timestamp, tracks: tracksData },
        activeTracksInfo,
        { 
          fps, 
          inferenceMs, 
          preprocessMs,
          postprocessMs,
          trackingMs, 
          renderMs: 0, 
          frameMs,
          executionProvider,
          deviceAcceleration
        }
      );
    } catch (err) {
      console.error('Frame processing failed:', err);
    } finally {
      isDetectingRef.current = false;
      if (useVisionStore.getState().isTracking && !useVisionStore.getState().isReplay) {
        requestRef.current = requestAnimationFrame(processFrame);
      }
    }
  }, [videoRef, sessionStartTime, addFrameData, yoloDetect, yoloWorldDetect, updateTracker, yoloReady, yoloWorldReady, captureFrame, confidenceThreshold]);

  useEffect(() => {
    if (isTracking && !isReplay && (visionMode === 'fast' ? yoloReady : yoloWorldReady)) {
      lastTimeRef.current = performance.now();
      frameCountRef.current = 0;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = requestAnimationFrame(processFrame);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isTracking, isModelLoading, isReplay, processFrame, visionMode, yoloReady, yoloWorldReady]);

  const isLoading = visionMode === 'fast' ? !yoloReady : (!yoloWorldReady || clipModelLoading);
  const error = visionMode === 'fast' ? yoloError : yoloWorldError;
  return { 
    isModelLoading: isLoading, 
    modelError: error || modelError,
    clipModelLoading,
    reidModelLoading
  };
}