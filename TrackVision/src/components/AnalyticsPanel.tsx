import React, { useMemo } from 'react';
import { useVisionStore } from '../store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { 
  Cpu, 
  Zap, 
  Activity, 
  Gauge, 
  Layers, 
  ShieldCheck, 
  Flame, 
  Smartphone, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export function AnalyticsPanel() {
  const frames = useVisionStore(s => s.frames);
  const trackMeta = useVisionStore(s => s.trackMeta);
  const telemetry = useVisionStore(s => s.telemetry);
  const hardwareInfo = useVisionStore(s => s.hardwareInfo);
  const isTracking = useVisionStore(s => s.isTracking);

  const { volumeData, classData, latencyHistoryData } = useMemo(() => {
    // Generate volume chart data (objects per frame over time)
    const sampleRate = Math.max(1, Math.floor(frames.length / 50));
    const volumeData = frames.filter((_, i) => i % sampleRate === 0).map(f => ({
      time: f.timestamp,
      count: f.tracks.length
    }));

    // Generate class distribution data
    const classCount: Record<string, number> = {};
    for (const meta of trackMeta.values()) {
      classCount[meta.className] = (classCount[meta.className] || 0) + 1;
    }
    const classData = Object.entries(classCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Prepare Latency History Data
    const latencyHistoryData = telemetry.latencyHistory.length > 0
      ? telemetry.latencyHistory.map((s, idx) => ({
          idx,
          total: s.total,
          inference: s.inference,
          preprocess: s.preprocess,
          postprocess: s.postprocess,
          tracking: s.tracking,
          fps: s.fps
        }))
      : Array.from({ length: 20 }, (_, i) => ({
          idx: i,
          total: telemetry.frameMs || 0,
          inference: telemetry.inferenceMs || 0,
          preprocess: telemetry.preprocessMs || 0,
          postprocess: telemetry.postprocessMs || 0,
          tracking: telemetry.trackingMs || 0,
          fps: telemetry.fps || 0
        }));

    return { volumeData, classData, latencyHistoryData };
  }, [frames, trackMeta, telemetry]);

  const activeProvider = telemetry.executionProvider || hardwareInfo.executionProvider || 'wasm';
  const accelerationDesc = telemetry.deviceAcceleration || hardwareInfo.deviceAcceleration || 'WASM SIMD';

  const isHardwareAccelerated = activeProvider === 'webgpu' || activeProvider === 'webnn' || activeProvider === 'webgl';

  const providerBadges = [
    {
      id: 'webnn',
      name: 'WebNN (NPU/DirectML)',
      desc: 'Native Neural Accelerator',
      supported: hardwareInfo.webnnSupported,
      active: activeProvider === 'webnn'
    },
    {
      id: 'webgpu',
      name: 'WebGPU (Compute)',
      desc: 'Direct Compute Shader',
      supported: hardwareInfo.webgpuSupported,
      active: activeProvider === 'webgpu'
    },
    {
      id: 'webgl',
      name: 'WebGL (GPGPU)',
      desc: 'Mobile GPU Shader Acceleration',
      supported: hardwareInfo.webglSupported,
      active: activeProvider === 'webgl'
    },
    {
      id: 'wasm',
      name: 'WASM SIMD (CPU)',
      desc: 'Multi-threaded Vectorized CPU',
      supported: hardwareInfo.wasmSimdSupported,
      active: activeProvider === 'wasm'
    }
  ];

  const totalPipelineMs = (telemetry.preprocessMs + telemetry.inferenceMs + telemetry.postprocessMs + telemetry.trackingMs) || 1;
  const preprocessPct = Math.min(100, Math.round((telemetry.preprocessMs / totalPipelineMs) * 100));
  const inferencePct = Math.min(100, Math.round((telemetry.inferenceMs / totalPipelineMs) * 100));
  const postprocessPct = Math.min(100, Math.round((telemetry.postprocessMs / totalPipelineMs) * 100));
  const trackingPct = Math.min(100, Math.round((telemetry.trackingMs / totalPipelineMs) * 100));

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#F5F5F5] font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-tight text-[#F5F5F5]">Performance & Acceleration</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
            isHardwareAccelerated 
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-700/50' 
              : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
          }`}>
            {activeProvider.toUpperCase()} ACTIVE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {/* Hardware Acceleration Status Card */}
        <div className="p-3.5 bg-[#0D0D0D] border border-[#222222] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E0E0E0]">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Execution Provider Diagnostics</span>
            </div>
            <span className="text-[10px] font-mono text-[#888888] flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-[#666666]" />
              Mobile FPS Boost: ON
            </span>
          </div>

          {/* Active Provider Banner */}
          <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-md flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#888888] uppercase tracking-wider font-mono">Current Active Engine</div>
              <div className="text-xs font-semibold text-[#FFFFFF] mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                {accelerationDesc}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#888888] font-mono">Thread Pool</div>
              <div className="text-xs font-mono font-medium text-emerald-400">
                {typeof navigator !== 'undefined' ? `${navigator.hardwareConcurrency || 4} Concurrency` : '4 Threads'}
              </div>
            </div>
          </div>

          {/* Provider Probing Grid */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {providerBadges.map(p => (
              <div 
                key={p.id}
                className={`p-2 rounded border text-left flex flex-col justify-between transition-all ${
                  p.active
                    ? 'bg-cyan-950/20 border-cyan-500/60 ring-1 ring-cyan-500/20'
                    : p.supported
                    ? 'bg-[#111111] border-[#222222] text-[#999999]'
                    : 'bg-[#0A0A0A] border-[#181818] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-medium ${p.active ? 'text-cyan-300 font-semibold' : 'text-[#CCCCCC]'}`}>
                    {p.name.split(' ')[0]}
                  </span>
                  {p.active ? (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      ENGAGED
                    </span>
                  ) : p.supported ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <span className="text-[9px] font-mono text-[#555555]">PROBED</span>
                  )}
                </div>
                <div className="text-[9px] text-[#777777] font-mono truncate mt-1">
                  {p.desc}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-[#777777] leading-relaxed">
            Automatic tiered fallback cascades from <strong className="text-[#AAAAAA]">WebNN → WebGPU → WebGL → WASM SIMD</strong>, preventing mobile inference frame stalls and memory spikes.
          </p>
        </div>

        {/* Realtime FPS & Latency Metric Strip */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-[#888888] uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Live Telemetry
            </h3>
            <span className="text-[10px] font-mono text-emerald-400">
              {isTracking ? 'STREAMING' : 'IDLE'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-lg overflow-hidden">
            <div className="bg-[#0A0A0A] p-2.5">
              <div className="text-[10px] text-[#777777] uppercase font-mono">Realtime FPS</div>
              <div className="text-base font-mono font-semibold text-emerald-400 mt-0.5">
                {telemetry.fps.toFixed(1)}
              </div>
            </div>
            <div className="bg-[#0A0A0A] p-2.5">
              <div className="text-[10px] text-[#777777] uppercase font-mono">Inference</div>
              <div className="text-base font-mono font-semibold text-cyan-400 mt-0.5">
                {telemetry.inferenceMs.toFixed(1)} <span className="text-[10px] font-normal text-[#666666]">ms</span>
              </div>
            </div>
            <div className="bg-[#0A0A0A] p-2.5">
              <div className="text-[10px] text-[#777777] uppercase font-mono">Frame Latency</div>
              <div className="text-base font-mono font-semibold text-[#FFFFFF] mt-0.5">
                {telemetry.frameMs.toFixed(1)} <span className="text-[10px] font-normal text-[#666666]">ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage-by-Stage Latency Pipeline Breakdown */}
        <div className="p-3.5 bg-[#0D0D0D] border border-[#222222] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#E0E0E0] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Pipeline Execution Breakdown
            </h3>
            <span className="text-[10px] font-mono text-[#888888]">Total: {telemetry.frameMs.toFixed(1)}ms</span>
          </div>

          {/* Visual Stacked Progress Bar */}
          <div className="h-3 w-full bg-[#181818] rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.max(4, preprocessPct)}%` }} 
              className="bg-amber-500 h-full transition-all duration-300" 
              title={`Preprocess: ${telemetry.preprocessMs.toFixed(1)}ms`} 
            />
            <div 
              style={{ width: `${Math.max(4, inferencePct)}%` }} 
              className="bg-cyan-500 h-full transition-all duration-300" 
              title={`Neural Inference: ${telemetry.inferenceMs.toFixed(1)}ms`} 
            />
            <div 
              style={{ width: `${Math.max(4, postprocessPct)}%` }} 
              className="bg-purple-500 h-full transition-all duration-300" 
              title={`Postprocess & NMS: ${telemetry.postprocessMs.toFixed(1)}ms`} 
            />
            <div 
              style={{ width: `${Math.max(4, trackingPct)}%` }} 
              className="bg-emerald-500 h-full transition-all duration-300" 
              title={`ByteTrack Tracking: ${telemetry.trackingMs.toFixed(1)}ms`} 
            />
          </div>

          {/* Pipeline Stage List */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#121212] border border-[#1E1E1E]">
              <span className="flex items-center gap-1.5 text-[#AAAAAA]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Preprocess
              </span>
              <span className="text-[#F5F5F5] font-semibold">{telemetry.preprocessMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#121212] border border-[#1E1E1E]">
              <span className="flex items-center gap-1.5 text-[#AAAAAA]">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                ONNX Infr
              </span>
              <span className="text-[#F5F5F5] font-semibold">{telemetry.inferenceMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#121212] border border-[#1E1E1E]">
              <span className="flex items-center gap-1.5 text-[#AAAAAA]">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                NMS Decode
              </span>
              <span className="text-[#F5F5F5] font-semibold">{telemetry.postprocessMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#121212] border border-[#1E1E1E]">
              <span className="flex items-center gap-1.5 text-[#AAAAAA]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ByteTrack
              </span>
              <span className="text-[#F5F5F5] font-semibold">{telemetry.trackingMs.toFixed(1)}ms</span>
            </div>
          </div>
        </div>

        {/* Live Latency Trend Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-[#888888] uppercase tracking-widest font-mono">
              Inference & Latency History (ms)
            </h3>
            <span className="text-[10px] font-mono text-[#666666]">Last 60 Frames</span>
          </div>
          <div className="h-28 -ml-6 bg-[#080808] border border-[#1A1A1A] rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyHistoryData}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222222', color: '#F5F5F5', fontSize: '11px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#06b6d4' }}
                  labelStyle={{ display: 'none' }}
                  cursor={{ stroke: '#333333' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inference" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#latencyGrad)" 
                  strokeWidth={1.5} 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detection Volume Chart */}
        <div>
          <h3 className="text-xs text-[#888888] uppercase mb-2 tracking-widest font-mono">Detection Volume Over Time</h3>
          <div className="h-28 -ml-6 bg-[#080808] border border-[#1A1A1A] rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5F5F5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#F5F5F5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222222', color: '#F5F5F5', fontSize: '11px' }}
                  itemStyle={{ color: '#F5F5F5' }}
                  labelStyle={{ display: 'none' }}
                  cursor={{ stroke: '#333333' }}
                />
                <Area type="monotone" dataKey="count" stroke="#F5F5F5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Distribution */}
        <div>
          <h3 className="text-xs text-[#888888] uppercase mb-2 tracking-widest font-mono">Active Target Categories</h3>
          {classData.length > 0 ? (
            <div className="h-32 bg-[#080808] border border-[#1A1A1A] rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: '#141414' }}
                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222222', color: '#F5F5F5', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16}>
                    {classData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : '#E0E0E0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg text-xs text-[#666666] text-center font-mono">
              Awaiting active track targets...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
