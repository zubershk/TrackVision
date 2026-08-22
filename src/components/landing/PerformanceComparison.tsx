import React from 'react';
import { Zap, ShieldCheck, Check, X, Minus, Activity, ArrowUpRight, Cpu } from 'lucide-react';

export function PerformanceComparison() {
  const comparisonData = [
    {
      metric: 'Per-Frame Inference Cost',
      trackvision: '$0.00 (Zero Server Compute)',
      cloud: '~$1.50 / 1,000 frames (High API bills)',
      python: 'High ($200-$1,000s hardware/cloud GPU)',
      highlight: true,
    },
    {
      metric: 'End-to-End Latency',
      trackvision: '15-30 ms (Local WebGPU V-Sync)',
      cloud: '250-600 ms (Network Roundtrip Lag)',
      python: '20-40 ms (Local GPU)',
      highlight: true,
    },
    {
      metric: 'Video Stream Privacy',
      trackvision: '100% Local (Zero bytes leave device)',
      cloud: 'Full video streamed to 3rd-party servers',
      python: 'Local (Requires dedicated physical box)',
      highlight: true,
    },
    {
      metric: 'Setup & Distribution',
      trackvision: 'Instant 1-Click Browser URL / PWA',
      cloud: 'Complex IAM credentials, API billing setup',
      python: 'CUDA, PyTorch, C++ compiler nightmare',
      highlight: false,
    },
    {
      metric: 'Temporal Multi-Object Tracking',
      trackvision: 'ByteTrack++ (Full 6x6 Kalman + ReID)',
      cloud: 'Often per-frame detection only (No ReID)',
      python: 'Available (Custom library integration)',
      highlight: false,
    },
    {
      metric: 'Offline & Edge Capability',
      trackvision: '100% Offline Ready (Cached WebAssembly)',
      cloud: 'Fails immediately when offline',
      python: 'Offline ready (Requires dedicated hardware)',
      highlight: false,
    },
  ];

  const latencyBreakdown = [
    { stage: 'Offscreen Capture & Preprocess', time: '1.8 ms', pct: 10, color: 'bg-blue-400' },
    { stage: 'YOLOv8n Neural Inference', time: '11.2 ms', pct: 64, color: 'bg-cyan-400' },
    { stage: 'OSNet ReID Feature Embedding', time: '2.4 ms', pct: 14, color: 'bg-purple-400' },
    { stage: 'ByteTrack++ Kalman Association', time: '0.8 ms', pct: 5, color: 'bg-emerald-400' },
    { stage: 'Canvas HUD & V-Sync Render', time: '1.2 ms', pct: 7, color: 'bg-amber-400' },
  ];

  return (
    <section id="benchmarks" className="py-20 sm:py-28 relative bg-[#030303] border-t border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>PERFORMANCE & BENCHMARKS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Edge In-Browser vs Traditional Computer Vision
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Eliminate server bills, network latency bottlenecks, and privacy liabilities with client-side WebGPU acceleration.
          </p>
        </div>

        {/* Latency Breakdown Bar */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/15 mb-14 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
                HARDWARE-ACCELERATED LATENCY BUDGET (TOTAL: 17.4ms / ~58 FPS)
              </span>
              <p className="text-sm text-[#B8B8B8]">
                Real-world breakdown measured on an Apple M-series / RTX 30-series WebGPU runtime.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
              Real-Time Compliant (&lt;33ms)
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-4 rounded-full bg-white/5 overflow-hidden flex mb-6 border border-white/10 p-0.5">
            {latencyBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`${item.color} h-full first:rounded-l-full last:rounded-r-full transition-all`}
                style={{ width: `${item.pct}%` }}
                title={`${item.stage}: ${item.time}`}
              />
            ))}
          </div>

          {/* Stage Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {latencyBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                <div className="flex flex-col">
                  <span className="text-white font-semibold">{item.time}</span>
                  <span className="text-[#888888] text-[11px] truncate">{item.stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="w-full overflow-x-auto rounded-2xl glass-panel border border-white/15 shadow-2xl backdrop-blur-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04] text-xs font-mono uppercase tracking-wider text-[#AAAAAA]">
                <th className="p-4 sm:p-5">Dimension</th>
                <th className="p-4 sm:p-5 text-cyan-300 font-bold bg-white/[0.04] border-x border-white/10">
                  TrackVision (Client WebGPU)
                </th>
                <th className="p-4 sm:p-5">Cloud Vision APIs (AWS/GCP)</th>
                <th className="p-4 sm:p-5">Desktop Python / PyTorch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-medium text-white">
                    {row.metric}
                  </td>
                  <td className="p-4 sm:p-5 text-cyan-200 font-semibold bg-cyan-500/[0.03] border-x border-white/10 font-mono">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{row.trackvision}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-[#AAAAAA]">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-amber-400/80 shrink-0" />
                      <span>{row.cloud}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-[#AAAAAA]">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-white/50 shrink-0" />
                      <span>{row.python}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
