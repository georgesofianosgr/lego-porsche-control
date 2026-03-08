export function registerKeyboard(window, handlers) {
  const keyState = {
    w: false,
    a: false,
    s: false,
    d: false,
  };

  const emitDriveState = () => {
    handlers.onDriveChange?.({ ...keyState });
  };

  const onKeyDown = (event) => {
    const key = String(event?.key || '').toLowerCase();
    if (key === 'escape') {
      handlers.onExit?.();
      return;
    }
    if (key === 'r' || key === 'R' || event?.scancode === 21) {
      handlers.onRetry?.();
      return;
    }
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      if (!keyState[key]) {
        keyState[key] = true;
        emitDriveState();
      }
    }
  };

  const onTextInput = (event) => {
    const text = String(event?.text || '').toLowerCase();
    if (text === 'r') {
      handlers.onRetry?.();
    }
  };

  const onKeyUp = (event) => {
    const key = String(event?.key || '').toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      if (keyState[key]) {
        keyState[key] = false;
        emitDriveState();
      }
    }
  };

  window.on('keyDown', onKeyDown);
  window.on('textInput', onTextInput);
  window.on('keyUp', onKeyUp);

  return () => {
    window.off('keyDown', onKeyDown);
    window.off('textInput', onTextInput);
    window.off('keyUp', onKeyUp);
  };
}
