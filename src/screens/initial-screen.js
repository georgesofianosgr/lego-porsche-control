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

export function renderInitialScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const hub = state.hub;

  const centerX = panelX + panelW / 2;
  const centerY = panelY + panelH / 2;

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const glowTop = ctx.createRadialGradient(centerX, panelY + 110, 10, centerX, panelY + 110, panelW * 0.5);
  glowTop.addColorStop(0, 'rgba(34,197,94,0.18)');
  glowTop.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(panelX, panelY, panelW, panelH * 0.6);

  const glowBottom = ctx.createRadialGradient(centerX, panelY + panelH + 20, 40, centerX, panelY + panelH, panelW);
  glowBottom.addColorStop(0, 'rgba(56,189,248,0.14)');
  glowBottom.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(panelX, panelY + panelH * 0.35, panelW, panelH * 0.65);

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
  drawStatusPill(ctx, hub.status.toUpperCase(), centerX, y, statusColor);

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

  ctx.textAlign = 'left';
}
