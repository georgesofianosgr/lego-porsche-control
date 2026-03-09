import { UiTokens } from './ui-tokens.js';

export function renderGamepadScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const x = panelX + 22;
  let y = panelY + 48;

  ctx.fillStyle = UiTokens.text;
  ctx.font = UiTokens.title;
  ctx.fillText('Select Gamepad', x, y);
  y += 42;

  ctx.font = UiTokens.body;
  ctx.fillStyle = UiTokens.muted;
  ctx.fillText('Use Left/Right (or D-Pad Up/Down) to choose. Press primary action to activate.', x, y);
  y += 34;

  const devices = state.gamepad.availableDevices || [];
  if (!devices.length) {
    ctx.fillStyle = UiTokens.muted;
    ctx.font = UiTokens.item;
    ctx.fillText('No controller detected.', x, y + 20);
    return;
  }

  for (const device of devices) {
    const selected = device.index === state.gamepad.selectedDeviceIndex;
    const active = device.index === state.gamepad.activeDeviceIndex;

    ctx.fillStyle = selected ? UiTokens.ok : UiTokens.text;
    ctx.font = selected ? UiTokens.itemSelected : UiTokens.bodyStrong;

    const marker = selected ? '>' : ' ';
    const activeTag = active ? ' [active]' : '';
    ctx.fillText(`${marker} ${device.name} (${device.profile})${activeTag}`, x, y);
    y += 30;
  }

  y += 18;
  ctx.fillStyle = UiTokens.muted;
  ctx.font = UiTokens.body;
  ctx.fillText(`Current profile: ${state.gamepad.profile.profile}`, x, y);
}
