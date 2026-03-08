export function createGamepadMonitor(sdl, handlers) {
  let controller = null;

  // SDL controller names are xbox-style across devices.
  // DualSense: CROSS -> a, OPTIONS -> start, PS -> guide.
  const retryButtons = new Set(['a']);
  const exitButtons = new Set(['start', 'guide', 'back']);

  const state = {
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
  };

  const emitState = () => {
    handlers.onChange?.({ ...state });
  };

  const tryOpen = () => {
    if (controller) return;
    const device = sdl.controller.devices[0] || null;
    if (!device) {
      state.connected = false;
      state.name = null;
      state.type = null;
      emitState();
      return;
    }

    controller = sdl.controller.openDevice(device);
    state.connected = true;
    state.name = device.name || null;
    state.type = device.type || null;
    state.leftStickX = Number(controller.axes.leftStickX || 0);
    state.leftStickY = Number(controller.axes.leftStickY || 0);
    state.rightStickX = Number(controller.axes.rightStickX || 0);
    state.rightStickY = Number(controller.axes.rightStickY || 0);
    state.leftTrigger = Number(controller.axes.leftTrigger || 0);
    state.rightTrigger = Number(controller.axes.rightTrigger || 0);
    state.leftShoulder = Boolean(controller.buttons.leftShoulder);
    state.rightShoulder = Boolean(controller.buttons.rightShoulder);
    emitState();

    controller.on('axisMotion', (event) => {
      const axis = String(event?.axis || '');
      const value = Number(event?.value);
      if (!Number.isFinite(value)) return;
      if (axis in state) {
        state[axis] = value;
        emitState();
      }
    });

    controller.on('buttonDown', (event) => {
      const name = String(event?.button || '').toLowerCase();
      state.lastButton = name || null;
      if (name === 'leftshoulder') state.leftShoulder = true;
      if (name === 'rightshoulder') state.rightShoulder = true;
      emitState();

      if (name === 'lefttrigger') state.leftTrigger = 1;
      if (name === 'righttrigger') state.rightTrigger = 1;
      emitState();

      if (retryButtons.has(name)) {
        handlers.onRetry?.();
        return;
      }

      if (exitButtons.has(name)) {
        handlers.onExit?.();
      }
    });
    controller.on('buttonUp', (event) => {
      const name = String(event?.button || '').toLowerCase();
      if (name === 'leftshoulder') state.leftShoulder = false;
      if (name === 'rightshoulder') state.rightShoulder = false;
      if (name === 'lefttrigger') state.leftTrigger = 0;
      if (name === 'righttrigger') state.rightTrigger = 0;
      emitState();
    });

    controller.on('close', () => {
      controller = null;
      state.connected = false;
      state.name = null;
      state.type = null;
      state.lastButton = null;
      state.leftStickX = 0;
      state.leftStickY = 0;
      state.rightStickX = 0;
      state.rightStickY = 0;
      state.leftTrigger = 0;
      state.rightTrigger = 0;
      state.leftShoulder = false;
      state.rightShoulder = false;
      emitState();
    });
  };

  const onDeviceAdd = () => {
    tryOpen();
  };

  const onDeviceRemove = () => {
    if (!sdl.controller.devices.length) {
      if (controller && !controller.closed) {
        controller.close();
      }
      controller = null;
      state.connected = false;
      state.name = null;
      state.type = null;
      state.lastButton = null;
      state.leftStickX = 0;
      state.leftStickY = 0;
      state.rightStickX = 0;
      state.rightStickY = 0;
      state.leftTrigger = 0;
      state.rightTrigger = 0;
      state.leftShoulder = false;
      state.rightShoulder = false;
      emitState();
      return;
    }

    if (controller && !controller.closed) return;
    tryOpen();
  };

  sdl.controller.on('deviceAdd', onDeviceAdd);
  sdl.controller.on('deviceRemove', onDeviceRemove);
  tryOpen();

  const dispose = () => {
    sdl.controller.off('deviceAdd', onDeviceAdd);
    sdl.controller.off('deviceRemove', onDeviceRemove);
    if (controller && !controller.closed) {
      controller.close();
    }
  };

  return {
    getState: () => ({ ...state }),
    dispose,
  };
}
