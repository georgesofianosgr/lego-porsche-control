#!/usr/bin/env node

import process from 'node:process';
import sdl from '@kmamal/sdl';
import { createGraphics } from './sdl-graphics.js';
import { registerKeyboard } from './sdl-keyboard.js';
import { createGamepadMonitor } from './sdl-gamepad.js';
import { createPorscheConnection } from './porsche-connection.js';

const REFRESH_MS = 100;
const CONTROL_MS = 50;
const CONNECTION_TIMEOUT_SECONDS = 15;
const STEER_MAX = 100;
const LIGHTS_ON = 0x00;
const TRIGGER_DEADZONE = 0.06;
const DEFAULT_SPEED = 85;
const SPEED_STEP = 25;
const SPEED_MIN = 0;
const SPEED_MAX = 100;
const KEYBOARD_ANGLE = 70;
const DRIVE_HEARTBEAT_MS = 180;

const graphics = createGraphics();

let exiting = false;
let connectInFlight = false;
let renderInterval = null;
let controlInterval = null;
let lastDriveSentAt = 0;
const triggerMode = {
  leftIsSigned: false,
  rightIsSigned: false,
};
const triggerRange = {
  left: { min: 1, max: 0 },
  right: { min: 1, max: 0 },
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
    lights: LIGHTS_ON,
    selectedSpeed: DEFAULT_SPEED,
  },
  keyboard: {
    w: false,
    a: false,
    s: false,
    d: false,
  },
};

const porsche = createPorscheConnection({ timeoutSeconds: CONNECTION_TIMEOUT_SECONDS });

async function retryConnect() {
  if (connectInFlight || exiting) return;
  connectInFlight = true;
  appState.hub = porsche.getState();

  try {
    appState.hub = await porsche.connect();
  } finally {
    connectInFlight = false;
  }
}

function clampUnit(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function applyDeadzone(value, deadzone) {
  const v = clampUnit(value);
  return Math.abs(v) < deadzone ? 0 : v;
}

function normalizeTrigger(value, isSignedMode) {
  const v = Number(value) || 0;
  if (isSignedMode) {
    return clamp01((v + 1) / 2);
  }
  return clamp01(v);
}

function updateTriggerRange(stats, raw) {
  if (!Number.isFinite(raw)) return;
  if (raw < stats.min) stats.min = raw;
  if (raw > stats.max) stats.max = raw;
}

function scaleTriggerByRange(raw, stats) {
  const range = stats.max - stats.min;
  if (!Number.isFinite(range) || range < 0.08) {
    // Not enough calibration yet; keep raw behavior.
    return raw;
  }
  return clamp01((raw - stats.min) / range);
}

function computeDriveFromGamepad(gamepad) {
  const steer = clampUnit(gamepad.leftStickX);
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

  return {
    speed: Math.round(throttle * 100 * speedScale),
    angle: Math.round(steer * STEER_MAX),
    lights: LIGHTS_ON,
  };
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

  return { speed, angle, lights: LIGHTS_ON };
}

function hasKeyboardDriveInput(keyboard) {
  return keyboard.w || keyboard.a || keyboard.s || keyboard.d;
}

async function exit() {
  if (exiting) return;
  exiting = true;
  if (renderInterval) clearInterval(renderInterval);
  if (controlInterval) clearInterval(controlInterval);

  try {
    await porsche.stop({ lights: LIGHTS_ON });
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
  onRetry: () => {
    void retryConnect();
  },
  onDriveChange: (next) => {
    appState.keyboard = next;
  },
});

const gamepadMonitor = createGamepadMonitor(sdl, {
  onRetry: () => {
    void retryConnect();
  },
  onSpeedUp: () => {
    appState.control.selectedSpeed = Math.min(
      SPEED_MAX,
      appState.control.selectedSpeed + SPEED_STEP,
    );
  },
  onSpeedDown: () => {
    appState.control.selectedSpeed = Math.max(
      SPEED_MIN,
      appState.control.selectedSpeed - SPEED_STEP,
    );
  },
  onExit: () => {
    void exit();
  },
  onChange: (next) => {
    if (Number(next.leftTrigger) < -0.05) triggerMode.leftIsSigned = true;
    if (Number(next.rightTrigger) < -0.05) triggerMode.rightIsSigned = true;
    if (!next.connected) {
      triggerRange.left.min = 1;
      triggerRange.left.max = 0;
      triggerRange.right.min = 1;
      triggerRange.right.max = 0;
    } else {
      const leftRaw = normalizeTrigger(next.leftTrigger, triggerMode.leftIsSigned);
      const rightRaw = normalizeTrigger(next.rightTrigger, triggerMode.rightIsSigned);
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
  graphics.render(appState);
}, REFRESH_MS);

let lastSent = { speed: null, angle: null, lights: null };
controlInterval = setInterval(() => {
  if (exiting) return;
  if (appState.hub.status !== 'Connected') return;

  const next = hasKeyboardDriveInput(appState.keyboard)
    ? computeDriveFromKeyboard(appState.keyboard)
    : computeDriveFromGamepad(appState.gamepad);
  appState.control = { ...next, selectedSpeed: appState.control.selectedSpeed };

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
  void porsche.drive(next);
}, CONTROL_MS);

await retryConnect();
graphics.render(appState);
