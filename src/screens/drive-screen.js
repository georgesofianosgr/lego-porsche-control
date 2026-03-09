export function renderDriveScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH, FG, MUTED } = layout;

  ctx.fillStyle = '#111827';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  let y = panelY + 48;
  const x = panelX + 22;

  ctx.fillStyle = FG;
  ctx.font = 'bold 30px Menlo';
  ctx.fillText('Drive Screen', x, y);
  y += 44;

  ctx.font = '18px Menlo';
  ctx.fillStyle = MUTED;
  ctx.fillText(`Device: ${state.hub.name || '(unknown)'}`, x, y);
  y += 30;
  ctx.fillText(`Address: ${state.hub.address || '(n/a)'}`, x, y);
  y += 30;
  ctx.fillText(`Selected speed: ${state.control.selectedSpeed}%`, x, y);
  y += 30;
  ctx.fillText(`Light mode: ${state.control.lightModeLabel} (0x${Number(state.control.lights).toString(16)})`, x, y);
  y += 30;
  ctx.fillText(`Command speed: ${state.control.speed}`, x, y);
  y += 30;
  ctx.fillText(`Command angle: ${state.control.angle}`, x, y);
  y += 30;
  ctx.fillText(`Controller profile: ${state.gamepad.profile.profile}`, x, y);
  y += 30;
  ctx.fillText(`Gamepad: ${state.gamepad.name || '(not connected)'}`, x, y);
  y += 30;
  ctx.fillText(
    `Triggers L2/R2: ${Number(state.gamepad.leftTrigger || 0).toFixed(2)} / ${Number(
      state.gamepad.rightTrigger || 0,
    ).toFixed(2)}`,
    x,
    y,
  );
  y += 30;
  ctx.fillText(
    `Keyboard WASD: ${state.keyboard.w ? 'W' : '-'}${state.keyboard.a ? 'A' : '-'}${
      state.keyboard.s ? 'S' : '-'
    }${state.keyboard.d ? 'D' : '-'}`,
    x,
    y,
  );
}
