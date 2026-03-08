export function createMockPorsche() {
  const state = {
    speed: 0,
    angle: 0,
    lights: 0x00,
    commandCount: 0,
    updatedAt: null,
  };

  const drive = async ({ speed = 0, angle = 0, lights = 0x00 } = {}) => {
    state.speed = Number(speed) || 0;
    state.angle = Number(angle) || 0;
    state.lights = Number(lights) || 0;
    state.commandCount += 1;
    state.updatedAt = Date.now();
    return true;
  };

  const stop = async ({ lights = 0x00 } = {}) => {
    state.speed = 0;
    state.angle = 0;
    state.lights = Number(lights) || 0;
    state.commandCount += 1;
    state.updatedAt = Date.now();
    return true;
  };

  return {
    drive,
    stop,
    getState: () => ({ ...state }),
  };
}
