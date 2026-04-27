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

  // Find the first raster-row payload of a given opcode/colour in the
  // encoded job. Matches the 3-byte header (opcode, colour, LEN=90) — no
  // other command in encodeJob shares that pattern, so it's unambiguous.
  function firstRasterRow(bytes: Uint8Array, opcode: number, colour: number): Uint8Array {
    for (let i = 0; i < bytes.length - 3 - 90; i++) {
      if (bytes[i] === opcode && bytes[i + 1] === colour && bytes[i + 2] === 90) {
        return bytes.slice(i + 3, i + 3 + 90);
      }
    }
    throw new Error(
      `no raster row with opcode 0x${opcode.toString(16)} colour 0x${colour.toString(16)}`,
    );
  }

  it('print() horizontally mirrors the rendered bitmap (single-colour)', async () => {
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    // 16×1 input, all white except the leftmost pixel = black.
    const data = new Uint8Array(16 * 4).fill(0xff);
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    await printer.print({ width: 16, height: 1, data }, MEDIA[259]);
    const row = firstRasterRow(written[0]!, 0x67, 0x00);
    // MEDIA[259] leftMarginPins = 12. After horizontal flip the black pixel
    // sits at bitmap x=15, so the head pin is 12+15=27. Byte 27>>3 = 3,
    // bit 7-(27&7) = 4, mask 0x10. The un-mirrored position would be
    // pin 12 → byte 1 bit 4 = 0x10; assert that's empty.
    expect(row[3]).toBe(0x10);
    expect(row[1]).toBe(0x00);
  });

  it('print() splits the job into ≤1 KB OUT-pipe chunks (firmware flow-control)', async () => {
    // 696×120 two-colour encodes to roughly 24 kB uncompressed — more than
    // enough to require multiple chunks. Each emitted slice must be ≤1024
    // bytes so the printer's input ring buffer has time to drain between
    // bursts. Single libusb writes that exceed the buffer reliably hang
    // the QL-820NWBc firmware mid-print.
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.print(solidRgba(696, 120), MEDIA[251]);
    expect(written.length).toBeGreaterThan(1);
    for (const w of written) {
      expect(w.length).toBeLessThanOrEqual(1024);
    }
  });

  it('print() horizontally mirrors both planes on two-colour media', async () => {
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    // 16×1 input. Leftmost pixel red, the rest white.
    const data = new Uint8Array(16 * 4).fill(0xff);
    data[0] = 255; // R
    data[1] = 0; // G
    data[2] = 0; // B
    data[3] = 255; // A
    await printer.print({ width: 16, height: 1, data }, MEDIA[251]);
    // Two-colour: 0x77 0x01 = black row, 0x77 0x02 = red row. The red bit
    // should land at byte 3 / 0x10 just like the single-colour case.
    const redRow = firstRasterRow(written[0]!, 0x77, 0x02);
    expect(redRow[3]).toBe(0x10);
    expect(redRow[1]).toBe(0x00);
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
    // print() chunks the OUT pipe; just assert it issued at least one
    // additional write after the status round-trip.
    expect(written.length).toBeGreaterThan(before);
  });

  it('print() splits two-colour bitmap when media carries a palette', async () => {
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    await printer.print(redRgba(64, 64), MEDIA[251]);
    // Two-colour job header includes the expanded-mode byte sequence —
    // just assert a job was emitted; byte-level details are covered by
    // the core protocol tests.
    expect(written.length).toBeGreaterThan(0);
  });

  it("print() auto-rotates landscape input on 'horizontal' die-cut media", async () => {
    // MEDIA[271] = DK-11201 29×90, defaultOrientation: 'horizontal'.
    // 800×200 landscape RGBA — the heuristic should rotate the bitmap 90°
    // CW so the visual reads along the tape feed direction. Without
    // rotation the encoded job has 200 raster rows; with rotation it has
    // 800. Assert the explicit `rotate: 0` bypass produces a smaller job
    // than the default auto path.
    const { transport: autoTransport, written: autoWritten } = makeTransport();
    const autoPrinter = new BrotherQLPrinter(DEVICES.QL_820NWB, autoTransport, 'usb');
    await autoPrinter.print(solidRgba(800, 200), MEDIA[271]);

    const { transport: bypassTransport, written: bypassWritten } = makeTransport();
    const bypassPrinter = new BrotherQLPrinter(DEVICES.QL_820NWB, bypassTransport, 'usb');
    await bypassPrinter.print(solidRgba(800, 200), MEDIA[271], { rotate: 0 });

    const totalAuto = autoWritten.reduce((acc, b) => acc + b.length, 0);
    const totalBypass = bypassWritten.reduce((acc, b) => acc + b.length, 0);
    expect(totalAuto).toBeGreaterThan(totalBypass);
  });

  it('createPreview() returns two planes on multi-ink media', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWB, transport, 'usb');
    const preview = await printer.createPreview(redRgba(64, 64), { media: MEDIA[251]! });
    expect(preview.planes.map(p => p.name)).toEqual(['black', 'red']);
    expect(preview.assumed).toBe(false);
  });

  it('createPreview() returns one plane on single-ink media', async () => {
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
