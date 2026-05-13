import {
  DeviceIdentificationRequiredError,
  type ConnectOptions,
  type DeviceEntry,
  type PrinterAdapterMap,
  type Transport,
  type TransportType,
} from '@thermal-label/contracts';
import { DEVICES, findDevice } from '@thermal-label/brother-ql-core';
import { WebSerialTransport, WebUsbTransport } from '@thermal-label/transport/web';
import { DEFAULT_FILTERS, WebBrotherQLPrinter } from './printer.js';

/**
 * Unified browser-picker factory for the brother-ql driver family.
 *
 * Dispatches on `opts.transport`:
 *
 * - `'usb'` — opens `navigator.usb` picker. Auto-identifies via
 *   `usbDevice.vendorId/productId` against the registry. Throws
 *   `DeviceIdentificationRequiredError` only if the picked device's
 *   VID/PID is not in the brother-ql registry.
 * - `'bluetooth-spp'` — always-ask (Web Serial has no BT name
 *   surface). `opts.deviceKey` required; if omitted, throws
 *   `DeviceIdentificationRequiredError` with the BT-SPP-capable
 *   subset of `DEVICES` (e.g. QL_820NWBc, PT_P910BT).
 *   `continueWith(deviceKey)` opens the Web Serial picker for the
 *   chosen device.
 * - `'serial'` — not declared in the brother-ql registry today;
 *   throws unconditionally.
 * - `'bluetooth-gatt'` — not declared in the brother-ql registry today;
 *   throws unconditionally.
 *
 * Returns a 1-key `PrinterAdapterMap` keyed by the device's primary
 * engine role.
 */
export async function requestPrinters(opts: ConnectOptions): Promise<PrinterAdapterMap> {
  switch (opts.transport) {
    case 'usb':
      return requestPrintersUsb(opts);
    case 'bluetooth-spp':
      return requestPrintersBluetoothSpp(opts);
    case 'serial':
      throw new Error('brother-ql: serial transport not declared in the registry');
    case 'bluetooth-gatt':
      throw new Error('brother-ql: bluetooth-gatt transport not declared in the registry');
  }
}

async function requestPrintersUsb(
  opts: Extract<ConnectOptions, { transport: 'usb' }>,
): Promise<PrinterAdapterMap> {
  const filters = DEFAULT_FILTERS;
  const usbDevice = await navigator.usb.requestDevice({ filters });

  if (opts.deviceKey !== undefined) {
    const entry = entryByKey(opts.deviceKey);
    if (!entry) {
      throw new Error(`requestPrinters(usb): unknown deviceKey "${opts.deviceKey}"`);
    }
    const transport = await WebUsbTransport.fromDevice(usbDevice);
    return adapterMap(entry, transport);
  }

  const entry = findDevice(usbDevice.vendorId, usbDevice.productId);
  if (entry) {
    const transport = await WebUsbTransport.fromDevice(usbDevice);
    return adapterMap(entry, transport);
  }

  // No registry match — let the caller pick from the USB-capable
  // candidates and keep the same USBDevice across the
  // `continueWith` resume.
  throw new DeviceIdentificationRequiredError(
    devicesForTransport('usb'),
    async (deviceKey: string) => {
      const chosen = entryByKey(deviceKey);
      if (!chosen) {
        throw new Error(`continueWith: unknown deviceKey "${deviceKey}"`);
      }
      const transport = await WebUsbTransport.fromDevice(usbDevice);
      return adapterMap(chosen, transport);
    },
  );
}

function requestPrintersBluetoothSpp(
  opts: Extract<ConnectOptions, { transport: 'bluetooth-spp' }>,
): Promise<PrinterAdapterMap> {
  if (opts.deviceKey === undefined) {
    return Promise.reject(
      new DeviceIdentificationRequiredError(
        devicesForTransport('bluetooth-spp'),
        deviceKey => openBluetoothSpp(deviceKey, opts.baudRate),
      ),
    );
  }
  return openBluetoothSpp(opts.deviceKey, opts.baudRate);
}

async function openBluetoothSpp(deviceKey: string, baudRate?: number): Promise<PrinterAdapterMap> {
  const entry = entryByKey(deviceKey);
  if (!entry) {
    throw new Error(`requestPrinters(bluetooth-spp): unknown deviceKey "${deviceKey}"`);
  }
  if (!entry.transports['bluetooth-spp']) {
    throw new Error(
      `requestPrinters(bluetooth-spp): ${deviceKey} does not declare bluetooth-spp transport`,
    );
  }
  // SPP baud is negotiated on the link; default to 9600 when not
  // specified.
  const transport = await WebSerialTransport.request(undefined, baudRate ?? 9600);
  return adapterMap(entry, transport);
}

function adapterMap(entry: DeviceEntry, transport: Transport): PrinterAdapterMap {
  const engine = entry.engines[0];
  if (!engine) throw new Error(`Device ${entry.key} has no engines.`);
  // WebBrotherQLPrinter accepts a generic Transport — the encoder is
  // transport-agnostic, so the BT-SPP path is just the same printer
  // class wrapped around a WebSerialTransport. Bench-confirmed on
  // QL-820NWBc.
  const printer = new WebBrotherQLPrinter(entry, transport);
  return { [engine.role]: printer };
}

/**
 * Filter the registry to entries declaring `transport`. Used to
 * populate `DeviceIdentificationRequiredError.candidates`.
 */
export function devicesForTransport(transport: TransportType): readonly DeviceEntry[] {
  return Object.values(DEVICES).filter(d => transport in d.transports);
}

function entryByKey(key: string): DeviceEntry | undefined {
  return (DEVICES as Record<string, DeviceEntry | undefined>)[key];
}
