import readline from 'node:readline';
import process from 'node:process';
import { createRequire } from 'node:module';
import { LightMode } from './constants.js';
import { TechnicMoveHub } from './hub.js';

const require = createRequire(import.meta.url);

function nowMs() {
  return Date.now();
}

function clampUnit(value) {
  return Math.max(-1, Math.min(1, value));
}

function normalizeStickByte(value) {
  // node-gamepad joystick values are typically 0..255 with 128 center.
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  return clampUnit((v - 128) / 127);
}

function normalizeTrigger(value) {
  // Accept either 0..1 or -1..1
  if (value >= 0 && value <= 1) return value;
  return (value + 1) / 2;
}

function resolveLights(state) {
  return state.keyboard.lights;
}

export async function runInteractive(hub, args) {
  await hub.calibrate();
  console.log('Connected. Keyboard + gamepad active.');
  console.log('Keyboard: hold w/s throttle, a/d steer, r center, l lights, q quit');

  const state = {
    keyboard: {
      lastW: 0,
      lastS: 0,
      angle: 0,
      angleUpdatedAt: 0,
      lights: LightMode.ON,
      lightsUpdatedAt: 0,
      speedUpdatedAt: 0,
    },
    gamepad: {
      throttle: 0,
      steer: 0,
      speedUpdatedAt: 0,
      angleUpdatedAt: 0,
      lightsUpdatedAt: 0,
    },
  };

  const loopState = {
    exit: false,
    lastSent: { speed: null, angle: null, lights: null },
  };

  const cleanup = [];

  const stopAndExit = async () => {
    loopState.exit = true;
    await hub.stop({ lights: resolveLights(state) });
  };

  setupKeyboard(state, loopState, cleanup);
  // Temporary isolation mode: disable gamepad wiring while debugging stability.
  // Re-enable by restoring setupGamepad(...) call.
  // setupGamepad(state, loopState, cleanup, args);
  console.log('Gamepad input temporarily disabled for debugging.');

  try {
    while (!loopState.exit) {
      const merged = computeMergedControl(state, args);
      const changed =
        merged.speed !== loopState.lastSent.speed ||
        merged.angle !== loopState.lastSent.angle ||
        merged.lights !== loopState.lastSent.lights;

      if (changed) {
        await hub.drive(merged);
        loopState.lastSent = merged;
        console.log(`speed=${merged.speed}, angle=${merged.angle}, lights=${merged.lights}`);
      }

      await new Promise((resolve) => setTimeout(resolve, args.pollIntervalMs));
    }
  } catch (err) {
    console.error(`Interactive error: ${err.message}`);
  } finally {
    for (const fn of cleanup) {
      try {
        fn();
      } catch {
        // ignore cleanup errors
      }
    }
    await stopAndExit();
  }
}

function computeMergedControl(state, args) {
  const t = nowMs();
  const kb = state.keyboard;
  const gp = state.gamepad;

  const wActive = t - kb.lastW <= args.keyboardHoldMs;
  const sActive = t - kb.lastS <= args.keyboardHoldMs;

  let kbSpeed = 0;
  if (wActive && !sActive) kbSpeed = args.keyboardDriveSpeed;
  if (sActive && !wActive) kbSpeed = -args.keyboardDriveSpeed;
  if (wActive && sActive) kbSpeed = kb.lastW >= kb.lastS ? args.keyboardDriveSpeed : -args.keyboardDriveSpeed;

  if (wActive || sActive) {
    kb.speedUpdatedAt = Math.max(kb.lastW, kb.lastS);
  }

  const gpSpeed = TechnicMoveHub.clamp(Math.round(gp.throttle * args.gamepadMaxSpeed));
  const gpAngle = TechnicMoveHub.clamp(Math.round(gp.steer * 100));

  const speed = kb.speedUpdatedAt >= gp.speedUpdatedAt ? kbSpeed : gpSpeed;
  const angle = kb.angleUpdatedAt >= gp.angleUpdatedAt ? kb.angle : gpAngle;
  const lights = kb.lights;

  return { speed, angle, lights };
}

function setupKeyboard(state, loopState, cleanup) {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  const onKeypress = (_str, key) => {
    const k = String(key?.name || '').toLowerCase();
    const t = nowMs();
    if (k === 'q' || (key?.ctrl && k === 'c')) {
      loopState.exit = true;
      return;
    }
    if (k === 'w') {
      state.keyboard.lastW = t;
      return;
    }
    if (k === 's') {
      state.keyboard.lastS = t;
      return;
    }
    if (k === 'a') {
      state.keyboard.angle = TechnicMoveHub.clamp(state.keyboard.angle - 20);
      state.keyboard.angleUpdatedAt = t;
      return;
    }
    if (k === 'd') {
      state.keyboard.angle = TechnicMoveHub.clamp(state.keyboard.angle + 20);
      state.keyboard.angleUpdatedAt = t;
      return;
    }
    if (k === 'r') {
      state.keyboard.angle = 0;
      state.keyboard.angleUpdatedAt = t;
      return;
    }
    if (k === 'l') {
      state.keyboard.lights = state.keyboard.lights === LightMode.ON ? LightMode.OFF : LightMode.ON;
      state.keyboard.lightsUpdatedAt = t;
    }
  };

  process.stdin.on('keypress', onKeypress);
  cleanup.push(() => {
    process.stdin.off('keypress', onKeypress);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  });
}

function setupGamepad(state, loopState, cleanup, args) {
  // Temporarily disabled (kept for quick re-enable).
  void state;
  void loopState;
  void cleanup;
  void args;
  return;

  let Gamepad;
  try {
    // node-gamepad is CommonJS
    Gamepad = require('node-gamepad');
  } catch {
    console.log('Gamepad library not available. Keyboard control still active.');
    return;
  }

  let controller;
  let activeConfig = null;
  let lastError = null;
  const candidates = [];
  const userOptions = {};
  if (Number.isFinite(args.gamepadVendorId)) userOptions.vendorID = args.gamepadVendorId;
  if (Number.isFinite(args.gamepadProductId)) userOptions.productID = args.gamepadProductId;

  candidates.push({ type: args.gamepadType, options: userOptions });
  if (!Number.isFinite(args.gamepadVendorId) && !Number.isFinite(args.gamepadProductId)) {
    candidates.push({ type: 'ps4/dualshock4', options: { vendorID: 1356, productID: 3302 } }); // DualSense
    candidates.push({ type: 'ps4/dualshock4', options: { vendorID: 1356, productID: 3570 } }); // DualSense Edge
    candidates.push({ type: 'ps4/dualshock4', options: { vendorID: 1356, productID: 2508 } }); // DS4 v2
    candidates.push({ type: 'ps4/dualshock4', options: { vendorID: 1356, productID: 1476 } }); // DS4
  }

  for (const candidate of candidates) {
    try {
      controller = safeConnectGamepad(Gamepad, candidate.type, candidate.options);
      activeConfig = candidate;
      break;
    } catch (err) {
      lastError = err;
      controller = null;
    }
  }

  if (!controller) {
    const message = lastError && lastError.message ? lastError.message : 'unknown error';
    console.log(`Could not start gamepad listener (${message}). Keyboard control still active.`);
    return;
  }

  const details = [];
  if (activeConfig.options.vendorID) details.push(`vendor=${activeConfig.options.vendorID}`);
  if (activeConfig.options.productID) details.push(`product=${activeConfig.options.productID}`);
  console.log(
    `Gamepad listener started (${activeConfig.type}${details.length ? `, ${details.join(', ')}` : ''})`,
  );

  const setSteer = (x) => {
    state.gamepad.steer = normalizeStickByte(x);
    state.gamepad.angleUpdatedAt = nowMs();
  };

  const setThrottleFromTriggers = (forwardPressed, reversePressed, rightY) => {
    if (forwardPressed && !reversePressed) {
      state.gamepad.throttle = 1;
      state.gamepad.speedUpdatedAt = nowMs();
      return;
    }
    if (reversePressed && !forwardPressed) {
      state.gamepad.throttle = -1;
      state.gamepad.speedUpdatedAt = nowMs();
      return;
    }

    // Fallback to right stick Y analog when triggers are not held.
    const forward = normalizeTrigger(-rightY);
    const reverse = normalizeTrigger(rightY);
    state.gamepad.throttle = clampUnit(forward - reverse);
    state.gamepad.speedUpdatedAt = nowMs();
  };

  let r2Pressed = false;
  let l2Pressed = false;
  let rightY = 0;

  const onLeftMove = (pos) => {
    if (typeof pos?.x === 'number') {
      setSteer(pos.x);
    }
  };

  const onRightMove = (pos) => {
    if (typeof pos?.y === 'number') {
      rightY = normalizeStickByte(pos.y);
      setThrottleFromTriggers(r2Pressed, l2Pressed, rightY);
    }
  };

  const onR2Press = () => {
    r2Pressed = true;
    setThrottleFromTriggers(r2Pressed, l2Pressed, rightY);
  };

  const onR2Release = () => {
    r2Pressed = false;
    setThrottleFromTriggers(r2Pressed, l2Pressed, rightY);
  };

  const onL2Press = () => {
    l2Pressed = true;
    setThrottleFromTriggers(r2Pressed, l2Pressed, rightY);
  };

  const onL2Release = () => {
    l2Pressed = false;
    setThrottleFromTriggers(r2Pressed, l2Pressed, rightY);
  };

  const onTriangle = () => {
    state.keyboard.lights = state.keyboard.lights === LightMode.ON ? LightMode.OFF : LightMode.ON;
    state.keyboard.lightsUpdatedAt = nowMs();
  };

  const onCircle = () => {
    state.gamepad.throttle = 0;
    state.gamepad.steer = 0;
    state.gamepad.speedUpdatedAt = nowMs();
    state.gamepad.angleUpdatedAt = nowMs();
  };

  const onQuit = () => {
    loopState.exit = true;
  };

  // Common node-gamepad DualShock style events
  controller.on('left:move', onLeftMove);
  controller.on('right:move', onRightMove);
  controller.on('r2:press', onR2Press);
  controller.on('r2:release', onR2Release);
  controller.on('l2:press', onL2Press);
  controller.on('l2:release', onL2Release);
  controller.on('triangle:press', onTriangle);
  controller.on('circle:press', onCircle);
  controller.on('options:press', onQuit);
  controller.on('psx:press', onQuit);

  cleanup.push(() => {
    controller.removeListener('left:move', onLeftMove);
    controller.removeListener('right:move', onRightMove);
    controller.removeListener('r2:press', onR2Press);
    controller.removeListener('r2:release', onR2Release);
    controller.removeListener('l2:press', onL2Press);
    controller.removeListener('l2:release', onL2Release);
    controller.removeListener('triangle:press', onTriangle);
    controller.removeListener('circle:press', onCircle);
    controller.removeListener('options:press', onQuit);
    controller.removeListener('psx:press', onQuit);
    try {
      controller.disconnect();
    } catch {
      // ignore
    }
  });
}

function safeConnectGamepad(Gamepad, type, options) {
  const originalExit = process.exit;
  try {
    process.exit = ((code) => {
      throw new Error(`gamepad init triggered process.exit(${code ?? 0})`);
    });
    const controller = new Gamepad(type, options);
    controller.connect();
    return controller;
  } finally {
    process.exit = originalExit;
  }
}
