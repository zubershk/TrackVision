import React, { useEffect, useState } from 'react';
import { CameraHUD } from './CameraHUD';
import { TrackInspector } from './TrackInspector';
import { Timeline } from './Timeline';
import { RightPanel } from './RightPanel';
import { CommandPalette } from './CommandPalette';
import { useVisionStore } from '../store';
import { MonitorPlay, Video, Activity, Clock, Map as MapIcon, BarChart2, Eye, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyticsPanel } from './AnalyticsPanel';
import { VisionPanel } from './VisionPanel';
import { useGlassInteractive } from '../hooks/useGlassInteractive';
import { EngineThinkingStream } from './EngineThinkingStream';

export function CommandCenter() {
  const setMode = useVisionStore(s => s.setMode);
  const setCommandPalette = useVisionStore(s => s.setCommandPalette);
  const activeTab = useVisionStore(s => s.activeTab);
  const setActiveTab = useVisionStore(s => s.setActiveTab);
  const isTracking = useVisionStore(s => s.isTracking);
  const telemetry = useVisionStore(s => s.telemetry);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'live', label: 'Live', icon: Video },
    { id: 'tracks', label: 'Tracks', icon: Activity },
    { id: 'vision', label: 'Vision', icon: Eye },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'scene', label: 'Scene', icon: MapIcon },
    { id: 'settings', label: 'Analytics', icon: BarChart2 },
  ] as const;

  // Glass interactive handlers for navbar buttons
  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-[#F5F5F5] overflow-hidden font-sans select-none">
      
      {/* Desktop Top Navbar - Glass Toolbar */}
      {!isMobile && (
        <nav className="h-12 glass-toolbar shrink-0 z-50 flex">
          <div className="flex items-center gap-8">
            <div 
              className="glass-nav-item flex items-center gap-3 cursor-pointer"
              onClick={() => setMode('landing')}
              {...glassBtnHandlers}
            >
              <MonitorPlay className="w-5 h-5 glass-text" />
              <span className="font-medium tracking-tight text-lg glass-text">TrackVision</span>
            </div>
            
            <div className="glass-container gap-2" role="tablist">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    role="tab"
                    aria-selected={isActive}
                    {...glassBtnHandlers}
                    className={cn(
                      "glass-nav-item",
                      isActive ? "glass-text" : "glass-text-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            {/* Claude Code-style Thinking Stream Pill */}
            <EngineThinkingStream variant="pill" />

            <div className="flex items-center gap-2 glass-text-muted">
              <kbd className="glass-btn-ghost px-2 py-0.5 rounded-sm font-mono text-xs">Ctrl+K</kbd>
              <button 
                onClick={() => setCommandPalette(true)} 
                {...glassBtnHandlers}
                className="glass-btn-ghost hover:glass-text transition-colors"
              >
                Command
              </button>
            </div>
            <div className="flex items-center gap-3">
              {isTracking ? (
                <>
                  <span className="glass-badge glass-badge-live flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Live</span>
                    <span className="glass-text-muted font-mono">{telemetry.fps.toFixed(1)} FPS</span>
                  </span>
                </>
              ) : (
                <span className="glass-badge glass-badge-standby">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Standby</span>
                </span>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Desktop Layout: Always show Camera in center. Panels show based on tabs. */}
        {!isMobile && (
          <div className="flex flex-1 w-full">
            
            {/* Tracks / Scene / Settings Side Panel - Glass Panel */}
            {(activeTab === 'tracks' || activeTab === 'settings' || activeTab === 'scene' || activeTab === 'vision') && (
              <div className="w-80 shrink-0 glass-panel border-r border-[var(--glass-border)] flex flex-col z-10 overflow-hidden">
                {activeTab === 'tracks' && <TrackInspector />}
                {activeTab === 'scene' && <RightPanel hideTelemetry={true} />}
                {activeTab === 'settings' && <AnalyticsPanel />}
                {activeTab === 'vision' && <VisionPanel />}
              </div>
            )}

            {/* Center Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#000000] relative">
              <div className="flex-1 p-4 lg:p-6 flex flex-col min-h-0 items-center justify-center relative">
                <CameraHUD />
              </div>
              
              {activeTab === 'history' && (
                <div className="glass-panel border-t border-[var(--glass-border)] h-72">
                  <Timeline />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="flex flex-1 flex-col w-full relative">
          
          {/* Top Status Bar (Mobile) - Glass Toolbar */}
          <div className="h-12 glass-toolbar shrink-0 absolute top-0 w-full z-20">
            <div className="flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 glass-text" />
              <span className="font-medium glass-text">TrackVision</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              {isTracking && (
                <>
                  <span className="glass-badge glass-badge-live">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>Live</span>
                    <span className="glass-text-muted">{telemetry.fps.toFixed(1)} FPS</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 pt-12 pb-[64px] bg-[#000000] relative overflow-hidden flex flex-col">
            {activeTab === 'live' && (
              <div className="flex-1 p-2 flex items-center justify-center relative">
                <CameraHUD />
              </div>
            )}
            
            {activeTab === 'tracks' && (
              <div className="flex-1 flex flex-col overflow-hidden glass-panel">
                <TrackInspector />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex-1 flex flex-col overflow-hidden glass-panel">
                <Timeline />
              </div>
            )}

            {activeTab === 'scene' && (
              <div className="flex-1 flex flex-col overflow-hidden glass-panel">
                <RightPanel hideTelemetry={true} />
              </div>
            )}

            {activeTab === 'vision' && (
              <div className="flex-1 flex flex-col overflow-hidden glass-panel">
                <VisionPanel />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="flex-1 flex flex-col overflow-hidden glass-panel">
                <AnalyticsPanel />
              </div>
            )}
          </div>
          
          {/* Mobile Bottom Navigation - Glass Toolbar */}
          <div className="h-[64px] glass-toolbar shrink-0 absolute bottom-0 w-full z-20">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  {...glassBtnHandlers}
                  className={cn(
                    "glass-nav-item flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "glass-text" : "glass-text-muted"
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        )}

      </div>

      <CommandPalette />
    </div>
  );
}