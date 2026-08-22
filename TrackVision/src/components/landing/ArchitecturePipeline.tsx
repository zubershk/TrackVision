import React, { useState } from 'react';
import { Video, Cpu, Brain, Layers, GitBranch, Database, Monitor, ArrowRight, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface PipelineNode {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  tech: string;
  latency: string;
  summary: string;
  details: {
    inputs: string;
    outputs: string;
    throughput: string;
    highlights: string[];
  };
}

export function ArchitecturePipeline() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('tracker');

  const nodes: PipelineNode[] = [
    {
      id: 'input',
      name: 'Input Layer',
      category: 'CAPTURE',
      icon: Video,
      tech: 'WebRTC / OffscreenCanvas',
      latency: '< 1.5 ms',
      summary: 'Zero-copy frame acquisition directly from camera feed to worker-shared buffers.',
      details: {
        inputs: 'Webcam MediaStream (1280x720 RGB @ 60 FPS)',
        outputs: 'OffscreenCanvas ImageBitmap / SharedArrayBuffer',
        throughput: '60 FPS Continuous',
        highlights: [
          'Direct GPU texture capture via OffscreenCanvas',
          'Aspect-preserving letterbox padding to 640x640',
          'Zero main-thread UI blocking during frame acquisition',
        ],
      },
    },
    {
      id: 'detection',
      name: 'Detection Worker',
      category: 'NEURAL INFERENCE',
      icon: Cpu,
      tech: 'ONNX Runtime Web (WebGPU)',
      latency: '11.2 ms',
      summary: 'High-speed object detection executing YOLOv8n or YOLO-World in a dedicated Web Worker.',
      details: {
        inputs: '640x640x3 Normalized Float32 Tensor',
        outputs: '8400 Candidate Bounding Boxes + Confidence Class Scores',
        throughput: '60-80 FPS on WebGPU',
        highlights: [
          'WebGPU execution provider with WASM SIMD fallback',
          'Class-aware Non-Maximum Suppression (IoU: 0.45)',
          'Dual mode: Fast COCO 80 categories or open-vocabulary CLIP prompt embeddings',
        ],
      },
    },
    {
      id: 'reid',
      name: 'ReID Worker',
      category: 'FEATURE EMBEDDING',
      icon: Brain,
      tech: 'OSNet x1.0 (ICCV 2019)',
      latency: '2.4 ms',
      summary: 'Extracts 512-dimensional appearance vectors for each detected bounding box crop.',
      details: {
        inputs: '256x128 Letterbox Detections Crop Batch',
        outputs: '512-dimensional L2-normalized hypersphere vectors',
        throughput: 'Batched inference in single forward pass',
        highlights: [
          'Trained on Market-1501 and DukeMTMC-reID benchmarks',
          'Exponential Moving Average (EMA α=0.3) appearance model',
          'Enables robust track recovery after occlusions and re-entries',
        ],
      },
    },
    {
      id: 'tracker',
      name: 'ByteTrack++ Engine',
      category: 'TEMPORAL PERSISTENCE',
      icon: GitBranch,
      tech: 'Custom TypeScript + 6x6 Kalman',
      latency: '0.8 ms',
      summary: 'Associates detections across time with 6x6 Kalman state filtering and Hungarian matching.',
      details: {
        inputs: 'Detections [bbox, score, class] + ReID 512-dim vectors',
        outputs: 'Confirmed Active Tracks [id, bbox, velocity, state]',
        throughput: 'Sub-millisecond association (<1ms)',
        highlights: [
          'State vector: [x, y, vx, vy, w, h] with constant acceleration covariance model',
          'Weighted cost matrix: 0.60 IoU + 0.30 Appearance + 0.10 Class consistency',
          'Split identity track merging and Kalman occlusion interpolation',
        ],
      },
    },
    {
      id: 'state',
      name: 'Reactive Telemetry',
      category: 'STATE & BUFFER',
      icon: Database,
      tech: 'Zustand Store + Ring Buffer',
      latency: '< 0.3 ms',
      summary: 'Maintains 5-minute sliding history ring buffer and computes live CLEAR MOT metrics.',
      details: {
        inputs: 'Frame telemetry, active tracks, dropped frame stats',
        outputs: 'Reactive hooks, time-machine frames, MOTA/IDF1 metrics',
        throughput: 'Zero-garbage collection memory reuse',
        highlights: [
          '5-minute sliding window with automatic garbage-free memory pruning',
          'Instant seek & frame replay for time-machine scrubber',
          'Real-time MOTA, MOTP, precision, recall, and FPS computation',
        ],
      },
    },
    {
      id: 'ui',
      name: 'HUD & Canvas Layer',
      category: 'DISPLAY & CONTROLS',
      icon: Monitor,
      tech: 'Liquid Glass + 60fps Canvas',
      latency: '1.2 ms',
      summary: 'Renders hardware-accelerated bounding boxes, ghost trajectory trails, and telemetry.',
      details: {
        inputs: 'Active frame tracks, selected target ID, ghost trail history',
        outputs: 'Liquid-glass HUD overlays, 2D scene density map',
        throughput: '60 FPS Smooth V-Sync',
        highlights: [
          'High-DPI retina canvas rendering with corner brackets and crosshairs',
          'Fading alpha trajectory ghost trails (15-25 frames)',
          'Top-down 2D spatial map with live bearing vectors',
        ],
      },
    },
  ];

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[3];

  return (
    <section id="architecture" className="py-20 sm:py-28 relative bg-[#020202] border-t border-b border-white/5">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03),transparent_70%)] pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>PIPELINE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Modular Multi-Worker Pipeline
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Inspection into TrackVision’s multi-threaded client-side execution graph. Zero latency overhead, non-blocking UI rendering, and sub-millisecond data association.
          </p>
        </div>

        {/* Pipeline Diagram Node Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {nodes.map((node, idx) => {
            const Icon = node.icon;
            const isSelected = node.id === selectedNodeId;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[110px] cursor-pointer ${
                  isSelected
                    ? 'glass-strong border-white/40 bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.1)] scale-102'
                    : 'glass border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {/* Node Index Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-white/40">0{idx + 1}</span>
                </div>

                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#888888] block">
                    {node.category}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-white truncate block">
                    {node.name}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#00F0FF]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Node Deep-Dive Inspection Card */}
        <div className="glass-panel p-6 sm:p-10 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Overview */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white shadow-inner">
                  {React.createElement(activeNode.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                    {activeNode.category}
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {activeNode.name}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#B8B8B8] leading-relaxed mb-6">
                {activeNode.summary}
              </p>

              {/* Specs Pills */}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">RUNTIME TECH:</span>
                  <span className="text-white font-medium px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {activeNode.tech}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">AVERAGE LATENCY:</span>
                  <span className="text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {activeNode.latency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">THROUGHPUT:</span>
                  <span className="text-white font-medium">
                    {activeNode.details.throughput}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Inputs, Outputs & Key Highlights */}
            <div className="lg:col-span-7 flex flex-col gap-6 bg-white/[0.02] p-6 rounded-xl border border-white/10">
              {/* Input / Output Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] font-mono text-[#888888] uppercase block mb-1">
                    INPUT DATA
                  </span>
                  <span className="text-xs font-mono text-white/90">
                    {activeNode.details.inputs}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] font-mono text-[#888888] uppercase block mb-1">
                    OUTPUT TENSORS / STRUCTS
                  </span>
                  <span className="text-xs font-mono text-cyan-300">
                    {activeNode.details.outputs}
                  </span>
                </div>
              </div>

              {/* Architectural Highlights */}
              <div>
                <span className="text-xs font-mono font-semibold text-white/80 uppercase tracking-wider block mb-3">
                  Architectural Highlights
                </span>
                <div className="flex flex-col gap-2.5">
                  {activeNode.details.highlights.map((highlight, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#CCCCCC]">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
