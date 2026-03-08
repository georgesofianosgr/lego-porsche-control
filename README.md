# lego-porsche-node-mvp

Node.js port of the Python MVP for LEGO Technic 42176 Porsche Move Hub.

## Upstream reference

This project is based on:
- https://github.com/DanieleBenedettelli/TechnicMoveHub

## Features

- Connect to hub over BLE
- Cache connected hub address for future runs
- Real-time keyboard controls
- Real-time gamepad controls
- Keyboard and gamepad can control the car simultaneously

## Install

```bash
cd node-mvp
npm install
```

## Commands

```bash
npm run scan
npm run connect-test
npm run interactive
```

or

```bash
node src/index.js scan
node src/index.js connect-test --timeout 12
node src/index.js interactive --timeout 12
```

## Interactive controls

Keyboard:
- hold `w`: forward
- hold `s`: reverse
- `a` / `d`: steer
- `r`: center steering
- `l`: toggle lights
- `q` or `Ctrl+C`: quit

Gamepad defaults:
- left stick X: steering
- right stick Y: throttle (analog fallback)
- R2/L2: full forward/reverse override
- triangle: lights
- circle: stop
- options/ps: quit

Both inputs are merged: whichever input changes a control most recently wins that control axis.

DualSense note:
- If your controller is recognized as a PS5 pad, run:

```bash
node src/index.js interactive --gamepad-type ps5/dualsense
```

If detection still fails, force HID IDs (DualSense USB often uses vendor `1356`, product `3302`):

```bash
node src/index.js interactive --gamepad-type ps4/dualshock4 --gamepad-vendor-id 1356 --gamepad-product-id 3302
```

The app also auto-tries common Sony IDs (DualSense/Edge/DS4) if gamepad options are not specified.

## Address cache

Saved to:

`~/.config/lego-porsche-node/last_address.txt`

Override with:

```bash
node src/index.js interactive --address-file /tmp/porsche-address.txt
```
