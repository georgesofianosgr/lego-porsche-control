import sdl from '@kmamal/sdl';
import { createCanvas } from '@napi-rs/canvas';
import { renderInitialScreen } from './screens/initial-screen.js';
import { renderDriveScreen } from './screens/drive-screen.js';
import { renderMenuScreen } from './screens/menu-screen.js';
import { renderGamepadScreen } from './screens/gamepad-screen.js';

const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 720;
const INTERNAL_WIDTH = 1920;
const INTERNAL_HEIGHT = 1080;
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

  const menuLabel = state?.gamepad?.profile?.menu || 'Options';
  const hint = state.ui.screen === 'menu' ? `${menuLabel}: Back` : `${menuLabel}: Menu`;
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
    // Render everything in fixed 1080p, then let SDL scale to window/fullscreen.
    const canvas = createCanvas(INTERNAL_WIDTH, INTERNAL_HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    drawTopBar(ctx, INTERNAL_WIDTH, state);

    const layout = {
      panelX: 24,
      panelY: 76,
      panelW: INTERNAL_WIDTH - 48,
      panelH: INTERNAL_HEIGHT - 100,
      FG,
      MUTED,
      OK,
      WARN: '#f59e0b',
      ERR: '#ef4444',
    };

    if (state.ui.screen === 'menu') {
      renderMenuScreen(ctx, layout, state);
    } else if (state.ui.screen === 'gamepad') {
      renderGamepadScreen(ctx, layout, state);
    } else if (state.ui.screen === 'drive') {
      renderDriveScreen(ctx, layout, state);
    } else {
      renderInitialScreen(ctx, layout, state);
    }

    const data = ctx.getImageData(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT).data;
    window.render(INTERNAL_WIDTH, INTERNAL_HEIGHT, INTERNAL_WIDTH * 4, 'rgba32', Buffer.from(data));
    window.setTitle(`LEGO Porsche SDL | ${state.ui.screen.toUpperCase()}`);
  };

  const dispose = () => {
    window.off('resize', resizeHandler);
    window.destroy();
  };

  const setFullscreen = (enabled) => {
    window.setFullscreen(Boolean(enabled));
  };

  const isFullscreen = () => Boolean(window.fullscreen);

  return { window, render, dispose, setFullscreen, isFullscreen };
}
