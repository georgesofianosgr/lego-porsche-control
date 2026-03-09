import { DEFAULT_DEVICE_NAME } from './constants.js';
import { TechnicMoveHub } from './hub.js';

// Upstream reference: https://github.com/DanieleBenedettelli/TechnicMoveHub

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createPorscheConnection({
  deviceName = DEFAULT_DEVICE_NAME,
  timeoutSeconds = 8,
} = {}) {
  const hub = new TechnicMoveHub({ deviceName });

  const state = {
    status: 'Disconnected',
    name: null,
    address: null,
    timeoutSeconds,
    remainingSeconds: null,
    lastError: null,
    pairingNote: null,
  };

  let connectRequestId = 0;
  let connectDeadlineMs = null;
  let writeInFlight = false;
  let queuedDrive = null;

  const snapshot = () => {
    let remainingSeconds = state.remainingSeconds;
    if (state.status === 'Connecting' && Number.isFinite(connectDeadlineMs)) {
      const msLeft = Math.max(0, connectDeadlineMs - Date.now());
      remainingSeconds = Math.ceil(msLeft / 1000);
    }

    return {
      ...state,
      remainingSeconds,
    };
  };

  const connect = async () => {
    connectRequestId += 1;
    const requestId = connectRequestId;
    state.status = 'Connecting';
    state.remainingSeconds = timeoutSeconds;
    state.lastError = null;
    connectDeadlineMs = Date.now() + timeoutSeconds * 1000;

    const timeoutAt = connectDeadlineMs;

    while (Date.now() <= timeoutAt) {
      if (requestId !== connectRequestId) return snapshot();

      try {
        const connected = await hub.connect({ timeout: 1 });
        if (connected) {
          await hub.calibrate();
          state.status = 'Connected';
          state.name = hub.connectedName || deviceName;
          state.address = hub.connectedAddress || null;
          state.remainingSeconds = null;
          state.lastError = null;
          state.pairingNote = hub.pairingNote || null;
          connectDeadlineMs = null;
          return snapshot();
        }
      } catch (err) {
        state.lastError = err instanceof Error ? err.message : String(err);
      }

      await delay(300);
    }

    state.status = 'Disconnected';
    state.name = null;
    state.address = null;
    state.remainingSeconds = 0;
    connectDeadlineMs = null;
    if (!state.lastError) {
      state.lastError = `Connection timeout after ${timeoutSeconds}s`;
    }
    return snapshot();
  };

  const disconnect = async () => {
    connectRequestId += 1;
    queuedDrive = null;
    await hub.disconnect();
    state.status = 'Disconnected';
    state.name = null;
    state.address = null;
    state.remainingSeconds = null;
    connectDeadlineMs = null;
    state.pairingNote = null;
  };

  const drive = async ({ speed = 0, angle = 0, lights = 0x00 } = {}) => {
    if (state.status !== 'Connected') return false;
    queuedDrive = { speed, angle, lights };
    if (writeInFlight) return true;

    writeInFlight = true;
    let ok = true;
    try {
      while (queuedDrive && state.status === 'Connected') {
        const next = queuedDrive;
        queuedDrive = null;
        await hub.drive(next);
      }
    } catch (err) {
      ok = false;
      state.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      writeInFlight = false;
    }
    return ok;
  };

  const stop = async ({ lights = 0x00 } = {}) => {
    if (state.status !== 'Connected') return false;
    queuedDrive = null;
    if (writeInFlight) return true;
    try {
      await hub.stop({ lights });
      return true;
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
      return false;
    }
  };

  return {
    connect,
    disconnect,
    drive,
    stop,
    getState: snapshot,
  };
}
