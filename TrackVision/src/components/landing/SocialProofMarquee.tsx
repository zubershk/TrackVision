import React from 'react';
import { Cpu, ShieldCheck, Zap, Activity, Layers, Terminal, Sparkles } from 'lucide-react';

export function SocialProofMarquee() {
  const technologies = [
    { label: 'WebGPU Native', tag: 'Compute Engine', icon: Cpu },
    { label: 'ONNX Runtime Web', tag: 'Neural Backend', icon: Zap },
    { label: 'ByteTrack++', tag: 'Temporal Tracking', icon: Activity },
    { label: 'YOLOv8 & YOLO-World', tag: 'Zero-Shot Vision', icon: Sparkles },
    { label: 'OSNet x1.0', tag: '512-dim Re-ID', icon: Layers },
    { label: 'WASM SIMD', tag: 'Vector Fallback', icon: Terminal },
    { label: 'React 19 & TypeScript', tag: 'Frontend Stack', icon: ShieldCheck },
  ];

  return (
    <div className="w-full py-10 border-t border-b border-white/5 bg-[#030303]/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4 text-center">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#777777]">
          BUILT ON OPEN NEURAL & CLIENT-SIDE WEB STANDARDS
        </span>
      </div>

      <div className="flex overflow-x-hidden relative [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
        <div className="flex shrink-0 items-center gap-8 py-2 animate-marquee">
          {technologies.concat(technologies).map((tech, idx) => {
            const Icon = tech.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/80 hover:text-white hover:border-white/25 transition-all cursor-default shrink-0 backdrop-blur-sm"
              >
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-white tracking-tight">{tech.label}</span>
                  <span className="text-[10px] font-mono text-[#888888]">{tech.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
