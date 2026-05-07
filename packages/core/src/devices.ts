import type { BrotherQLDevice } from './types.js';
import { DEVICES, REGISTRY } from './devices.generated.js';

// Re-exported under the historical name so external consumers keep
// importing `DEVICE_REGISTRY` while the generated module exports the
// labelwriter-aligned `REGISTRY` symbol.
export const DEVICE_REGISTRY = REGISTRY;

// Mass-storage PIDs aligned to Linux usb-ids (gowdy.us / linux-usb.org).
// Each large-format printer with Editor Lite enumerates as USB Mass
// Storage Class on this alternate PID until the user holds the Editor
// Lite button to switch back to printer-class. Aggregated from each
// device entry's `capabilities.massStoragePid`.
const MASS_STORAGE_PIDS = new Set<number>(
  Object.values(DEVICES).flatMap(d => {
    const pid = d.capabilities?.massStoragePid;
    return typeof pid === 'string' ? [parseInt(pid, 16)] : [];
  }),
);

export { DEVICES };

/**
 * Numeric VID/PID extracted from a device's USB transport.
 *
 * Returns `undefined` when the device has no USB transport. Hex
 * strings on the registry (`'0x04f9'`) are parsed at this boundary so
 * runtime callers stay numeric.
 */
export function getUsbIds(device: BrotherQLDevice): { vid: number; pid: number } | undefined {
  const usb = device.transports.usb;
  if (!usb) return undefined;
  return { vid: parseInt(usb.vid, 16), pid: parseInt(usb.pid, 16) };
}

export function findDevice(vid: number, pid: number): BrotherQLDevice | undefined {
  return Object.values(DEVICES).find(d => {
    const ids = getUsbIds(d);
    return ids?.vid === vid && ids.pid === pid;
  });
}

export function isMassStorageMode(pid: number): boolean {
  return MASS_STORAGE_PIDS.has(pid);
}
