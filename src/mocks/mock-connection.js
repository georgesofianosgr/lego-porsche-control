import { createMockPorsche } from './mock-porsche.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockConnection({ timeoutSeconds = 15, deviceName = 'Mock Porsche 42176' } = {}) {
  const porsche = createMockPorsche();

  const state = {
    status: 'Disconnected',
    name: null,
    address: null,
    timeoutSeconds,
    remainingSeconds: null,
    lastError: null,
    batteryPercent: null,
    batteryUpdatedAt: null,
    batteryLastMessage: null,
  };

  let connectRequestId = 0;

  const getState = () => ({ ...state });

  const connect = async () => {
    connectRequestId += 1;
    const requestId = connectRequestId;
    state.status = 'Connecting';
    state.remainingSeconds = timeoutSeconds;
    state.lastError = null;

    const steps = 5;
    for (let i = 0; i < steps; i += 1) {
      if (requestId !== connectRequestId) return getState();
      await delay(120);
      const remaining = timeoutSeconds - Math.ceil(((i + 1) / steps) * timeoutSeconds);
      state.remainingSeconds = Math.max(0, remaining);
    }

    if (requestId !== connectRequestId) return getState();

    state.status = 'Connected';
    state.name = deviceName;
    state.address = 'MOCK:PORSCHE:42176';
    state.remainingSeconds = null;
    state.lastError = null;
    state.batteryPercent = 87;
    state.batteryUpdatedAt = Date.now();
    state.batteryLastMessage = {
      msgType: 0x01,
      property: 0x06,
      operation: 0x06,
      value: 87,
    };
    return getState();
  };

  const disconnect = async () => {
    connectRequestId += 1;
    await delay(60);
    state.status = 'Disconnected';
    state.name = null;
    state.address = null;
    state.remainingSeconds = null;
    state.batteryPercent = null;
    state.batteryUpdatedAt = null;
    state.batteryLastMessage = null;
  };

  const drive = async (payload) => {
    if (state.status !== 'Connected') return false;
    return porsche.drive(payload);
  };

  const stop = async (payload) => {
    if (state.status !== 'Connected') return false;
    return porsche.stop(payload);
  };

  return {
    connect,
    disconnect,
    drive,
    stop,
    getState,
    getMockPorscheState: porsche.getState,
  };
}
