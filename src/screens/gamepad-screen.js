import { UiTokens } from './ui-tokens.js';
import { getButtonIcon, getButtonIconForFamily } from '../button-icons.js';

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

function controllerFamilyFromDevice(device, fallbackProfile) {
  const profile = String(device?.profile || fallbackProfile || '').toLowerCase();
  const name = String(device?.name || '').toLowerCase();
  if (profile !== 'playstation') return 'xbox';
  if (name.includes('dualshock') || name.includes('ps4')) return 'dualshock';
  return 'dualsense';
}

function keymapRowsForFamily(family) {
  return [
    { action: 'Steering', controlText: 'Left Stick X' },
    { action: 'Throttle', controlText: family === 'xbox' ? 'RT (Right Trigger)' : 'R2' },
    { action: 'Reverse / Brake', controlText: family === 'xbox' ? 'LT (Left Trigger)' : 'L2' },
    { action: 'Lights On/Off', iconAction: 'lights', fallback: family === 'xbox' ? 'Y' : 'Triangle' },
    { action: 'Parking Mode', iconAction: 'parking', fallback: family === 'xbox' ? 'B' : 'Circle' },
    { action: 'Menu Toggle', iconAction: 'menu', fallback: family === 'xbox' ? 'Menu' : 'Options' },
    { action: 'Select / Activate', iconAction: 'primary', fallback: family === 'xbox' ? 'A' : 'Cross' },
    { action: 'Secondary Action', iconAction: 'secondary', fallback: family === 'xbox' ? 'X' : 'Square' },
  ];
}

export function renderGamepadScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;
  const devices = state.gamepad.availableDevices || [];

  ctx.fillStyle = UiTokens.panel;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const pad = 20;
  const titleX = panelX + pad;
  let y = panelY + 42;

  ctx.fillStyle = UiTokens.text;
  ctx.font = 'bold 30px Menlo';
  ctx.fillText('Gamepad Setup', titleX, y);
  y += 30;

  ctx.fillStyle = UiTokens.muted;
  ctx.font = '14px Menlo';
  ctx.fillText('Switch: Left/Right or D-Pad Up/Down', titleX, y);
  y += 24;

  ctx.fillText('Activate selected controller with', titleX, y);
  const activePrimaryIcon = getButtonIcon(state.gamepad, 'primary');
  const activateTextW = ctx.measureText('Activate selected controller with').width;
  if (activePrimaryIcon) {
    ctx.drawImage(activePrimaryIcon, titleX + activateTextW + 10, y - 15, 20, 20);
  } else {
    const primary = state?.gamepad?.profile?.primary || 'A';
    ctx.fillText(primary, titleX + activateTextW + 10, y);
  }

  const cardsTop = y + 14;
  const cardsH = panelY + panelH - cardsTop - pad;
  const leftW = Math.floor(panelW * 0.46);
  const gap = 18;
  const leftX = panelX + pad;
  const rightX = leftX + leftW + gap;
  const rightW = panelX + panelW - pad - rightX;

  roundedRectPath(ctx, leftX, cardsTop, leftW, cardsH, 16);
  ctx.fillStyle = UiTokens.panelAlt;
  ctx.fill();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.stroke();

  roundedRectPath(ctx, rightX, cardsTop, rightW, cardsH, 16);
  ctx.fillStyle = UiTokens.panelAlt;
  ctx.fill();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.stroke();

  const leftInnerX = leftX + 16;
  let leftY = cardsTop + 30;
  ctx.fillStyle = UiTokens.text;
  ctx.font = 'bold 20px Menlo';
  ctx.fillText('Controllers', leftInnerX, leftY);
  leftY += 24;
  ctx.fillStyle = UiTokens.muted;
  ctx.font = '13px Menlo';
  ctx.fillText('Select one and activate it', leftInnerX, leftY);
  leftY += 20;

  if (!devices.length) {
    ctx.fillStyle = UiTokens.muted;
    ctx.font = '16px Menlo';
    ctx.fillText('No controller detected.', leftInnerX, leftY + 20);
  } else {
    const rowX = leftInnerX;
    const rowW = leftW - 32;
    const rowH = 36;
    const rowGap = 10;
    for (const device of devices) {
      const selected = device.index === state.gamepad.selectedDeviceIndex;
      const active = device.index === state.gamepad.activeDeviceIndex;
      const rowY = leftY - 24;
      roundedRectPath(ctx, rowX, rowY, rowW, rowH, 10);
      if (selected) {
        ctx.fillStyle = 'rgba(34,197,94,0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34,197,94,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(148,163,184,0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = selected ? UiTokens.text : '#cbd5e1';
      ctx.font = selected ? 'bold 16px Menlo' : '15px Menlo';
      const activeTag = active ? ' [active]' : '';
      ctx.fillText(`${device.name}${activeTag}`, rowX + 12, leftY);
      leftY += rowH + rowGap;
    }
  }

  const selectedDevice =
    devices.find((d) => d.index === state.gamepad.selectedDeviceIndex) ||
    devices.find((d) => d.index === state.gamepad.activeDeviceIndex) ||
    null;
  const family = controllerFamilyFromDevice(selectedDevice, state?.gamepad?.profile?.profile);
  const keymapTitle = family === 'xbox' ? 'Xbox Keymap' : family === 'dualshock' ? 'DualShock Keymap' : 'DualSense Keymap';
  const rows = keymapRowsForFamily(family);

  const rightInnerX = rightX + 16;
  let rightY = cardsTop + 30;
  const controlColX = rightInnerX + 190;

  ctx.fillStyle = UiTokens.text;
  ctx.font = 'bold 20px Menlo';
  ctx.fillText(keymapTitle, rightInnerX, rightY);
  rightY += 24;
  ctx.fillStyle = UiTokens.muted;
  ctx.font = '13px Menlo';
  ctx.fillText('Controls', rightInnerX, rightY);
  rightY += 20;

  for (const row of rows) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px Menlo';
    ctx.fillText(row.action, rightInnerX, rightY);

    if (row.iconAction) {
      const icon = getButtonIconForFamily(family, row.iconAction);
      if (icon) {
        ctx.drawImage(icon, controlColX, rightY - 16, 20, 20);
      } else {
        ctx.fillStyle = UiTokens.muted;
        ctx.fillText(row.fallback || '', controlColX, rightY);
      }
    } else {
      ctx.fillStyle = UiTokens.muted;
      ctx.fillText(row.controlText || '', controlColX, rightY);
    }

    rightY += 28;
  }
}

