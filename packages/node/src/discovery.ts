import { DEVICES, getUsbIds } from '@thermal-label/brother-ql-core';
import type {
  DeviceEntry,
  DiscoveredPrinter,
  OpenOptions,
  PrinterAdapterMap,
  PrinterDiscovery,
} from '@thermal-label/contracts';
import { DeviceIdentificationRequiredError, DeviceNotFoundError } from '@thermal-label/contracts';
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
 * Serial (RFCOMM over OS-paired Bluetooth on the QL-820NWB, or any
 * USB-to-serial adapter) uses the contract's `serialPath` / `baudRate`;
 * the pre-0.6.2 `path` spelling is still accepted for one release.
 * Serial and TCP both need a registry key when the printer cannot be
 * identified: see `BrotherQLDiscovery.openPrinter`.
 */
export interface BrotherQLOpenOptions extends OpenOptions {
  /** @deprecated Use `serialPath`. Removed in the next minor. */
  path?: string;
}

const REGISTRY = Object.values(DEVICES);

function tcpCandidates(): DeviceEntry[] {
  return REGISTRY.filter(d => d.transports.tcp !== undefined);
}

function serialCandidates(): DeviceEntry[] {
  return REGISTRY.filter(
    d => d.transports.serial !== undefined || d.transports['bluetooth-spp'] !== undefined,
  );
}

function keyList(candidates: readonly DeviceEntry[]): string {
  return candidates
    .map(d => d.key)
    .sort()
    .join(', ');
}

/**
 * `DeviceIdentificationRequiredError` with a message that says why the
 * printer could not be identified, instead of the contract's generic
 * one; `candidates` and `continueWith` keep the contract shape.
 */
function identificationRequired(
  candidates: readonly DeviceEntry[],
  reason: string,
  open: (deviceKey: string) => Promise<BrotherQLPrinter>,
): DeviceIdentificationRequiredError {
  const err = new DeviceIdentificationRequiredError(
    candidates,
    async (deviceKey): Promise<PrinterAdapterMap> => {
      const printer = await open(deviceKey);
      return { [printer.device.engines[0]?.role ?? 'primary']: printer };
    },
  );
  err.message = `${reason}. Pass deviceKey, one of: ${keyList(candidates)}.`;
  return err;
}

/**
 * `PrinterDiscovery` implementation for Brother QL printers.
 *
 * `listPrinters()` enumerates USB via the shared transport helper. A
 * printer in Editor Lite (mass-storage) mode exposes a PID outside the
 * registry, so it is simply absent from the list. Network printers open
 * via `openPrinter({ host, port, deviceKey })`; there is no mDNS
 * implementation so `listPrinters()` never surfaces them.
 */
export class BrotherQLDiscovery implements PrinterDiscovery {
  readonly family = 'brother-ql';

  async listPrinters(): Promise<DiscoveredPrinter[]> {
    const found = await enumerateUsbDevices(REGISTRY);
    return found.map(({ descriptor, serialNumber, connectionId }) => ({
      device: descriptor,
      ...(serialNumber === undefined ? {} : { serialNumber }),
      transport: 'usb' as const,
      connectionId,
    }));
  }

  async openPrinter(options: BrotherQLOpenOptions = {}): Promise<BrotherQLPrinter> {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- alias kept for one release
    const serialPath = options.serialPath ?? options.path;
    if (serialPath !== undefined) return this.openSerial(serialPath, options);
    if (options.host !== undefined) return this.openTcp(options.host, options);
    return this.openUsb(options);
  }

  private async openSerial(
    serialPath: string,
    options: BrotherQLOpenOptions,
  ): Promise<BrotherQLPrinter> {
    // Serial carries no identifying metadata and the registry has more
    // than one serial-capable entry, so the caller names the model.
    const candidates = serialCandidates();
    if (options.deviceKey === undefined) {
      throw identificationRequired(
        candidates,
        `Serial port ${serialPath} carries no model signal`,
        deviceKey => this.openSerial(serialPath, { ...options, deviceKey }),
      );
    }
    const descriptor = descriptorForKey(options.deviceKey, candidates, 'serial');
    const transport = await SerialTransport.open(serialPath, options.baudRate);
    return new BrotherQLPrinter(descriptor, transport, 'serial');
  }

  private async openTcp(host: string, options: BrotherQLOpenOptions): Promise<BrotherQLPrinter> {
    // Port 9100 carries no model signal and the registry has a dozen
    // TCP-capable entries, so the caller names the model. Resolve it
    // before connecting: a declined open must leave no session on a
    // print server that serves one 9100 client.
    const candidates = tcpCandidates();
    if (options.deviceKey === undefined) {
      throw identificationRequired(
        candidates,
        `Port 9100 on ${host} carries no model signal`,
        deviceKey => this.openTcp(host, { ...options, deviceKey }),
      );
    }
    const descriptor = descriptorForKey(options.deviceKey, candidates, 'tcp');
    const transport = await TcpTransport.connect(host, options.port);
    return new BrotherQLPrinter(descriptor, transport, 'tcp');
  }

  private async openUsb(options: BrotherQLOpenOptions): Promise<BrotherQLPrinter> {
    const found = await enumerateUsbDevices(REGISTRY);
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

function descriptorForKey(
  deviceKey: string,
  candidates: readonly DeviceEntry[],
  kind: 'tcp' | 'serial',
): DeviceEntry {
  const descriptor = (DEVICES as Record<string, DeviceEntry | undefined>)[deviceKey];
  if (!descriptor) {
    throw new Error(
      `Unknown deviceKey "${deviceKey}". ${kind === 'tcp' ? 'TCP' : 'Serial'}-capable Brother QL keys: ${keyList(candidates)}.`,
    );
  }
  if (!candidates.includes(descriptor)) {
    throw new Error(
      `Device ${descriptor.key} has no ${kind} transport — it cannot be opened over ${kind === 'tcp' ? '`host`' : '`serialPath`'}. ${kind === 'tcp' ? 'TCP' : 'Serial'}-capable keys: ${keyList(candidates)}.`,
    );
  }
  return descriptor;
}

/**
 * Named export discovered by the unified `thermal-label-cli` — the CLI
 * walks installed drivers looking for `mod.discovery`.
 */
export const discovery = new BrotherQLDiscovery();
