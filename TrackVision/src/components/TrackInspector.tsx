import React from 'react';
import { useVisionStore } from '../store';
import { formatTime } from '../lib/utils';
import { Crosshair, PlayCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function TrackInspector() {
  const selectedId = useVisionStore(s => s.selectedTrackId);
  const trackMetaMap = useVisionStore(s => s.trackMeta);
  
  const selectTrack = useVisionStore(s => s.selectTrack);
  const setHoverTrack = useVisionStore(s => s.setHoverTrack);
  const followMode = useVisionStore(s => s.followMode);
  const toggleFollowMode = useVisionStore(s => s.toggleFollowMode);
  const setReplay = useVisionStore(s => s.setReplay);

  const allTracks = Array.from(trackMetaMap.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  const selectedTrack = selectedId ? trackMetaMap.get(selectedId) : null;

  return (
    <div className="flex flex-col h-full bg-[#050505] font-sans">
      <div className="p-4 border-b border-[#1A1A1A]">
        <h2 className="text-sm font-medium text-[#F5F5F5]">Track Inspector</h2>
      </div>

      {selectedTrack ? (
        <div className="p-6 border-b border-[#1A1A1A] flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-[#777777] uppercase mb-1">Selected Identity</div>
              <div className="text-xl text-[#F5F5F5] font-medium">
                {selectedTrack.className} <span className="text-[#777777]">#{selectedTrack.id}</span>
              </div>
            </div>
            <button 
              onClick={() => selectTrack(null)} 
              className="text-[#777777] hover:text-[#F5F5F5] transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[#1A1A1A] border border-[#1A1A1A] rounded-sm overflow-hidden mb-6">
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Status</div>
              <div className={cn("text-sm font-mono", selectedTrack.status === 'ACTIVE' ? 'text-[#F5F5F5]' : 'text-[#777777]')}>
                {selectedTrack.status}
              </div>
            </div>
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Duration</div>
              <div className="text-sm font-mono text-[#F5F5F5]">{formatTime(selectedTrack.duration)}</div>
            </div>
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Speed (px/s)</div>
              <div className="text-sm font-mono text-[#F5F5F5]">{selectedTrack.currentSpeed?.toFixed(1) || '0.0'}</div>
            </div>
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Distance (px)</div>
              <div className="text-sm font-mono text-[#F5F5F5]">{selectedTrack.totalDistance?.toFixed(0) || '0'}</div>
            </div>
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Frames</div>
              <div className="text-sm font-mono text-[#F5F5F5]">{selectedTrack.frameCount}</div>
            </div>
            <div className="bg-[#050505] p-3">
              <div className="text-[11px] text-[#777777] uppercase mb-1">Bearing</div>
              <div className="text-sm font-mono text-[#F5F5F5]">{selectedTrack.bearing?.toFixed(1) || '0.0'}°</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={toggleFollowMode}
              className={cn("flex-1 py-2.5 rounded-sm text-xs flex items-center justify-center gap-2 transition-colors border", 
                followMode 
                  ? 'bg-[#F5F5F5] text-[#000000] border-[#F5F5F5]' 
                  : 'bg-transparent text-[#F5F5F5] border-[#242424] hover:border-[#444444]'
              )}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {followMode ? 'Following' : 'Follow'}
            </button>
            <button 
              onClick={() => setReplay(true, selectedTrack.firstSeen)}
              className="flex-1 py-2.5 rounded-sm text-xs bg-[#121212] text-[#F5F5F5] border border-[#242424] hover:border-[#444444] flex items-center justify-center gap-2 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Replay Track
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 border-b border-[#1A1A1A] text-[#777777] text-sm">
          No track selected. Select a track to view telemetry.
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {allTracks.map(track => {
          const isSelected = selectedId === track.id;
          return (
            <div 
              key={track.id}
              onClick={() => selectTrack(track.id)}
              onMouseEnter={() => setHoverTrack(track.id)}
              onMouseLeave={() => setHoverTrack(null)}
              className={cn(
                "p-3 rounded-sm cursor-pointer flex justify-between items-center transition-all group border",
                isSelected 
                  ? "bg-[#121212] border-[#242424]" 
                  : "bg-transparent border-transparent hover:bg-[#080808]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", 
                  track.status === 'ACTIVE' 
                    ? (isSelected ? 'bg-[#F5F5F5]' : 'bg-[#777777]')
                    : 'bg-[#242424]'
                )} />
                <div>
                  <div className={cn("text-sm transition-colors", isSelected ? 'text-[#F5F5F5]' : 'text-[#B8B8B8] group-hover:text-[#F5F5F5]')}>
                    {track.className} <span className="text-[#777777] font-mono">#{track.id}</span>
                  </div>
                  <div className="text-[11px] text-[#777777] mt-0.5 font-mono">
                    {formatTime(track.duration)} • {track.status}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
