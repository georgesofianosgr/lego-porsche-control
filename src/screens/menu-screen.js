const ITEMS = ['Disconnect', 'Exit'];

export function renderMenuScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH, FG, MUTED, OK } = layout;

  ctx.fillStyle = '#111827';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  let y = panelY + 48;
  const x = panelX + 22;

  ctx.fillStyle = FG;
  ctx.font = 'bold 30px Menlo';
  ctx.fillText('Menu', x, y);
  y += 48;

  ctx.fillStyle = MUTED;
  ctx.font = '16px Menlo';
  ctx.fillText('Use D-Pad Up/Down (or keyboard arrows) and X to select', x, y);
  y += 44;

  for (let i = 0; i < ITEMS.length; i += 1) {
    const selected = state.ui.menuIndex === i;
    ctx.fillStyle = selected ? OK : FG;
    ctx.font = selected ? 'bold 24px Menlo' : '20px Menlo';
    ctx.fillText(`${selected ? '>' : ' '} ${ITEMS[i]}`, x, y);
    y += 38;
  }
}
