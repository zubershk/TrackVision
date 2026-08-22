import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import { useSpotlightEffect } from '../../hooks/useSpotlightEffect';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export function FaqSection() {
  const containerRef = useSpotlightEffect<HTMLDivElement>();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      category: 'HARDWARE & WEBGPU',
      question: 'How does TrackVision achieve 60+ FPS multi-object tracking in a standard web browser?',
      answer:
        'TrackVision utilizes ONNX Runtime Web with a dedicated WebGPU execution provider. The entire video feed is captured via OffscreenCanvas and preprocessed without main-thread blocking. Object detection (YOLOv8n / YOLO-World) and feature embeddings (OSNet) execute in multi-threaded Web Workers with direct GPU tensor pipelines, keeping latency strictly under 16-30ms.',
    },
    {
      category: 'PRIVACY & SECURITY',
      question: 'Is any video frame or telemetry data ever uploaded to external cloud servers?',
      answer:
        'Never. TrackVision is architecturally 100% client-side. The neural weights are downloaded once into your browser cache, and all inference occurs in your device’s local GPU/CPU memory. Zero video frames, metadata, or coordinates are ever transmitted over the network.',
    },
    {
      category: 'TRACKING ALGORITHMS',
      question: 'What is ByteTrack++ and how does it prevent identity switches during dense occlusions?',
      answer:
        'ByteTrack++ associates both high-confidence and low-confidence detections across consecutive frames using a full 6x6 covariance Kalman filter. When two objects overlap or a target is temporarily blocked, OSNet generates a 512-dimensional appearance embedding that allows the Hungarian matching algorithm to re-acquire the exact same track ID once the object re-emerges.',
    },
    {
      category: 'BROWSER SUPPORT',
      question: 'Which browsers and platforms are supported?',
      answer:
        'TrackVision runs natively on all modern browsers with WebGPU support (Google Chrome 113+, Microsoft Edge 113+, and Safari 18+). If WebGPU is unavailable on older hardware, the engine automatically falls back to multi-threaded WebAssembly with 128-bit SIMD vectorization.',
    },
    {
      category: 'OPEN-VOCABULARY VISION',
      question: 'How does Open-Vocabulary YOLO-World mode detect custom objects not in COCO?',
      answer:
        'In Open Vision mode, TrackVision embeds a lightweight CLIP ViT text encoder in a Web Worker. When you enter natural language concepts like "drone" or "safety helmet", the text encoder creates semantic vectors that dynamically condition the detection head to find custom objects in real time.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/15 text-xs font-mono text-white/80 mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Technical Architecture FAQs
          </h2>
          <p className="text-[#A0A0A0] max-w-xl text-sm sm:text-base leading-relaxed">
            Everything you need to know about in-browser WebGPU execution, temporal persistence, and security guarantees.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div ref={containerRef} className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`spotlight-card rounded-2xl transition-all duration-300 border overflow-hidden ${
                  isOpen
                    ? 'glass-strong border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-white/[0.04]'
                    : 'glass border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider uppercase">
                      {faq.category}
                    </span>
                    <span className="text-base sm:text-lg font-semibold text-white">
                      {faq.question}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl bg-white/5 border border-white/10 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-white/15 text-white' : 'text-white/60'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#B8B8B8] leading-relaxed border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
