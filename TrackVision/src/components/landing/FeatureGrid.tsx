import React, { useState } from 'react';
import { Shield, Zap, Sparkles, Clock, Map as MapIcon, GitMerge, Layers, Lock, Activity, Eye, ArrowUpRight } from 'lucide-react';
import { useSpotlightEffect } from '../../hooks/useSpotlightEffect';

export function FeatureGrid() {
  const containerRef = useSpotlightEffect<HTMLDivElement>();
  const [reidSim, setReidSim] = useState(0.89);

  const features = [
    {
      icon: Shield,
      tag: 'PRIVACY FIRST',
      title: '100% Client-Side Intelligence',
      description:
        'Zero video frames or sensitive telemetry leave your device. All neural networks execute locally in your browser memory via WebGPU and WASM SIMD.',
      specs: ['Zero cloud streaming bills', 'GDPR & HIPAA compliant by design', 'Fully offline capable PWA ready'],
      accent: 'emerald',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            <span>CLOUD TRANSMISSION</span>
          </div>
          <span className="text-emerald-300 font-bold">0 BYTES (SECURE)</span>
        </div>
      ),
    },
    {
      icon: Zap,
      tag: 'DUAL ARCHITECTURE',
      title: 'YOLOv8 & Open-Vocabulary Vision',
      description:
        'Seamlessly toggle between ultra-fast COCO 80-class object detection and zero-shot YOLO-World + CLIP open-vocabulary text-conditioned prompt detection.',
      specs: ['15-30ms inference on modern GPUs', 'Dynamic prompt embeddings via CLIP', 'Class-aware non-maximum suppression'],
      accent: 'amber',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Activity className="w-3.5 h-3.5" />
            <span>INFERENCE SPEED</span>
          </div>
          <span className="text-amber-300 font-bold">60+ FPS (16ms)</span>
        </div>
      ),
    },
    {
      icon: GitMerge,
      tag: 'STATE ESTIMATION',
      title: 'ByteTrack++ & 6x6 Kalman Filter',
      description:
        'Custom TypeScript implementation with a full 6x6 covariance matrix modeling position, velocity, and aspect ratio under constant acceleration.',
      specs: ['Hungarian data association', 'Dual-threshold low-confidence recovery', 'Split identity track merging'],
      accent: 'cyan',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <GitMerge className="w-3.5 h-3.5" />
            <span>KALMAN STATE</span>
          </div>
          <span className="text-cyan-300 font-bold">[x, y, vx, vy, w, h]</span>
        </div>
      ),
    },
    {
      icon: Layers,
      tag: 'RE-IDENTIFICATION',
      title: 'Deep OSNet Appearance Embeddings',
      description:
        'Omni-Scale Network (OSNet x1.0) generates 512-dimensional hypersphere embeddings per object crop to re-acquire lost tracks across severe occlusions.',
      specs: ['512-dim L2 normalized vectors', 'Cosine similarity Hungarian gating', 'EMA appearance fusion (α=0.3)'],
      accent: 'purple',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-purple-500/[0.04] border border-purple-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-purple-400">
            <Layers className="w-3.5 h-3.5" />
            <span>COSINE SIMILARITY</span>
          </div>
          <span className="text-purple-300 font-bold">{(reidSim * 100).toFixed(1)}% (MATCH)</span>
        </div>
      ),
    },
    {
      icon: Clock,
      tag: 'TIME MACHINE',
      title: '5-Minute History & Gantt Replay',
      description:
        'Scrub backward through a 5-minute rolling ring buffer. Inspect past frame tracks, velocity dynamics, and replay historical moments with frame-level fidelity.',
      specs: ['Gantt-style track lifetime bars', 'Variable speed playback (0.5x-4x)', 'CLEAR MOT (MOTA, IDF1) metrics'],
      accent: 'blue',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-blue-500/[0.04] border border-blue-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            <span>BUFFER WINDOW</span>
          </div>
          <span className="text-blue-300 font-bold">5 MIN / 18,000 FRAMES</span>
        </div>
      ),
    },
    {
      icon: MapIcon,
      tag: 'SPATIAL INTELLIGENCE',
      title: '2D Top-Down Spatial Scene Map',
      description:
        'Transform camera-plane coordinates into a bird’s-eye 2D spatial density map with live position markers, bearing vectors, and track clusters.',
      specs: ['Real-time spatial density rendering', 'Track velocity & heading vectors', 'Interactive focus & follow mode'],
      accent: 'pink',
      microPreview: (
        <div className="mt-4 p-2.5 rounded-lg bg-pink-500/[0.04] border border-pink-500/20 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-pink-400">
            <MapIcon className="w-3.5 h-3.5" />
            <span>SPATIAL MAPPING</span>
          </div>
          <span className="text-pink-300 font-bold">640x480 TOP-DOWN DENSITY</span>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Engineered for Precision & Performance
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Every layer of TrackVision is architected in pure TypeScript and ONNX Runtime Web for native client-side execution with zero compromise on accuracy.
          </p>
        </div>

        {/* Feature Cards Grid with Cursor Spotlight Effect */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group spotlight-card glass-card p-6 sm:p-8 rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col justify-between relative overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
              >
                <div>
                  {/* Top Row: Icon & Tag */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center group-hover:scale-110 group-hover:border-white/40 transition-all shadow-inner">
                      <Icon className="w-6 h-6 text-white/90" />
                    </div>
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#AAAAAA] group-hover:text-white transition-colors">
                      {feat.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 group-hover:text-white transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#999999] leading-relaxed mb-4 font-normal">
                    {feat.description}
                  </p>

                  {/* Micro-preview Widget */}
                  {feat.microPreview}
                </div>

                {/* Specs List */}
                <div className="pt-4 border-t border-white/10 flex flex-col gap-2 mt-6">
                  {feat.specs.map((spec, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-xs font-mono text-[#CCCCCC]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-cyan-400 transition-colors" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
