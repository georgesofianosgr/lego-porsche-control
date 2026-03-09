export function drawHeadlightIcon(ctx, { x, y, size = 24, color = '#e5e7eb' } = {}) {
  const s = Math.max(12, Number(size) || 24);
  const lampW = s * 0.48;
  const lampH = s * 0.56;
  const lampX = x;
  const lampY = y + s * 0.18;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, Math.round(s * 0.08));

  // Lamp body
  ctx.beginPath();
  ctx.moveTo(lampX + lampW, lampY);
  ctx.lineTo(lampX + lampW * 0.45, lampY);
  ctx.quadraticCurveTo(lampX, lampY + lampH * 0.5, lampX + lampW * 0.45, lampY + lampH);
  ctx.lineTo(lampX + lampW, lampY + lampH);
  ctx.closePath();
  ctx.stroke();

  // Light beams
  const beamStartX = lampX + lampW + s * 0.08;
  const beamY = y + s * 0.24;
  const beamLen = s * 0.42;
  const beamGap = s * 0.16;
  for (let i = 0; i < 3; i += 1) {
    const by = beamY + i * beamGap;
    ctx.beginPath();
    ctx.moveTo(beamStartX, by);
    ctx.lineTo(beamStartX + beamLen, by);
    ctx.stroke();
  }
}
