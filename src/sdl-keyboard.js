export function registerKeyboard(window, handlers) {
  const keyState = { w: false, a: false, s: false, d: false };

  const emitDriveState = () => {
    handlers.onDriveChange?.({ ...keyState });
  };

  const setDriveKey = (key, isDown) => {
    if (keyState[key] === isDown) return;
    keyState[key] = isDown;
    emitDriveState();
  };

  const onKeyDown = (event) => {
    const key = String(event?.key || '').toLowerCase();

    if (key === 'escape') {
      handlers.onExit?.();
      return;
    }
    if (key === 'm') {
      handlers.onMenuToggle?.();
      return;
    }
    if (key === 'x') {
      handlers.onPrimaryAction?.();
      return;
    }
    if (key === 'z') {
      handlers.onSecondaryAction?.();
      return;
    }
    if (key === 'g') {
      handlers.onGamepadScreen?.();
      return;
    }
    if (key === 'up') {
      handlers.onMenuUp?.();
      return;
    }
    if (key === 'down') {
      handlers.onMenuDown?.();
      return;
    }
    if (key === 'left') {
      handlers.onNavLeft?.();
      return;
    }
    if (key === 'right') {
      handlers.onNavRight?.();
      return;
    }
    if (key === 'return' || key === 'enter') {
      handlers.onMenuSelect?.();
      return;
    }

    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      setDriveKey(key, true);
    }
  };

  const onKeyUp = (event) => {
    const key = String(event?.key || '').toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      setDriveKey(key, false);
    }
  };

  window.on('keyDown', onKeyDown);
  window.on('keyUp', onKeyUp);

  return () => {
    window.off('keyDown', onKeyDown);
    window.off('keyUp', onKeyUp);
  };
}
