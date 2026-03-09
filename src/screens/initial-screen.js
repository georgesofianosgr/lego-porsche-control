import { UiTokens } from './ui-tokens.js';

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStatusPill(ctx, text, x, y, color) {
  const w = 170;
  const h = 30;
  roundedRectPath(ctx, x - w / 2, y - h / 2, w, h, 15);
  ctx.fillStyle = '#0b1220';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 14px Menlo';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 5);
}

function drawCheckeredFlagBackground(ctx, panelX, panelY, panelW, panelH) {
  const tile = 52;
  const cols = Math.ceil(panelW / tile) + 2;
  const rows = Math.ceil(panelH / tile) + 2;

  ctx.save();
  ctx.translate(panelX, panelY);
  ctx.beginPath();
  ctx.rect(0, 0, panelW, panelH);
  ctx.clip();
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, panelW, panelH);

  ctx.globalAlpha = 0.3;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const isDark = (row + col) % 2 === 0;
      ctx.fillStyle = isDark ? '#f8fafc' : '#111827';
      ctx.fillRect(col * tile - tile, row * tile - tile, tile, tile);
    }
  }

  ctx.globalAlpha = 1;
  const vignette = ctx.createLinearGradient(0, 0, panelW, panelH);
  vignette.addColorStop(0, 'rgba(2,6,23,0.6)');
  vignette.addColorStop(0.5, 'rgba(2,6,23,0.28)');
  vignette.addColorStop(1, 'rgba(2,6,23,0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, panelW, panelH);
  ctx.restore();
}

export function renderInitialScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const hub = state.hub;

  const centerX = panelX + panelW / 2;
  const centerY = panelY + panelH / 2;

  drawCheckeredFlagBackground(ctx, panelX, panelY, panelW, panelH);

  const cardW = Math.min(720, panelW - 80);
  const cardH = Math.min(360, panelH - 80);
  const cardX = centerX - cardW / 2;
  const cardY = centerY - cardH / 2;

  roundedRectPath(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  let y = cardY + 84;
  ctx.textAlign = 'center';
  const timedOut = String(hub.lastError || '').toLowerCase().includes('timeout');
  const isDisconnected = hub.status === 'Disconnected';
  const statusColor = hub.status === 'Connecting' ? UiTokens.warn : isDisconnected || timedOut ? UiTokens.err : UiTokens.ok;
  if (hub.status !== 'Disconnected') {
    drawStatusPill(ctx, hub.status.toUpperCase(), centerX, y, statusColor);
  }

  y += 54;

  if (hub.status === 'Connecting') {
    ctx.fillStyle = UiTokens.text;
    ctx.font = 'bold 20px Menlo';
    ctx.fillText('Connecting to Porsche...', centerX, y);
    y += 58;

    ctx.fillStyle = UiTokens.text;
    ctx.font = 'bold 44px Menlo';
    ctx.fillText(`${hub.remainingSeconds ?? hub.timeoutSeconds}s`, centerX, y);
    y += 44;

    ctx.fillStyle = UiTokens.muted;
    ctx.font = 'bold 20px Menlo';
    ctx.fillText('Press the green button on LEGO Porsche GT4', centerX, y);
  } else {
    if (timedOut) {
      roundedRectPath(ctx, centerX - 250, y - 28, 500, 42, 10);
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239,68,68,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = UiTokens.err;
      ctx.font = 'bold 15px Menlo';
      ctx.fillText('Connection timed out. Move closer and try again.', centerX, y - 2);
      y += 54;
    }
    y += 48;

    ctx.fillStyle = UiTokens.text;
    ctx.font = 'bold 20px Menlo';
    ctx.fillText('Press X to connect', centerX, y);
  }

  ctx.fillStyle = UiTokens.muted;
  ctx.font = '13px Menlo';
  ctx.fillText(
    'You may need to pair LEGO Porsche in Bluetooth settings before connecting in the app.',
    centerX,
    cardY + cardH - 18,
  );

  ctx.textAlign = 'left';
}
