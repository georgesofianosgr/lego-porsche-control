// Icon paths from Bootstrap Icons (MIT):
// - lightbulb-fill
// - p-circle-fill
const P_CIRCLE_FILL_PATH =
  'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.5 4.002V12h1.283V9.164h1.668C10.033 9.164 11 8.08 11 6.586c0-1.482-.955-2.584-2.538-2.584zm2.77 4.072c.893 0 1.419-.545 1.419-1.488s-.526-1.482-1.42-1.482H6.778v2.97z';

let cachedHandbrakePath = null;

function getPath(pathString, cacheRefSetter) {
  if (typeof Path2D !== 'function') return null;
  try {
    const path = new Path2D(pathString);
    cacheRefSetter(path);
    return path;
  } catch {
    return null;
  }
}

function getHandbrakePath() {
  if (cachedHandbrakePath) return cachedHandbrakePath;
  return getPath(P_CIRCLE_FILL_PATH, (path) => {
    cachedHandbrakePath = path;
  });
}

function drawFallbackHandbrake(ctx, x, y, size, color) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, Math.round(size * 0.08));
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(size * 0.65)}px Menlo`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawDashboardLightVector(ctx, x, y, size, color) {
  const lampX = x + size * 0.08;
  const lampY = y + size * 0.14;
  const lampW = size * 0.38;
  const lampH = size * 0.72;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, Math.round(size * 0.075));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Headlight housing (dashboard style "D" shape)
  ctx.beginPath();
  ctx.moveTo(lampX + lampW, lampY);
  ctx.lineTo(lampX + lampW * 0.35, lampY);
  ctx.quadraticCurveTo(lampX, lampY + lampH * 0.5, lampX + lampW * 0.35, lampY + lampH);
  ctx.lineTo(lampX + lampW, lampY + lampH);
  ctx.stroke();

  // Small inner fill to make icon read better at low sizes
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(lampX + lampW * 0.94, lampY + 2);
  ctx.lineTo(lampX + lampW * 0.42, lampY + 2);
  ctx.quadraticCurveTo(lampX + 2, lampY + lampH * 0.5, lampX + lampW * 0.42, lampY + lampH - 2);
  ctx.lineTo(lampX + lampW * 0.94, lampY + lampH - 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Beam lines
  const beamStartX = x + size * 0.55;
  const beamLen = size * 0.34;
  const beamGap = size * 0.18;
  const topY = y + size * 0.24;
  for (let i = 0; i < 3; i += 1) {
    const by = topY + i * beamGap;
    ctx.beginPath();
    ctx.moveTo(beamStartX, by);
    ctx.lineTo(beamStartX + beamLen, by);
    ctx.stroke();
  }

  // Lower short beam marker
  ctx.beginPath();
  ctx.moveTo(beamStartX + size * 0.05, y + size * 0.77);
  ctx.lineTo(beamStartX + beamLen * 0.8, y + size * 0.77);
  ctx.stroke();
}

function drawIconPath(ctx, path, x, y, size, color, fallback) {
  if (!path) {
    fallback(ctx, x, y, size, color);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

export function drawDashboardLightIcon(ctx, { x, y, size = 24, active = false } = {}) {
  const color = active ? '#f8fafc' : '#64748b';
  drawDashboardLightVector(ctx, x, y, size, color);
}

export function drawDashboardHandbrakeIcon(ctx, { x, y, size = 24, active = false } = {}) {
  const color = active ? '#f97316' : '#64748b';
  drawIconPath(ctx, getHandbrakePath(), x, y, size, color, drawFallbackHandbrake);
}
