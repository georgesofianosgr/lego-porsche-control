import fs from 'node:fs';
import { Image } from '@napi-rs/canvas';

const ICON_PATHS = {
  xbox: {
    primary: '../assets/controller-buttons/xbox/primary.png',
    secondary: '../assets/controller-buttons/xbox/secondary.png',
    menu: '../assets/controller-buttons/xbox/menu.png',
    lights: '../assets/controller-buttons/xbox/lights.png',
    parking: '../assets/controller-buttons/xbox/parking.png',
  },
  dualsense: {
    primary: '../assets/controller-buttons/dualsense/primary.png',
    secondary: '../assets/controller-buttons/dualsense/secondary.png',
    menu: '../assets/controller-buttons/dualsense/menu.png',
    lights: '../assets/controller-buttons/dualsense/lights.png',
    parking: '../assets/controller-buttons/dualsense/parking.png',
  },
  dualshock: {
    primary: '../assets/controller-buttons/dualshock/primary.png',
    secondary: '../assets/controller-buttons/dualshock/secondary.png',
    menu: '../assets/controller-buttons/dualshock/menu.png',
    lights: '../assets/controller-buttons/dualshock/lights.png',
    parking: '../assets/controller-buttons/dualshock/parking.png',
  },
};

function loadImage(relativePath) {
  try {
    const image = new Image();
    image.src = fs.readFileSync(new URL(relativePath, import.meta.url));
    return image;
  } catch (_err) {
    return null;
  }
}

const ICONS = {
  xbox: {
    primary: loadImage(ICON_PATHS.xbox.primary),
    secondary: loadImage(ICON_PATHS.xbox.secondary),
    menu: loadImage(ICON_PATHS.xbox.menu),
    lights: loadImage(ICON_PATHS.xbox.lights),
    parking: loadImage(ICON_PATHS.xbox.parking),
  },
  dualsense: {
    primary: loadImage(ICON_PATHS.dualsense.primary),
    secondary: loadImage(ICON_PATHS.dualsense.secondary),
    menu: loadImage(ICON_PATHS.dualsense.menu),
    lights: loadImage(ICON_PATHS.dualsense.lights),
    parking: loadImage(ICON_PATHS.dualsense.parking),
  },
  dualshock: {
    primary: loadImage(ICON_PATHS.dualshock.primary),
    secondary: loadImage(ICON_PATHS.dualshock.secondary),
    menu: loadImage(ICON_PATHS.dualshock.menu),
    lights: loadImage(ICON_PATHS.dualshock.lights),
    parking: loadImage(ICON_PATHS.dualshock.parking),
  },
};

function profileFamily(gamepadState) {
  const profile = String(gamepadState?.profile?.profile || '').toLowerCase();
  const name = String(gamepadState?.name || '').toLowerCase();

  if (profile !== 'playstation') return 'xbox';
  if (name.includes('dualshock') || name.includes('ps4')) return 'dualshock';
  return 'dualsense';
}

export function getButtonIcon(gamepadState, action) {
  const family = profileFamily(gamepadState);
  return ICONS[family]?.[action] || null;
}

export function getButtonIconForFamily(family, action) {
  const key = family === 'dualshock' || family === 'dualsense' ? family : 'xbox';
  return ICONS[key]?.[action] || null;
}
