import type { BrotherQLDevice } from './types.js';
import { DEVICES } from './devices.generated.js';

// PIDs aligned to Linux usb-ids (gowdy.us / linux-usb.org):
//   0x20a9 — QL-1100 mass storage
//   0x20aa — QL-1110NWB mass storage
//   0x20ac — QL-1115NWB mass storage
const MASS_STORAGE_PIDS = new Set([0x20a9, 0x20aa, 0x20ac]);

export { DEVICES };

export function findDevice(vid: number, pid: number): BrotherQLDevice | undefined {
  return Object.values(DEVICES).find(d => d.vid === vid && d.pid === pid);
}

export function isMassStorageMode(pid: number): boolean {
  return MASS_STORAGE_PIDS.has(pid);
}
