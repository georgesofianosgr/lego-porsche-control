import { drawBatteryGraphic } from './battery-graphic.js';
import { drawSpeedometerGraphic } from './speedometer-graphic.js';

let animatedSpeed = 0;
let lastAnimationAt = Date.now();

function connectionColor(status) {
  if (status === 'Connected') return '#22c55e';
  if (status === 'Connecting') return '#f59e0b';
  return '#ef4444';
}

function getAnimatedSpeed(targetSpeed) {
  const target = Number(targetSpeed) || 0;
  const now = Date.now();
  const deltaMs = Math.max(1, now - lastAnimationAt);
  lastAnimationAt = now;

  const diff = target - animatedSpeed;
  if (Math.abs(diff) < 0.01) {
    animatedSpeed = target;
    return animatedSpeed;
  }

  const distance = Math.min(1, Math.abs(diff) / 100);
  const baseEase = 0.16 + distance * 0.18;
  const frameScale = deltaMs / 16.67;
  const easedStep = 1 - Math.pow(1 - baseEase, frameScale);

  animatedSpeed += diff * easedStep;
  return animatedSpeed;
}

function drawStatusStrip(ctx, panelX, panelY, panelW, state) {
  const statusY = panelY + 22;
  const labelX = panelX + 20;

  ctx.font = '13px Menlo';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CONNECTION', labelX, statusY);

  ctx.font = 'bold 16px Menlo';
  ctx.fillStyle = connectionColor(state.hub.status);
  ctx.fillText(state.hub.status, labelX, statusY + 20);

  const rightX = panelX + panelW - 20;
  ctx.textAlign = 'right';
  ctx.font = '13px Menlo';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CONTROLLER', rightX, statusY);
  ctx.font = 'bold 16px Menlo';
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(state.gamepad.name || '(none)', rightX, statusY + 20);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 18, panelY + 52);
  ctx.lineTo(panelX + panelW - 18, panelY + 52);
  ctx.stroke();
}

function drawSteeringWidget(ctx, centerX, centerY, state) {
  const angle = Number(state.control.angle || 0);
  const barW = 440;
  const barH = 20;
  const barX = centerX - barW / 2;
  const barY = centerY + 190;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Menlo';
  ctx.textAlign = 'center';
  ctx.fillText(`STEERING ${angle}`, centerX, barY - 10);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX, barY, barW, barH);

  const half = barW / 2;
  const norm = Math.max(-1, Math.min(1, angle / 100));
  const fillW = Math.round(Math.abs(norm) * half);
  ctx.fillStyle = '#38bdf8';
  if (norm >= 0) {
    ctx.fillRect(barX + half, barY, fillW, barH);
  } else {
    ctx.fillRect(barX + half - fillW, barY, fillW, barH);
  }

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.beginPath();
  ctx.moveTo(barX + half, barY - 4);
  ctx.lineTo(barX + half, barY + barH + 4);
  ctx.stroke();

  ctx.textAlign = 'left';
}

function drawBottomCards(ctx, panelX, panelY, panelW, panelH, state) {
  const spacing = 16;
  const margin = 20;
  const cardH = 88;
  const cardY = state.ui.debugControls ? panelY + panelH - 240 : panelY + panelH - cardH - margin;
  const cardW = Math.floor((panelW - margin * 2 - spacing * 2) / 3);
  const firstX = panelX + margin;
  const secondX = firstX + cardW + spacing;
  const thirdX = secondX + cardW + spacing;
  const batteryPercent = Number.isFinite(state.hub.batteryPercent)
    ? Math.max(0, Math.min(100, Number(state.hub.batteryPercent)))
    : null;

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(firstX, cardY, cardW, cardH);
  ctx.fillRect(secondX, cardY, cardW, cardH);
  ctx.fillRect(thirdX, cardY, cardW, cardH);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Menlo';
  ctx.fillText('LIGHT MODE', firstX + 14, cardY + 24);
  ctx.fillText('MAX SPEED', secondX + 14, cardY + 24);
  ctx.fillText('BATTERY', thirdX + 14, cardY + 20);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 24px Menlo';
  ctx.fillText(state.control.lightModeLabel, firstX + 14, cardY + 58);
  ctx.fillText(`${state.control.selectedSpeed}%`, secondX + 14, cardY + 58);
  drawBatteryGraphic(ctx, {
    x: thirdX + 14,
    y: cardY + 34,
    width: cardW - 30,
    height: 34,
    percent: batteryPercent,
  });
}

function drawDebugPanel(ctx, panelX, panelY, panelW, panelH, state) {
  if (!state.ui.debugControls) return;

  const boxX = panelX + 20;
  const boxY = panelY + panelH - 140;
  const boxW = panelW - 40;
  const boxH = 120;

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 14px Menlo';
  ctx.fillText('Debug Telemetry', boxX + 12, boxY + 20);

  ctx.font = '12px Menlo';
  ctx.fillStyle = '#94a3b8';
  const t = state.gamepad;
  const line1 = `LStickX=${Number(t.leftStickX || 0).toFixed(3)} | L2=${Number(t.leftTrigger || 0).toFixed(
    3,
  )} | R2=${Number(t.rightTrigger || 0).toFixed(3)} | L1=${t.leftShoulder ? 1 : 0} | R1=${
    t.rightShoulder ? 1 : 0
  }`;
  const line2 = `Speed=${state.control.speed} Angle=${state.control.angle} Source=${state.control.inputSource} Selected=${
    state.control.selectedSpeed
  }`;
  const line3 = `Hub=${state.hub.status} Battery=${
    typeof state.hub.batteryPercent === 'number' ? `${state.hub.batteryPercent}%` : '--'
  } PropOp=${
    state.hub.batteryLastMessage ? `0x${state.hub.batteryLastMessage.operation.toString(16)}` : '(n/a)'
  } Error=${
    state.hub.lastError || '(none)'
  }`;

  ctx.fillText(line1, boxX + 12, boxY + 46);
  ctx.fillText(line2, boxX + 12, boxY + 70);
  ctx.fillText(line3, boxX + 12, boxY + 94);
}

export function renderDriveScreen(ctx, layout, state) {
  const { panelX, panelY, panelW, panelH } = layout;

  ctx.fillStyle = '#111827';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  drawStatusStrip(ctx, panelX, panelY, panelW, state);

  const centerX = panelX + panelW * 0.5;
  const centerY = panelY + panelH * 0.42;
  const displaySpeed = getAnimatedSpeed(state.control.speed);
  drawSpeedometerGraphic(ctx, {
    centerX,
    centerY,
    radius: 165,
    speed: displaySpeed,
    maxSpeed: 100,
    reverse: Number(displaySpeed || 0) < 0,
  });
  drawSteeringWidget(ctx, centerX, centerY, state);
  drawBottomCards(ctx, panelX, panelY, panelW, panelH, state);
  drawDebugPanel(ctx, panelX, panelY, panelW, panelH, state);
}
