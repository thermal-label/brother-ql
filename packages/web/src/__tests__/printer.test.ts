import { describe, it, expect, beforeEach } from 'vitest';
import { WebBrotherQLPrinter, openWebDevice } from '../printer.js';
import { DEVICES, findMedia } from '@thermal-label/brother-ql-core';
import { createMockUSBDevice } from './webusb-mock.js';

const media62mm = findMedia(259)!;

describe('WebBrotherQLPrinter', () => {
  let mock: ReturnType<typeof createMockUSBDevice>;

  beforeEach(() => {
    mock = createMockUSBDevice({ productId: 0x20a7 }); // QL-820NWB
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
    // Job starts with 400 zero bytes (invalidate)
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0, 0, 0, 0]));
    // Ends with 0x1A (print last page)
    expect(bytes.at(-1)).toBe(0x1a);
  });

  it('printTwoColor throws on non-two-color device', async () => {
    const printer = new WebBrotherQLPrinter(mock.device, DEVICES.QL_700);
    const imgData = { width: 10, height: 10, data: new Uint8ClampedArray(10 * 10 * 4) } as ImageData;
    await expect(printer.printTwoColor(imgData, imgData, media62mm)).rejects.toThrow(
      'does not support two-color',
    );
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
});
