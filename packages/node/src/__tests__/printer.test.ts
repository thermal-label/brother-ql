import { describe, expect, it, vi } from 'vitest';
import { MediaNotSpecifiedError, type Transport } from '@thermal-label/contracts';
import { DEVICES, MEDIA } from '@thermal-label/brother-ql-core';
import { BrotherQLPrinter } from '../printer.js';

function makeTransport(statusBytes: Uint8Array = new Uint8Array(32)): {
  transport: Transport;
  written: Uint8Array[];
} {
  const written: Uint8Array[] = [];
  const transport: Transport = {
    get connected() {
      return true;
    },
    write: vi.fn((data: Uint8Array) => {
      written.push(new Uint8Array(data));
      return Promise.resolve();
    }),
    read: vi.fn(() => Promise.resolve(statusBytes)),
    close: vi.fn(() => Promise.resolve()),
  };
  return { transport, written };
}

function solidRgba(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  return {
    width,
    height,
    data: new Uint8Array(width * height * 4).fill(0),
  };
}

function redRgba(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  return { width, height, data };
}

describe('BrotherQLPrinter', () => {
  it('exposes adapter metadata', () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    expect(printer.family).toBe('brother-ql');
    expect(printer.model).toBe('QL-820NWB');
    expect(printer.device).toBe(DEVICES.QL_820NWB);
    expect(printer.transportType).toBe('usb');
    expect(printer.connected).toBe(true);
  });

  it('print() throws MediaNotSpecifiedError without media or status', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await expect(printer.print(solidRgba(64, 64))).rejects.toBeInstanceOf(MediaNotSpecifiedError);
  });

  it('print() encodes a single-colour job for non-colour-capable media', async () => {
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.print(solidRgba(64, 64), MEDIA[259]);
    expect(written.length).toBeGreaterThan(0);
  });

  it('print() uses detected media from a prior getStatus when media is omitted', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const { transport, written } = makeTransport(bytes);
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.getStatus();
    const before = written.length;
    await printer.print(solidRgba(64, 64));
    expect(written.length).toBe(before + 1);
  });

  it('print() splits two-colour bitmap when media.colorCapable is true', async () => {
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.print(redRgba(64, 64), MEDIA[251]);
    // Two-colour job header includes the expanded-mode byte sequence —
    // just assert a job was emitted; byte-level details are covered by
    // the core protocol tests.
    expect(written.length).toBeGreaterThan(0);
  });

  it('createPreview() returns two planes on colorCapable media', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    const preview = await printer.createPreview(redRgba(64, 64), { media: MEDIA[251]! });
    expect(preview.planes.map(p => p.name)).toEqual(['black', 'red']);
    expect(preview.assumed).toBe(false);
  });

  it('createPreview() returns one plane on non-colorCapable media', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    const preview = await printer.createPreview(solidRgba(64, 64), { media: MEDIA[259]! });
    expect(preview.planes).toHaveLength(1);
    expect(preview.planes[0]!.name).toBe('black');
  });

  it('createPreview() falls back to DEFAULT_MEDIA with assumed=true', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    const preview = await printer.createPreview(solidRgba(64, 64));
    expect(preview.assumed).toBe(true);
    expect(preview.media.id).toBe(259);
  });

  it('createPreview() reuses detected media from a prior getStatus', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const { transport } = makeTransport(bytes);
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.getStatus();
    const preview = await printer.createPreview(solidRgba(64, 64));
    expect(preview.assumed).toBe(false);
    expect(preview.media.id).toBe(259);
  });

  it('getStatus() polls until 32 bytes arrive and returns BrotherQLStatus', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const { transport } = makeTransport(bytes);
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');

    const status = await printer.getStatus();
    expect(status.rawBytes.length).toBe(32);
    expect(status.editorLiteMode).toBe(false);
    expect(status.detectedMedia?.id).toBe(259);
  });

  it('close() awaits the transport', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.close();
    // Dodge @typescript-eslint/unbound-method — the point is to verify
    // the mock was called, not to keep a `this`-bound reference.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(transport.close)).toHaveBeenCalled();
  });

  it('getStatus() throws when the printer never queues a response', async () => {
    // transport.read always returns 0 bytes — mirrors the USB path where
    // the printer hasn't responded yet.
    const transport: Transport = {
      get connected() {
        return true;
      },
      write: vi.fn(() => Promise.resolve()),
      read: vi.fn(() => Promise.resolve(new Uint8Array(0))),
      close: vi.fn(() => Promise.resolve()),
    };
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await expect(printer.getStatus()).rejects.toThrow(/did not respond to status request/);
  }, 10_000);
});
