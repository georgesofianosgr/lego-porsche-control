#!/usr/bin/env node

import { Command } from 'commander';
import { DEFAULT_DEVICE_NAME } from './constants.js';
import { DEFAULT_ADDRESS_FILE, loadCachedAddress, saveCachedAddress } from './address-cache.js';
import { TechnicMoveHub } from './hub.js';
import { runInteractive } from './interactive.js';

function withCommonOptions(command) {
  return command
    .option('--device-name <name>', 'BLE name match', DEFAULT_DEVICE_NAME)
    .option('--address <address>', 'BLE address/UUID to connect directly')
    .option('--timeout <seconds>', 'BLE scan/connect timeout in seconds', '5')
    .option('--address-file <path>', 'Path to cached BLE address file', DEFAULT_ADDRESS_FILE);
}

function parseTimeout(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function resolveAddress(opts) {
  if (opts.address) return { address: opts.address, fromCache: false };
  const cached = loadCachedAddress(opts.addressFile);
  if (cached) return { address: cached, fromCache: true };
  return { address: null, fromCache: false };
}

async function withConnection(opts, action) {
  const hub = new TechnicMoveHub({ deviceName: opts.deviceName });
  const timeout = parseTimeout(opts.timeout);
  const { address, fromCache } = resolveAddress(opts);

  if (fromCache) {
    console.log(`Using cached address '${address}'`);
  }

  const connected = await hub.connect({ timeout, address });
  if (!connected) {
    console.log(`Could not find/connect to '${address || opts.deviceName}'`);
    return 1;
  }

  try {
    if (hub.connectedAddress) {
      saveCachedAddress(opts.addressFile, hub.connectedAddress);
    }
    return await action(hub, { connectedAddress: hub.connectedAddress, address });
  } finally {
    await hub.disconnect();
  }
}

const program = new Command();
program.name('lego-porsche-node').description('Node.js CLI for LEGO Technic 42176 Move Hub');

withCommonOptions(program.command('scan').description('Scan nearby BLE devices')).action(async (opts) => {
  const hub = new TechnicMoveHub({ deviceName: opts.deviceName });
  const devices = await hub.scan({ timeout: parseTimeout(opts.timeout) });
  if (!devices.length) {
    console.log('No BLE devices found');
    process.exitCode = 1;
    return;
  }
  for (const d of devices) {
    const name = d?.advertisement?.localName || '(no name)';
    const address = d.address || d.id;
    console.log(`${name} | ${address}`);
  }
});

withCommonOptions(program.command('connect-test').description('Scan and verify hub connection')).action(async (opts) => {
  const rc = await withConnection(opts, async (_hub, info) => {
    console.log(`Connected to Porsche hub '${info.connectedAddress || opts.deviceName}'`);
    return 0;
  });

  if (rc !== 0) {
    const hub = new TechnicMoveHub({ deviceName: opts.deviceName });
    const devices = await hub.scan({ timeout: parseTimeout(opts.timeout) });
    if (!devices.length) {
      console.log('Nearby BLE devices: none found');
    } else {
      console.log('Nearby BLE devices:');
      for (const d of devices) {
        const name = d?.advertisement?.localName || '(no name)';
        const address = d.address || d.id;
        console.log(`- ${name} | ${address}`);
      }
    }
  }

  process.exitCode = rc;
});

withCommonOptions(program.command('interactive').description('Keyboard + gamepad control loop'))
  .option('--keyboard-drive-speed <n>', 'Keyboard speed while holding w/s', '65')
  .option('--keyboard-hold-ms <n>', 'Keyboard hold timeout in milliseconds', '180')
  .option('--gamepad-max-speed <n>', 'Maximum gamepad speed', '85')
  .option('--poll-interval-ms <n>', 'Control loop poll interval in milliseconds', '40')
  .option('--gamepad-type <type>', 'node-gamepad controller type', 'ps4/dualshock4')
  .option('--gamepad-vendor-id <n>', 'Optional HID vendor ID override')
  .option('--gamepad-product-id <n>', 'Optional HID product ID override')
  .action(async (opts) => {
    const rc = await withConnection(opts, async (hub) => {
      await runInteractive(hub, {
        keyboardDriveSpeed: Number(opts.keyboardDriveSpeed) || 65,
        keyboardHoldMs: Number(opts.keyboardHoldMs) || 180,
        gamepadMaxSpeed: Number(opts.gamepadMaxSpeed) || 85,
        pollIntervalMs: Number(opts.pollIntervalMs) || 40,
        gamepadType: opts.gamepadType,
        gamepadVendorId: opts.gamepadVendorId === undefined ? undefined : Number(opts.gamepadVendorId),
        gamepadProductId: opts.gamepadProductId === undefined ? undefined : Number(opts.gamepadProductId),
      });
      return 0;
    });
    process.exitCode = rc;
  });

await program.parseAsync(process.argv);
