import React, { useState, useEffect } from 'react';
import { useModelInitStore } from '../store/modelInitStore';
import { useVisionStore } from '../store';
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function useBrailleSpinner(speedMs: number = 80) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % BRAILLE_FRAMES.length);
    }, speedMs);
    return () => clearInterval(timer);
  }, [speedMs]);

  return BRAILLE_FRAMES[frameIndex];
}

interface EngineThinkingStreamProps {
  variant?: 'pill' | 'standby' | 'boot' | 'liveHud';
  className?: string;
  onStartTracking?: () => void;
}

export function EngineThinkingStream({ variant = 'pill', className, onStartTracking }: EngineThinkingStreamProps) {
  const spinner = useBrailleSpinner(75);
  const isFullyReady = useModelInitStore((s) => s.isFullyReady);
  const overallProgress = useModelInitStore((s) => s.overallProgress);
  const isBooting = useModelInitStore((s) => s.isBootingSequence);
  const bootThought = useModelInitStore((s) => s.bootThought);
  const subsystems = useModelInitStore((s) => s.subsystems);
  const logs = useModelInitStore((s) => s.logs);

  const isTracking = useVisionStore((s) => s.isTracking);
  const frames = useVisionStore((s) => s.frames);
  const telemetry = useVisionStore((s) => s.telemetry);

  const [showLogsDrawer, setShowLogsDrawer] = useState(false);

  // Active track count from latest frame
  const currentFrame = frames.length > 0 ? frames[frames.length - 1] : null;
  const activeTrackCount = currentFrame?.tracks?.length || 0;
  const topTrack = currentFrame?.tracks?.[0];

  // Dynamic live thought computation
  let currentThought = 'Engines ready';
  let isThinking = !isFullyReady || isBooting;

  if (isBooting) {
    currentThought = bootThought;
    isThinking = true;
  } else if (!isFullyReady) {
    currentThought = subsystems.yolo.message || `Initializing AI runtime (${overallProgress}%)...`;
    isThinking = true;
  } else if (isTracking) {
    if (activeTrackCount === 0) {
      currentThought = 'Scanning visual field: You will be detected.';
      isThinking = true;
    } else {
      const label = topTrack ? `${topTrack.className} ${(topTrack.score * 100).toFixed(0)}%` : 'target';
      currentThought = `Locked ${activeTrackCount} target${activeTrackCount > 1 ? 's' : ''} • ID #${topTrack?.id || 1} (${label}) • Kalman active`;
      isThinking = false;
    }
  } else {
    currentThought = 'Engines ready • TrackVision neural core primed';
    isThinking = false;
  }

  // Variant: Top Navbar Pill
  if (variant === 'pill') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowLogsDrawer(!showLogsDrawer)}
          className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono transition-all border select-none group",
            isBooting
              ? "bg-slate-900/60 border-slate-500/40 text-slate-300 shadow-[0_0_12px_rgba(148,163,184,0.2)] animate-pulse"
              : isThinking
              ? "bg-white/[0.04] border-white/15 text-slate-200 hover:border-white/25"
              : isTracking
              ? "bg-slate-900/40 border-slate-500/30 text-slate-300 hover:border-slate-300"
              : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/20",
            className
          )}
          title="Click to toggle AI Engine Thought Logs"
        >
          <span className={cn(
            "font-mono font-bold text-sm leading-none",
            isThinking ? "text-slate-300" : "text-slate-300"
          )}>
            {isThinking ? spinner : '●'}
          </span>
          <span className="text-[11px] font-medium tracking-wide">
            {isBooting ? 'Thinking...' : isThinking ? 'Loading Engine' : 'AI Engine Ready'}
          </span>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-300 ml-0.5 transition-colors">
            {showLogsDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </button>

        {/* Floating Minimal CLI Thought Drawer */}
        {showLogsDrawer && (
          <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 rounded-xl bg-black/95 backdrop-blur-xl border border-white/15 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-slate-300" />
                <span>AI Engine Stream</span>
              </div>
              <span className="text-[10px] text-slate-500">WASM SIMD • {telemetry.inferenceMs.toFixed(1)}ms</span>
            </div>

            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] custom-scrollbar">
              <div className="text-slate-300/90 flex items-start gap-1.5">
                <span className="text-slate-500">&gt;</span>
                <span>{currentThought}</span>
              </div>
              {logs.slice(0, 8).map((log) => (
                <div key={log.id} className="text-slate-400 flex items-start gap-1.5">
                  <span className="text-slate-600 text-[10px] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-[10px] shrink-0 font-medium text-slate-300">
                    [{log.source}]
                  </span>
                  <span className="text-slate-300 truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Standby Prompt below start button
  if (variant === 'standby') {
    return (
      <div className={cn("flex flex-col items-center gap-2 font-mono select-none", className)}>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-xs text-slate-300 shadow-lg">
          <span className={cn(
            "font-mono font-bold text-sm",
            isThinking ? "text-slate-300" : "text-slate-300"
          )}>
            {isThinking ? spinner : '●'}
          </span>
          <span className="text-slate-400">Thinking:</span>
          <span className="text-slate-200 font-medium tracking-tight">
            {currentThought}
          </span>
        </div>
      </div>
    );
  }

  // Variant: Boot / Starting Cinematic Scan Overlay
  if (variant === 'boot') {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none">
        
        {/* Holographic Radar / Reticle Pulse */}
        <div className="relative flex items-center justify-center w-64 h-64 mb-8">
          <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-25" />
          <div className="absolute inset-4 rounded-full border border-white/15 animate-pulse" />
          <div className="absolute inset-12 rounded-full border border-dashed border-slate-500/30 animate-[spin_8s_linear_infinite]" />
          
          {/* Laser scanning sweep line */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-500/10 to-transparent h-16 w-full animate-[bounce_2s_infinite] pointer-events-none" />

          {/* Center Target Reticle */}
          <div className="relative flex flex-col items-center justify-center text-center p-4">
            <span className="font-mono text-3xl text-slate-300 font-bold mb-1">
              {spinner}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Calibrating
            </span>
          </div>

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-300" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-slate-300" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300" />
        </div>

        {/* Live Claude-Code Stream of Consciousness */}
        <div className="flex flex-col items-center gap-2 max-w-md px-6 text-center">
          <div className="flex items-center gap-2 font-mono text-sm sm:text-base text-slate-200 font-medium tracking-wide">
            <span className="text-slate-300 font-bold">{spinner}</span>
            <span className="animate-pulse">{bootThought}</span>
          </div>
          <p className="text-xs font-mono text-slate-500">
            WASM SIMD Neural Ingestion • Ready for spatial association
          </p>
        </div>
      </div>
    );
  }

  // Variant: Live HUD Thinking Pill on active camera feed
  if (variant === 'liveHud') {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 font-mono text-xs text-slate-200 select-none shadow-lg transition-all", className)}>
        <span className={cn(
          "font-mono font-bold text-sm",
          isThinking ? "text-slate-300" : "text-slate-300"
        )}>
          {isThinking ? spinner : '●'}
        </span>
        <span className="text-slate-400">Thinking:</span>
        <span className={cn(
          "font-medium tracking-tight",
          activeTrackCount > 0 ? "text-slate-300" : "text-slate-300"
        )}>
          {currentThought}
        </span>
      </div>
    );
  }

  return null;
}
