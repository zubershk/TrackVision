import React, { useState } from 'react';
import { Terminal, Copy, Check, Code2, Sparkles, Cpu, Layers } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function CodeQuickstart() {
  const [activeTab, setActiveTab] = useState<'hook' | 'tracker' | 'webgpu'>('hook');
  const [copied, setCopied] = useState(false);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  const codeSnippets = {
    hook: `import React, { useRef } from 'react';
import { useVisionEngine } from './hooks/useVisionEngine';
import { useVisionStore } from './store';
import { drawTrackingHUD } from './lib/draw';

export function VisionStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize multi-worker WebGPU tracking engine
  const { isModelLoading, modelError } = useVisionEngine(videoRef);
  const frames = useVisionStore(s => s.frames);
  const telemetry = useVisionStore(s => s.telemetry);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-4 right-4 font-mono text-xs text-white">
        FPS: {telemetry.fps} | Latency: {telemetry.inferenceMs}ms
      </div>
    </div>
  );
}`,
    tracker: `// ByteTrack++ Temporal Multi-Object Association
import { KalmanFilter } from './kalman';
import { hungarianAlgorithm } from './hungarian';

export class ByteTracker {
  private tracks: Track[] = [];
  private frameId: number = 0;

  public update(detections: Detection[], reidEmbeddings: Float32Array[]): Track[] {
    this.frameId++;
    
    // 1. Predict new locations with 6x6 covariance Kalman filter
    for (const track of this.tracks) {
      track.predict();
    }

    // 2. Fused cost matrix: 0.60 IoU + 0.30 Appearance + 0.10 Class
    const costMatrix = this.computeFusedCost(this.tracks, detections, reidEmbeddings);
    
    // 3. Hungarian optimal assignment
    const { matches, unmatchedTracks, unmatchedDetections } = 
      hungarianAlgorithm(costMatrix, 0.7);

    // 4. Update state machine: NEW -> TRACKED -> LOST -> REMOVED
    this.updateTrackStates(matches, unmatchedTracks, unmatchedDetections);
    
    return this.tracks.filter(t => t.isConfirmed());
  }
}`,
    webgpu: `// ONNX Runtime WebGPU Session Configuration
import * as ort from 'onnxruntime-web';

export async function createVisionSession(modelUrl: string): Promise<ort.InferenceSession> {
  // Configure WebGPU hardware acceleration backend
  ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
  ort.env.wasm.simd = true;

  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: [
      {
        name: 'webgpu',
        deviceType: 'gpu',
        powerPreference: 'high-performance',
      },
      'wasm' // Seamless fallback
    ],
    graphOptimizationLevel: 'all',
  });

  return session;
}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const models = [
    { name: 'YOLOv8n (COCO)', file: 'yolov8n.onnx', size: '~4 KB (demo) / 6 MB', purpose: 'Fast 80-Class Detection' },
    { name: 'YOLO-World', file: 'yoloworld.onnx', size: '~4 KB (demo) / 8 MB', purpose: 'Open-Vocabulary Detection' },
    { name: 'OSNet x1.0', file: 'osnet_x1_0.onnx', size: '140 KB', purpose: '512-dim Re-ID Embeddings' },
    { name: 'CLIP Text Encoder', file: 'clip_text.onnx', size: '96 MB', purpose: 'Zero-Shot Text Prompt Anchors' },
  ];

  return (
    <section id="code" className="py-20 sm:py-28 relative bg-[#020202] border-t border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>DEVELOPER QUICKSTART</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Clean, Modular TypeScript Architecture
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Integrate client-side vision workers and ByteTrack persistence into your existing React or WebGPU frontend application in minutes.
          </p>
        </div>

        {/* Code Block Window */}
        <div className="w-full max-w-4xl mx-auto rounded-2xl glass-panel border border-white/20 shadow-2xl overflow-hidden backdrop-blur-2xl mb-12">
          {/* Window Titlebar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            {/* Window Dots & Tabs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
              </div>

              {/* Snippet Tabs */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab('hook')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeTab === 'hook'
                      ? 'bg-white/20 text-white shadow-inner font-semibold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  React Hook
                </button>
                <button
                  onClick={() => setActiveTab('tracker')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeTab === 'tracker'
                      ? 'bg-white/20 text-white shadow-inner font-semibold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ByteTrack++ Core
                </button>
                <button
                  onClick={() => setActiveTab('webgpu')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeTab === 'webgpu'
                      ? 'bg-white/20 text-white shadow-inner font-semibold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  WebGPU Config
                </button>
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="glass-btn px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-white"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Code Content */}
          <div className="p-4 sm:p-6 overflow-x-auto font-mono text-xs sm:text-sm text-[#E0E0E0] bg-[#050505]/80 leading-relaxed custom-scrollbar max-h-[420px]">
            <pre>
              <code>{codeSnippets[activeTab]}</code>
            </pre>
          </div>
        </div>

        {/* Neural Models Breakdown Table */}
        <div className="w-full max-w-4xl mx-auto rounded-2xl glass-card border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Embedded Neural Model Specifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {models.map((m, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block mb-1">{m.name}</span>
                  <span className="text-[11px] font-mono text-white/50 block mb-2">{m.purpose}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#888888]">SIZE:</span>
                  <span className="text-emerald-400 font-medium">{m.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
