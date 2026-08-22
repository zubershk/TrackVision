import React, { useEffect, useRef } from 'react';
import { useVisionStore } from '../store';
import { cn } from '../lib/utils';

export function RightPanel({ hideTelemetry }: { hideTelemetry?: boolean }) {
  const trackMeta = useVisionStore(s => s.trackMeta);
  const selectedId = useVisionStore(s => s.selectedTrackId);
  const frames = useVisionStore(s => s.frames);
  const isReplay = useVisionStore(s => s.isReplay);
  const currentTime = useVisionStore(s => s.currentTime);
  const selectTrack = useVisionStore(s => s.selectTrack);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, 640, 480);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    
    trackMeta.forEach(meta => {
      if (meta.frameCount > 5) {
        meta.history.forEach(pos => {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }, [trackMeta, frames.length]);

  let mapTracks: { id: number, x: number, y: number, className: string, bearing: number, speed: number }[] = [];

  if (isReplay) {
    let activeFrame = frames.length > 0 ? frames[frames.length - 1] : null;
    let activeIndex = frames.length - 1;
    
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].timestamp > currentTime) {
        activeIndex = Math.max(0, i - 1);
        break;
      }
    }
    
    activeFrame = frames[activeIndex] || null;
    
    if (activeFrame) {
      mapTracks = activeFrame.tracks.map(t => {
        const meta = trackMeta.get(t.id);
        return {
          id: t.id,
          className: t.className,
          x: t.bbox[0] + t.bbox[2]/2,
          y: t.bbox[1] + t.bbox[3]/2,
          bearing: meta?.bearing || 0,
          speed: meta?.currentSpeed || 0
        };
      });
    }
  } else {
    mapTracks = Array.from(trackMeta.values())
      .filter(t => t.status === 'ACTIVE')
      .map(t => {
        const currentPos = t.history[t.history.length - 1];
        return {
          id: t.id,
          className: t.className,
          x: currentPos ? currentPos.x : 0,
          y: currentPos ? currentPos.y : 0,
          bearing: t.bearing,
          speed: t.currentSpeed
        };
      });
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] font-sans">
      <div className="p-4 border-b border-[#1A1A1A] flex justify-between items-center">
        <h2 className="text-sm font-medium text-[#F5F5F5]">Scene Density Map</h2>
        <div className="text-[10px] text-[#777777] font-mono">KINEMATICS</div>
      </div>

      <div className="flex-1 relative bg-[#000000] border-b border-[#1A1A1A] overflow-hidden">
        {/* Minimal Grid */}
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        
        {/* Heatmap Canvas */}
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-4">
          <div className="relative w-full h-full">
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={480} 
              className="absolute inset-0 w-full h-full object-contain opacity-70 filter blur-[1px]" 
            />
          </div>
        </div>

        {/* Live track dots */}
        <div className="absolute inset-0 z-20 pointer-events-auto p-4">
          <div className="relative w-full h-full">
            {mapTracks.map(track => {
              // Using relative % positioning based on 640x480 standard viewport
              const nx = (track.x / 640) * 100;
              const ny = (track.y / 480) * 100;
              const isSelected = selectedId === track.id;
              
              return (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track.id)}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200",
                    isSelected ? 'z-30' : 'z-20'
                  )}
                  style={{ left: `${nx}%`, top: `${ny}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    {track.speed > 5 && (
                      <div 
                        className="absolute w-6 h-[1px] bg-gradient-to-r from-transparent to-[#777777] origin-left"
                        style={{ transform: `rotate(${track.bearing}deg)` }}
                      />
                    )}
                    <div className={cn("w-1.5 h-1.5 rounded-full transition-all relative z-10", isSelected ? 'bg-[#FFFFFF] scale-150 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-[#777777]')} />
                  </div>
                  <div className={cn("text-[9px] font-mono whitespace-nowrap", isSelected ? 'text-[#FFFFFF]' : 'text-[#777777]')}>
                    #{track.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
