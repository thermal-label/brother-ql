import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebBrotherQLPrinter, openWebDevice } from '../printer.js';
import { DEVICES, findMedia } from '@thermal-label/brother-ql-core';
import { createMockUSBDevice } from './webusb-mock.js';

const media62mm = findMedia(259)!;

function makeImageData(width = 10, height = 10): ImageData {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) } as unknown as ImageData;
}

describe('WebBrotherQLPrinter', () => {
  let mock: ReturnType<typeof createMockUSBDevice>;

  beforeEach(() => {
    mock = createMockUSBDevice({ productId: 0x20a7 }); // QL-820NWB
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('openWebDevice opens and claims interface', async () => {
    const printer = await openWebDevice(mock.device);
    expect(mock.spies.open).toHaveBeenCalledOnce();
    expect(mock.spies.selectConfiguration).toHaveBeenCalledWith(1);
    expect(mock.spies.claimInterface).toHaveBeenCalledWith(0);
    expect(printer.descriptor.name).toBe('QL-820NWB');
  });

  it('openWebDevice throws for unknown device', async () => {
    const { device } = createMockUSBDevice({ vendorId: 0x04f9, productId: 0x9999 });
    await expect(openWebDevice(device)).rejects.toThrow('Unsupported device');
  });

  it('print writes encoded bytes via transferOut', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    const bitmap = { widthPx: 720, heightPx: 10, data: new Uint8Array(90 * 10) };
    await printer.print([{ bitmap, media: media62mm }]);
    expect(mock.spies.transferOut).toHaveBeenCalled();
    const bytes = mock.spies.transferOut.mock.calls[0]?.[1] as Uint8Array;
    // Job starts with ESC i a 01 (raster mode) then 200-byte invalidate
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x69);
    expect(bytes[2]).toBe(0x61);
    // Ends with 0x1A (print last page)
    expect(bytes.at(-1)).toBe(0x1a);
  });

  it('getStatus sends status request and parses response', async () => {
    const statusBytes = new Uint8Array(32);
    statusBytes[0] = 0x80;
    statusBytes[10] = 62; // 62mm media
    statusBytes[11] = 0x0a; // continuous
    mock.spies.transferIn.mockResolvedValueOnce({
      status: 'ok',
      data: new DataView(statusBytes.buffer),
    });
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    const status = await printer.getStatus();
    const outBytes = mock.spies.transferOut.mock.calls[0]?.[1] as Uint8Array;
    expect(outBytes).toEqual(new Uint8Array([0x1b, 0x69, 0x53]));
    expect(status.mediaWidthMm).toBe(62);
    expect(status.mediaType).toBe('continuous');
  });

  it('getStatus throws when no data is returned', async () => {
    mock.spies.transferIn.mockResolvedValueOnce({ status: 'ok', data: null });
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await expect(printer.getStatus()).rejects.toThrow('No status data received');
  });

  it('disconnect releases interface and closes device', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.disconnect();
    expect(mock.spies.releaseInterface).toHaveBeenCalledWith(0);
    expect(mock.spies.close).toHaveBeenCalledOnce();
  });

  it('isConnected reflects device opened state', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    expect(printer.isConnected()).toBe(false);
    await mock.device.open();
    expect(printer.isConnected()).toBe(true);
  });

  it('printText() renders text and sends to device', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printText('hello', media62mm);
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printText() passes PageOptions through to print', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printText('hi', media62mm, { autoCut: true });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printText() forwards invert and scale options', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printText('test', media62mm, { invert: true, scaleX: 2, scaleY: 2 });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImage() renders ImageData and sends to device', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printImage(makeImageData(), media62mm);
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImage() passes renderImage options', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printImage(makeImageData(), media62mm, {
      threshold: 100,
      dither: true,
      invert: true,
    });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImage() applies explicit rotation when provided', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printImage(makeImageData(), media62mm, { rotate: 180 });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImage() passes PageOptions through to print', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printImage(makeImageData(), media62mm, { autoCut: true });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImageURL() fetches URL and prints via canvas', async () => {
    const blobMock = new Blob();
    const bmpMock = { width: 10, height: 10 };
    const ctxMock = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(makeImageData()),
    };
    const canvasMock = { getContext: vi.fn().mockReturnValue(ctxMock) };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: vi.fn().mockResolvedValue(blobMock) }),
    );
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bmpMock));
    vi.stubGlobal('OffscreenCanvas', vi.fn().mockReturnValue(canvasMock));

    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await printer.printImageURL('https://example.com/label.png', media62mm);
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printImageURL() throws when canvas context cannot be obtained', async () => {
    const blobMock = new Blob();
    const bmpMock = { width: 10, height: 10 };
    const canvasMock = { getContext: vi.fn().mockReturnValue(null) };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: vi.fn().mockResolvedValue(blobMock) }),
    );
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bmpMock));
    vi.stubGlobal('OffscreenCanvas', vi.fn().mockReturnValue(canvasMock));

    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    await expect(printer.printImageURL('https://example.com/label.png', media62mm)).rejects.toThrow(
      'Could not get canvas context',
    );
  });

  it('printTwoColor throws on non-two-color device', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_700);
    const imgData = makeImageData();
    await expect(printer.printTwoColor(imgData, imgData, media62mm)).rejects.toThrow(
      'does not support two-color',
    );
  });

  it('printTwoColor() renders and prints both channels', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    const imgData = makeImageData();
    await printer.printTwoColor(imgData, imgData, media62mm);
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });

  it('printTwoColor() passes options through to print', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_820NWB);
    const imgData = makeImageData();
    await printer.printTwoColor(imgData, imgData, media62mm, { autoCut: true });
    expect(mock.spies.transferOut).toHaveBeenCalled();
  });
});
