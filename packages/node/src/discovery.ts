import {
  DEVICES,
  findDevice,
  isMassStorageMode,
  type BrotherQLDevice,
} from '@thermal-label/brother-ql-core';
/* eslint-disable import-x/consistent-type-specifier-style */
import type { DiscoveredPrinter, OpenOptions, PrinterDiscovery } from '@thermal-label/contracts';
import { SerialTransport, TcpTransport, UsbTransport } from '@thermal-label/transport/node';
import * as usb from 'usb';
import { BrotherQLPrinter } from './printer.js';

/**
 * Driver-specific `openPrinter` options.
 *
 * Extends the contracts `OpenOptions` with `path` / `baudRate` for
 * serial (RFCOMM over OS-paired Bluetooth on the QL-820NWB, or any
 * USB-to-serial adapter). Baud rate is forwarded to the OS driver;
 * RFCOMM ignores it, but `serialport` requires a value.
 */
export interface BrotherQLOpenOptions extends OpenOptions {
  /**
   * Serial device path — e.g. `/dev/rfcomm0` (Linux) or `COM3`
   * (Windows) after pairing the printer via the OS Bluetooth
   * settings. Mutually exclusive with `host` and the USB fields.
   */
  path?: string;
  /** Baud rate override; defaults to 9600. */
  baudRate?: number;
}

const BROTHER_VID = 0x04f9;

async function readSerialNumber(device: usb.Device, idx: number): Promise<string | undefined> {
  return new Promise(resolve => {
    device.getStringDescriptor(idx, (err, value) => {
      resolve(err ? undefined : value);
    });
  });
}

async function enumerateUsbDevices(): Promise<
  { device: usb.Device; descriptor: BrotherQLDevice; serialNumber: string | undefined }[]
> {
  const results: {
    device: usb.Device;
    descriptor: BrotherQLDevice;
    serialNumber: string | undefined;
  }[] = [];

  for (const device of usb.getDeviceList()) {
    const desc = device.deviceDescriptor;
    if (desc.idVendor !== BROTHER_VID) continue;

    if (isMassStorageMode(desc.idProduct)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[brother-ql] Detected printer in Editor Lite (mass storage) mode (PID 0x${desc.idProduct.toString(16).toUpperCase()}). ` +
          'Hold the Editor Lite button until the LED turns off to switch to printer mode.',
      );
      continue;
    }

    const descriptor = findDevice(desc.idVendor, desc.idProduct);
    if (!descriptor) continue;

    let serialNumber: string | undefined;
    if (desc.iSerialNumber) {
      device.open();
      try {
        serialNumber = await readSerialNumber(device, desc.iSerialNumber);
      } finally {
        device.close();
      }
    }

    results.push({ device, descriptor, serialNumber });
  }

  return results;
}

/**
 * `PrinterDiscovery` implementation for Brother QL printers.
 *
 * `listPrinters()` enumerates USB and skips printers in Editor Lite
 * mass-storage mode (a warning is logged — the user has to switch
 * them out of Editor Lite manually). Network printers open via
 * `openPrinter({ host, port })`; there is no mDNS implementation so
 * `listPrinters()` never surfaces them.
 */
export class BrotherQLDiscovery implements PrinterDiscovery {
  readonly family = 'brother-ql';

  async listPrinters(): Promise<DiscoveredPrinter[]> {
    const found = await enumerateUsbDevices();
    return found.map(({ device, descriptor, serialNumber }) => ({
      device: descriptor,
      ...(serialNumber === undefined ? {} : { serialNumber }),
      transport: 'usb' as const,
      connectionId: `${String(device.busNumber)}.${String(device.deviceAddress)}`,
    }));
  }

  async openPrinter(options: BrotherQLOpenOptions = {}): Promise<BrotherQLPrinter> {
    if (options.path !== undefined) {
      const transport = await SerialTransport.open(options.path, options.baudRate);
      // Serial (typically RFCOMM) carries no identifying metadata —
      // fall back to the most capable descriptor with a serial
      // transport tag. `getStatus()` still returns accurate
      // detectedMedia regardless of which descriptor we attach.
      const descriptor = Object.values(DEVICES).find(d =>
        (d.transports as readonly string[]).includes('serial'),
      );
      /* v8 ignore next -- DEVICES always has QL_820NWB with 'serial' in transports */
      if (!descriptor) throw new Error('No serial-capable Brother QL descriptor found.');
      return new BrotherQLPrinter(descriptor, transport, 'serial');
    }

    if (options.host !== undefined) {
      const transport = await TcpTransport.connect(options.host, options.port);
      const descriptor = Object.values(DEVICES).find(d => d.network !== 'none');
      /* v8 ignore next -- DEVICES always has network-capable entries */
      if (!descriptor) throw new Error('No network-capable Brother QL descriptor found.');
      return new BrotherQLPrinter(descriptor, transport, 'tcp');
    }

    const found = await enumerateUsbDevices();
    const match = found.find(entry => {
      if (options.vid !== undefined && entry.descriptor.vid !== options.vid) return false;
      if (options.pid !== undefined && entry.descriptor.pid !== options.pid) return false;
      if (options.serialNumber !== undefined && entry.serialNumber !== options.serialNumber)
        return false;
      return true;
    });

    if (!match) throw new Error('No compatible Brother QL printer found.');

    const transport = await UsbTransport.open(match.descriptor.vid, match.descriptor.pid);
    return new BrotherQLPrinter(match.descriptor, transport, 'usb');
  }
}

/**
 * Named export discovered by the unified `thermal-label-cli` — the CLI
 * walks installed drivers looking for `mod.discovery`.
 */
export const discovery = new BrotherQLDiscovery();
