#!/usr/bin/env node

import process from 'node:process';
import sdl from '@kmamal/sdl';
import { createGraphics } from './sdl-graphics.js';
import { registerKeyboard } from './sdl-keyboard.js';
import { createGamepadMonitor } from './sdl-gamepad.js';
import { createPorscheConnection } from './porsche-connection.js';
import { createMockConnection } from './mocks/mock-connection.js';
import { LightMode } from './constants.js';

const REFRESH_MS = 100;
const CONTROL_MS = 50;
const CONNECTION_TIMEOUT_SECONDS = 15;
const STEER_MAX = 100;
const TRIGGER_DEADZONE = 0.06;
const STICK_CENTER_DEADZONE = 0.08;
const STICK_OUTER_THRESHOLD = 0.9;
const DEFAULT_SPEED = 100;
const SPEED_STEP = 25;
const SPEED_MIN = 0;
const SPEED_MAX = 100;
const KEYBOARD_ANGLE = 70;
const DRIVE_HEARTBEAT_MS = 180;
const LIGHT_MODES = [
  { value: LightMode.ON, label: 'On' }, // 0x00
  { value: LightMode.OFF, label: 'Off' }, // 0x04
  { value: LightMode.BRAKE_ONLY, label: 'Brake Only' }, // 0x05
];

const SCREEN_INITIAL = 'initial';
const SCREEN_DRIVE = 'drive';
const SCREEN_MENU = 'menu';
const SCREEN_GAMEPAD = 'gamepad';
const useMock = process.argv.includes('--mock');
const debugControls = process.argv.includes('--debug-controls') || process.argv.includes('--debug');

const graphics = createGraphics();
const porsche = useMock
  ? createMockConnection({ timeoutSeconds: CONNECTION_TIMEOUT_SECONDS })
  : createPorscheConnection({ timeoutSeconds: CONNECTION_TIMEOUT_SECONDS });

let exiting = false;
let connectInFlight = false;
let renderInterval = null;
let controlInterval = null;
let lastDriveSentAt = 0;
let lastDebugLine = null;

const triggerMode = {
  leftIsSigned: false,
  rightIsSigned: false,
};

const triggerRange = {
  left: { max: 0, neutral: null },
  right: { max: 0, neutral: null },
};

const appState = {
  gamepad: {
    connected: false,
    name: null,
    type: null,
    lastButton: null,
    leftStickX: 0,
    leftStickY: 0,
    rightStickX: 0,
    rightStickY: 0,
    leftTrigger: 0,
    rightTrigger: 0,
    leftShoulder: false,
    rightShoulder: false,
    availableDevices: [],
    selectedDeviceIndex: 0,
    activeDeviceIndex: null,
    profile: {
      profile: 'xbox',
      primary: 'A',
      secondary: 'X',
      menu: 'Menu',
      menuAlt: 'Xbox',
      dpad: 'D-Pad',
    },
  },
  hub: {
    status: 'Disconnected',
    name: null,
    address: null,
    timeoutSeconds: CONNECTION_TIMEOUT_SECONDS,
    remainingSeconds: null,
    lastError: null,
  },
  control: {
    speed: 0,
    angle: 0,
    lights: LIGHT_MODES[0].value,
    lightModeLabel: LIGHT_MODES[0].label,
    selectedSpeed: DEFAULT_SPEED,
  },
  keyboard: {
    w: false,
    a: false,
    s: false,
    d: false,
  },
  ui: {
    screen: SCREEN_INITIAL,
    previousScreen: SCREEN_INITIAL,
    menuIndex: 0,
    mockMode: useMock,
    isFullscreen: false,
  },
  mock: {
    porsche: null,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampUnit(value) {
  return clamp(value, -1, 1);
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function applyDeadzone(value, deadzone) {
  const v = clampUnit(value);
  return Math.abs(v) < deadzone ? 0 : v;
}

function normalizeStickAxis(
  value,
  centerDeadzone = STICK_CENTER_DEADZONE,
  outerThreshold = STICK_OUTER_THRESHOLD,
) {
  const v = clampUnit(value);
  const abs = Math.abs(v);
  if (abs <= centerDeadzone) return 0;
  if (abs >= outerThreshold) return Math.sign(v);

  const span = outerThreshold - centerDeadzone;
  if (span <= 0) return Math.sign(v);

  const scaled = (abs - centerDeadzone) / span;
  return Math.sign(v) * clamp01(scaled);
}

function normalizeTrigger(value, isSignedMode) {
  const v = Number(value) || 0;
  if (isSignedMode) return clamp01((v + 1) / 2);
  return clamp01(v);
}

function updateTriggerRange(stats, raw) {
  if (!Number.isFinite(raw)) return;
  if (raw > stats.max) stats.max = raw;
}

function scaleTriggerByRange(raw, stats) {
  const neutral =
    typeof stats.neutral === 'number'
      ? stats.neutral
      : raw >= 0.3 && raw <= 0.7
        ? 0.5
        : 0;

  const top = Math.max(stats.max, neutral + 0.08);
  const range = top - neutral;
  if (!Number.isFinite(range) || range < 0.06) return clamp01(raw - neutral);
  return clamp01((raw - neutral) / range);
}

function updateTriggerNeutral(stats, raw) {
  if (!Number.isFinite(raw)) return;
  // Learn neutral from the resting midpoint band.
  if (raw < 0.35 || raw > 0.65) return;
  if (stats.neutral === null) {
    stats.neutral = raw;
    return;
  }
  stats.neutral = stats.neutral * 0.9 + raw * 0.1;
}

function hasKeyboardDriveInput(keyboard) {
  return keyboard.w || keyboard.a || keyboard.s || keyboard.d;
}

function computeDriveFromGamepad(gamepad) {
  const steerRaw = clampUnit(gamepad.leftStickX);
  const steer = normalizeStickAxis(steerRaw);
  const forwardRaw = normalizeTrigger(gamepad.rightTrigger, triggerMode.rightIsSigned);
  const reverseRaw = normalizeTrigger(gamepad.leftTrigger, triggerMode.leftIsSigned);
  const forwardAxis = scaleTriggerByRange(forwardRaw, triggerRange.right);
  const reverseAxis = scaleTriggerByRange(reverseRaw, triggerRange.left);
  const forwardDigital = gamepad.rightShoulder ? 1 : 0;
  const reverseDigital = gamepad.leftShoulder ? 1 : 0;
  const forward = Math.max(forwardAxis, forwardDigital);
  const reverse = Math.max(reverseAxis, reverseDigital);
  const throttle = applyDeadzone(forward - reverse, TRIGGER_DEADZONE);
  const speedScale = appState.control.selectedSpeed / 100;

  const command = {
    speed: Math.round(throttle * 100 * speedScale),
    angle: Math.round(steer * STEER_MAX),
    lights: appState.control.lights,
  };

  const debug = {
    steerInput: Number(gamepad.leftStickX || 0),
    steerClamped: steerRaw,
    steerNormalized: steer,
    triggerLeftRaw: Number(gamepad.leftTrigger || 0),
    triggerRightRaw: Number(gamepad.rightTrigger || 0),
    triggerLeftSignedMode: triggerMode.leftIsSigned,
    triggerRightSignedMode: triggerMode.rightIsSigned,
    triggerLeftNormalized: reverseRaw,
    triggerRightNormalized: forwardRaw,
    triggerLeftScaled: reverseAxis,
    triggerRightScaled: forwardAxis,
    triggerRangeLeft: { ...triggerRange.left },
    triggerRangeRight: { ...triggerRange.right },
    forward,
    reverse,
    throttle,
    speedScale,
    commandSpeed: command.speed,
    commandAngle: command.angle,
  };

  return { command, debug };
}

function computeDriveFromKeyboard(keyboard) {
  const speedScale = appState.control.selectedSpeed / 100;
  const keyboardSpeed = Math.round(100 * speedScale);

  let speed = 0;
  if (keyboard.w && !keyboard.s) speed = keyboardSpeed;
  if (keyboard.s && !keyboard.w) speed = -keyboardSpeed;

  let angle = 0;
  if (keyboard.a && !keyboard.d) angle = -KEYBOARD_ANGLE;
  if (keyboard.d && !keyboard.a) angle = KEYBOARD_ANGLE;

  return { speed, angle, lights: appState.control.lights };
}

function debugControlLog(payload) {
  if (!debugControls) return;
  const line = JSON.stringify(payload);
  if (line === lastDebugLine) return;
  lastDebugLine = line;
  console.log(`[control-debug] ${line}`);
}

function syncMainScreenWithConnection() {
  if (appState.ui.screen === SCREEN_MENU || appState.ui.screen === SCREEN_GAMEPAD) return;
  const target = appState.hub.status === 'Connected' ? SCREEN_DRIVE : SCREEN_INITIAL;
  appState.ui.screen = target;
  appState.ui.previousScreen = target;
}

function toggleMenu() {
  if (appState.ui.screen === SCREEN_MENU) {
    appState.ui.screen = appState.ui.previousScreen;
    return;
  }
  appState.ui.previousScreen = appState.ui.screen;
  appState.ui.menuIndex = 0;
  appState.ui.screen = SCREEN_MENU;
}

function toggleFullscreen() {
  const next = !appState.ui.isFullscreen;
  graphics.setFullscreen(next);
  appState.ui.isFullscreen = graphics.isFullscreen();
}

function adjustSelectedSpeed(delta) {
  appState.control.selectedSpeed = clamp(
    appState.control.selectedSpeed + delta,
    SPEED_MIN,
    SPEED_MAX,
  );
}

async function retryConnect() {
  if (connectInFlight || exiting || appState.hub.status === 'Connected') return;
  connectInFlight = true;
  appState.hub = porsche.getState();
  try {
    appState.hub = await porsche.connect();
  } finally {
    connectInFlight = false;
  }
}

async function disconnectPorsche() {
  await porsche.stop({ lights: appState.control.lights });
  await porsche.disconnect();
  appState.hub = porsche.getState();
}

function cycleLightMode() {
  const currentIndex = LIGHT_MODES.findIndex((mode) => mode.value === appState.control.lights);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % LIGHT_MODES.length : 0;
  const next = LIGHT_MODES[nextIndex];
  appState.control.lights = next.value;
  appState.control.lightModeLabel = next.label;
}

async function runMenuSelection() {
  if (appState.ui.menuIndex === 0) {
    await disconnectPorsche();
    appState.ui.screen = SCREEN_INITIAL;
    appState.ui.previousScreen = SCREEN_INITIAL;
    return;
  }
  if (appState.ui.menuIndex === 1) {
    appState.ui.previousScreen = appState.ui.screen;
    appState.ui.screen = SCREEN_GAMEPAD;
    return;
  }
  if (appState.ui.menuIndex === 2) {
    cycleLightMode();
    return;
  }
  if (appState.ui.menuIndex === 3) {
    toggleFullscreen();
    return;
  }
  if (appState.ui.menuIndex === 4) {
    await exit();
  }
}

function openGamepadScreen() {
  if (appState.ui.screen === SCREEN_MENU) return;
  appState.ui.previousScreen = appState.ui.screen;
  appState.ui.screen = SCREEN_GAMEPAD;
}

function onPrimaryAction() {
  if (appState.ui.screen === SCREEN_MENU) {
    void runMenuSelection();
    return;
  }

  if (appState.ui.screen === SCREEN_GAMEPAD) {
    gamepadMonitor.activateSelectedDevice();
    appState.ui.screen = appState.hub.status === 'Connected' ? SCREEN_DRIVE : SCREEN_INITIAL;
    appState.ui.previousScreen = appState.ui.screen;
    return;
  }

  if (appState.ui.screen === SCREEN_INITIAL) {
    void retryConnect();
    return;
  }

  if (appState.ui.screen === SCREEN_DRIVE) {
    adjustSelectedSpeed(SPEED_STEP);
  }
}

function onSecondaryAction() {
  if (appState.ui.screen === SCREEN_INITIAL) {
    openGamepadScreen();
    return;
  }
  if (appState.ui.screen === SCREEN_GAMEPAD) {
    appState.ui.screen = appState.hub.status === 'Connected' ? SCREEN_DRIVE : SCREEN_INITIAL;
    appState.ui.previousScreen = appState.ui.screen;
    return;
  }
  if (appState.ui.screen === SCREEN_DRIVE) {
    adjustSelectedSpeed(-SPEED_STEP);
  }
}

function onMenuUp() {
  if (appState.ui.screen === SCREEN_MENU) {
    appState.ui.menuIndex = appState.ui.menuIndex > 0 ? appState.ui.menuIndex - 1 : 4;
    return;
  }
  if (appState.ui.screen === SCREEN_GAMEPAD) {
    gamepadMonitor.selectPreviousDevice();
  }
}

function onMenuDown() {
  if (appState.ui.screen === SCREEN_MENU) {
    appState.ui.menuIndex = appState.ui.menuIndex < 4 ? appState.ui.menuIndex + 1 : 0;
    return;
  }
  if (appState.ui.screen === SCREEN_GAMEPAD) {
    gamepadMonitor.selectNextDevice();
  }
}

async function exit() {
  if (exiting) return;
  exiting = true;
  if (renderInterval) clearInterval(renderInterval);
  if (controlInterval) clearInterval(controlInterval);

  try {
    await porsche.stop({ lights: appState.control.lights });
    await porsche.disconnect();
  } finally {
    cleanupKeyboard();
    gamepadMonitor.dispose();
    graphics.dispose();
    process.exit(0);
  }
}

const cleanupKeyboard = registerKeyboard(graphics.window, {
  onExit: () => {
    void exit();
  },
  onMenuToggle: () => {
    toggleMenu();
  },
  onMenuUp,
  onMenuDown,
  onMenuSelect: () => {
    if (appState.ui.screen === SCREEN_MENU) {
      void runMenuSelection();
      return;
    }
    if (appState.ui.screen === SCREEN_GAMEPAD) {
      gamepadMonitor.activateSelectedDevice();
      appState.ui.screen = appState.hub.status === 'Connected' ? SCREEN_DRIVE : SCREEN_INITIAL;
      appState.ui.previousScreen = appState.ui.screen;
    }
  },
  onGamepadScreen: () => {
    openGamepadScreen();
  },
  onNavLeft: () => {
    if (appState.ui.screen === SCREEN_GAMEPAD) {
      gamepadMonitor.selectPreviousDevice();
    }
  },
  onNavRight: () => {
    if (appState.ui.screen === SCREEN_GAMEPAD) {
      gamepadMonitor.selectNextDevice();
    }
  },
  onPrimaryAction,
  onSecondaryAction,
  onDriveChange: (next) => {
    appState.keyboard = next;
  },
});

const gamepadMonitor = createGamepadMonitor(sdl, {
  onMenuToggle: () => {
    toggleMenu();
  },
  onMenuUp,
  onMenuDown,
  onPrimaryAction,
  onSecondaryAction,
  onChange: (next) => {
    if (Number(next.leftTrigger) < -0.05) triggerMode.leftIsSigned = true;
    if (Number(next.rightTrigger) < -0.05) triggerMode.rightIsSigned = true;

    if (!next.connected) {
      triggerRange.left.max = 0;
      triggerRange.left.neutral = null;
      triggerRange.right.max = 0;
      triggerRange.right.neutral = null;
    } else {
      const leftRaw = normalizeTrigger(next.leftTrigger, triggerMode.leftIsSigned);
      const rightRaw = normalizeTrigger(next.rightTrigger, triggerMode.rightIsSigned);
      updateTriggerNeutral(triggerRange.left, leftRaw);
      updateTriggerNeutral(triggerRange.right, rightRaw);
      updateTriggerRange(triggerRange.left, leftRaw);
      updateTriggerRange(triggerRange.right, rightRaw);
    }

    appState.gamepad = next;
  },
});

graphics.window.on('close', () => {
  void exit();
});

renderInterval = setInterval(() => {
  if (exiting) return;
  appState.hub = porsche.getState();
  if (typeof porsche.getMockPorscheState === 'function') {
    appState.mock.porsche = porsche.getMockPorscheState();
  }
  syncMainScreenWithConnection();
  graphics.render(appState);
}, REFRESH_MS);

let lastSent = { speed: null, angle: null, lights: null };
controlInterval = setInterval(() => {
  if (exiting) return;
  if (appState.hub.status !== 'Connected') return;

  let next = { speed: 0, angle: 0, lights: appState.control.lights };
  let controlDebug = null;
  if (appState.ui.screen === SCREEN_DRIVE) {
    if (hasKeyboardDriveInput(appState.keyboard)) {
      next = computeDriveFromKeyboard(appState.keyboard);
      controlDebug = {
        source: 'keyboard',
        keyboard: { ...appState.keyboard },
        commandSpeed: next.speed,
        commandAngle: next.angle,
      };
    } else {
      const gamepadControl = computeDriveFromGamepad(appState.gamepad);
      next = gamepadControl.command;
      controlDebug = {
        source: 'gamepad',
        ...gamepadControl.debug,
      };
    }
  }

  appState.control = {
    ...next,
    selectedSpeed: appState.control.selectedSpeed,
    lightModeLabel: appState.control.lightModeLabel,
  };

  if (
    next.speed === lastSent.speed &&
    next.angle === lastSent.angle &&
    next.lights === lastSent.lights
  ) {
    const moving = next.speed !== 0 || next.angle !== 0;
    if (!moving) return;
    if (Date.now() - lastDriveSentAt < DRIVE_HEARTBEAT_MS) return;
  }

  lastSent = next;
  lastDriveSentAt = Date.now();
  debugControlLog({
    at: new Date().toISOString(),
    selectedSpeed: appState.control.selectedSpeed,
    sent: next,
    debug: controlDebug,
  });
  void porsche.drive(next);
}, CONTROL_MS);

graphics.render(appState);
