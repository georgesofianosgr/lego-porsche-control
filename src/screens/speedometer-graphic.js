function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function drawSpeedometerGraphic(
  ctx,
  { centerX, centerY, radius, speed, maxSpeed = 100, reverse = false },
) {
  const startDeg = -210;
  const endDeg = 30;
  const sweepDeg = endDeg - startDeg;
  const value = clamp(Math.abs(speed), 0, maxSpeed);
  const ratio = maxSpeed > 0 ? value / maxSpeed : 0;

  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 12, toRad(startDeg), toRad(endDeg));
  ctx.stroke();

  ctx.strokeStyle = reverse ? '#ef4444' : '#22c55e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 12, toRad(startDeg), toRad(startDeg + sweepDeg * ratio));
  ctx.stroke();

  for (let tick = 0; tick <= maxSpeed; tick += 5) {
    const tickRatio = tick / maxSpeed;
    const deg = startDeg + sweepDeg * tickRatio;
    const a = toRad(deg);
    const major = tick % 10 === 0;
    const outer = radius - 2;
    const inner = major ? radius - 24 : radius - 17;
    const x1 = centerX + Math.cos(a) * inner;
    const y1 = centerY + Math.sin(a) * inner;
    const x2 = centerX + Math.cos(a) * outer;
    const y2 = centerY + Math.sin(a) * outer;
    ctx.strokeStyle = major ? '#e5e7eb' : '#64748b';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (major && tick % 20 === 0) {
      const tx = centerX + Math.cos(a) * (radius - 42);
      const ty = centerY + Math.sin(a) * (radius - 42);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 15px Menlo';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(tick), tx, ty);
    }
  }

  const needleDeg = startDeg + sweepDeg * ratio;
  const needleA = toRad(needleDeg);
  const needleLen = radius - 30;
  const nx = centerX + Math.cos(needleA) * needleLen;
  const ny = centerY + Math.sin(needleA) * needleLen;
  ctx.strokeStyle = reverse ? '#ef4444' : '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Menlo';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SPEED', centerX, centerY + 18);

  ctx.fillStyle = reverse ? '#ef4444' : '#e5e7eb';
  ctx.font = 'bold 40px Menlo';
  ctx.fillText(String(Math.round(value)), centerX, centerY + 56);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Menlo';
  ctx.fillText('km/h', centerX, centerY + 78);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
