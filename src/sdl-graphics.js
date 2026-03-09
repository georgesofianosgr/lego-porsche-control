import sdl from '@kmamal/sdl';
import fs from 'node:fs';
import { createCanvas, Image } from '@napi-rs/canvas';
import { renderInitialScreen } from './screens/initial-screen.js';
import { renderDriveScreen } from './screens/drive-screen.js';
import { renderMenuScreen } from './screens/menu-screen.js';
import { renderGamepadScreen } from './screens/gamepad-screen.js';

const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 720;
const INTERNAL_WIDTH = 1920;
const INTERNAL_HEIGHT = 1080;
const UI_SCALE = 2;
const VIRTUAL_WIDTH = Math.round(INTERNAL_WIDTH / UI_SCALE);
const VIRTUAL_HEIGHT = Math.round(INTERNAL_HEIGHT / UI_SCALE);
const BG = '#0f172a';
const FG = '#e5e7eb';
const MUTED = '#94a3b8';
const OK = '#22c55e';
const PORSCHE_LOGO_PATH = new URL('../assets/porsche-logo.png', import.meta.url);

function loadPorscheLogo() {
  try {
    const image = new Image();
    image.src = fs.readFileSync(PORSCHE_LOGO_PATH);
    return image;
  } catch (_err) {
    return null;
  }
}

const PORSCHE_LOGO = loadPorscheLogo();

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.round(n));
}

function drawTopBar(ctx, width, state) {
  const logoW = 26;
  const logoH = 34;
  const logoX = 32;
  const titleBaselineY = 48;
  ctx.font = 'bold 28px Menlo';
  const titleMetrics = ctx.measureText('LEGO Porsche');
  const ascent = titleMetrics.actualBoundingBoxAscent || 22;
  const descent = titleMetrics.actualBoundingBoxDescent || 6;
  const textCenterY = titleBaselineY + (descent - ascent) / 2;
  const logoY = Math.round(textCenterY - logoH / 2);
  if (PORSCHE_LOGO) {
    ctx.drawImage(PORSCHE_LOGO, logoX, logoY, logoW, logoH);
  }

  const titleX = PORSCHE_LOGO ? logoX + logoW + 12 : logoX;
  ctx.fillStyle = FG;
  ctx.fillText('LEGO Porsche', titleX, titleBaselineY);

  const menuLabel = state?.gamepad?.profile?.menu || 'Options';
  const hint = state.ui.screen === 'menu' ? `${menuLabel}: Back` : `${menuLabel}: Menu`;
  ctx.font = '16px Menlo';
  ctx.fillStyle = MUTED;
  const textWidth = ctx.measureText(hint).width;
  ctx.fillText(hint, width - textWidth - 32, 38);
}

export function createGraphics() {
  const window = sdl.video.createWindow({
    title: 'Lego Porsche Control',
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
    ctx.setTransform(UI_SCALE, 0, 0, UI_SCALE, 0, 0);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    drawTopBar(ctx, VIRTUAL_WIDTH, state);

    const layout = {
      panelX: 24,
      panelY: 76,
      panelW: VIRTUAL_WIDTH - 48,
      panelH: VIRTUAL_HEIGHT - 100,
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
    window.setTitle('Lego Porsche Control');
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
