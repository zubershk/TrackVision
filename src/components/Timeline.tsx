import React, { useRef, useState, useEffect } from 'react';
import { useVisionStore } from '../store';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { formatTime, cn } from '../lib/utils';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackMetaMap = useVisionStore(s => s.trackMeta);
  const sessionStartTime = useVisionStore(s => s.sessionStartTime);
  const maxHistoryMs = useVisionStore(s => s.maxHistoryMs);
  const isReplay = useVisionStore(s => s.isReplay);
  const setReplay = useVisionStore(s => s.setReplay);
  const currentTime = useVisionStore(s => s.currentTime);
  const selectedTrackId = useVisionStore(s => s.selectedTrackId);
  const selectTrack = useVisionStore(s => s.selectTrack);
  const frames = useVisionStore(s => s.frames);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const windowStart = Math.max(0, currentTime - maxHistoryMs);
  const windowEnd = Math.max(maxHistoryMs, currentTime);
  const timeSpan = maxHistoryMs;

  const tracks = Array.from(trackMetaMap.values()).sort((a, b) => a.firstSeen - b.firstSeen);

  useEffect(() => {
    if (isPlaying) {
      lastUpdateRef.current = performance.now();
      const tick = () => {
        const now = performance.now();
        const delta = now - lastUpdateRef.current;
        lastUpdateRef.current = now;
        
        useVisionStore.getState().setCurrentTime(
          useVisionStore.getState().currentTime + (delta * playbackSpeed)
        );
        playRef.current = requestAnimationFrame(tick);
      };
      playRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = windowStart + (percentage * timeSpan);
    
    if (!isReplay) {
      setReplay(true, newTime);
    } else {
      useVisionStore.getState().setCurrentTime(newTime);
    }
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleScrub(e);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] font-sans text-[#F5F5F5]">
      
      {/* Controls Bar */}
      <div className="flex items-center justify-between p-3 border-b border-[#1A1A1A] shrink-0 bg-[#050505] z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => useVisionStore.getState().setCurrentTime(Math.max(0, currentTime - 5000))}
              className="p-1.5 text-[#777777] hover:text-[#F5F5F5] hover:bg-[#121212] rounded-sm transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-[#F5F5F5] hover:bg-[#121212] rounded-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button 
              onClick={() => useVisionStore.getState().setCurrentTime(currentTime + 5000)}
              className="p-1.5 text-[#777777] hover:text-[#F5F5F5] hover:bg-[#121212] rounded-sm transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          
          <select 
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-transparent text-sm text-[#B8B8B8] font-mono border-none outline-none cursor-pointer"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
            <option value={4}>4.0x</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-sm font-mono text-[#B8B8B8]">
          <span>{formatTime(currentTime)}</span>
          {isReplay && (
            <button 
              onClick={() => {
                setIsPlaying(false);
                setReplay(false);
              }}
              className="flex items-center gap-2 bg-[#121212] hover:bg-[#242424] text-[#F5F5F5] px-3 py-1 rounded-sm border border-[#242424] transition-colors text-xs font-sans"
            >
              <X className="w-3.5 h-3.5" />
              Return to Live
            </button>
          )}
        </div>
      </div>

      {/* Tracks Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Y-Axis Labels */}
        <div className="w-16 shrink-0 bg-[#050505] border-r border-[#1A1A1A] z-10 flex flex-col pt-6 overflow-hidden">
          {tracks.map(t => (
            <div key={t.id} className="h-6 flex items-center justify-end pr-3">
              <span className={cn("text-[10px] font-mono", selectedTrackId === t.id ? "text-[#F5F5F5]" : "text-[#777777]")}>
                #{t.id}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Chart */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#000000]"
          onMouseDown={handleScrub}
          onMouseMove={handleDrag}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, #1A1A1A 1px, transparent 1px)', backgroundSize: '10% 100%' }} />
          
          <div className="absolute top-0 left-0 w-full pt-6 pb-6">
            {tracks.map(t => {
              const startPct = ((t.firstSeen - windowStart) / timeSpan) * 100;
              const widthPct = ((t.duration) / timeSpan) * 100;
              const isSelected = selectedTrackId === t.id;
              
              return (
                <div key={t.id} className="h-6 relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); selectTrack(t.id); }}>
                  <div className="absolute inset-y-0 hover:bg-[#121212] transition-colors w-full z-0" />
                  <div 
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full z-10 transition-colors",
                      isSelected ? "bg-[#F5F5F5]" : "bg-[#444444] group-hover:bg-[#777777]"
                    )}
                    style={{ left: `${Math.max(0, startPct)}%`, width: `${Math.max(0.5, widthPct)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Scrubber Line */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-[#F5F5F5] pointer-events-none z-20 flex flex-col items-center"
            style={{ left: `${((currentTime - windowStart) / timeSpan) * 100}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-[#F5F5F5] -translate-y-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
