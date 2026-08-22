import { create } from 'zustand';

export type SubsystemId = 'yolo' | 'yoloworld' | 'reid' | 'tracker' | 'pipeline';
export type SubsystemStatus = 'idle' | 'downloading' | 'compiling' | 'ready' | 'fallback' | 'error';

export interface SubsystemProgress {
  id: SubsystemId;
  name: string;
  category: string;
  status: SubsystemStatus;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  message: string;
  details?: string;
  executionProvider?: string;
  updatedAt: number;
}

export interface InitLog {
  id: string;
  timestamp: number;
  source: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

interface ModelInitState {
  isOpen: boolean;
  isMinimized: boolean;
  isFullyReady: boolean;
  hasStarted: boolean;
  isBootingSequence: boolean;
  bootThought: string;
  autoDismissCount: number | null;
  subsystems: Record<SubsystemId, SubsystemProgress>;
  logs: InitLog[];
  overallProgress: number; // 0 - 100
  
  // Actions
  openOverlay: () => void;
  closeOverlay: () => void;
  toggleMinimize: () => void;
  updateSubsystem: (id: SubsystemId, update: Partial<SubsystemProgress>) => void;
  addLog: (source: string, message: string, level?: 'info' | 'success' | 'warn' | 'error') => void;
  dismissManually: () => void;
  resetProgress: () => void;
  triggerBootSequence: (onComplete?: () => void) => void;
}

const initialSubsystems: Record<SubsystemId, SubsystemProgress> = {
  yolo: {
    id: 'yolo',
    name: 'YOLOv8 Object Detector',
    category: 'Neural Detection Engine',
    status: 'idle',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 6449493,
    message: 'Waiting for detector initialization...',
    executionProvider: 'WASM SIMD',
    updatedAt: Date.now()
  },
  reid: {
    id: 'reid',
    name: 'OSNet ReID Feature Extractor',
    category: 'Appearance Embedding',
    status: 'idle',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: 'Waiting for ReID pipeline...',
    executionProvider: 'WASM / Spatial Fallback',
    updatedAt: Date.now()
  },
  tracker: {
    id: 'tracker',
    name: 'ByteTrack Association Engine',
    category: 'Kalman & Hungarian Matcher',
    status: 'idle',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: 'Waiting for tracker configuration...',
    executionProvider: 'Web Worker Thread',
    updatedAt: Date.now()
  },
  yoloworld: {
    id: 'yoloworld',
    name: 'YOLO-World Zero-Shot Model',
    category: 'Open-Vocabulary Vision',
    status: 'idle',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: 'Standby mode for open vocabulary',
    executionProvider: 'WASM SIMD',
    updatedAt: Date.now()
  },
  pipeline: {
    id: 'pipeline',
    name: 'Vision Stream & Offscreen Buffer',
    category: 'Hardware Acceleration',
    status: 'idle',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: 'Allocating WebGL / 2D Canvas buffers...',
    executionProvider: 'OffscreenCanvas',
    updatedAt: Date.now()
  }
};

export const useModelInitStore = create<ModelInitState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  isFullyReady: false,
  hasStarted: false,
  isBootingSequence: false,
  bootThought: 'Engines ready • TrackVision neural core online',
  autoDismissCount: null,
  subsystems: initialSubsystems,
  logs: [
    {
      id: 'init-0',
      timestamp: Date.now(),
      source: 'System',
      message: 'Initializing TrackVision AI runtime & ONNX worker threads...',
      level: 'info'
    }
  ],
  overallProgress: 0,

  openOverlay: () => set({ isOpen: true, isMinimized: false }),
  closeOverlay: () => set({ isOpen: false }),
  toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized, isOpen: true })),
  
  dismissManually: () => set({ isOpen: false }),

  triggerBootSequence: (onComplete) => {
    const thoughts = [
      'Calibrating optical matrix [1280x720]...',
      'Allocating neural tensors in Web Worker...',
      'Scanning visual stream: You will be detected.',
      'Locking coordinates • Neural tracker online.'
    ];

    set({ isBootingSequence: true, bootThought: thoughts[0] });

    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index < thoughts.length) {
        set({ bootThought: thoughts[index] });
      } else {
        clearInterval(interval);
        setTimeout(() => {
          set({ isBootingSequence: false });
          if (onComplete) onComplete();
        }, 400);
      }
    }, 450);
  },

  updateSubsystem: (id, update) => {
    set((state) => {
      const current = state.subsystems[id] || initialSubsystems[id];
      const updated: SubsystemProgress = {
        ...current,
        ...update,
        updatedAt: Date.now()
      };

      const newSubsystems = {
        ...state.subsystems,
        [id]: updated
      };

      // Calculate weighted overall progress
      // YOLOv8: 50%, ReID: 25%, Tracker: 15%, Pipeline: 10%
      const yoloScore = (newSubsystems.yolo.percent || 0) * 0.50;
      const reidScore = (newSubsystems.reid.percent || 0) * 0.25;
      const trackerScore = (newSubsystems.tracker.percent || 0) * 0.15;
      const pipelineScore = (newSubsystems.pipeline.percent || 0) * 0.10;

      const overall = Math.min(100, Math.round(yoloScore + reidScore + trackerScore + pipelineScore));

      const isYoloReady = newSubsystems.yolo.status === 'ready' || newSubsystems.yolo.status === 'fallback';
      const isReidReady = newSubsystems.reid.status === 'ready' || newSubsystems.reid.status === 'fallback';
      const isTrackerReady = newSubsystems.tracker.status === 'ready';
      const isPipelineReady = newSubsystems.pipeline.status === 'ready';

      const isFullyReady = isYoloReady && isReidReady && isTrackerReady;

      return {
        subsystems: newSubsystems,
        overallProgress: isFullyReady ? 100 : overall,
        isFullyReady,
        hasStarted: true
      };
    });
  },

  addLog: (source, message, level = 'info') => {
    set((state) => {
      const newLog: InitLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        source,
        message,
        level
      };
      // Keep last 60 logs
      const updatedLogs = [newLog, ...state.logs].slice(0, 60);
      return { logs: updatedLogs };
    });
  },

  resetProgress: () => set({
    subsystems: initialSubsystems,
    overallProgress: 0,
    isFullyReady: false,
    isOpen: true,
    isMinimized: false
  })
}));
