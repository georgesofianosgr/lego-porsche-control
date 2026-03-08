export function renderGamepadScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH, FG, MUTED, OK } = layout;

  ctx.fillStyle = '#111827';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const x = panelX + 22;
  let y = panelY + 48;

  ctx.fillStyle = FG;
  ctx.font = 'bold 30px Menlo';
  ctx.fillText('Select Gamepad', x, y);
  y += 42;

  ctx.font = '16px Menlo';
  ctx.fillStyle = MUTED;
  ctx.fillText('Use Left/Right (or D-Pad Up/Down) to choose. Press primary action to activate.', x, y);
  y += 34;

  const devices = state.gamepad.availableDevices || [];
  if (!devices.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '20px Menlo';
    ctx.fillText('No controller detected.', x, y + 20);
    return;
  }

  for (const device of devices) {
    const selected = device.index === state.gamepad.selectedDeviceIndex;
    const active = device.index === state.gamepad.activeDeviceIndex;

    ctx.fillStyle = selected ? OK : FG;
    ctx.font = selected ? 'bold 22px Menlo' : '18px Menlo';

    const marker = selected ? '>' : ' ';
    const activeTag = active ? ' [active]' : '';
    ctx.fillText(`${marker} ${device.name} (${device.profile})${activeTag}`, x, y);
    y += 30;
  }

  y += 18;
  ctx.fillStyle = MUTED;
  ctx.font = '16px Menlo';
  ctx.fillText(`Current profile: ${state.gamepad.profile.profile}`, x, y);
}
