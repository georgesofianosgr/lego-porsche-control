export function getMenuItems(state) {
  const items = [];

  if (state?.hub?.status === 'Connected') {
    items.push({ id: 'disconnect', label: 'Disconnect' });
  }

  items.push(
    { id: 'gamepad', label: 'Choose Gamepad' },
    { id: 'fullscreen', label: `Toggle Fullscreen (${state.ui.isFullscreen ? 'On' : 'Off'})` },
    { id: 'exit', label: 'Exit' },
  );

  return items;
}
