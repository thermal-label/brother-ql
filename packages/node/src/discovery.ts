import { DEVICES, getUsbIds } from '@thermal-label/brother-ql-core';
import type { DiscoveredPrinter, OpenOptions, PrinterDiscovery } from '@thermal-label/contracts';
import { DeviceNotFoundError } from '@thermal-label/contracts';
import {
  enumerateUsbDevices,
  SerialTransport,
  TcpTransport,
  UsbTransport,
} from '@thermal-label/transport/node';
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

/**
 * `PrinterDiscovery` implementation for Brother QL printers.
 *
 * `listPrinters()` enumerates USB via the shared transport helper. A
 * printer in Editor Lite (mass-storage) mode exposes a PID outside the
 * registry, so it is simply absent from the list. Network printers open
 * via `openPrinter({ host, port })`; there is no mDNS implementation so
 * `listPrinters()` never surfaces them.
 */
export class BrotherQLDiscovery implements PrinterDiscovery {
  readonly family = 'brother-ql';

  async listPrinters(): Promise<DiscoveredPrinter[]> {
    const found = await enumerateUsbDevices(Object.values(DEVICES));
    return found.map(({ descriptor, serialNumber, connectionId }) => ({
      device: descriptor,
      ...(serialNumber === undefined ? {} : { serialNumber }),
      transport: 'usb' as const,
      connectionId,
    }));
  }

  async openPrinter(options: BrotherQLOpenOptions = {}): Promise<BrotherQLPrinter> {
    if (options.path !== undefined) {
      const transport = await SerialTransport.open(options.path, options.baudRate);
      // Serial (typically RFCOMM over OS-paired Bluetooth) carries no
      // identifying metadata — attach any descriptor that declares the
      // `bluetooth-spp` transport. `getStatus()` returns accurate
      // detectedMedia regardless of which descriptor we attach, but
      // the descriptor's `name` is what surfaces in logs.
      const descriptor = Object.values(DEVICES).find(
        d => d.transports['bluetooth-spp'] !== undefined,
      );
      /* v8 ignore next -- the registry carries QL_820NWBc with bluetooth-spp */
      if (!descriptor) throw new Error('No bluetooth-spp-capable Brother QL descriptor found.');
      return new BrotherQLPrinter(descriptor, transport, 'serial');
    }

    if (options.host !== undefined) {
      const transport = await TcpTransport.connect(options.host, options.port);
      const descriptor = Object.values(DEVICES).find(d => d.transports.tcp !== undefined);
      /* v8 ignore next -- the registry always has TCP-capable entries */
      if (!descriptor) throw new Error('No network-capable Brother QL descriptor found.');
      return new BrotherQLPrinter(descriptor, transport, 'tcp');
    }

    const found = await enumerateUsbDevices(Object.values(DEVICES));
    const match = found.find(entry => {
      const ids = getUsbIds(entry.descriptor);
      if (options.vid !== undefined && ids?.vid !== options.vid) return false;
      if (options.pid !== undefined && ids?.pid !== options.pid) return false;
      if (options.serialNumber !== undefined && entry.serialNumber !== options.serialNumber)
        return false;
      return true;
    });

    if (!match) throw new DeviceNotFoundError();

    const ids = getUsbIds(match.descriptor);
    /* v8 ignore next -- USB-discovered devices always have USB transport */
    if (!ids) throw new Error('Discovered device has no USB transport — should be unreachable.');
    const transport = await UsbTransport.open(ids.vid, ids.pid);
    return new BrotherQLPrinter(match.descriptor, transport, 'usb');
  }
}

/**
 * Named export discovered by the unified `thermal-label-cli` — the CLI
 * walks installed drivers looking for `mod.discovery`.
 */
export const discovery = new BrotherQLDiscovery();
