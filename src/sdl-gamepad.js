function detectProfile(name) {
  const text = String(name || '').toLowerCase();
  if (
    text.includes('sony') ||
    text.includes('playstation') ||
    text.includes('dualshock') ||
    text.includes('dualsense') ||
    text.includes('ps4') ||
    text.includes('ps5')
  ) {
    return 'playstation';
  }
  return 'xbox';
}

function profileLabels(profile) {
  if (profile === 'playstation') {
    return {
      profile,
      primary: 'X',
      secondary: 'Square',
      menu: 'Options',
      menuAlt: 'PS',
      dpad: 'D-Pad',
    };
  }

  return {
    profile: 'xbox',
    primary: 'A',
    secondary: 'X',
    menu: 'Menu',
    menuAlt: 'Xbox',
    dpad: 'D-Pad',
  };
}

export function createGamepadMonitor(sdl, handlers) {
  let controller = null;
  let selectedDeviceIndex = 0;

  const menuButtons = new Set(['start', 'guide', 'back']);
  const primaryButtons = new Set(['a']);
  const secondaryButtons = new Set(['x']);

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
    availableDevices: [],
    selectedDeviceIndex: 0,
    activeDeviceIndex: null,
    profile: profileLabels('xbox'),
  };

  const emitState = () => {
    handlers.onChange?.({ ...state, profile: { ...state.profile }, availableDevices: state.availableDevices.map((d) => ({ ...d })) });
  };

  const refreshDevices = () => {
    const devices = sdl.controller.devices || [];
    state.availableDevices = devices.map((device, index) => {
      const profile = detectProfile(device?.name);
      return {
        index,
        name: device?.name || `Controller ${index + 1}`,
        type: device?.type || 'gamecontroller',
        profile,
      };
    });

    if (!state.availableDevices.length) {
      selectedDeviceIndex = 0;
      state.selectedDeviceIndex = 0;
      state.activeDeviceIndex = null;
      return;
    }

    selectedDeviceIndex = Math.max(0, Math.min(selectedDeviceIndex, state.availableDevices.length - 1));
    state.selectedDeviceIndex = selectedDeviceIndex;

    if (
      state.activeDeviceIndex !== null &&
      (state.activeDeviceIndex < 0 || state.activeDeviceIndex >= state.availableDevices.length)
    ) {
      state.activeDeviceIndex = null;
    }
  };

  const resetInputState = () => {
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
    state.profile = profileLabels('xbox');
  };

  const closeController = () => {
    if (controller && !controller.closed) {
      controller.close();
    }
    controller = null;
  };

  const openSelectedDevice = () => {
    refreshDevices();
    const selected = state.availableDevices[selectedDeviceIndex] || null;

    closeController();
    resetInputState();

    if (!selected) {
      emitState();
      return false;
    }

    const rawDevice = sdl.controller.devices[selected.index];
    if (!rawDevice) {
      emitState();
      return false;
    }

    controller = sdl.controller.openDevice(rawDevice);

    state.connected = true;
    state.activeDeviceIndex = selected.index;
    state.name = rawDevice.name || selected.name;
    state.type = rawDevice.type || selected.type;
    state.profile = profileLabels(selected.profile);
    state.leftStickX = Number(controller.axes.leftStickX || 0);
    state.leftStickY = Number(controller.axes.leftStickY || 0);
    state.rightStickX = Number(controller.axes.rightStickX || 0);
    state.rightStickY = Number(controller.axes.rightStickY || 0);
    state.leftTrigger = Number(controller.axes.leftTrigger || 0);
    state.rightTrigger = Number(controller.axes.rightTrigger || 0);
    state.leftShoulder = Boolean(controller.buttons.leftShoulder);
    state.rightShoulder = Boolean(controller.buttons.rightShoulder);

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

      if (menuButtons.has(name)) {
        handlers.onMenuToggle?.();
        return;
      }
      if (name === 'dpadup') {
        handlers.onMenuUp?.();
        return;
      }
      if (name === 'dpaddown') {
        handlers.onMenuDown?.();
        return;
      }
      if (primaryButtons.has(name)) {
        handlers.onPrimaryAction?.();
        return;
      }
      if (secondaryButtons.has(name)) {
        handlers.onSecondaryAction?.();
      }
    });

    controller.on('buttonUp', (event) => {
      const name = String(event?.button || '').toLowerCase();
      if (name === 'leftshoulder') state.leftShoulder = false;
      if (name === 'rightshoulder') state.rightShoulder = false;
      emitState();
    });

    controller.on('close', () => {
      controller = null;
      resetInputState();
      state.activeDeviceIndex = null;
      refreshDevices();
      emitState();
    });

    emitState();
    return true;
  };

  const selectNextDevice = () => {
    refreshDevices();
    if (!state.availableDevices.length) return;
    selectedDeviceIndex = (selectedDeviceIndex + 1) % state.availableDevices.length;
    state.selectedDeviceIndex = selectedDeviceIndex;
    emitState();
  };

  const selectPreviousDevice = () => {
    refreshDevices();
    if (!state.availableDevices.length) return;
    selectedDeviceIndex =
      (selectedDeviceIndex - 1 + state.availableDevices.length) % state.availableDevices.length;
    state.selectedDeviceIndex = selectedDeviceIndex;
    emitState();
  };

  const onDeviceAdd = () => {
    refreshDevices();
    if (!controller && state.availableDevices.length) {
      openSelectedDevice();
      return;
    }
    emitState();
  };

  const onDeviceRemove = () => {
    refreshDevices();
    const activeExists =
      state.activeDeviceIndex !== null && sdl.controller.devices[state.activeDeviceIndex] !== undefined;

    if (!activeExists) {
      closeController();
      resetInputState();
      state.activeDeviceIndex = null;
      if (state.availableDevices.length) {
        openSelectedDevice();
        return;
      }
    }

    emitState();
  };

  sdl.controller.on('deviceAdd', onDeviceAdd);
  sdl.controller.on('deviceRemove', onDeviceRemove);

  refreshDevices();
  if (state.availableDevices.length) {
    openSelectedDevice();
  } else {
    emitState();
  }

  const dispose = () => {
    sdl.controller.off('deviceAdd', onDeviceAdd);
    sdl.controller.off('deviceRemove', onDeviceRemove);
    closeController();
  };

  return {
    getState: () => ({ ...state, profile: { ...state.profile }, availableDevices: state.availableDevices.map((d) => ({ ...d })) }),
    selectNextDevice,
    selectPreviousDevice,
    activateSelectedDevice: openSelectedDevice,
    dispose,
  };
}
