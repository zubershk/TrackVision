import { create } from 'zustand';
import { generateColor } from './lib/utils';

export type BBox = [number, number, number, number];

export type TrackStateType = 'TENTATIVE' | 'CONFIRMED' | 'DELETED';

export interface TrackData {
  id: number;
  className: string;
  score: number;
  bbox: BBox;
  state: TrackStateType;
}

export interface FrameData {
  timestamp: number;
  tracks: TrackData[];
}

export interface TrackMeta {
  id: number;
  className: string;
  firstSeen: number;
  lastSeen: number;
  duration: number;
  frameCount: number;
  status: 'ACTIVE' | 'LOST';
  color: string;
  history: { x: number, y: number, time: number }[];
  totalDistance: number;
  currentSpeed: number;
  bearing: number;
}

export type ExecutionProviderType = 'webgpu' | 'webnn' | 'webgl' | 'wasm';

export interface LatencySample {
  time: number;
  preprocess: number;
  inference: number;
  postprocess: number;
  tracking: number;
  render: number;
  total: number;
  fps: number;
}

export interface HardwareInfo {
  executionProvider: ExecutionProviderType;
  deviceAcceleration: string;
  webgpuSupported: boolean;
  webnnSupported: boolean;
  webglSupported: boolean;
  wasmSimdSupported: boolean;
  threads: number;
  memoryPoolMB?: number;
}

export interface Telemetry {
  fps: number;
  inferenceMs: number;
  preprocessMs: number;
  postprocessMs: number;
  trackingMs: number;
  renderMs: number;
  frameMs: number;
  executionProvider: ExecutionProviderType;
  deviceAcceleration: string;
  latencyHistory: LatencySample[];
  fpsHistory: number[];
  droppedFrames: number;
  totalProcessedFrames: number;
}

export interface TrackingMetrics {
  mota: number;
  motp: number;
  idf1: number;
  precision: number;
  recall: number;
  fp: number;
  fn: number;
  idSwaps: number;
  mostlyTracked: number;
  mostlyLost: number;
  partiallyTracked: number;
  fps: number;
  totalFrames: number;
  totalObjects: number;
}

export type EventType = 'TRACK_NEW' | 'TRACK_LOST' | 'TRACK_REACQUIRED' | 'SYSTEM';
export interface AppEvent {
  id: string;
  time: number;
  type: EventType;
  trackId?: number;
  message: string;
}

interface VisionState {
  mode: 'landing' | 'loading' | 'app';
  isTracking: boolean;
  isReplay: boolean;
  confidenceThreshold: number;
  sessionStartTime: number;
  currentTime: number;
  frames: FrameData[];
  trackMeta: Map<number, TrackMeta>;
  events: AppEvent[];
  telemetry: Telemetry;
  hardwareInfo: HardwareInfo;
  maxHistoryMs: number;
  visionMode: 'fast' | 'open';
  openConcepts: string[];
  activeTab: 'live' | 'tracks' | 'vision' | 'history' | 'scene' | 'settings' | 'performance';
  selectedTrackId: number | null;
  hoverTrackId: number | null;
  ghostMode: boolean;
  followMode: boolean;
  showSceneMap: boolean;
  showCommandPalette: boolean;
  trackingMetrics: TrackingMetrics | null;
  metricsEnabled: boolean;
  setMode: (mode: 'landing' | 'loading' | 'app') => void;
  setTracking: (isTracking: boolean) => void;
  setReplay: (isReplay: boolean, time?: number) => void;
  setCurrentTime: (time: number) => void;
  setConfidenceThreshold: (val: number) => void;
  addFrameData: (frame: FrameData, activeTracksInfo: { id: number, className: string, center: [number, number], status: 'NEW'|'ACTIVE'|'REACQUIRED'|'LOST', state?: TrackStateType }[], telemetry: Partial<Telemetry>) => void;
  setHardwareInfo: (info: Partial<HardwareInfo>) => void;
  selectTrack: (id: number | null) => void;
  setHoverTrack: (id: number | null) => void;
  toggleGhostMode: () => void;
  toggleFollowMode: () => void;
  toggleSceneMap: () => void;
  setCommandPalette: (open: boolean) => void;
  setActiveTab: (tab: 'live' | 'tracks' | 'vision' | 'history' | 'scene' | 'settings' | 'performance') => void;
  resetSession: () => void;
  setVisionMode: (mode: 'fast' | 'open') => void;
  setOpenConcepts: (concepts: string[]) => void;
}

const stateToString = (state: number): TrackStateType => {
  switch (state) {
    case 0: return 'TENTATIVE';
    case 1: return 'CONFIRMED';
    case 2: return 'DELETED';
    default: return 'TENTATIVE';
  }
};

export const useVisionStore = create<VisionState>((set, get) => ({
  mode: 'landing',
  isTracking: false,
  isReplay: false,
  confidenceThreshold: 0.5,
  sessionStartTime: 0,
  currentTime: 0,
  frames: [],
  trackMeta: new Map(),
  events: [],
  hardwareInfo: {
    executionProvider: 'wasm',
    deviceAcceleration: 'WASM SIMD',
    webgpuSupported: false,
    webnnSupported: false,
    webglSupported: true,
    wasmSimdSupported: true,
    threads: 2,
    memoryPoolMB: 32
  },
  telemetry: { 
    fps: 0, 
    inferenceMs: 0, 
    preprocessMs: 0,
    postprocessMs: 0,
    trackingMs: 0, 
    renderMs: 0, 
    frameMs: 0,
    executionProvider: 'wasm',
    deviceAcceleration: 'WASM SIMD (Vectorized)',
    latencyHistory: [],
    fpsHistory: [],
    droppedFrames: 0,
    totalProcessedFrames: 0
  },
  maxHistoryMs: 5 * 60 * 1000,
  visionMode: 'fast',
  openConcepts: ['laptop', 'phone', 'person'],
  activeTab: 'live',
  selectedTrackId: null,
  hoverTrackId: null,
  ghostMode: false,
  followMode: false,
  showSceneMap: true,
  showCommandPalette: false,
  trackingMetrics: null,
  metricsEnabled: false,

  setMode: (mode) => set({ mode }),
  setHardwareInfo: (info) => set((s) => ({ hardwareInfo: { ...s.hardwareInfo, ...info } })),
  setTracking: (isTracking) => {
    const isStarting = isTracking && !get().isTracking;
    if (isStarting) {
      const now = performance.now();
      set({ 
        isTracking, 
        sessionStartTime: now,
        currentTime: 0,
        frames: [],
        trackMeta: new Map(),
        events: [{ id: Math.random().toString(), time: 0, type: 'SYSTEM', message: 'Vision Pipeline Initialized' }]
      });
    } else {
      set({ isTracking });
    }
  },
  setReplay: (isReplay, time) => set({ isReplay, currentTime: time ?? get().currentTime }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),

  addFrameData: (frame, activeTracksInfo, rawTelemetry) => {
    set((state) => {
      const newFrames = [...state.frames, frame];
      const cutoffTime = frame.timestamp - state.maxHistoryMs;
      while (newFrames.length > 0 && newFrames[0].timestamp < cutoffTime) {
        newFrames.shift();
      }

      const prevTelemetry = state.telemetry;
      const inferenceMs = rawTelemetry.inferenceMs ?? prevTelemetry.inferenceMs;
      const preprocessMs = rawTelemetry.preprocessMs ?? prevTelemetry.preprocessMs;
      const postprocessMs = rawTelemetry.postprocessMs ?? prevTelemetry.postprocessMs;
      const trackingMs = rawTelemetry.trackingMs ?? prevTelemetry.trackingMs;
      const renderMs = rawTelemetry.renderMs ?? prevTelemetry.renderMs;
      const frameMs = rawTelemetry.frameMs ?? (preprocessMs + inferenceMs + postprocessMs + trackingMs + renderMs);
      const fps = rawTelemetry.fps ?? prevTelemetry.fps;
      const executionProvider = rawTelemetry.executionProvider ?? prevTelemetry.executionProvider;
      const deviceAcceleration = rawTelemetry.deviceAcceleration ?? prevTelemetry.deviceAcceleration;

      const newSample: LatencySample = {
        time: frame.timestamp,
        preprocess: parseFloat(preprocessMs.toFixed(1)),
        inference: parseFloat(inferenceMs.toFixed(1)),
        postprocess: parseFloat(postprocessMs.toFixed(1)),
        tracking: parseFloat(trackingMs.toFixed(1)),
        render: parseFloat(renderMs.toFixed(1)),
        total: parseFloat(frameMs.toFixed(1)),
        fps: parseFloat(fps.toFixed(1))
      };

      const latencyHistory = [...prevTelemetry.latencyHistory, newSample];
      if (latencyHistory.length > 60) latencyHistory.shift();

      const fpsHistory = [...prevTelemetry.fpsHistory, fps];
      if (fpsHistory.length > 60) fpsHistory.shift();

      const totalProcessedFrames = prevTelemetry.totalProcessedFrames + 1;
      const droppedFrames = frameMs > 33.3 ? prevTelemetry.droppedFrames + 1 : prevTelemetry.droppedFrames;

      const nextTelemetry: Telemetry = {
        fps,
        inferenceMs,
        preprocessMs,
        postprocessMs,
        trackingMs,
        renderMs,
        frameMs,
        executionProvider,
        deviceAcceleration,
        latencyHistory,
        fpsHistory,
        droppedFrames,
        totalProcessedFrames
      };

      const newTrackMeta = new Map(state.trackMeta);
      const newEvents = [...state.events];

      for (const info of activeTracksInfo) {
        let meta = newTrackMeta.get(info.id);
        
        if (!meta) {
          meta = {
            id: info.id,
            className: info.className,
            firstSeen: frame.timestamp,
            lastSeen: frame.timestamp,
            duration: 0,
            frameCount: 1,
            status: 'ACTIVE',
            color: generateColor(info.id),
            history: [{ x: info.center[0], y: info.center[1], time: frame.timestamp }],
            totalDistance: 0,
            currentSpeed: 0,
            bearing: 0
          };
          newEvents.unshift({ id: Math.random().toString(), time: frame.timestamp, type: 'TRACK_NEW', trackId: info.id, message: `Track #${info.id} (${info.className}) Acquired` });
        } else {
          const lastPos = meta.history[meta.history.length - 1];
          const dx = info.center[0] - lastPos.x;
          const dy = info.center[1] - lastPos.y;
          const dt = frame.timestamp - lastPos.time;
          const dist = Math.hypot(dx, dy);

          const rawSpeed = dt > 0 ? (dist / dt) * 1000 : 0;
          const newBearing = dist > 1 ? Math.atan2(dy, dx) * (180 / Math.PI) : meta.bearing;

          meta = { ...meta };
          meta.lastSeen = frame.timestamp;
          meta.duration = frame.timestamp - meta.firstSeen;
          meta.frameCount += 1;
          meta.totalDistance += dist;
          meta.currentSpeed = meta.currentSpeed * 0.8 + rawSpeed * 0.2;
          meta.bearing = newBearing;
          meta.history = [...meta.history, { x: info.center[0], y: info.center[1], time: frame.timestamp }];
          if (meta.history.length > 300) {
            meta.history.shift();
          }
          
          if (meta.status === 'LOST') {
            meta.status = 'ACTIVE';
            newEvents.unshift({ id: Math.random().toString(), time: frame.timestamp, type: 'TRACK_REACQUIRED', trackId: info.id, message: `Track #${info.id} Reacquired` });
          }
        }
        newTrackMeta.set(info.id, meta);
      }

      const currentTrackIds = new Set(activeTracksInfo.map(t => t.id));
      for (const [id, meta] of newTrackMeta.entries()) {
        if (!currentTrackIds.has(id) && meta.status === 'ACTIVE') {
          const updatedMeta = { ...meta, status: 'LOST' as const };
          newTrackMeta.set(id, updatedMeta);
          newEvents.unshift({ id: Math.random().toString(), time: frame.timestamp, type: 'TRACK_LOST', trackId: id, message: `Track #${id} Lost` });
        }
      }

      if (newEvents.length > 50) newEvents.length = 50;

      return {
        frames: newFrames,
        trackMeta: newTrackMeta,
        events: newEvents,
        telemetry: nextTelemetry,
        currentTime: state.isReplay ? state.currentTime : frame.timestamp
      };
    });
  },

  selectTrack: (selectedTrackId) => set({ selectedTrackId }),
  setHoverTrack: (hoverTrackId) => set({ hoverTrackId }),
  toggleGhostMode: () => set((s) => ({ ghostMode: !s.ghostMode })),
  toggleFollowMode: () => set((s) => ({ followMode: !s.followMode })),
  toggleSceneMap: () => set((s) => ({ showSceneMap: !s.showSceneMap })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  setVisionMode: (visionMode) => set({ visionMode }),
  setOpenConcepts: (openConcepts) => set({ openConcepts }),
  setTrackingMetrics: (metrics: TrackingMetrics | null) => set({ trackingMetrics: metrics }),
  setMetricsEnabled: (enabled: boolean) => set({ metricsEnabled: enabled }),
  resetSession: () => set({
    frames: [], trackMeta: new Map(), events: [], currentTime: 0, isReplay: false, sessionStartTime: performance.now(), trackingMetrics: null
  })
}));