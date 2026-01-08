import type { PlayerDNA } from "@/utils/playerDnaCalculator";

interface RenderOptions {
  dna: PlayerDNA;
  playerName: string;
  playerTag: string;
  scale?: number;
}

export async function renderDnaCardToCanvas(options: RenderOptions): Promise<HTMLCanvasElement> {
  const { dna, playerName, playerTag, scale = 2 } = options;
  const { stats, archetype, similarPro } = dna;
  const avgScore = Math.round((stats.aggression + stats.defense + stats.versatility) / 3);

  const width = 280 * scale;
  const height = 400 * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Scale everything
  ctx.scale(scale, scale);

  // Background with gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 400);
  bgGrad.addColorStop(0, '#1a1508');
  bgGrad.addColorStop(0.5, '#0d0a04');
  bgGrad.addColorStop(1, '#1a1508');
  
  // Gold border
  const borderGrad = ctx.createLinearGradient(0, 0, 280, 400);
  borderGrad.addColorStop(0, '#d4af37');
  borderGrad.addColorStop(0.3, '#f5d87a');
  borderGrad.addColorStop(0.5, '#d4af37');
  borderGrad.addColorStop(0.7, '#b8963c');
  borderGrad.addColorStop(1, '#d4af37');

  // Draw border
  ctx.fillStyle = borderGrad;
  roundRect(ctx, 0, 0, 280, 400, 14);
  ctx.fill();

  // Draw inner background
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 3, 3, 274, 394, 11);
  ctx.fill();

  // Top glow
  const topGlow = ctx.createRadialGradient(140, 30, 0, 140, 30, 80);
  topGlow.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(60, 0, 160, 80);

  // PLAYER DNA badge
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, 95, 12, 90, 18, 9);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 7px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('✦ PLAYER DNA', 140, 24);
  ctx.restore();

  // Archetype title
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
  ctx.shadowBlur = 15;
  ctx.fillText(archetype.toUpperCase(), 140, 55);
  ctx.shadowBlur = 0;

  // Avatar circle
  const avatarY = 100;
  
  // Outer glow
  const avatarGlow = ctx.createRadialGradient(140, avatarY, 25, 140, avatarY, 45);
  avatarGlow.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
  avatarGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = avatarGlow;
  ctx.beginPath();
  ctx.arc(140, avatarY, 45, 0, Math.PI * 2);
  ctx.fill();

  // Avatar circle background
  const avatarBg = ctx.createLinearGradient(140, avatarY - 28, 140, avatarY + 28);
  avatarBg.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
  avatarBg.addColorStop(1, 'rgba(139, 107, 35, 0.3)');
  ctx.fillStyle = avatarBg;
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(140, avatarY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crown icon (simplified)
  ctx.fillStyle = '#d4af37';
  ctx.font = '22px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♛', 140, avatarY);

  // Score badge
  const scoreBadgeY = avatarY + 32;
  const scoreBadgeGrad = ctx.createLinearGradient(120, scoreBadgeY - 8, 120, scoreBadgeY + 8);
  scoreBadgeGrad.addColorStop(0, '#f5d87a');
  scoreBadgeGrad.addColorStop(0.5, '#d4af37');
  scoreBadgeGrad.addColorStop(1, '#b8963c');
  ctx.fillStyle = scoreBadgeGrad;
  roundRect(ctx, 120, scoreBadgeY - 8, 40, 16, 8);
  ctx.fill();
  
  ctx.fillStyle = '#1a1508';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(avgScore.toString(), 140, scoreBadgeY);

  // Player name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  const displayName = playerName.length > 20 ? playerName.slice(0, 18) + '...' : playerName;
  ctx.fillText(displayName, 140, 155);
  ctx.shadowBlur = 0;

  // Player tag
  ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.font = '9px monospace';
  ctx.fillText(playerTag, 140, 175);

  // Stats
  const statsStartY = 200;
  const statSpacing = 40;
  
  drawStatBar(ctx, 'AGG', stats.aggression, '#ef4444', '#f97316', statsStartY);
  drawStatBar(ctx, 'DEF', stats.defense, '#3b82f6', '#06b6d4', statsStartY + statSpacing);
  drawStatBar(ctx, 'VER', stats.versatility, '#a855f7', '#ec4899', statsStartY + statSpacing * 2);

  // Similar to section
  const similarY = 330;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 20, similarY, 240, 24, 4);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Similar to: ', 115, similarY + 12);
  
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 10px system-ui';
  ctx.fillText(similarPro, 175, similarY + 12);

  // Footer branding
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.font = 'bold 7px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('♛ AI ROYALE COACH', 265, 375);

  // Corner accents
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1;
  
  // Top-left
  ctx.beginPath();
  ctx.moveTo(15, 25);
  ctx.lineTo(15, 15);
  ctx.lineTo(25, 15);
  ctx.stroke();
  
  // Top-right
  ctx.beginPath();
  ctx.moveTo(255, 15);
  ctx.lineTo(265, 15);
  ctx.lineTo(265, 25);
  ctx.stroke();
  
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(15, 375);
  ctx.lineTo(15, 385);
  ctx.lineTo(25, 385);
  ctx.stroke();
  
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(255, 385);
  ctx.lineTo(265, 385);
  ctx.lineTo(265, 375);
  ctx.stroke();

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStatBar(
  ctx: CanvasRenderingContext2D, 
  label: string, 
  value: number, 
  colorFrom: string, 
  colorTo: string, 
  y: number
) {
  const x = 25;
  const barWidth = 190;
  
  // Icon background
  const iconGrad = ctx.createLinearGradient(x, y, x + 20, y + 20);
  iconGrad.addColorStop(0, colorFrom);
  iconGrad.addColorStop(1, colorTo);
  ctx.fillStyle = iconGrad;
  roundRect(ctx, x, y, 20, 20, 4);
  ctx.fill();
  
  // Icon symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icons: Record<string, string> = { 'AGG': '⚔', 'DEF': '🛡', 'VER': '⇄' };
  ctx.fillText(icons[label] || '●', x + 10, y + 10);
  
  // Label
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 8px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + 28, y + 2);
  
  // Value
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(value.toString(), x + barWidth + 25, y + 2);
  
  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 28, y + 14, barWidth, 6, 3);
  ctx.fill();
  ctx.stroke();
  
  // Bar fill
  const barFillGrad = ctx.createLinearGradient(x + 28, 0, x + 28 + barWidth, 0);
  barFillGrad.addColorStop(0, colorFrom);
  barFillGrad.addColorStop(1, colorTo);
  ctx.fillStyle = barFillGrad;
  const fillWidth = (value / 100) * barWidth;
  roundRect(ctx, x + 28, y + 14, fillWidth, 6, 3);
  ctx.fill();
}
