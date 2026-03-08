export function renderInitialScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH, FG, MUTED, WARN, ERR, OK } = layout;
  const hub = state.hub;
  const primary = state.gamepad.profile.primary;
  const secondary = state.gamepad.profile.secondary;

  ctx.fillStyle = '#111827';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const centerX = panelX + panelW / 2;
  let y = panelY + 90;

  ctx.textAlign = 'center';
  ctx.fillStyle = FG;
  ctx.font = 'bold 30px Menlo';
  ctx.fillText('Initial Screen', centerX, y);
  y += 56;

  if (hub.status === 'Connecting') {
    ctx.fillStyle = WARN;
    ctx.font = 'bold 24px Menlo';
    ctx.fillText('Connecting to Porsche...', centerX, y);
    y += 46;

    ctx.fillStyle = FG;
    ctx.font = 'bold 40px Menlo';
    ctx.fillText(`${hub.remainingSeconds ?? hub.timeoutSeconds}s`, centerX, y);
    y += 42;

    ctx.fillStyle = MUTED;
    ctx.font = '18px Menlo';
    ctx.fillText('Please wait while connection is in progress', centerX, y);
  } else {
    const timedOut = String(hub.lastError || '').toLowerCase().includes('timeout');

    if (timedOut) {
      ctx.fillStyle = ERR;
      ctx.font = 'bold 24px Menlo';
      ctx.fillText('Porsche not found.', centerX, y);
      y += 42;
    }

    ctx.fillStyle = OK;
    ctx.font = 'bold 24px Menlo';
    ctx.fillText(`Press ${primary} to Connect`, centerX, y);
    y += 40;

    ctx.fillStyle = MUTED;
    ctx.font = '16px Menlo';
    ctx.fillText(`Press ${secondary} to Choose Gamepad | Keyboard: X connect, G gamepad`, centerX, y);
  }

  ctx.textAlign = 'left';
}
