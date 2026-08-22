import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RefreshCw, Plus, Sparkles, Activity, Layers, Crosshair, Zap, Eye, Target, Compass, Lock, Info } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

interface SimEntity {
  id: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  color: string;
  score: number;
  history: { x: number; y: number }[];
  category: string;
  reidHash: string;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

const PALETTE = [
  '#00F0FF', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
];

const DEFAULT_LABELS = ['person', 'laptop', 'drone', 'vehicle', 'backpack', 'smart-device'];

export function InteractiveSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [simMode, setSimMode] = useState<'fast' | 'open'>('fast');
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(16.2);
  const [activeCount, setActiveCount] = useState(4);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [fpsSparkline, setFpsSparkline] = useState<number[]>([58, 60, 59, 61, 60, 62, 60, 59, 61, 60]);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  const entitiesRef = useRef<SimEntity[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const radarScanRef = useRef(0);
  const nextIdRef = useRef(1);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(performance.now());
  const reticleAngleRef = useRef(0);

  // Initialize entities
  const initEntities = useCallback((width: number, height: number) => {
    const initial: SimEntity[] = [
      {
        id: 1,
        label: 'person',
        x: width * 0.2,
        y: height * 0.35,
        w: 64,
        h: 115,
        vx: 1.1,
        vy: 0.6,
        color: PALETTE[0],
        score: 0.98,
        history: [],
        category: 'human',
        reidHash: '0x8F9A...4B21',
      },
      {
        id: 2,
        label: 'laptop',
        x: width * 0.65,
        y: height * 0.48,
        w: 82,
        h: 56,
        vx: -0.8,
        vy: 0.5,
        color: PALETTE[1],
        score: 0.95,
        history: [],
        category: 'electronics',
        reidHash: '0x3E1C...9A72',
      },
      {
        id: 3,
        label: 'drone',
        x: width * 0.45,
        y: height * 0.2,
        w: 72,
        h: 42,
        vx: 1.5,
        vy: -0.7,
        color: PALETTE[2],
        score: 0.92,
        history: [],
        category: 'robotics',
        reidHash: '0x7C4D...2E88',
      },
      {
        id: 4,
        label: 'vehicle',
        x: width * 0.78,
        y: height * 0.68,
        w: 115,
        h: 68,
        vx: -1.3,
        vy: -0.5,
        color: PALETTE[4],
        score: 0.99,
        history: [],
        category: 'transport',
        reidHash: '0x1A8B...6F04',
      },
    ];
    nextIdRef.current = 5;
    entitiesRef.current = initial;
    setActiveCount(initial.length);
    setSelectedId(1);
  }, []);

  // Spawn new target
  const handleAddTarget = useCallback((targetX?: number, targetY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const id = nextIdRef.current++;
    const label = DEFAULT_LABELS[Math.floor(Math.random() * DEFAULT_LABELS.length)];
    const color = PALETTE[id % PALETTE.length];
    
    const posX = targetX !== undefined ? Math.max(30, Math.min(width - 90, targetX - 35)) : Math.random() * (width - 150) + 75;
    const posY = targetY !== undefined ? Math.max(30, Math.min(height - 90, targetY - 30)) : Math.random() * (height - 150) + 75;

    const newEntity: SimEntity = {
      id,
      label,
      x: posX,
      y: posY,
      w: 60 + Math.random() * 35,
      h: 50 + Math.random() * 55,
      vx: (Math.random() - 0.5) * 2.8,
      vy: (Math.random() - 0.5) * 2.8,
      color,
      score: +(0.89 + Math.random() * 0.1).toFixed(2),
      history: [],
      category: 'detected',
      reidHash: `0x${Math.floor(Math.random()*65535).toString(16).toUpperCase()}...${Math.floor(Math.random()*65535).toString(16).toUpperCase()}`,
    };

    entitiesRef.current.push(newEntity);
    setActiveCount(entitiesRef.current.length);
    setSelectedId(id);
  }, []);

  // Reset simulation
  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initEntities(canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
  };

  // Canvas Click: Hit-test entity or trigger Sonar ripple & target spawn
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hit test on entities
    let clickedEntity: SimEntity | null = null;
    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
      const ent = entitiesRef.current[i];
      if (x >= ent.x && x <= ent.x + ent.w && y >= ent.y && y <= ent.y + ent.h) {
        clickedEntity = ent;
        break;
      }
    }

    if (clickedEntity) {
      setSelectedId(clickedEntity.id);
    } else {
      // Add ripple animation
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius: 60,
        alpha: 0.8,
      });

      // Spawn or direct target
      handleAddTarget(x, y);
    }
  };

  // Canvas MouseMove: Hover detection
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: number | null = null;
    for (const ent of entitiesRef.current) {
      if (x >= ent.x && x <= ent.x + ent.w && y >= ent.y && y <= ent.y + ent.h) {
        found = ent.id;
        break;
      }
    }
    setHoveredId(found);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'g') {
        setShowGhost((g) => !g);
      } else if (e.key.toLowerCase() === 'v') {
        setShowVectors((v) => !v);
      } else if (e.key.toLowerCase() === 'r') {
        handleReset();
      } else if (e.key.toLowerCase() === 's') {
        handleAddTarget();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddTarget]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      if (entitiesRef.current.length === 0) {
        initEntities(rect.width, rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;

    const render = (time: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 450;

      // Update Reticle Rotation
      reticleAngleRef.current += 0.03;

      // FPS and Latency calculation & Sparkline update
      frameCountRef.current++;
      if (time - fpsTimerRef.current >= 500) {
        const calculatedFps = Math.round((frameCountRef.current * 1000) / (time - fpsTimerRef.current));
        setFps(calculatedFps);
        setLatency(+(14.2 + Math.random() * 3.2).toFixed(1));
        setFpsSparkline((prev) => [...prev.slice(1), calculatedFps]);
        frameCountRef.current = 0;
        fpsTimerRef.current = time;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Tech Grid Background with subtle radial fade
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center crosshair
      const cx = width / 2;
      const cy = height / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy);
      ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy + 20);
      ctx.stroke();

      // Corner Viewport Brackets
      const bSize = 18;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.5;

      // TL
      ctx.beginPath();
      ctx.moveTo(16, 16 + bSize);
      ctx.lineTo(16, 16);
      ctx.lineTo(16 + bSize, 16);
      ctx.stroke();

      // TR
      ctx.beginPath();
      ctx.moveTo(width - 16 - bSize, 16);
      ctx.lineTo(width - 16, 16);
      ctx.lineTo(width - 16, 16 + bSize);
      ctx.stroke();

      // BL
      ctx.beginPath();
      ctx.moveTo(16, height - 16 - bSize);
      ctx.lineTo(16, height - 16);
      ctx.lineTo(16 + bSize, height - 16);
      ctx.stroke();

      // BR
      ctx.beginPath();
      ctx.moveTo(width - 16 - bSize, height - 16);
      ctx.lineTo(width - 16, height - 16);
      ctx.lineTo(width - 16, height - 16 - bSize);
      ctx.stroke();

      // 2. Click Ripples (Sonar animation)
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rip = ripplesRef.current[i];
        rip.radius += 2.5;
        rip.alpha -= 0.035;

        if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
          ripplesRef.current.splice(i, 1);
        } else {
          ctx.strokeStyle = `rgba(0, 240, 255, ${rip.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Second subtle ripple ring
          ctx.strokeStyle = `rgba(0, 240, 255, ${rip.alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, Math.max(0, rip.radius - 12), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 3. Radar Scanline Sweep
      if (showRadar) {
        radarScanRef.current = (radarScanRef.current + 1.8) % height;
        const grad = ctx.createLinearGradient(0, radarScanRef.current - 50, 0, radarScanRef.current);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.09)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, Math.max(0, radarScanRef.current - 50), width, 50);

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, radarScanRef.current);
        ctx.lineTo(width, radarScanRef.current);
        ctx.stroke();
      }

      // 4. Update & Render Simulated Entities
      const entities = entitiesRef.current;
      for (const ent of entities) {
        if (isPlaying) {
          ent.x += ent.vx;
          ent.y += ent.vy;

          // Wall bounce
          if (ent.x <= 20) {
            ent.x = 20;
            ent.vx = Math.abs(ent.vx);
          } else if (ent.x + ent.w >= width - 20) {
            ent.x = width - 20 - ent.w;
            ent.vx = -Math.abs(ent.vx);
          }

          if (ent.y <= 20) {
            ent.y = 20;
            ent.vy = Math.abs(ent.vy);
          } else if (ent.y + ent.h >= height - 20) {
            ent.y = height - 20 - ent.h;
            ent.vy = -Math.abs(ent.vy);
          }

          // Push history for ghost trails
          const centerX = ent.x + ent.w / 2;
          const centerY = ent.y + ent.h / 2;
          ent.history.push({ x: centerX, y: centerY });
          if (ent.history.length > 25) {
            ent.history.shift();
          }
        }

        const isSelected = ent.id === selectedId;
        const isHovered = ent.id === hoveredId;

        // Draw Ghost Trails
        if (showGhost && ent.history.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < ent.history.length - 1; i++) {
            const p1 = ent.history[i];
            const p2 = ent.history[i + 1];
            const alpha = (i / ent.history.length) * (isSelected ? 0.65 : 0.4);
            ctx.strokeStyle = ent.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = isSelected ? 2.5 : 1.8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Draw Kalman Velocity Vector
        if (showVectors) {
          const ecx = ent.x + ent.w / 2;
          const ecy = ent.y + ent.h / 2;
          const vecLength = 26;
          const targetX = ecx + ent.vx * vecLength;
          const targetY = ecy + ent.vy * vecLength;

          ctx.strokeStyle = ent.color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(ecx, ecy);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Vector tip point
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Bounding Box (Liquid Glass HUD bracket aesthetic)
        ctx.fillStyle = isSelected ? `${ent.color}25` : `${ent.color}10`;
        ctx.fillRect(ent.x, ent.y, ent.w, ent.h);

        // Highlight ring on selected / hovered
        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#FFFFFF' : ent.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = ent.color;
          ctx.shadowBlur = isSelected ? 12 : 6;
        } else {
          ctx.strokeStyle = ent.color;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 0;
        }

        // Draw Corner Brackets on BBox
        const corner = Math.min(14, ent.w * 0.28);
        // TL
        ctx.beginPath();
        ctx.moveTo(ent.x, ent.y + corner);
        ctx.lineTo(ent.x, ent.y);
        ctx.lineTo(ent.x + corner, ent.y);
        ctx.stroke();

        // TR
        ctx.beginPath();
        ctx.moveTo(ent.x + ent.w - corner, ent.y);
        ctx.lineTo(ent.x + ent.w, ent.y);
        ctx.lineTo(ent.x + ent.w, ent.y + corner);
        ctx.stroke();

        // BL
        ctx.beginPath();
        ctx.moveTo(ent.x, ent.y + ent.h - corner);
        ctx.lineTo(ent.x, ent.y + ent.h);
        ctx.lineTo(ent.x + corner, ent.y + ent.h);
        ctx.stroke();

        // BR
        ctx.beginPath();
        ctx.moveTo(ent.x + ent.w - corner, ent.y + ent.h);
        ctx.lineTo(ent.x + ent.w, ent.y + ent.h);
        ctx.lineTo(ent.x + ent.w, ent.y + ent.h - corner);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Thin connector border
        ctx.strokeStyle = isSelected ? `${ent.color}80` : `${ent.color}35`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);

        // Center crosshair dot
        const ecx = ent.x + ent.w / 2;
        const ecy = ent.y + ent.h / 2;
        ctx.fillStyle = isSelected ? '#FFFFFF' : ent.color;
        ctx.beginPath();
        ctx.arc(ecx, ecy, isSelected ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Rotating Reticle if Selected
        if (isSelected) {
          ctx.save();
          ctx.translate(ecx, ecy);
          ctx.rotate(reticleAngleRef.current);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 6]);
          const rRadius = Math.max(ent.w, ent.h) * 0.65;
          ctx.beginPath();
          ctx.arc(0, 0, rRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Top Label Badge
        const tagText = `#${ent.id.toString().padStart(2, '0')} ${ent.label} ${(ent.score * 100).toFixed(0)}%`;
        ctx.font = '10px monospace';
        const textWidth = ctx.measureText(tagText).width;
        const tagHeight = 16;
        const tagY = ent.y - tagHeight - 4 < 5 ? ent.y + ent.h + 4 : ent.y - tagHeight - 4;

        // Label background pill
        ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(ent.x, tagY, textWidth + 10, tagHeight);
        ctx.strokeStyle = isSelected ? '#00F0FF' : ent.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(ent.x, tagY, textWidth + 10, tagHeight);

        // Label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, ent.x + 5, tagY + 11);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, showGhost, showVectors, showRadar, selectedId, hoveredId, initEntities]);

  const activeTarget = entitiesRef.current.find((e) => e.id === selectedId) || entitiesRef.current[0];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Outer Glass Card */}
      <div className="w-full rounded-2xl glass-panel border border-white/20 shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden relative backdrop-blur-2xl">
        
        {/* Canvas Header / Telemetry & Micro-Sparkline */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              <span className="text-xs font-mono font-medium text-white/90">LIVE VISION SIMULATOR</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10 hidden sm:inline-block">
              ByteTrack++ • Interactive 60 FPS
            </span>
          </div>

          {/* Sparkline & Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono text-white/80">
            {/* Live FPS Sparkline */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-[10px] text-[#888888]">FPS:</span>
              <div className="flex items-end gap-0.5 h-3.5 w-12">
                {fpsSparkline.map((val, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-cyan-400/80 rounded-t-sm"
                    style={{ height: `${Math.min(100, Math.max(20, (val / 65) * 100))}%` }}
                  />
                ))}
              </div>
              <strong className="text-white ml-0.5">{fps}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LATENCY: <strong className="text-white">{latency}ms</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>TRACKS: <strong className="text-white">{activeCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Interactive Viewport Canvas */}
        <div ref={containerRef} className="relative w-full h-[340px] sm:h-[430px] lg:h-[490px] bg-[#000000] overflow-hidden">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Floating Target Lock-On Telemetry Card (Top Left Inside Canvas) */}
          {activeTarget && (
            <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 animate-in fade-in duration-300">
              <div className="glass px-3 py-2 rounded-xl border border-cyan-400/30 text-[11px] font-mono text-white shadow-xl backdrop-blur-md flex flex-col gap-1 bg-black/60">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Target className="w-3.5 h-3.5" />
                    <span>LOCKED: #{activeTarget.id.toString().padStart(2, '0')} {activeTarget.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    {(activeTarget.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 text-[10px] text-white/70">
                  <span>VELOCITY: <strong className="text-white">{(Math.hypot(activeTarget.vx, activeTarget.vy) * 12).toFixed(1)} px/s</strong></span>
                  <span>BEARING: <strong className="text-white">{(Math.atan2(activeTarget.vy, activeTarget.vx) * (180 / Math.PI) + 180).toFixed(0)}°</strong></span>
                </div>
                <div className="text-[9px] text-[#888888] flex items-center justify-between">
                  <span>RE-ID HASH:</span>
                  <span className="text-cyan-400 font-mono">{activeTarget.reidHash}</span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Floating Quick Controls (Bottom Right Inside Canvas) */}
          <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="glass-btn px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 border border-white/20 hover:border-white/40"
              title="Pause/Play Simulation (Space)"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => handleAddTarget()}
              className="glass-btn px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 border border-white/20 hover:border-white/40 text-cyan-300"
              title="Spawn New Track Target (S)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Spawn Entity</span>
            </button>

            <button
              onClick={handleReset}
              className="glass-btn px-2.5 py-1.5 text-xs rounded-lg border border-white/20 hover:border-white/40"
              title="Reset Scene (R)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Click to Direct Target Hint (Bottom Center Inside Canvas) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-white/10 text-[10px] font-mono text-white/50 backdrop-blur-sm">
            <span>Click anywhere to ping sonar & spawn target • Click entity to lock focus</span>
          </div>
        </div>

        {/* Viewport Toolbar Controls & Keyboard Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-white/10 bg-white/[0.02]">
          {/* Toggle Features */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#888888] font-mono mr-1 text-[11px] hidden sm:inline">LAYERS:</span>
            
            <button
              onClick={() => setShowGhost(!showGhost)}
              className={`px-3 py-1 rounded-lg border font-mono text-xs transition-all ${
                showGhost
                  ? 'bg-white/15 border-white/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              Ghost Trails (G) {showGhost ? '●' : '○'}
            </button>

            <button
              onClick={() => setShowVectors(!showVectors)}
              className={`px-3 py-1 rounded-lg border font-mono text-xs transition-all ${
                showVectors
                  ? 'bg-white/15 border-white/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              Kalman Vectors (V) {showVectors ? '●' : '○'}
            </button>

            <button
              onClick={() => setShowRadar(!showRadar)}
              className={`px-3 py-1 rounded-lg border font-mono text-xs transition-all ${
                showRadar
                  ? 'bg-white/15 border-white/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              Radar Sweep {showRadar ? '●' : '○'}
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSimMode('fast')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                simMode === 'fast'
                  ? 'bg-white/20 text-white shadow-inner border border-white/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Fast (COCO 80)</span>
            </button>
            <button
              onClick={() => setSimMode('open')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                simMode === 'open'
                  ? 'bg-white/20 text-white shadow-inner border border-white/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>Open-Vocabulary</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
