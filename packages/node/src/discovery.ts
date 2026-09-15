import { DEVICES, getUsbIds, MEDIA } from '@thermal-label/brother-ql-core';
import type {
  DeviceEntry,
  DiscoveredPrinter,
  MediaDescriptor,
  OpenOptions,
  PrinterAdapterMap,
  PrinterDiscovery,
} from '@thermal-label/contracts';
import { DeviceIdentificationRequiredError, DeviceNotFoundError } from '@thermal-label/contracts';
import {
  enumerateNetworkDevices,
  enumerateUsbDevices,
  identifyNetworkDevice,
  PRINTER_MIB,
  SerialTransport,
  snmpGet,
  TcpTransport,
  UsbTransport,
  type EnumeratedNetworkDevice,
  type SnmpOptions,
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

export interface BrotherQLDiscoveryOptions {
  /**
   * Scan the LAN (SNMP broadcast) in `listPrinters()` and fall back to
   * it in `openPrinter({ serialNumber })`. Default `true`; set `false`
   * for tests, air-gapped hosts, or callers that only want USB.
   */
  network?: boolean;
  /**
   * SNMP community for every SNMP use this discovery makes: the scan,
   * identification on `openPrinter({ host })`, and the printer's status
   * side channel. `OpenOptions.snmpCommunity` wins per call. Default
   * `'public'`.
   */
  community?: string;
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

function snmpOptions(community: string | undefined): SnmpOptions {
  return community === undefined ? {} : { community };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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
 * `listPrinters()` is the USB enumeration plus one SNMP broadcast on the
 * local subnets. Network printers open by `host`: the model comes from
 * SNMP (`hrDeviceDescr`) because port 9100 carries no model or status
 * signal, and `deviceKey` overrides that. A printer in Editor Lite
 * (mass-storage) mode exposes a PID outside the registry, so it is
 * simply absent from the USB list.
 */
export class BrotherQLDiscovery implements PrinterDiscovery {
  readonly family = 'brother-ql';

  private readonly network: boolean;
  private readonly community: string | undefined;

  constructor(options: BrotherQLDiscoveryOptions = {}) {
    this.network = options.network ?? true;
    this.community = options.community;
  }

  async listPrinters(): Promise<DiscoveredPrinter[]> {
    const [usb, network] = await Promise.allSettled([
      enumerateUsbDevices(REGISTRY),
      this.network ? enumerateNetworkDevices(REGISTRY, snmpOptions(this.community)) : [],
    ]);
    // Either half may be unavailable (no `usb` addon installed, no
    // network); the other still lists. Both failing is a real error.
    if (usb.status === 'rejected' && network.status === 'rejected') {
      throw usb.reason instanceof Error ? usb.reason : new Error(String(usb.reason));
    }
    const printers: DiscoveredPrinter[] = [];
    if (usb.status === 'fulfilled') {
      for (const { descriptor, serialNumber, connectionId } of usb.value) {
        printers.push({
          device: descriptor,
          ...(serialNumber === undefined ? {} : { serialNumber }),
          transport: 'usb',
          connectionId,
        });
      }
    }
    if (network.status === 'fulfilled') {
      for (const found of network.value) printers.push(networkPrinter(found));
    }
    return printers;
  }

  listMedia(): readonly MediaDescriptor[] {
    return Object.values(MEDIA);
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
    // Resolve the descriptor before connecting: a declined open must
    // leave no session on a print server that serves one 9100 client.
    const descriptor =
      options.deviceKey === undefined
        ? await this.identifyTcp(host, options)
        : descriptorForKey(options.deviceKey, tcpCandidates(), 'tcp');
    const transport = await TcpTransport.connect(host, options.port);
    const community = options.snmpCommunity ?? this.community;
    return new BrotherQLPrinter(descriptor, transport, 'tcp', {
      host,
      ...(community === undefined ? {} : { community }),
    });
  }

  private async identifyTcp(host: string, options: BrotherQLOpenOptions): Promise<DeviceEntry> {
    const snmp = snmpOptions(options.snmpCommunity ?? this.community);
    let reason: string;
    try {
      const found = await identifyNetworkDevice(host, REGISTRY, snmp);
      if (found) return found.descriptor;
      reason = `${host} reports ${await reportedModel(host, snmp)}, which is not in the brother-ql registry`;
    } catch (err) {
      // "no SNMP answer" / "status is unavailable" are matched by
      // thermal-label-cli to add `--media` to its hint; keep them.
      reason = `No SNMP answer from ${host} (${errorMessage(err)}); the model cannot be identified and status is unavailable, so pass media too`;
    }
    throw identificationRequired(tcpCandidates(), reason, deviceKey =>
      this.openTcp(host, { ...options, deviceKey }),
    );
  }

  private async openUsb(options: BrotherQLOpenOptions): Promise<BrotherQLPrinter> {
    let usbError: unknown;
    const found = await enumerateUsbDevices(REGISTRY).catch((err: unknown) => {
      usbError = err;
      return [];
    });
    const match = found.find(entry => {
      const ids = getUsbIds(entry.descriptor);
      if (options.vid !== undefined && ids?.vid !== options.vid) return false;
      if (options.pid !== undefined && ids?.pid !== options.pid) return false;
      if (options.serialNumber !== undefined && entry.serialNumber !== options.serialNumber)
        return false;
      return true;
    });

    if (!match) {
      // A serial number can also belong to a network printer.
      if (options.serialNumber !== undefined && this.network) {
        const remote = await this.findNetworkBySerial(options.serialNumber);
        if (remote) {
          return this.openTcp(remote.host, {
            ...options,
            port: remote.port,
            deviceKey: remote.descriptor.key,
          });
        }
      }
      if (usbError instanceof Error) throw usbError;
      throw new DeviceNotFoundError();
    }

    const ids = getUsbIds(match.descriptor);
    /* v8 ignore next -- USB-discovered devices always have USB transport */
    if (!ids) throw new Error('Discovered device has no USB transport — should be unreachable.');
    const transport = await UsbTransport.open(ids.vid, ids.pid);
    return new BrotherQLPrinter(match.descriptor, transport, 'usb');
  }

  private async findNetworkBySerial(
    serialNumber: string,
  ): Promise<EnumeratedNetworkDevice | undefined> {
    const found = await enumerateNetworkDevices(REGISTRY, snmpOptions(this.community)).catch(
      () => [],
    );
    return found.find(d => d.serialNumber === serialNumber);
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

/** One extra unicast, only on the failure path, so the message can name the model. */
async function reportedModel(host: string, snmp: SnmpOptions): Promise<string> {
  try {
    const answers = await snmpGet(host, [PRINTER_MIB.hrDeviceDescr, PRINTER_MIB.sysDescr], snmp);
    const value = answers[PRINTER_MIB.hrDeviceDescr] ?? answers[PRINTER_MIB.sysDescr];
    if (value?.type === 'string' && value.value.length > 0) return JSON.stringify(value.value);
  } catch {
    /* fall through */
  }
  return 'a model';
}

function networkPrinter(found: EnumeratedNetworkDevice): DiscoveredPrinter {
  return {
    device: found.descriptor,
    ...(found.serialNumber === undefined ? {} : { serialNumber: found.serialNumber }),
    transport: 'tcp',
    connectionId: found.connectionId,
    host: found.host,
    port: found.port,
  };
}

/**
 * Named export discovered by the unified `thermal-label-cli` — the CLI
 * walks installed drivers looking for `mod.discovery`.
 */
export const discovery = new BrotherQLDiscovery();
