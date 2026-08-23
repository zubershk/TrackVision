import React, { useState } from 'react';
import { Eye, Zap, Sparkles, Plus, Check, Search, Cpu, ArrowRight } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function OpenVisionPlayground() {
  const [concepts, setConcepts] = useState<string[]>(['laptop', 'drone', 'coffee cup', 'person', 'smart-device']);
  const [customInput, setCustomInput] = useState('');
  const [activeConcept, setActiveConcept] = useState('drone');

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  const presetPool = [
    'helmet',
    'electric scooter',
    'backpack',
    'water bottle',
    'safety vest',
    'forklift',
    'headphones',
    'sports car',
  ];

  const handleAddConcept = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && !concepts.includes(trimmed)) {
      setConcepts([...concepts, trimmed]);
      setActiveConcept(trimmed);
      setCustomInput('');
    }
  };

  const handleRemoveConcept = (name: string) => {
    if (concepts.length > 1) {
      const filtered = concepts.filter((c) => c !== name);
      setConcepts(filtered);
      if (activeConcept === name) {
        setActiveConcept(filtered[0]);
      }
    }
  };

  // Mock similarity scores based on activeConcept
  const mockConfidence = activeConcept === 'drone' ? 96.4 : activeConcept === 'laptop' ? 98.2 : 92.7;

  return (
    <section id="playground" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZERO-SHOT TEXT CONDITIONING</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Open-Vocabulary Vision Playground
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl text-sm sm:text-base leading-relaxed">
            Beyond fixed 80 COCO classes. Type any natural language concept to generate real-time CLIP text embeddings and detect novel objects dynamically.
          </p>
        </div>

        {/* Playground Main Card */}
        <div className="glass-panel rounded-2xl border border-white/20 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Interactive Prompt Builder */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div>
                <span className="text-xs font-mono text-[#888888] uppercase tracking-wider block mb-2">
                  1. CONFIGURE ACTIVE PROMPT VOCABULARY
                </span>
                <p className="text-sm text-[#B8B8B8] mb-4">
                  Select or add target classes. The YOLO-World text encoder generates 512-dimensional semantic anchors in real-time.
                </p>

                {/* Active Concepts Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {concepts.map((concept) => (
                    <button
                      key={concept}
                      onClick={() => setActiveConcept(concept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                        activeConcept === concept
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                          : 'bg-white/5 text-white/80 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{concept}</span>
                      {concepts.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveConcept(concept);
                          }}
                          className="hover:text-white/60 ml-0.5"
                        >
                          ×
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddConcept(customInput);
                  }}
                  className="flex items-center gap-2 mb-4"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Type custom concept (e.g. smart watch, helmet)..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="glass-btn px-4 py-2 text-xs sm:text-sm rounded-xl font-medium flex items-center gap-1.5 border border-white/20 hover:border-white/40 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Preset Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono text-[#777777] mr-1">SUGGESTIONS:</span>
                  {presetPool.slice(0, 5).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAddConcept(preset)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#AAAAAA] hover:text-white border border-white/5 hover:border-white/15 transition-colors"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Engine Status */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">ENCODER MODEL:</span>
                  <span className="text-white">CLIP ViT-B/32 (ONNX, in-browser)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">EMBEDDING DIMENSION:</span>
                  <span className="text-cyan-400 font-mono">512-dim Float32</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#888888]">TEXT ENCODER LOAD:</span>
                  <span className="text-emerald-400">Lazy — encoded once per concept set</span>
                </div>
              </div>
            </div>

            {/* Right: Neural Activation & Embedding Visualizer */}
            <div className="lg:col-span-6 flex flex-col gap-4 bg-white/[0.02] p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-medium text-white">
                    NEURAL ACTIVATION RESPONSE
                  </span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  Target: "{activeConcept}"
                </span>
              </div>

              {/* Simulated Feature Tensor Matrix */}
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-mono text-[#888888] uppercase">
                  SIMULATED CLIP TEXT-IMAGE COSINE SIMILARITY
                </span>

                {/* Concept Similarity Bars */}
                <div className="flex flex-col gap-3">
                  {concepts.map((concept) => {
                    const isTarget = concept === activeConcept;
                    const val = isTarget ? mockConfidence : +(50 + Math.random() * 35).toFixed(1);
                    return (
                      <div key={concept} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className={isTarget ? 'text-cyan-300 font-semibold' : 'text-white/70'}>
                            {concept} {isTarget ? '★' : ''}
                          </span>
                          <span className={isTarget ? 'text-cyan-400 font-semibold' : 'text-white/50'}>
                            {val}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTarget
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_8px_#00F0FF]'
                                : 'bg-white/20'
                            }`}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Embedding Vector Preview Matrix */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-[10px] font-mono text-[#888888] uppercase block mb-2">
                  512-DIM VECTOR SAMPLE FOR "{activeConcept.toUpperCase()}"
                </span>
                <div className="grid grid-cols-8 gap-1 font-mono text-[9px] text-white/50 bg-black/40 p-2.5 rounded-lg border border-white/5">
                  {Array.from({ length: 16 }).map((_, idx) => (
                    <span key={idx} className="truncate text-center text-cyan-300/80">
                      {((Math.sin(idx * 1.7) * 0.8 + 0.1)).toFixed(2)}
                    </span>
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
