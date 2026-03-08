import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_ADDRESS_FILE = path.join(os.homedir(), '.config', 'lego-porsche-node', 'last_address.txt');

export function loadCachedAddress(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const value = fs.readFileSync(filePath, 'utf8').trim();
    return value || null;
  } catch {
    return null;
  }
}

export function saveCachedAddress(filePath, address) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${address}\n`, 'utf8');
  } catch {
    // best effort cache write
  }
}
