import React, { useEffect, useState } from 'react';
import { useVisionStore } from '../store';
import { MonitorPlay, ArrowRight, Settings, Ghost, Map as MapIcon, Crosshair, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

export function CommandPalette() {
  const show = useVisionStore(s => s.showCommandPalette);
  const setCommandPalette = useVisionStore(s => s.setCommandPalette);
  const ghostMode = useVisionStore(s => s.ghostMode);
  const followMode = useVisionStore(s => s.followMode);
  const showSceneMap = useVisionStore(s => s.showSceneMap);

  const toggleGhostMode = useVisionStore(s => s.toggleGhostMode);
  const toggleFollowMode = useVisionStore(s => s.toggleFollowMode);
  const toggleSceneMap = useVisionStore(s => s.toggleSceneMap);
  const resetSession = useVisionStore(s => s.resetSession);
  const setMode = useVisionStore(s => s.setMode);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPalette(!show);
      }
      if (e.key === 'Escape') setCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, setCommandPalette]);

  if (!show) return null;

  const commands = [
    { id: 'ghost', name: 'Toggle Ghost Mode', icon: Ghost, action: toggleGhostMode, state: ghostMode },
    { id: 'follow', name: 'Toggle Follow Mode', icon: Crosshair, action: toggleFollowMode, state: followMode },
    { id: 'map', name: 'Toggle Scene Map', icon: MapIcon, action: toggleSceneMap, state: showSceneMap },
    { id: 'reset', name: 'Reset Tracking Session', icon: RefreshCcw, action: resetSession },
    { id: 'exit', name: 'Exit to Landing', icon: ArrowRight, action: () => setMode('landing') },
  ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  const handleAction = (action: () => void) => {
    action();
    setCommandPalette(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm" onClick={() => setCommandPalette(false)} />
      
      <div className="relative bg-[#050505] border border-[#242424] rounded-sm w-full max-w-lg shadow-2xl flex flex-col font-sans">
        
        <div className="p-4 border-b border-[#1A1A1A] flex items-center gap-3">
          <MonitorPlay className="w-5 h-5 text-[#777777]" />
          <input 
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(s => Math.min(s + 1, commands.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(s => Math.max(s - 1, 0));
              } else if (e.key === 'Enter' && commands[selectedIndex]) {
                e.preventDefault();
                handleAction(commands[selectedIndex].action);
              }
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-[#F5F5F5] placeholder:text-[#444444] text-sm"
          />
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          {commands.map((cmd, i) => (
            <div 
              key={cmd.id}
              onClick={() => handleAction(cmd.action)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "flex items-center justify-between p-3 rounded-sm cursor-pointer transition-colors",
                selectedIndex === i ? "bg-[#121212]" : "hover:bg-[#080808]"
              )}
            >
              <div className="flex items-center gap-3 text-sm">
                <cmd.icon className={cn("w-4 h-4", selectedIndex === i ? "text-[#F5F5F5]" : "text-[#777777]")} />
                <span className={selectedIndex === i ? "text-[#F5F5F5]" : "text-[#B8B8B8]"}>{cmd.name}</span>
              </div>
              {cmd.state !== undefined && (
                <div className={cn(
                  "text-xs px-2 py-0.5 rounded-sm font-medium border",
                  cmd.state 
                    ? "bg-[#F5F5F5] text-[#000000] border-[#F5F5F5]" 
                    : "bg-transparent text-[#777777] border-[#242424]"
                )}>
                  {cmd.state ? 'ON' : 'OFF'}
                </div>
              )}
            </div>
          ))}
          {commands.length === 0 && (
            <div className="p-8 text-center text-[#777777] text-sm">
              No commands found.
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#1A1A1A] text-xs text-[#444444] flex items-center justify-between bg-[#050505]">
          <div className="flex gap-4">
            <span><kbd className="bg-[#121212] px-1.5 py-0.5 rounded border border-[#242424]">↑</kbd> <kbd className="bg-[#121212] px-1.5 py-0.5 rounded border border-[#242424]">↓</kbd> to navigate</span>
            <span><kbd className="bg-[#121212] px-1.5 py-0.5 rounded border border-[#242424]">Enter</kbd> to select</span>
          </div>
          <span><kbd className="bg-[#121212] px-1.5 py-0.5 rounded border border-[#242424]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
