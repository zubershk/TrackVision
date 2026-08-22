import React from 'react';
import { useVisionStore } from '../../store';
import { MonitorPlay, ArrowUp, Github, ExternalLink, ShieldCheck, Cpu, Terminal } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function LandingFooter() {
  const setMode = useVisionStore(s => s.setMode);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-white/10 bg-[#000000] relative overflow-hidden py-16 sm:py-20">
      {/* Background Ambient Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        
        {/* Top Section: Brand & Big CTA */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <MonitorPlay className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">TrackVision</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white/80">
                v2.0.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#888888] max-w-md font-normal">
              Production-ready, client-side multi-object tracking and zero-shot open-vocabulary computer vision in your browser.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setMode('app')}
              {...glassBtnHandlers}
              className="glass-btn-prominent px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 border border-white/25 hover:border-white/50 text-white cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.15)]"
            >
              <Cpu className="w-4 h-4 text-white" />
              <span>Launch Command Center</span>
            </button>

            <button
              onClick={scrollToTop}
              className="p-3 rounded-xl glass border border-white/15 hover:border-white/30 text-white hover:bg-white/10 transition-colors"
              title="Back to Top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Section: Quick Links & Status Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-10 border-b border-white/5 text-xs">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-3">
              Architecture
            </span>
            <ul className="space-y-2 text-[#999999]">
              <li><a href="#architecture" className="hover:text-white transition-colors">ByteTrack++ Core</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">OSNet Re-ID Engine</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">WebGPU Pipeline</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Zustand Rolling Buffer</a></li>
            </ul>
          </div>

          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-3">
              Neural Models
            </span>
            <ul className="space-y-2 text-[#999999]">
              <li><a href="#code" className="hover:text-white transition-colors">YOLOv8n (COCO 80)</a></li>
              <li><a href="#code" className="hover:text-white transition-colors">YOLO-World + CLIP</a></li>
              <li><a href="#code" className="hover:text-white transition-colors">OSNet x1.0 (512-dim)</a></li>
              <li><a href="#code" className="hover:text-white transition-colors">ONNX Runtime Web</a></li>
            </ul>
          </div>

          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-3">
              Capabilities
            </span>
            <ul className="space-y-2 text-[#999999]">
              <li><a href="#features" className="hover:text-white transition-colors">Ghost Mode Trails</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">2D Spatial Scene Map</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Time Machine Scrubber</a></li>
              <li><a href="#benchmarks" className="hover:text-white transition-colors">CLEAR MOT Metrics</a></li>
            </ul>
          </div>

          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-3">
              System Status
            </span>
            <div className="flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WebGPU & WASM Active</span>
              </div>
              <span className="text-[11px] text-[#777777] font-mono">
                Zero Cloud Dependencies
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright & Badges */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#777777]">
          <div className="flex items-center gap-2">
            <span>© 2026 TrackVision. Open-Source MIT License.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-default">TypeScript 5.8</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-default">React 19</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-default">ONNX Runtime Web</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
