import React, { useState } from 'react';
import { useVisionStore } from '../store';
import { cn } from '../lib/utils';
import { Zap, Eye } from 'lucide-react';

export function VisionPanel() {
  const visionMode = useVisionStore(s => s.visionMode);
  const setVisionMode = useVisionStore(s => s.setVisionMode);
  const openConcepts = useVisionStore(s => s.openConcepts);
  const setOpenConcepts = useVisionStore(s => s.setOpenConcepts);
  const executionProvider = useVisionStore(s => s.telemetry.executionProvider);
  const deviceAcceleration = useVisionStore(s => s.telemetry.deviceAcceleration);
  
  const [conceptsInput, setConceptsInput] = useState(openConcepts.join(', '));

  const handleApplyConcepts = () => {
    const concepts = conceptsInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (concepts.length > 0) {
      setOpenConcepts(concepts);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] font-sans">
      <div className="p-4 border-b border-[#1A1A1A]">
        <h2 className="text-sm font-medium text-[#F5F5F5]">Detection Engine</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* Detection Mode */}
        <div>
          <h3 className="text-xs text-[#777777] uppercase mb-4 tracking-widest">Detection Mode</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setVisionMode('fast')}
              className={cn(
                "flex items-start gap-4 p-4 rounded-sm border text-left transition-all",
                visionMode === 'fast' ? "border-[#F5F5F5] bg-[#121212]" : "border-[#1A1A1A] hover:border-[#444444] bg-[#050505]"
              )}
            >
              <Zap className={cn("w-5 h-5 shrink-0", visionMode === 'fast' ? "text-[#F5F5F5]" : "text-[#777777]")} />
              <div>
                <div className={cn("text-sm font-medium mb-1", visionMode === 'fast' ? "text-[#F5F5F5]" : "text-[#B8B8B8]")}>Fast Vision</div>
                <div className="text-xs text-[#777777]">YOLOv8n ONNX with ByteTrack + OSNet ReID appearance matching. Fixed 80-class COCO vocabulary, max FPS.</div>
              </div>
            </button>
            
            <button
              onClick={() => setVisionMode('open')}
              className={cn(
                "flex items-start gap-4 p-4 rounded-sm border text-left transition-all",
                visionMode === 'open' ? "border-[#F5F5F5] bg-[#121212]" : "border-[#1A1A1A] hover:border-[#444444] bg-[#050505]"
              )}
            >
              <Eye className={cn("w-5 h-5 shrink-0", visionMode === 'open' ? "text-[#F5F5F5]" : "text-[#777777]")} />
              <div>
                <div className={cn("text-sm font-medium mb-1", visionMode === 'open' ? "text-[#F5F5F5]" : "text-[#B8B8B8]")}>Open Vision</div>
                <div className="text-xs text-[#777777]">YOLO-World + CLIP text embeddings computed in-browser. Zero-shot: find any object by typing its name.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Open Vision Query Interface */}
        {visionMode === 'open' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-xs text-[#777777] uppercase mb-4 tracking-widest">What should TrackVision find?</h3>
            <div className="flex flex-col gap-3">
              <textarea
                value={conceptsInput}
                onChange={e => setConceptsInput(e.target.value)}
                placeholder="e.g. laptop, phone, headphones, backpack, water bottle"
                className="w-full bg-[#050505] border border-[#242424] rounded-sm p-3 text-sm text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#777777] resize-none h-24"
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#777777]">Comma-separated concepts</div>
                <button
                  onClick={handleApplyConcepts}
                  className="px-4 py-2 bg-[#F5F5F5] text-[#000000] text-sm font-medium rounded-sm hover:bg-[#E0E0E0] transition-colors"
                >
                  Start Open Vision
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="text-xs text-[#777777] uppercase mb-4 tracking-widest">Runtime Status</h3>
              <div className="p-3 bg-[#1A1A1A] rounded-sm border border-[#242424] flex justify-between items-center text-sm">
                <span className="text-[#B8B8B8]">Execution Provider</span>
                <span className="text-[#F5F5F5] font-mono uppercase">{executionProvider}</span>
              </div>
              {deviceAcceleration && (
                <div className="mt-2 px-3 py-2 bg-[#111111] rounded-sm border border-[#1F1F1F] flex justify-between items-center text-xs">
                  <span className="text-[#777777]">Acceleration</span>
                  <span className="text-[#AAAAAA] font-mono">{deviceAcceleration}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
