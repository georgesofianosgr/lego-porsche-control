function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function batteryColor(percent) {
  if (percent < 20) return '#ef4444';
  if (percent < 50) return '#f59e0b';
  return '#22c55e';
}

export function drawBatteryGraphic(ctx, { x, y, width, height, percent }) {
  const hasValue = Number.isFinite(percent);
  const normalized = hasValue ? clamp(percent, 0, 100) : null;
  const fillRatio = normalized === null ? 0 : normalized / 100;

  const tipW = Math.max(6, Math.round(width * 0.045));
  const tipH = Math.max(10, Math.round(height * 0.45));
  const bodyW = width - tipW - 4;
  const bodyH = height;

  const innerPad = 3;
  const innerX = x + innerPad;
  const innerY = y + innerPad;
  const innerW = bodyW - innerPad * 2;
  const innerH = bodyH - innerPad * 2;
  const fillW = Math.max(0, Math.round(innerW * fillRatio));

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, bodyW, bodyH);
  ctx.strokeRect(x + bodyW + 2, y + Math.round((bodyH - tipH) / 2), tipW, tipH);

  ctx.fillStyle = '#111827';
  ctx.fillRect(innerX, innerY, innerW, innerH);

  if (fillW > 0) {
    ctx.fillStyle = hasValue ? batteryColor(normalized) : '#64748b';
    ctx.fillRect(innerX, innerY, fillW, innerH);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 16px Menlo';
  ctx.fillText(
    hasValue ? `${Math.round(normalized)}%` : '--%',
    x + Math.round(bodyW / 2),
    y + Math.round(bodyH * 0.66),
  );
  ctx.textAlign = 'left';
}
