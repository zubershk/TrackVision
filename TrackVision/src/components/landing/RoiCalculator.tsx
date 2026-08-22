import React, { useState } from 'react';
import { DollarSign, Shield, Zap, TrendingUp, Sparkles, Server, HardDrive, Cpu, CheckCircle2 } from 'lucide-react';
import { useSpotlightEffect } from '../../hooks/useSpotlightEffect';

export function RoiCalculator() {
  const containerRef = useSpotlightEffect<HTMLDivElement>();
  const [cameras, setCameras] = useState(4);
  const [fpsPreset, setFpsPreset] = useState<'30fps' | '60fps'>('60fps');

  // Calculation logic
  const framesPerSec = fpsPreset === '60fps' ? 60 : 30;
  const hoursPerDay = 12; // typical commercial operation
  const daysPerMonth = 30;
  const totalFramesMonthly = cameras * framesPerSec * 3600 * hoursPerDay * daysPerMonth;

  // Cloud API pricing average: $0.0015 per image/frame (e.g. AWS Rekognition / Google Cloud Vision)
  const cloudCostPerFrame = 0.0012;
  const monthlyCloudCost = Math.round((totalFramesMonthly / 1000) * (cloudCostPerFrame * 1000));
  
  // Bandwidth saved (1080p H.264 stream ~ 4 Mbps)
  const bandwidthGbps = (cameras * (fpsPreset === '60fps' ? 4.5 : 2.5) * 3600 * hoursPerDay * daysPerMonth) / (8 * 1024);
  const monthlyBandwidthTB = (bandwidthGbps / 1024).toFixed(1);

  return (
    <section className="py-16 sm:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>CLOUD COST & BANDWIDTH CALCULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Calculate Your In-Browser Edge Savings
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Eliminate recurring cloud vision ingestion charges and upstream bandwidth costs by processing multi-camera streams locally on client devices.
          </p>
        </div>

        {/* Calculator Interactive Glass Panel */}
        <div ref={containerRef} className="max-w-5xl mx-auto rounded-2xl glass-panel border border-white/20 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl spotlight-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Interactive Sliders & Presets */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* Slider 1: Active Cameras */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/80 uppercase">
                    Active Video Cameras / Feeds
                  </span>
                  <span className="text-base font-mono font-bold text-cyan-400 px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    {cameras} {cameras === 1 ? 'Camera' : 'Cameras'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={32}
                  value={cameras}
                  onChange={(e) => setCameras(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#777777]">
                  <span>1 Stream</span>
                  <span>8 Streams</span>
                  <span>16 Streams</span>
                  <span>32 Streams</span>
                </div>
              </div>

              {/* Toggle: Framerate */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-mono text-white/80 uppercase">
                  Target Tracking Framerate
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFpsPreset('30fps')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-2 ${
                      fpsPreset === '30fps'
                        ? 'bg-white/20 border-white/40 text-white shadow-inner'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>30 FPS (Standard)</span>
                  </button>
                  <button
                    onClick={() => setFpsPreset('60fps')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-2 ${
                      fpsPreset === '60fps'
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>60 FPS (High-Speed)</span>
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#CCCCCC]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited inferences with zero token or per-frame API metering</span>
                </div>
                <div className="flex items-center gap-2 text-[#CCCCCC]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero outbound internet video streaming required</span>
                </div>
              </div>
            </div>

            {/* Right: Dynamic Savings Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Cloud API Bill Saved */}
              <div className="p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/30 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                    ESTIMATED CLOUD BILL
                  </span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono block">
                    ${monthlyCloudCost.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-400/90 font-mono">
                    Saved monthly ($0 with TrackVision)
                  </span>
                </div>
              </div>

              {/* Card 2: Bandwidth Upload Saved */}
              <div className="p-5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/30 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">
                    UPSTREAM BANDWIDTH
                  </span>
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono block">
                    {monthlyBandwidthTB} TB
                  </span>
                  <span className="text-[11px] text-cyan-400/90 font-mono">
                    Zero video stream upload required
                  </span>
                </div>
              </div>

              {/* Card 3: Latency Advantage */}
              <div className="p-5 rounded-xl bg-purple-500/[0.04] border border-purple-500/30 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-purple-400 font-semibold">
                    LATENCY REDUCTION
                  </span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono block">
                    -94%
                  </span>
                  <span className="text-[11px] text-purple-400/90 font-mono">
                    16ms local vs ~350ms network roundtrip
                  </span>
                </div>
              </div>

              {/* Card 4: Compliance & Privacy */}
              <div className="p-5 rounded-xl bg-amber-500/[0.04] border border-amber-500/30 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold">
                    PRIVACY COMPLIANCE
                  </span>
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono block">
                    100%
                  </span>
                  <span className="text-[11px] text-amber-400/90 font-mono">
                    GDPR, CCPA & HIPAA compliant by design
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
