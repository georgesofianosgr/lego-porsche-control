import noble from '@abandonware/noble';
import { CHAR_UUID, DEFAULT_DEVICE_NAME, SERVICE_UUID } from './constants.js';

const SCAN_INTERVAL_MS = 200;

function normalizeUuid(value) {
  return String(value || '').toLowerCase().replace(/-/g, '');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TechnicMoveHub {
  constructor({ deviceName = DEFAULT_DEVICE_NAME } = {}) {
    this.deviceName = deviceName;
    this.peripheral = null;
    this.characteristic = null;
    this.connectedAddress = null;
  }

  static clamp(value, low = -100, high = 100) {
    return Math.max(low, Math.min(high, value));
  }

  static toByte(value) {
    return value & 0xff;
  }

  static buildDrivePayload(speed, angle, lights) {
    const s = TechnicMoveHub.clamp(speed);
    const a = TechnicMoveHub.clamp(angle);
    return Buffer.from([
      0x0d,
      0x00,
      0x81,
      0x36,
      0x11,
      0x51,
      0x00,
      0x03,
      0x00,
      TechnicMoveHub.toByte(s),
      TechnicMoveHub.toByte(a),
      TechnicMoveHub.toByte(lights),
      0x00,
    ]);
  }

  static calibrationPayloads() {
    return [
      Buffer.from('0d008136115100030000001000', 'hex'),
      Buffer.from('0d008136115100030000000800', 'hex'),
    ];
  }

  static isHubCandidate(peripheral, expectedName) {
    const name = String(peripheral?.advertisement?.localName || '').toLowerCase();
    const expected = String(expectedName || '').toLowerCase();
    if (expected && name.includes(expected)) return true;
    if (name.includes('technic move')) return true;

    const uuids = peripheral?.advertisement?.serviceUuids || [];
    const target = normalizeUuid(SERVICE_UUID);
    return uuids.map(normalizeUuid).includes(target);
  }

  async waitForPoweredOn(timeoutSeconds = 8) {
    if (noble.state === 'poweredOn') return;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        noble.removeListener('stateChange', onState);
        reject(new Error(`Bluetooth adapter not ready (state=${noble.state})`));
      }, timeoutSeconds * 1000);

      const onState = (state) => {
        if (state === 'poweredOn') {
          clearTimeout(timeout);
          noble.removeListener('stateChange', onState);
          resolve();
        }
      };

      noble.on('stateChange', onState);
    });
  }

  async scan({ timeout = 5 }) {
    await this.waitForPoweredOn();

    const seen = new Map();
    const onDiscover = (peripheral) => {
      seen.set(peripheral.address || peripheral.id, peripheral);
    };

    noble.on('discover', onDiscover);
    await noble.startScanningAsync([], true);

    const endAt = Date.now() + timeout * 1000;
    while (Date.now() < endAt) {
      await delay(SCAN_INTERVAL_MS);
    }

    await noble.stopScanningAsync();
    noble.removeListener('discover', onDiscover);
    return Array.from(seen.values());
  }

  async connect({ timeout = 5, address = null }) {
    this.connectedAddress = null;
    const peripherals = await this.scan({ timeout });

    for (const peripheral of peripherals) {
      const peripheralAddress = peripheral.address || peripheral.id;
      if (address && String(peripheralAddress).toLowerCase() !== String(address).toLowerCase()) {
        continue;
      }
      if (!address && !TechnicMoveHub.isHubCandidate(peripheral, this.deviceName)) {
        continue;
      }

      try {
        await peripheral.connectAsync();
        const targetService = normalizeUuid(SERVICE_UUID);
        const targetChar = normalizeUuid(CHAR_UUID);
        const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
          [targetService],
          [targetChar],
        );

        if (!characteristics?.length) {
          await peripheral.disconnectAsync();
          continue;
        }

        this.peripheral = peripheral;
        this.characteristic = characteristics[0];
        this.connectedAddress = peripheralAddress;
        return true;
      } catch {
        try {
          if (peripheral.state === 'connected') {
            await peripheral.disconnectAsync();
          }
        } catch {
          // ignore cleanup errors
        }
      }
    }

    return false;
  }

  async disconnect() {
    if (!this.peripheral) return;
    try {
      if (this.peripheral.state === 'connected') {
        await this.peripheral.disconnectAsync();
      }
    } finally {
      this.peripheral = null;
      this.characteristic = null;
    }
  }

  async send(payload) {
    if (!this.characteristic) {
      throw new Error('Not connected to hub');
    }
    await this.characteristic.writeAsync(Buffer.from(payload), false);
  }

  async calibrate() {
    const [first, second] = TechnicMoveHub.calibrationPayloads();
    await this.send(first);
    await this.send(second);
  }

  async drive({ speed = 0, angle = 0, lights = 0x00 } = {}) {
    await this.send(TechnicMoveHub.buildDrivePayload(speed, angle, lights));
  }

  async stop({ lights = 0x00 } = {}) {
    await this.drive({ speed: 0, angle: 0, lights });
  }
}
