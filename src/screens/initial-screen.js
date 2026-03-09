import { UiTokens } from './ui-tokens.js';

export function renderInitialScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const hub = state.hub;
  const primary = state.gamepad.profile.primary;
  const secondary = state.gamepad.profile.secondary;

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const centerX = panelX + panelW / 2;
  let y = panelY + 90;

  ctx.textAlign = 'center';
  ctx.fillStyle = UiTokens.text;
  ctx.font = UiTokens.title;
  ctx.fillText('Initial Screen', centerX, y);
  y += 56;

  if (hub.status === 'Connecting') {
    ctx.fillStyle = UiTokens.warn;
    ctx.font = UiTokens.heading;
    ctx.fillText('Connecting to Porsche...', centerX, y);
    y += 46;

    ctx.fillStyle = UiTokens.text;
    ctx.font = 'bold 44px Menlo';
    ctx.fillText(`${hub.remainingSeconds ?? hub.timeoutSeconds}s`, centerX, y);
    y += 42;

    ctx.fillStyle = UiTokens.muted;
    ctx.font = UiTokens.body;
    ctx.fillText('Please wait while connection is in progress', centerX, y);
  } else {
    const timedOut = String(hub.lastError || '').toLowerCase().includes('timeout');

    if (timedOut) {
      ctx.fillStyle = UiTokens.err;
      ctx.font = UiTokens.heading;
      ctx.fillText('Porsche not found.', centerX, y);
      y += 42;
    }

    ctx.fillStyle = UiTokens.ok;
    ctx.font = UiTokens.heading;
    ctx.fillText(`Press ${primary} to Connect`, centerX, y);
    y += 40;

    ctx.fillStyle = UiTokens.muted;
    ctx.font = UiTokens.body;
    ctx.fillText(`Press ${secondary} to Choose Gamepad | Keyboard: X connect, G gamepad`, centerX, y);
  }

  ctx.textAlign = 'left';
}
