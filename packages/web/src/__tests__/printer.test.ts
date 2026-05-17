/* eslint-disable @typescript-eslint/no-deprecated -- intentionally exercises the deprecated per-transport factories during plan-10 transition */
import { describe, expect, it, vi } from 'vitest';
import { MediaNotSpecifiedError } from '@thermal-label/contracts';
import type { Transport } from '@thermal-label/contracts';
import { DEVICES, MEDIA, findDevice } from '@thermal-label/brother-ql-core';
import { fromUSBDevice, requestPrinter, WebBrotherQLPrinter } from '../printer.js';
import { createMockUSBDevice } from './webusb-mock.js';

/**
 * Fake `Transport` recording write order. Each ESC iS write (1B 69 53)
 * queues a 32-byte status frame the persistent read loop drains.
 * `write()` does an async hop so an unserialised concurrent caller
 * could interleave.
 */
class RecordingTransport implements Transport {
  readonly writes: { firstByte: number | undefined; isStatusReq: boolean }[] = [];
  connected = true;
  private readonly frames: Uint8Array[] = [];
  private waiter: ((frame: Uint8Array) => void) | undefined;

  async write(data: Uint8Array): Promise<void> {
    const isStatusReq = data[0] === 0x1b && data[1] === 0x69 && data[2] === 0x53;
    this.writes.push({ firstByte: data[0], isStatusReq });
    await Promise.resolve();
    await Promise.resolve();
    if (isStatusReq) this.enqueue(new Uint8Array(32));
  }

  private enqueue(frame: Uint8Array): void {
    if (this.waiter) {
      const w = this.waiter;
      this.waiter = undefined;
      w(frame);
    } else {
      this.frames.push(frame);
    }
  }

  read(): Promise<Uint8Array> {
    const next = this.frames.shift();
    if (next) return Promise.resolve(next);
    return new Promise<Uint8Array>(resolve => {
      this.waiter = resolve;
    });
  }

  close(): Promise<void> {
    this.connected = false;
    this.waiter?.(new Uint8Array(0));
    return Promise.resolve();
  }
}

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

describe('WebBrotherQLPrinter', () => {
  it('exposes adapter metadata for a QL-820NWBc', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    expect(printer.family).toBe('brother-ql');
    expect(printer.model).toBe('QL-820NWBc');
    expect(printer.device.engines[0]?.capabilities?.twoColor).toBe(true);
    expect(printer.connected).toBe(true);
  });

  it('print() splits two-colour images when media carries a palette', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    await printer.print(redRgba(64, 64), MEDIA[251]);
    expect(device.__transfers.length).toBeGreaterThan(0);
  });

  it('createPreview() returns two planes on multi-ink media', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    const preview = await printer.createPreview(redRgba(64, 64), { media: MEDIA[251]! });
    expect(preview.planes.map(p => p.name)).toEqual(['black', 'red']);
    expect(preview.assumed).toBe(false);
  });

  it('createPreview() returns one plane on single-ink media', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    const preview = await printer.createPreview(solidRgba(64, 64), { media: MEDIA[259]! });
    expect(preview.planes).toHaveLength(1);
  });

  it('createPreview() reuses detected media from a prior getStatus', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x209d, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    await printer.getStatus();
    const preview = await printer.createPreview(solidRgba(64, 64));
    expect(preview.assumed).toBe(false);
    expect(preview.media.id).toBe(259);
  });

  it('createPreview() falls back to DEFAULT_MEDIA with assumed=true', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    const preview = await printer.createPreview(solidRgba(64, 64));
    expect(preview.assumed).toBe(true);
    expect(preview.media.id).toBe(259);
  });

  it('close() releases the underlying USB device', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    await printer.close();
    expect(device.opened).toBe(false);
    expect(printer.connected).toBe(false);
  });

  it('print() writes an encoded raster job for single-ink media', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    await printer.print(solidRgba(64, 64), MEDIA[259]);
    expect(device.__transfers.length).toBeGreaterThan(0);
  });

  it("print() auto-rotates landscape input on 'horizontal' die-cut media", async () => {
    // MEDIA[271] = DK-11201 29×90, defaultOrientation: 'horizontal'.
    // 800×200 landscape RGBA — auto-rotate kicks in. Bypass with
    // `rotate: 0` for the comparison case; the auto path encodes more
    // raster rows so the total transfer is larger.
    const autoDevice = createMockUSBDevice({ productId: 0x209d });
    const autoPrinter = await fromUSBDevice(autoDevice);
    await autoPrinter.print(solidRgba(800, 200), MEDIA[271]);

    const bypassDevice = createMockUSBDevice({ productId: 0x209d });
    const bypassPrinter = await fromUSBDevice(bypassDevice);
    await bypassPrinter.print(solidRgba(800, 200), MEDIA[271], { rotate: 0 });

    const totalAuto = autoDevice.__transfers.reduce((acc, t) => acc + t.data.length, 0);
    const totalBypass = bypassDevice.__transfers.reduce((acc, t) => acc + t.data.length, 0);
    expect(totalAuto).toBeGreaterThan(totalBypass);
  });

  /**
   * TIFF-style PackBits row decoder — inverse of `pack-bits.ts`'s
   * `packBits`. The web driver prints with `compress: true`, so encoded
   * raster rows carry a PackBits-compressed payload; decoding restores
   * the flat 90-byte head-aligned row the assertions inspect.
   */
  function unpackBits(input: Uint8Array): Uint8Array {
    const out: number[] = [];
    let i = 0;
    while (i < input.length) {
      const header = (input[i]! << 24) >> 24; // interpret as signed int8
      i += 1;
      if (header >= 0) {
        // Literal run: the next `header + 1` bytes follow verbatim.
        for (let n = 0; n <= header; n++) out.push(input[i + n]!);
        i += header + 1;
      } else if (header !== -128) {
        // Repeat run: the next byte repeated `1 - header` times.
        const value = input[i]!;
        i += 1;
        for (let n = 0; n < 1 - header; n++) out.push(value);
      }
    }
    return new Uint8Array(out);
  }

  // Find the first raster row of a given (opcode, colour) in the encoded
  // job and return its decoded payload. The web driver enables PackBits
  // compression (WebBrotherQLPrinter.print sets `compress: true`), so the
  // row's LEN byte is the *compressed* length — read it, slice that many
  // bytes, then PackBits-decode back to the flat 90-byte (720-pin head)
  // raster row. The node printer.test.ts helper scans for an
  // uncompressed LEN=90 row because the node driver does not compress.
  function firstRasterRow(bytes: Uint8Array, opcode: number, colour: number): Uint8Array {
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === opcode && bytes[i + 1] === colour) {
        const len = bytes[i + 2]!;
        if (i + 3 + len > bytes.length) continue;
        const row = unpackBits(bytes.slice(i + 3, i + 3 + len));
        if (row.length === 90) return row;
      }
    }
    throw new Error(
      `no raster row with opcode 0x${opcode.toString(16)} colour 0x${colour.toString(16)}`,
    );
  }

  it('print() horizontally mirrors the rendered bitmap (single-colour)', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    const data = new Uint8Array(16 * 4).fill(0xff);
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    await printer.print({ width: 16, height: 1, data }, MEDIA[259]);
    const row = firstRasterRow(device.__transfers[0]!.data, 0x67, 0x00);
    expect(row[3]).toBe(0x10);
    expect(row[1]).toBe(0x00);
  });

  it('serialises getStatus() behind an in-flight print() via WriteSerializer (plan 15 A4)', async () => {
    const transport = new RecordingTransport();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- QL-820NWBc is in the registry
    const device = findDevice(0x04f9, 0x209d)!;
    const printer = new WebBrotherQLPrinter(device, transport);

    // Kick a print and fire a status poll before it resolves.
    const printDone = printer.print(solidRgba(696, 120), MEDIA[251]);
    const statusDone = printer.getStatus();
    await Promise.all([printDone, statusDone]);

    // getStatus() issues the only ESC iS write. With the shared
    // WriteSerializer it must land strictly after every print chunk
    // write — no status request spliced into the raster stream.
    const statusReqIdx = transport.writes.findIndex(w => w.isStatusReq);
    expect(statusReqIdx).toBeGreaterThan(0);
    expect(statusReqIdx).toBe(transport.writes.length - 1);
    // Every preceding write is a print chunk (not a status request).
    expect(transport.writes.slice(0, statusReqIdx).some(w => w.isStatusReq)).toBe(false);

    await printer.close();
  });

  it('print() splits the job into ≤1 KB OUT-pipe chunks (firmware flow-control)', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    await printer.print(solidRgba(696, 120), MEDIA[251]);
    expect(device.__transfers.length).toBeGreaterThan(1);
    for (const t of device.__transfers) {
      expect(t.data.length).toBeLessThanOrEqual(1024);
    }
  });

  it('print() horizontally mirrors both planes on two-colour media', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    const data = new Uint8Array(16 * 4).fill(0xff);
    data[0] = 255;
    data[1] = 0;
    data[2] = 0;
    data[3] = 255;
    await printer.print({ width: 16, height: 1, data }, MEDIA[251]);
    const redRow = firstRasterRow(device.__transfers[0]!.data, 0x77, 0x02);
    expect(redRow[3]).toBe(0x10);
    expect(redRow[1]).toBe(0x00);
  });

  it('print() reuses media detected from a prior getStatus()', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x209d, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    await printer.getStatus();
    const before = device.__transfers.length;
    await printer.print(solidRgba(64, 64));
    expect(device.__transfers.length).toBeGreaterThan(before);
  });

  it('print() forwards highRes:true into the encoded job on a high-res-capable engine', async () => {
    // PT-P750W (vid=0x04f9 pid=0x2062) has highResDpi=360 on its primary
    // engine; QL series do not, so the highRes path can only be exercised
    // here. TZe-211 (id 401) is the smallest stocked TZe tape.
    const device = createMockUSBDevice({ productId: 0x2062 });
    const printer = await fromUSBDevice(device);
    await printer.print(solidRgba(64, 64), MEDIA[401], { highRes: true });
    expect(device.__transfers.length).toBeGreaterThan(0);
  });

  it('print() throws MediaNotSpecifiedError when media is missing', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
    const printer = await fromUSBDevice(device);
    await expect(printer.print(solidRgba(64, 64))).rejects.toBeInstanceOf(MediaNotSpecifiedError);
  });

  it('getStatus returns BrotherQLStatus with detected media when present', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x209d, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    const status = await printer.getStatus();
    expect(status.rawBytes.length).toBe(32);
    expect(status.detectedMedia?.id).toBe(259);
  });

  it('onStatus delivers status frames via the contracts polling shim', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x209d, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    const received: number[] = [];
    const unsubscribe = printer.onStatus(s => {
      if (s.detectedMedia) received.push(s.detectedMedia.id as number);
    });
    // The shim kicks an immediate getStatus(); give the read loop a tick
    // to deliver the ESC iS response frame.
    await new Promise<void>(r => setTimeout(r, 30));
    unsubscribe();
    await printer.close();
    expect(received).toContain(259);
  });

  it('onStatus stops delivering after unsubscribe', async () => {
    const bytes = new Uint8Array(32);
    bytes[10] = 62;
    bytes[11] = 0x0a;
    const device = createMockUSBDevice({ productId: 0x209d, statusBytes: bytes });
    const printer = await fromUSBDevice(device);
    let count = 0;
    const unsubscribe = printer.onStatus(() => {
      count += 1;
    });
    await new Promise<void>(r => setTimeout(r, 30));
    const afterFirst = count;
    unsubscribe();
    await new Promise<void>(r => setTimeout(r, 30));
    // The 4 s poll interval never elapses inside the test window, so any
    // further call after unsubscribe would be a leaked timer.
    expect(afterFirst).toBeGreaterThanOrEqual(1);
    expect(count).toBe(afterFirst);
    await printer.close();
  });

  it('throws for unknown USB devices', async () => {
    const device = createMockUSBDevice({ vendorId: 0x1234, productId: 0x5678 });
    await expect(fromUSBDevice(device)).rejects.toThrow('Unsupported USB device');
  });
});

describe('requestPrinter', () => {
  it('passes the brother-ql VID/PIDs to navigator.usb.requestDevice', async () => {
    const device = createMockUSBDevice({ productId: 0x209d });
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
      expect(pids).toContain(parseInt(d.transports.usb!.pid, 16));
    }
  });
});
