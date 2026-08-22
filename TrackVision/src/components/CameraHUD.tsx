import React, { useRef, useEffect } from 'react';
import { useVisionStore } from '../store';
import { useVisionEngine } from '../hooks/useVisionEngine';
import { drawTrackingHUD } from '../lib/draw';
import { Play, Loader2, AlertTriangle, Crosshair, Eye, Sparkles, MonitorPlay } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGlassInteractive } from '../hooks/useGlassInteractive';
import { useModelInitStore } from '../store/modelInitStore';
import { EngineThinkingStream } from './EngineThinkingStream';

export function CameraHUD() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<number | null>(null);

  const { isModelLoading, modelError } = useVisionEngine(videoRef);

  const isFullyReady = useModelInitStore(s => s.isFullyReady);
  const isBooting = useModelInitStore(s => s.isBootingSequence);
  const triggerBootSequence = useModelInitStore(s => s.triggerBootSequence);

  const isTracking = useVisionStore(s => s.isTracking);
  const isReplay = useVisionStore(s => s.isReplay);
  const setTracking = useVisionStore(s => s.setTracking);
  const frames = useVisionStore(s => s.frames);
  const trackMeta = useVisionStore(s => s.trackMeta);
  const currentTime = useVisionStore(s => s.currentTime);
  const selectedId = useVisionStore(s => s.selectedTrackId);
  const hoverId = useVisionStore(s => s.hoverTrackId);
  const ghostMode = useVisionStore(s => s.ghostMode);
  const followMode = useVisionStore(s => s.followMode);
  const toggleGhostMode = useVisionStore(s => s.toggleGhostMode);
  const toggleFollowMode = useVisionStore(s => s.toggleFollowMode);

  // Glass interactive for buttons
  const startBtnProps = useGlassInteractive();
  const { ref: _, ...startBtnHandlers } = startBtnProps;

  const handleStartTracking = () => {
    if (isBooting) return;
    triggerBootSequence(() => {
      setTracking(true);
    });
  };

  // Request Camera
  useEffect(() => {
    if (isTracking && !isReplay && videoRef.current && !videoRef.current.srcObject) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play();
        }
      }).catch(err => {
        console.error(err);
      });
    }

    if (!isTracking && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [isTracking, isReplay]);

  // Render Loop
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      }

      const state = useVisionStore.getState();
      let activeFrame = state.frames.length > 0 ? state.frames[state.frames.length - 1] : null;
      let historyForGhost = state.frames;

      if (state.isReplay) {
        let activeIndex = state.frames.length - 1;
        for (let i = 0; i < state.frames.length; i++) {
          if (state.frames[i].timestamp > state.currentTime) {
            activeIndex = Math.max(0, i - 1);
            break;
          }
        }
        activeFrame = state.frames[activeIndex] || null;
        historyForGhost = state.frames.slice(0, activeIndex + 1);
      }

      if (activeFrame) {
        drawTrackingHUD(
          canvas,
          activeFrame,
          state.trackMeta,
          historyForGhost,
          state.selectedTrackId,
          state.hoverTrackId,
          state.ghostMode,
          state.followMode
        );
      } else {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      renderRef.current = requestAnimationFrame(render);
    };

    renderRef.current = requestAnimationFrame(render);
    return () => {
      if (renderRef.current) cancelAnimationFrame(renderRef.current);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const state = useVisionStore.getState();
    let activeFrame = state.frames.length > 0 ? state.frames[state.frames.length - 1] : null;
    if (state.isReplay) {
      let activeIndex = state.frames.length - 1;
      for (let i = 0; i < state.frames.length; i++) {
        if (state.frames[i].timestamp > state.currentTime) {
          activeIndex = Math.max(0, i - 1);
          break;
        }
      }
      activeFrame = state.frames[activeIndex] || null;
    }

    if (activeFrame) {
      let clickedId = null;
      for (let i = activeFrame.tracks.length - 1; i >= 0; i--) {
        const t = activeFrame.tracks[i];
        const [tx, ty, tw, th] = t.bbox;
        if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) {
          clickedId = t.id;
          break;
        }
      }
      useVisionStore.getState().selectTrack(clickedId);
    }
  };

  return (
    <div className="relative w-full h-full max-h-full glass overflow-hidden flex flex-col group">
      
      {/* Replay Indicator - Glass Badge */}
      {isReplay && (
        <div className="absolute top-4 left-4 z-20">
          <div className="glass-badge glass-badge-recording flex items-center gap-2 px-3 py-1.5">
            <MonitorPlay className="w-4 h-4 glass-text" />
            <span className="text-xs font-mono glass-text font-medium tracking-wide">
              REPLAY
            </span>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="relative flex-1 bg-[#000000] flex items-center justify-center overflow-hidden">
        
        {/* Boot Sequence Animation ("You will be detected") */}
        {isBooting && <EngineThinkingStream variant="boot" />}

        {modelError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center glass-panel z-30 px-6 text-center">
            <AlertTriangle className="w-10 h-10 glass-text-accent mb-6 font-light" strokeWidth={1} />
            <h3 className="text-lg font-medium glass-text mb-2">Camera Unavailable</h3>
            <p className="text-sm glass-text-muted font-sans max-w-sm">
              Check your browser permissions and try again.
            </p>
          </div>
        )}

        {!isTracking && !modelError && !isBooting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center glass-panel z-30 px-8">
            
            {/* Living Reticle Core */}
            <div className="relative flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border border-slate-500/20 animate-ping opacity-40" />
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <Crosshair className="w-8 h-8 text-slate-300/80 animate-pulse" strokeWidth={1.5} />
            </div>
            
            <button 
              onClick={handleStartTracking}
              disabled={isModelLoading && !isFullyReady}
              {...startBtnHandlers}
              className={cn(
                "glass-btn-prominent px-10 py-4 rounded-[var(--glass-morph-radius-lg)]",
                "text-base font-semibold tracking-wide flex items-center gap-3 transition-all",
                "hover:shadow-[0_0_24px_rgba(148,163,184,0.35)]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {!isFullyReady ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              ) : (
                <Play className="w-5 h-5 fill-current text-slate-300" />
              )}
              <span>Start Tracking</span>
            </button>

            {/* Living Claude-Code Thinking Stream */}
            <div className="mt-6">
              <EngineThinkingStream variant="standby" />
            </div>

            <p className="mt-6 text-xs glass-text-muted text-center px-6 font-mono opacity-80">
              100% on-device neural processing • WebAssembly SIMD
            </p>
          </div>
        )}

        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-out",
            (isTracking && !isReplay) ? 'opacity-100' : 'opacity-0'
          )}
          playsInline
          muted
          autoPlay
        />
        
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full object-contain z-10 cursor-crosshair"
        />
      </div>

      {/* Corner Glass Controls - Floating Glass Buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          id="camera-hud-ghost-mode-btn"
          onClick={toggleGhostMode}
          className={cn(
            "glass-interactive p-2.5 rounded-full transition-all duration-200 cursor-pointer",
            ghostMode 
              ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
          )}
          title={ghostMode ? "Ghost Mode (Trajectory & Trails): Enabled" : "Ghost Mode (Trajectory & Trails): Click to Enable"}
          aria-pressed={ghostMode}
          aria-label="Toggle Ghost Mode"
        >
          <Eye className={cn("w-5 h-5 transition-colors", ghostMode ? "text-cyan-300" : "glass-text")} strokeWidth={1.75} />
        </button>
        <button
          id="camera-hud-follow-mode-btn"
          onClick={toggleFollowMode}
          className={cn(
            "glass-interactive p-2.5 rounded-full transition-all duration-200 cursor-pointer",
            followMode 
              ? "bg-amber-500/20 border-amber-400/40 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
          )}
          title={followMode ? "Follow Mode (Target Lock & Focus): Enabled" : "Follow Mode (Target Lock & Focus): Click to Enable"}
          aria-pressed={followMode}
          aria-label="Toggle Follow Mode"
        >
          <Crosshair className={cn("w-5 h-5 transition-colors", followMode ? "text-amber-300" : "glass-text")} strokeWidth={1.75} />
        </button>
      </div>

      {/* Bottom Glass Info Bar */}
      {isTracking && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-4 pointer-events-none">
          <div className="pointer-events-auto">
            <EngineThinkingStream variant="liveHud" />
          </div>
          
          <div className="glass-container gap-2 pointer-events-auto">
            <span className="glass-badge glass-text-muted text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
              <span>Tracking Active</span>
            </span>
          </div>
        </div>
      )}

    </div>
  );
}