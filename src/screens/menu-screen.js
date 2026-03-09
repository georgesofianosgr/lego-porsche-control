import { UiTokens } from './ui-tokens.js';

export function renderMenuScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const items = [
    'Disconnect',
    'Choose Gamepad',
    `Lights: ${state.control.lightModeLabel}`,
    `Toggle Fullscreen (${state.ui.isFullscreen ? 'On' : 'Off'})`,
    'Exit',
  ];

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  let y = panelY + 48;
  const x = panelX + 22;

  ctx.fillStyle = UiTokens.text;
  ctx.font = UiTokens.title;
  ctx.fillText('Menu', x, y);
  y += 48;

  ctx.fillStyle = UiTokens.muted;
  ctx.font = UiTokens.body;
  ctx.fillText('Use D-Pad Up/Down (or keyboard arrows) and primary action to select', x, y);
  y += 44;

  for (let i = 0; i < items.length; i += 1) {
    const selected = state.ui.menuIndex === i;
    ctx.fillStyle = selected ? UiTokens.ok : UiTokens.text;
    ctx.font = selected ? UiTokens.itemSelected : UiTokens.item;
    ctx.fillText(`${selected ? '>' : ' '} ${items[i]}`, x, y);
    y += 38;
  }
}
