import React from 'react';
import { Compass, ShoppingBag, Trophy, Factory, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export function UseCasesSection() {
  const useCases = [
    {
      icon: Compass,
      tag: 'ROBOTICS & UAV',
      title: 'Autonomous Navigation & Drone Tracking',
      description:
        'Equip edge robots and drones with sub-20ms visual target following and obstacle trajectory prediction running locally on low-power companion computers.',
      benefits: ['Zero telemetry lag for fast flight control', 'Kalman velocity vectors for trajectory intercept', 'Works without ground network connectivity'],
    },
    {
      icon: ShoppingBag,
      tag: 'RETAIL INTELLIGENCE',
      title: 'Anonymous Foot-Traffic & Spatial Analytics',
      description:
        'Measure customer flow patterns, shelf dwell times, and occupancy density across retail floors with absolute privacy compliance — no video ever leaves the premises.',
      benefits: ['Zero PII or facial data stored', '2D top-down store heatmapping', '5-minute historical replay scrubber'],
    },
    {
      icon: Trophy,
      tag: 'SPORTS TELEMETRY',
      title: 'Athlete Trajectory & Play Analysis',
      description:
        'Track multiple fast-moving athletes across field sports simultaneously, re-identifying players through dense occlusions and scrums using OSNet appearance models.',
      benefits: ['Persistent tracking through player overlaps', 'Speed, acceleration, and distance metrics', 'CLEAR MOT benchmark evaluation built-in'],
    },
    {
      icon: Factory,
      tag: 'INDUSTRIAL AUTOMATION',
      title: 'Conveyor Line QA & Safety Zone Monitoring',
      description:
        'Count parts, monitor assembly line flow rates, and establish visual safety perimeters around heavy machinery directly through standard browser-connected IP cameras.',
      benefits: ['Open-vocabulary custom part detection', 'Split identity recovery on dense lines', 'Instant deployment with zero client install'],
    },
  ];

  return (
    <section id="use-cases" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>APPLICATIONS & DEPLOYMENTS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Versatile Edge Vision for Any Domain
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            From smart cities and retail to robotics and sports science, TrackVision delivers enterprise-grade multi-object intelligence right in the browser.
          </p>
        </div>

        {/* Use Case Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {useCases.map((uc, idx) => {
            const Icon = uc.icon;
            return (
              <div
                key={idx}
                className="group glass-card p-6 sm:p-8 rounded-2xl border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-all shadow-inner">
                      <Icon className="w-6 h-6 text-white/90" />
                    </div>
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#AAAAAA]">
                      {uc.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-white transition-colors">
                    {uc.title}
                  </h3>

                  <p className="text-sm text-[#999999] leading-relaxed mb-6 font-normal">
                    {uc.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                  {uc.benefits.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2 text-xs font-mono text-[#CCCCCC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{b}</span>
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
