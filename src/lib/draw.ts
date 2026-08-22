import { FrameData, TrackMeta, BBox } from '../store';

function drawCorners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + size); ctx.lineTo(x, y); ctx.lineTo(x + size, y);
  ctx.moveTo(x + w - size, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + size);
  ctx.moveTo(x, y + h - size); ctx.lineTo(x, y + h); ctx.lineTo(x + size, y + h);
  ctx.moveTo(x + w - size, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - size);
  ctx.stroke();
}

export function drawTrackingHUD(
  canvas: HTMLCanvasElement,
  frame: FrameData,
  trackMeta: Map<number, TrackMeta>,
  historyFrames: FrameData[],
  selectedId: number | null,
  hoverId: number | null,
  ghostMode: boolean,
  followMode: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // If followMode and selectedId, dim everything else heavily for OLED effect
  if (followMode && selectedId) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw Ghost Mode (Fading trails using opacity, not colors)
  if (ghostMode && historyFrames.length > 0) {
    const ghosts = historyFrames.slice(-15);
    ghosts.forEach((gFrame, i) => {
      const opacity = (i / ghosts.length) * 0.3; // max 30% opacity
      
      gFrame.tracks.forEach(track => {
        if (followMode && selectedId && track.id !== selectedId) return;

        const meta = trackMeta.get(track.id);
        if (!meta) return;

        const [x, y, w, h] = track.bbox;
        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
      });
    });
    ctx.globalAlpha = 1.0;
  }

  // Draw current tracks
  for (const track of frame.tracks) {
    const meta = trackMeta.get(track.id);
    const className = meta?.className || track.className || 'object';
    const trackId = track.id;
    const color = meta?.color || '#38BDF8';

    const isSelected = selectedId === track.id;
    const isHovered = hoverId === track.id;
    const isFocused = followMode && selectedId ? isSelected : true;
    
    if (!isFocused) {
      ctx.globalAlpha = 0.2;
    } else {
      ctx.globalAlpha = 1.0;
    }

    const [x, y, w, h] = track.bbox;

    // Subtle box fill
    ctx.fillStyle = isSelected 
      ? 'rgba(255, 255, 255, 0.12)' 
      : isHovered 
        ? 'rgba(56, 189, 248, 0.10)' 
        : 'rgba(56, 189, 248, 0.04)';
    ctx.fillRect(x, y, w, h);

    // Subtle bounding border
    ctx.strokeStyle = isSelected ? '#FFFFFF' : isHovered ? '#38BDF8' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // High-visibility accented corners
    ctx.strokeStyle = isSelected ? '#FFFFFF' : isHovered ? '#67E8F9' : '#38BDF8';
    ctx.lineWidth = isSelected ? 2.5 : 2;
    drawCorners(ctx, x, y, w, h, Math.max(8, Math.min(20, w / 3, h / 3)));

    // Label construction
    const confPct = Math.round((track.score || 0.85) * 100);
    const labelText = `${className.toUpperCase()} #${trackId} · ${confPct}%`;
      
    ctx.font = '600 11px "JetBrains Mono", "Geist Mono", "Fira Code", monospace';
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const badgeW = textWidth + 18;
    const badgeH = 20;

    // Clamp badge position within canvas bounds
    let badgeX = Math.max(4, Math.min(x, width - badgeW - 4));
    let badgeY = y >= badgeH + 4 ? y - badgeH - 3 : y + 4;

    // Badge Background
    ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(10, 15, 28, 0.92)';
    ctx.beginPath();
    ctx.roundRect 
      ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4) 
      : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();

    // Badge Border
    ctx.strokeStyle = isSelected ? '#FFFFFF' : isHovered ? '#38BDF8' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Status / color indicator dot
    ctx.fillStyle = isSelected ? '#000000' : color;
    ctx.beginPath();
    ctx.arc(badgeX + 8, badgeY + badgeH / 2, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Label text
    ctx.fillStyle = isSelected ? '#000000' : '#F8FAFC';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, badgeX + 16, badgeY + badgeH / 2 + 0.5);

    // Trajectory History (Glowing dots & path)
    if (meta && meta.history) {
      const validHistory = meta.history.filter(h => h.time <= frame.timestamp);
      if (validHistory.length > 1 && isFocused && (isSelected || hoverId === track.id)) {
        ctx.beginPath();
        ctx.moveTo(validHistory[0].x, validHistory[0].y);
        for (let i = 1; i < validHistory.length; i++) {
          ctx.lineTo(validHistory[i].x, validHistory[i].y);
        }
        ctx.strokeStyle = isSelected ? '#FFFFFF' : '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        const currentPos = validHistory[validHistory.length - 1];
        ctx.beginPath();
        ctx.arc(currentPos.x, currentPos.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1.0;
  }
}
