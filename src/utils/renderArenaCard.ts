import type { ClashRoyaleCard } from '@/services/clashRoyaleApi';

export interface ArenaCardRenderOptions {
  winner: 'user' | 'pro';
  winProbability: number;
  userHp: number;
  proHp: number;
  proName: string;
  proSpecialty: string;
  userDeck: ClashRoyaleCard[];
  translations: {
    iDefeated: string;
    iLostTo: string;
    winProbability: string;
    myDeck: string;
    finalHp: string;
    upsetAlert: string;
    aiSimulation: string;
  };
  scale?: number;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

export async function renderArenaCardToCanvas(
  options: ArenaCardRenderOptions
): Promise<HTMLCanvasElement> {
  const {
    winner,
    winProbability,
    userHp,
    proHp,
    proName,
    proSpecialty,
    userDeck,
    translations,
    scale = 2,
  } = options;

  const isVictory = winner === 'user';
  const isUpset = isVictory && winProbability < 0.3;
  const winProbabilityPercent = Math.round(winProbability * 100);

  const BASE_WIDTH = 360;
  const BASE_HEIGHT = 640;
  const width = BASE_WIDTH * scale;
  const height = BASE_HEIGHT * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Draw background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  if (isVictory) {
    bgGrad.addColorStop(0, '#1a1508');
    bgGrad.addColorStop(0.25, '#2d2006');
    bgGrad.addColorStop(0.5, '#3d2a08');
    bgGrad.addColorStop(0.75, '#2d2006');
    bgGrad.addColorStop(1, '#1a1508');
  } else {
    bgGrad.addColorStop(0, '#1a1a1a');
    bgGrad.addColorStop(0.25, '#2d2222');
    bgGrad.addColorStop(0.5, '#3d2a2a');
    bgGrad.addColorStop(0.75, '#2d2222');
    bgGrad.addColorStop(1, '#1a1a1a');
  }
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, BASE_WIDTH, BASE_HEIGHT, 16);
  ctx.fill();

  // Draw radial glow overlay
  const glowGrad = ctx.createRadialGradient(
    BASE_WIDTH / 2,
    BASE_HEIGHT / 3,
    0,
    BASE_WIDTH / 2,
    BASE_HEIGHT / 3,
    BASE_WIDTH * 0.8
  );
  if (isVictory) {
    glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
  } else {
    glowGrad.addColorStop(0, 'rgba(220, 38, 38, 0.1)');
    glowGrad.addColorStop(1, 'transparent');
  }
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  let yPos = 40;

  // Draw crossed swords or crown icon
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px system-ui, sans-serif';
  if (isVictory) {
    ctx.fillStyle = '#FFD700';
    ctx.fillText('👑', BASE_WIDTH / 2, yPos);
    if (isUpset) {
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#DC2626';
      ctx.fillText('🔥', BASE_WIDTH / 2 + 30, yPos - 5);
    }
  } else {
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('⚔️', BASE_WIDTH / 2, yPos);
  }

  yPos += 40;

  // Draw result text
  ctx.textAlign = 'center';
  if (isVictory) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(translations.iDefeated, BASE_WIDTH / 2, yPos);
    ctx.shadowBlur = 0;
  } else {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(translations.iLostTo, BASE_WIDTH / 2, yPos);
  }

  yPos += 35;

  // Draw pro player badge
  const badgeWidth = 180;
  const badgeHeight = 56;
  const badgeX = (BASE_WIDTH - badgeWidth) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, badgeX, yPos, badgeWidth, badgeHeight, 10);
  ctx.fill();

  // Pro avatar circle
  const avatarRadius = 20;
  const avatarCenterX = badgeX + 30;
  const avatarCenterY = yPos + badgeHeight / 2;
  const avatarGrad = ctx.createLinearGradient(
    avatarCenterX - avatarRadius,
    avatarCenterY - avatarRadius,
    avatarCenterX + avatarRadius,
    avatarCenterY + avatarRadius
  );
  avatarGrad.addColorStop(0, '#DC2626');
  avatarGrad.addColorStop(1, '#991B1B');
  ctx.fillStyle = avatarGrad;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pro initial
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(proName.charAt(0), avatarCenterX, avatarCenterY);
  ctx.textBaseline = 'alphabetic';

  // Pro name and specialty
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#F9FAFB';
  ctx.fillText(proName, badgeX + 58, yPos + 22);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(proSpecialty, badgeX + 58, yPos + 40);

  yPos += badgeHeight + 25;

  // Draw upset badge if applicable
  if (isUpset) {
    const upsetBadgeWidth = 90;
    const upsetBadgeHeight = 24;
    const upsetX = (BASE_WIDTH - upsetBadgeWidth) / 2;
    ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, upsetX, yPos, upsetBadgeWidth, upsetBadgeHeight, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${translations.upsetAlert}`, BASE_WIDTH / 2, yPos + 16);
    yPos += 35;
  }

  // Draw win probability box
  const probBoxWidth = 160;
  const probBoxHeight = 80;
  const probBoxX = (BASE_WIDTH - probBoxWidth) / 2;
  ctx.fillStyle = isUpset ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)';
  if (isUpset) {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
  }
  roundRect(ctx, probBoxX, yPos, probBoxWidth, probBoxHeight, 12);
  ctx.fill();
  if (isUpset) ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(translations.winProbability, BASE_WIDTH / 2, yPos + 24);

  ctx.font = 'bold 36px system-ui, sans-serif';
  if (isUpset) {
    ctx.fillStyle = '#FFD700';
  } else if (isVictory) {
    ctx.fillStyle = '#34D399';
  } else {
    ctx.fillStyle = '#9CA3AF';
  }
  ctx.fillText(`${winProbabilityPercent}%`, BASE_WIDTH / 2, yPos + 62);

  yPos += probBoxHeight + 25;

  // Draw "My Deck" label
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.fillText(`⚔️ ${translations.myDeck}`, BASE_WIDTH / 2, yPos);

  yPos += 15;

  // Load and draw card images (4x2 grid)
  const cardWidth = 70;
  const cardHeight = 85;
  const cardGap = 8;
  const gridWidth = cardWidth * 4 + cardGap * 3;
  const startX = (BASE_WIDTH - gridWidth) / 2;

  const deckCards = userDeck.slice(0, 8);
  
  // Try to load card images, use placeholders on failure
  const cardImagePromises = deckCards.map(async (card) => {
    const url = card.iconUrls?.medium;
    if (!url) return null;
    try {
      return await loadImage(url);
    } catch {
      return null;
    }
  });

  const cardImages = await Promise.all(cardImagePromises);

  for (let i = 0; i < deckCards.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = startX + col * (cardWidth + cardGap);
    const y = yPos + row * (cardHeight + cardGap);

    // Card background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    roundRect(ctx, x, y, cardWidth, cardHeight, 8);
    ctx.fill();

    const img = cardImages[i];
    if (img) {
      // Draw card image
      ctx.save();
      roundRect(ctx, x + 2, y + 2, cardWidth - 4, cardHeight - 4, 6);
      ctx.clip();
      ctx.drawImage(img, x + 2, y + 2, cardWidth - 4, cardHeight - 4);
      ctx.restore();
    } else {
      // Fallback: draw card name
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.textAlign = 'center';
      const cardName = deckCards[i]?.name || '?';
      const truncated = cardName.length > 8 ? cardName.slice(0, 7) + '…' : cardName;
      ctx.fillText(truncated, x + cardWidth / 2, y + cardHeight / 2 + 4);
    }
  }

  yPos += 2 * (cardHeight + cardGap) + 15;

  // Draw Final HP section
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.fillText(translations.finalHp, BASE_WIDTH / 2, yPos);

  yPos += 25;

  // HP values
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = isVictory ? '#34D399' : '#DC2626';
  ctx.fillText(String(userHp), BASE_WIDTH / 2 - 40, yPos);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('vs', BASE_WIDTH / 2, yPos);

  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = !isVictory ? '#34D399' : '#DC2626';
  ctx.fillText(String(proHp), BASE_WIDTH / 2 + 40, yPos);

  // Draw branding footer
  const footerY = BASE_HEIGHT - 40;
  const footerWidth = 180;
  const footerHeight = 28;
  const footerX = (BASE_WIDTH - footerWidth) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, footerX, footerY, footerWidth, footerHeight, 14);
  ctx.fill();

  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.fillText(`👑 ${translations.aiSimulation}`, BASE_WIDTH / 2, footerY + 18);

  return canvas;
}
