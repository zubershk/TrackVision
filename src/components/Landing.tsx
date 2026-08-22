import React from 'react';
import { useVisionStore } from '../store';
import { MonitorPlay, ArrowRight } from 'lucide-react';

export function Landing() {
  const setMode = useVisionStore(s => s.setMode);

  return (
    <div className="flex-1 bg-[#000000] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Elements - Minimalist */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#050505] via-[#000000] to-[#000000]" />
      
      <div className="relative z-10 max-w-2xl w-full text-center flex flex-col items-center">
        <MonitorPlay className="w-16 h-16 text-[#F5F5F5] mb-8 font-light" strokeWidth={1} />
        
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[#F5F5F5] mb-4 font-sans">
          TrackVision
        </h1>
        
        <p className="text-[#B8B8B8] text-sm md:text-base font-mono uppercase tracking-widest mb-12">
          Precision Object Intelligence
        </p>

        <button 
          onClick={() => setMode('app')}
          className="group bg-[#F5F5F5] hover:bg-[#D4D4D4] text-[#000000] px-8 py-3 rounded-sm font-medium tracking-wide transition-all flex items-center gap-3 text-sm"
        >
          Start Tracking
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
