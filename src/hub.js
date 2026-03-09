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
    this.connectedName = null;
    this.pairingNote = null;
    this.onBatteryChanged = null;
    this.onHubPropertyMessage = null;
    this.notifyHandler = null;
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

  static buildHubPropertyPayload(property, operation) {
    return Buffer.from([0x05, 0x00, 0x01, property & 0xff, operation & 0xff]);
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
    this.cleanupNotifications();
    this.characteristic = null;
    this.peripheral = null;
    this.connectedAddress = null;
    this.connectedName = null;
    this.pairingNote = null;
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
        await this.ensureWindowsPairing(peripheral);
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
        await this.setupNotifications();
        this.connectedAddress = peripheralAddress;
        this.connectedName = peripheral?.advertisement?.localName || null;
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
      this.cleanupNotifications();
      this.peripheral = null;
      this.characteristic = null;
      this.connectedName = null;
      this.pairingNote = null;
    }
  }

  setupMessageHandlers({ onBatteryChanged = null, onHubPropertyMessage = null } = {}) {
    this.onBatteryChanged = typeof onBatteryChanged === 'function' ? onBatteryChanged : null;
    this.onHubPropertyMessage =
      typeof onHubPropertyMessage === 'function' ? onHubPropertyMessage : null;
  }

  async setupNotifications() {
    if (!this.characteristic) return;
    this.cleanupNotifications();
    this.notifyHandler = (data) => {
      this.handleNotifyPayload(data);
    };
    this.characteristic.on('data', this.notifyHandler);
    await this.characteristic.subscribeAsync();
  }

  cleanupNotifications() {
    if (!this.characteristic || !this.notifyHandler) return;
    this.characteristic.removeListener('data', this.notifyHandler);
    this.notifyHandler = null;
  }

  handleNotifyPayload(data) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
    if (!payload.length) return;

    let offset = 0;
    while (offset < payload.length) {
      const len = payload[offset];
      if (!len || offset + len > payload.length) break;
      const frame = payload.subarray(offset, offset + len);
      this.parseFrame(frame);
      offset += len;
    }
  }

  parseFrame(frame) {
    if (!frame || frame.length < 5) return;
    const msgType = frame[2];
    if (msgType !== 0x01) return;

    const property = frame[3];
    const operation = frame[4];
    const value = frame.length > 5 ? frame[5] : null;

    if (this.onHubPropertyMessage) {
      this.onHubPropertyMessage({
        msgType,
        property,
        operation,
        value,
        raw: Buffer.from(frame),
      });
    }

    if (property === 0x06 && value !== null && this.onBatteryChanged) {
      this.onBatteryChanged(TechnicMoveHub.clamp(value, 0, 100));
    }
  }

  async ensureWindowsPairing(peripheral) {
    if (process.platform !== 'win32') return;

    const methodCandidates = ['pairAsync', 'pair', 'bondAsync', 'bond'];
    const methodName = methodCandidates.find((name) => typeof peripheral?.[name] === 'function');

    if (!methodName) {
      this.pairingNote =
        'Windows pairing API is not available via noble; pair the hub in Windows Bluetooth settings.';
      return;
    }

    try {
      const result = await peripheral[methodName]({ protectionLevel: 2 });
      if (result === false) {
        this.pairingNote =
          'Pairing call returned false; pair the hub in Windows Bluetooth settings if control fails.';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.pairingNote =
        `Pairing attempt via '${methodName}' failed (${msg}); pair the hub in Windows Bluetooth settings.`;
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

  async enableBatteryUpdates() {
    await this.send(TechnicMoveHub.buildHubPropertyPayload(0x06, 0x02));
  }

  async requestBatteryUpdate() {
    await this.send(TechnicMoveHub.buildHubPropertyPayload(0x06, 0x05));
  }

  async drive({ speed = 0, angle = 0, lights = 0x00 } = {}) {
    await this.send(TechnicMoveHub.buildDrivePayload(speed, angle, lights));
  }

  async stop({ lights = 0x00 } = {}) {
    await this.drive({ speed: 0, angle: 0, lights });
  }
}
