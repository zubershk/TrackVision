import React from 'react';
import { useVisionStore } from '../../store';
import { InteractiveSimulator } from './InteractiveSimulator';
import { ArrowRight, ShieldCheck, Zap, Cpu, Eye, Sparkles, Terminal, Activity, Layers } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function HeroSection() {
  const setMode = useVisionStore(s => s.setMode);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden flex flex-col items-center">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] sm:h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03),transparent_70%)] pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent_70%)] pointer-events-none blur-3xl -z-10" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-white/20 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
          <span className="text-xs font-mono font-medium text-white/90">
            WebGPU Accelerated • 100% Client-Side • Zero Data Uploads
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl leading-[1.1] mb-6">
          Precision Object Intelligence.{' '}
          <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
            Running Entirely in Your Browser.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-xl text-[#B8B8B8] max-w-3xl leading-relaxed mb-10 font-normal">
          Real-time multi-object tracking with <strong>ByteTrack++</strong> temporal persistence, dual neural detection (<strong>YOLOv8</strong> + <strong>YOLO-World</strong>), and <strong>OSNet</strong> appearance re-identification — powered locally via WebGPU with zero cloud latency.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={() => setMode('app')}
            {...glassBtnHandlers}
            className="glass-btn-prominent px-8 py-3.5 text-sm sm:text-base font-semibold rounded-2xl flex items-center gap-3 border border-white/30 hover:border-white/60 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] text-white cursor-pointer"
          >
            <Cpu className="w-5 h-5 text-white" />
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="#architecture"
            className="glass-btn px-6 py-3.5 text-sm sm:text-base font-medium rounded-2xl text-[#E0E0E0] hover:text-white border border-white/15 hover:border-white/30 transition-all"
          >
            Explore Architecture
          </a>
        </div>

        {/* Quick Spec Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl mb-14 text-left">
          <div className="glass p-4 rounded-xl border border-white/10 flex flex-col">
            <div className="flex items-center gap-2 text-white/70 mb-1 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% LOCAL</span>
            </div>
            <span className="text-sm font-semibold text-white">Zero Server Ingestion</span>
            <span className="text-[11px] text-[#888888]">100% private in-browser compute</span>
          </div>

          <div className="glass p-4 rounded-xl border border-white/10 flex flex-col">
            <div className="flex items-center gap-2 text-white/70 mb-1 text-xs font-mono">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>60+ FPS LATENCY</span>
            </div>
            <span className="text-sm font-semibold text-white">15-30ms Per Frame</span>
            <span className="text-[11px] text-[#888888]">Hardware WebGPU / WASM SIMD</span>
          </div>

          <div className="glass p-4 rounded-xl border border-white/10 flex flex-col">
            <div className="flex items-center gap-2 text-white/70 mb-1 text-xs font-mono">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>BYTETRACK++</span>
            </div>
            <span className="text-sm font-semibold text-white">6x6 Covariance Kalman</span>
            <span className="text-[11px] text-[#888888]">High & low score dual association</span>
          </div>

          <div className="glass p-4 rounded-xl border border-white/10 flex flex-col">
            <div className="flex items-center gap-2 text-white/70 mb-1 text-xs font-mono">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>OSNET RE-ID</span>
            </div>
            <span className="text-sm font-semibold text-white">512-dim Embeddings</span>
            <span className="text-[11px] text-[#888888]">Occlusion identity recovery</span>
          </div>
        </div>

        {/* Live Simulator Viewport Section */}
        <div className="w-full max-w-5xl">
          <InteractiveSimulator />
        </div>

      </div>
    </section>
  );
}
