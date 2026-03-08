import sdl from '@kmamal/sdl';
import { createCanvas } from '@napi-rs/canvas';

const WINDOW_WIDTH = 920;
const WINDOW_HEIGHT = 520;
const BG = '#0f172a';
const PANEL = '#111827';
const FG = '#e5e7eb';
const MUTED = '#94a3b8';
const OK = '#22c55e';
const WARN = '#f59e0b';
const ERR = '#ef4444';

function statusColor(label) {
  if (label === 'Connected') return OK;
  if (label === 'Connecting') return WARN;
  return ERR;
}

function boolLabel(value) {
  return value ? 'Connected' : 'Disconnected';
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.round(n));
}

export function createGraphics() {
  const window = sdl.video.createWindow({
    title: 'LEGO Porsche SDL Status',
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
    // @kmamal/sdl may emit either positional args or a single resize event object.
    const evt = args[0] && typeof args[0] === 'object' ? args[0] : null;
    const width = evt ? (evt.pixelWidth ?? evt.width) : (args[2] ?? args[0]);
    const height = evt ? (evt.pixelHeight ?? evt.height) : (args[3] ?? args[1]);
    size = {
      width: toPositiveInt(width, size.width),
      height: toPositiveInt(height, size.height),
    };
  };

  window.on('resize', resizeHandler);

  const render = (uiState) => {
    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.fillStyle = FG;
    ctx.font = 'bold 28px Menlo';
    ctx.fillText('LEGO Porsche Connection Status', 32, 48);

    ctx.font = '16px Menlo';
    ctx.fillStyle = MUTED;
    ctx.fillText('Keyboard: WASD = Drive | ESC = Exit | R = Retry Connect', 32, 80);
    ctx.fillText('PlayStation: L2/R2 = Reverse/Throttle | OPTIONS/PS = Exit | CROSS (X) = Retry', 32, 102);

    const panelX = 24;
    const panelY = 126;
    const panelW = size.width - 48;
    const panelH = size.height - 150;

    ctx.fillStyle = PANEL;
    ctx.fillRect(panelX, panelY, panelW, panelH);

    let y = panelY + 44;

    const drawSection = (title, stateLabel, lines) => {
      ctx.fillStyle = FG;
      ctx.font = 'bold 20px Menlo';
      ctx.fillText(title, panelX + 20, y);

      ctx.fillStyle = statusColor(stateLabel);
      ctx.font = 'bold 18px Menlo';
      ctx.fillText(stateLabel, panelX + panelW - 180, y);

      y += 28;
      ctx.font = '16px Menlo';
      for (const line of lines) {
        ctx.fillStyle = MUTED;
        ctx.fillText(line, panelX + 20, y);
        y += 24;
      }
      y += 18;
    };

    const gamepadLabel = boolLabel(uiState.gamepad.connected);
    drawSection('Gamepad', gamepadLabel, [
      `Name: ${uiState.gamepad.name || '(none)'}`,
      `Type: ${uiState.gamepad.type || '(unknown)'}`,
      `Last button: ${uiState.gamepad.lastButton || '(none)'}`,
      `LStick X: ${Number(uiState.gamepad.leftStickX || 0).toFixed(2)}`,
      `Triggers L2/R2: ${Number(uiState.gamepad.leftTrigger || 0).toFixed(2)} / ${Number(
        uiState.gamepad.rightTrigger || 0,
      ).toFixed(2)}`,
      `Shoulders L1/R1: ${uiState.gamepad.leftShoulder ? 'on' : 'off'} / ${
        uiState.gamepad.rightShoulder ? 'on' : 'off'
      }`,
    ]);

    drawSection('LEGO Control+ Device', uiState.hub.status, [
      `Name: ${uiState.hub.name || '(not connected)'}`,
      `Address: ${uiState.hub.address || '(n/a)'}`,
      `Timeout: ${uiState.hub.timeoutSeconds}s`,
      `Countdown: ${
        uiState.hub.status === 'Connecting'
          ? `${uiState.hub.remainingSeconds ?? uiState.hub.timeoutSeconds}s`
          : '(idle)'
      }`,
      `Keyboard WASD: ${uiState.keyboard.w ? 'W' : '-'}${uiState.keyboard.a ? 'A' : '-'}${
        uiState.keyboard.s ? 'S' : '-'
      }${uiState.keyboard.d ? 'D' : '-'}`,
      `Last error: ${uiState.hub.lastError || '(none)'}`,
      `Command speed/angle: ${uiState.control.speed} / ${uiState.control.angle}`,
    ]);

    const data = ctx.getImageData(0, 0, size.width, size.height).data;
    const buffer = Buffer.from(data);
    window.render(size.width, size.height, size.width * 4, 'rgba32', buffer);

    window.setTitle(
      `LEGO Porsche SDL | Hub ${uiState.hub.status} | Gamepad ${gamepadLabel}${
        uiState.gamepad.name ? ` (${uiState.gamepad.name})` : ''
      }`,
    );
  };

  const dispose = () => {
    window.off('resize', resizeHandler);
    window.destroy();
  };

  return {
    window,
    render,
    dispose,
  };
}
