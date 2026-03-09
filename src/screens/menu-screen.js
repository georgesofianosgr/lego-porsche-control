import { UiTokens } from './ui-tokens.js';
import { getMenuItems } from '../menu-items.js';

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

export function renderMenuScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const items = getMenuItems(state);

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const cardX = panelX + 24;
  const cardY = panelY + 20;
  const cardW = panelW - 48;
  const cardH = panelH - 40;

  roundedRectPath(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = UiTokens.panelAlt;
  ctx.fill();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.stroke();

  const titleX = cardX + 28;
  let y = cardY + 44;

  ctx.fillStyle = UiTokens.text;
  ctx.font = 'bold 29px Menlo';
  ctx.fillText('Menu', titleX, y);

  y += 26;
  ctx.fillStyle = UiTokens.muted;
  ctx.font = '13px Menlo';
  ctx.fillText('Select an action', titleX, y);

  y += 44;
  const rowX = titleX;
  const rowW = cardW - 56;
  const rowH = 42;
  const rowGap = 10;

  for (let i = 0; i < items.length; i += 1) {
    const selected = state.ui.menuIndex === i;
    const rowY = y - 30;
    roundedRectPath(ctx, rowX, rowY, rowW, rowH, 10);
    if (selected) {
      ctx.fillStyle = 'rgba(34,197,94,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,197,94,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = UiTokens.text;
      ctx.font = 'bold 21px Menlo';
      ctx.fillText(items[i].label, rowX + 18, y);
    } else {
      ctx.fillStyle = 'rgba(148,163,184,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '19px Menlo';
      ctx.fillText(items[i].label, rowX + 18, y);
    }

    y += rowH + rowGap;
  }
}
