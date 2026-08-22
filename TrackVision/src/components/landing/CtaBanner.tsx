import React from 'react';
import { useVisionStore } from '../../store';
import { Cpu, ArrowRight, Sparkles, ShieldCheck, Zap, Layers } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function CtaBanner() {
  const setMode = useVisionStore(s => s.setMode);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06),transparent_70%)] pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-3xl glass-strong border border-white/30 p-8 sm:p-14 text-center overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          
          {/* Animated Background Shimmer Sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none animate-shimmer" />

          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-white/20 text-xs font-mono text-white/90 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>INSTANT BROWSER ACCESS • ZERO INSTALLATION</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight mb-6">
            Ready to Track 100+ Objects in Real-Time?
          </h2>

          <p className="text-sm sm:text-lg text-[#B8B8B8] max-w-2xl mx-auto leading-relaxed mb-10">
            Experience state-of-the-art YOLOv8 object detection, open-vocabulary YOLO-World, and ByteTrack++ temporal persistence running 100% locally on your machine.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setMode('app')}
              {...glassBtnHandlers}
              className="glass-btn-prominent px-8 py-4 text-base sm:text-lg font-semibold rounded-2xl flex items-center gap-3 border border-white/40 hover:border-white/70 transition-all shadow-[0_0_35px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.35)] text-white cursor-pointer group"
            >
              <Cpu className="w-5 h-5 text-white" />
              <span>Launch Command Center</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href="#code"
              className="glass-btn px-6 py-4 text-base font-medium rounded-2xl text-[#E0E0E0] hover:text-white border border-white/20 hover:border-white/40 transition-all"
            >
              View Quickstart Code
            </a>
          </div>

          {/* Micro Guarantee Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-white/10 text-xs font-mono text-[#888888]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Private & In-Memory</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>WebGPU Hardware Accelerated</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Free & Open Source (MIT)</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
