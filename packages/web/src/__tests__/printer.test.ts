import { describe, expect, it, vi } from 'vitest';
import { MediaNotSpecifiedError } from '@thermal-label/contracts';
import { DEVICES, MEDIA } from '@thermal-label/brother-ql-core';
import { fromUSBDevice, requestPrinter } from '../printer.js';
import { createMockUSBDevice } from './webusb-mock.js';

function solidRgba(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  return { width, height, data: new Uint8Array(width * height * 4).fill(0) };
}

describe('WebBrotherQLPrinter', () => {
  it('exposes adapter metadata for a QL-820NWB', async () => {
    const device = createMockUSBDevice({ productId: 0x20a7 });
    const printer = await fromUSBDevice(device);
    expect(printer.family).toBe('brother-ql');
    expect(printer.model).toBe('QL-820NWB');
    expect(printer.device.twoColor).toBe(true);
  });

  it('print() writes an encoded raster job for non-colorCapable media', async () => {
    const device = createMockUSBDevice({ productId: 0x20a7 });
    const printer = await fromUSBDevice(device);
    await printer.print(solidRgba(64, 64), MEDIA[259]);
    expect(device.__transfers.length).toBeGreaterThan(0);
  });

  it('print() throws MediaNotSpecifiedError when media is missing', async () => {
    const device = createMockUSBDevice({ productId: 0x20a7 });
    const printer = await fromUSBDevice(device);
    await expect(printer.print(solidRgba(64, 64))).rejects.toBeInstanceOf(MediaNotSpecifiedError);
  });

  it('getStatus returns BrotherQLStatus with detected media when present', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x20a7, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    const status = await printer.getStatus();
    expect(status.rawBytes.length).toBe(32);
    expect(status.editorLiteMode).toBe(false);
    expect(status.detectedMedia?.id).toBe(259);
  });

  it('throws for unknown USB devices', async () => {
    const device = createMockUSBDevice({ vendorId: 0x1234, productId: 0x5678 });
    await expect(fromUSBDevice(device)).rejects.toThrow('Unsupported USB device');
  });
});

describe('requestPrinter', () => {
  it('passes the brother-ql VID/PIDs to navigator.usb.requestDevice', async () => {
    const device = createMockUSBDevice({ productId: 0x20a7 });
    const requestDevice = vi.fn(() => Promise.resolve(device));
    Object.defineProperty(globalThis, 'navigator', {
      value: { usb: { requestDevice } },
      configurable: true,
    });

    await requestPrinter();

    expect(requestDevice).toHaveBeenCalledOnce();
    const call = (requestDevice.mock.calls as unknown as [{ filters: USBDeviceFilter[] }][])[0]![0];
    const pids = call.filters.map(f => f.productId);
    for (const d of Object.values(DEVICES)) {
      expect(pids).toContain(d.pid);
    }
  });
});
