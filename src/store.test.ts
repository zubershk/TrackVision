import { describe, it, expect, beforeEach } from 'vitest';
import { useVisionStore } from './store';
import type { FrameData, Telemetry } from './store';

const TELEMETRY: Telemetry = {
  fps: 30,
  inferenceMs: 10,
  preprocessMs: 1,
  postprocessMs: 1,
  trackingMs: 1,
  renderMs: 0,
  frameMs: 13,
  executionProvider: 'wasm',
  deviceAcceleration: 'test',
  latencyHistory: [],
  fpsHistory: [],
  droppedFrames: 0,
  totalProcessedFrames: 0
};

function frame(timestamp: number): FrameData {
  return {
    timestamp,
    tracks: [
      { id: 1, className: 'person', score: 0.9, bbox: [0, 0, 50, 50], state: 'CONFIRMED' }
    ]
  };
}

describe('useVisionStore', () => {
  beforeEach(() => {
    useVisionStore.getState().resetSession();
    useVisionStore.setState({ mode: 'landing' });
  });

  it('setMode switches between landing/loading/app', () => {
    const { setMode } = useVisionStore.getState();
    setMode('app');
    expect(useVisionStore.getState().mode).toBe('app');
    setMode('landing');
    expect(useVisionStore.getState().mode).toBe('landing');
  });

  it('addFrameData appends frames and updates track metadata', () => {
    const { addFrameData } = useVisionStore.getState();
    addFrameData(frame(1000), [{ id: 1, className: 'person', center: [25, 25], status: 'ACTIVE' }], TELEMETRY);

    const state = useVisionStore.getState();
    expect(state.frames).toHaveLength(1);
    expect(state.frames[0].timestamp).toBe(1000);
    expect(state.trackMeta.get(1)).toBeDefined();
    expect(state.trackMeta.get(1)!.className).toBe('person');
  });

  it('prunes frames older than the 5-minute history window', () => {
    const { addFrameData } = useVisionStore.getState();
    const maxHistory = useVisionStore.getState().maxHistoryMs;

    addFrameData(frame(0), [], TELEMETRY);                       // ancient
    addFrameData(frame(maxHistory - 1000), [], TELEMETRY);       // just inside window
    addFrameData(frame(maxHistory + 5000), [], TELEMETRY);       // newest

    const stamps = useVisionStore.getState().frames.map(f => f.timestamp);
    expect(stamps).not.toContain(0);
    expect(stamps).toContain(maxHistory - 1000);
    expect(stamps).toContain(maxHistory + 5000);
  });

  it('accumulates track history points for ghost trails', () => {
    const { addFrameData } = useVisionStore.getState();
    for (let i = 0; i < 5; i++) {
      addFrameData(
        frame(i * 33),
        [{ id: 1, className: 'person', center: [i * 10, 0], status: 'ACTIVE' }],
        TELEMETRY
      );
    }

    const meta = useVisionStore.getState().trackMeta.get(1)!;
    expect(meta.frameCount).toBeGreaterThanOrEqual(5);
    expect(meta.history.length).toBeGreaterThanOrEqual(5);
  });

  it('resetSession clears frames, track metadata and replay clock', () => {
    const { addFrameData } = useVisionStore.getState();
    addFrameData(frame(1000), [{ id: 1, className: 'person', center: [25, 25], status: 'ACTIVE' }], TELEMETRY);

    useVisionStore.getState().resetSession();
    const state = useVisionStore.getState();
    expect(state.frames).toHaveLength(0);
    expect(state.trackMeta.size).toBe(0);
    expect(state.events).toHaveLength(0);
    expect(state.isReplay).toBe(false);
  });
});
