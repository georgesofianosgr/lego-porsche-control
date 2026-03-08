import sdl from '@kmamal/sdl';
import { createCanvas } from '@napi-rs/canvas';
import { renderInitialScreen } from './screens/initial-screen.js';
import { renderDriveScreen } from './screens/drive-screen.js';
import { renderMenuScreen } from './screens/menu-screen.js';

const WINDOW_WIDTH = 920;
const WINDOW_HEIGHT = 520;
const BG = '#0f172a';
const FG = '#e5e7eb';
const MUTED = '#94a3b8';
const OK = '#22c55e';

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.round(n));
}

function drawTopBar(ctx, width, state) {
  ctx.fillStyle = FG;
  ctx.font = 'bold 28px Menlo';
  ctx.fillText('LEGO Porsche', 32, 48);

  const hint = state.ui.screen === 'menu' ? 'OPTIONS: Back' : 'OPTIONS: Menu';
  ctx.font = '16px Menlo';
  ctx.fillStyle = MUTED;
  const textWidth = ctx.measureText(hint).width;
  ctx.fillText(hint, width - textWidth - 32, 38);
}

export function createGraphics() {
  const window = sdl.video.createWindow({
    title: 'LEGO Porsche SDL',
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    resizable: false,
    fullscreen: false,
  });

  let size = {
    width: toPositiveInt(window.pixelWidth ?? window.width, WINDOW_WIDTH),
    height: toPositiveInt(window.pixelHeight ?? window.height, WINDOW_HEIGHT),
  };

  const resizeHandler = (...args) => {
    const evt = args[0] && typeof args[0] === 'object' ? args[0] : null;
    const width = evt ? (evt.pixelWidth ?? evt.width) : (args[2] ?? args[0]);
    const height = evt ? (evt.pixelHeight ?? evt.height) : (args[3] ?? args[1]);
    size = {
      width: toPositiveInt(width, size.width),
      height: toPositiveInt(height, size.height),
    };
  };

  window.on('resize', resizeHandler);

  const render = (state) => {
    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size.width, size.height);

    drawTopBar(ctx, size.width, state);

    const layout = {
      panelX: 24,
      panelY: 76,
      panelW: size.width - 48,
      panelH: size.height - 100,
      FG,
      MUTED,
      OK,
      WARN: '#f59e0b',
      ERR: '#ef4444',
    };

    if (state.ui.screen === 'menu') {
      renderMenuScreen(ctx, layout, state);
    } else if (state.ui.screen === 'drive') {
      renderDriveScreen(ctx, layout, state);
    } else {
      renderInitialScreen(ctx, layout, state);
    }

    const data = ctx.getImageData(0, 0, size.width, size.height).data;
    window.render(size.width, size.height, size.width * 4, 'rgba32', Buffer.from(data));
    window.setTitle(`LEGO Porsche SDL | ${state.ui.screen.toUpperCase()}`);
  };

  const dispose = () => {
    window.off('resize', resizeHandler);
    window.destroy();
  };

  return { window, render, dispose };
}
