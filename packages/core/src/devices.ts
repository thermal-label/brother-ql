import type { BrotherQLDevice } from './types.js';
import { DEVICES, REGISTRY } from './devices.generated.js';

// Re-exported under the historical name so external consumers keep
// importing `DEVICE_REGISTRY` while the generated module exports the
// labelwriter-aligned `REGISTRY` symbol.
export const DEVICE_REGISTRY = REGISTRY;

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
