import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBitmap } from '@mbtech-nl/bitmap';
import { MEDIA, DEVICES } from '@thermal-label/brother-ql-core';

const mockWrite = vi.fn().mockImplementation(() => Promise.resolve());
const mockRead = vi.fn().mockResolvedValue(new Uint8Array(32).fill(0));
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());

const mockTransport = {
  write: mockWrite,
  read: mockRead,
  close: mockClose,
};

vi.mock('../transport.js', () => ({
  UsbTransport: {
    open: vi.fn().mockImplementation(() => Promise.resolve(mockTransport)),
  },
  TcpTransport: {
    connect: vi.fn().mockImplementation(() => Promise.resolve(mockTransport)),
  },
}));

vi.mock('../discovery.js', () => ({
  listPrinters: vi.fn(() => [
    {
      device: DEVICES.QL_820NWB,
      serialNumber: undefined,
      path: '1.5',
      transport: 'usb',
    },
  ]),
  DEVICES,
}));

const { mockLoadImage, mockCreateCanvas } = vi.hoisted(() => ({
  mockLoadImage: vi.fn(),
  mockCreateCanvas: vi.fn(),
}));

vi.mock('@napi-rs/canvas', () => ({
  loadImage: mockLoadImage,
  createCanvas: mockCreateCanvas,
}));

beforeEach(() => {
  mockWrite.mockClear().mockImplementation(() => Promise.resolve());
  mockRead.mockClear().mockResolvedValue(new Uint8Array(32).fill(0));
  mockClose.mockClear().mockImplementation(() => Promise.resolve());

  const mockContext = {
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8Array(400) }),
  };
  mockCreateCanvas
    .mockReset()
    .mockReturnValue({ getContext: vi.fn().mockReturnValue(mockContext) });
  mockLoadImage.mockReset().mockResolvedValue({ width: 10, height: 10 });
});

describe('BrotherQLPrinter', () => {
  it('print() writes the encoded byte stream via transport', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    const bitmap = createBitmap(720, 10);
    const media = MEDIA[259]!;
    await printer.print([{ bitmap, media }]);
    expect(mockWrite).toHaveBeenCalledOnce();
    const written = mockWrite.mock.calls[0]![0] as Uint8Array;
    expect(written[0]).toBe(0);
    expect(written[399]).toBe(0);
    expect(written.at(-1)).toBe(0x1a);
  });

  it('getStatus() sends status request and parses 32-byte response', async () => {
    const statusBytes = new Uint8Array(32);
    statusBytes[0] = 0x80;
    statusBytes[10] = 62;
    statusBytes[11] = 0x0a;
    mockRead.mockResolvedValueOnce(statusBytes);

    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    const status = await printer.getStatus();

    expect(mockWrite).toHaveBeenCalledOnce();
    const req = mockWrite.mock.calls[0]![0] as Uint8Array;
    expect(req[0]).toBe(0x1b);
    expect(req[1]).toBe(0x69);
    expect(req[2]).toBe(0x53);
    expect(status.mediaWidthMm).toBe(62);
    expect(status.mediaType).toBe('continuous');
  });

  it('printTwoColor() throws UnsupportedOperationError on non-two-color device', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const { UnsupportedOperationError } = await import('../errors.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_700, 'usb');
    const bitmap = createBitmap(720, 10);
    const media = MEDIA[259]!;
    await expect(printer.printTwoColor(bitmap, bitmap, media)).rejects.toThrow(
      UnsupportedOperationError,
    );
  });

  it('printTwoColor() succeeds on two-color capable device', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    const bitmap = createBitmap(720, 10);
    const media = MEDIA[259]!;
    await printer.printTwoColor(bitmap, bitmap, media);
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printTwoColor() passes options through to print', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    const bitmap = createBitmap(720, 10);
    await printer.printTwoColor(bitmap, bitmap, MEDIA[259]!, { autoCut: true });
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printText() renders text and writes via transport', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    const media = MEDIA[259]!;
    await printer.printText('hello', media);
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printText() forwards invert option', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printText('hi', MEDIA[259]!, { invert: true });
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printText() passes PageOptions through to print', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printText('hi', MEDIA[259]!, { autoCut: true });
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printImage() decodes a Buffer and prints', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printImage(Buffer.alloc(100), MEDIA[259]!);
    expect(mockLoadImage).toHaveBeenCalledOnce();
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printImage() loads an image from a file path', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printImage('/tmp/test.png', MEDIA[259]!);
    expect(mockLoadImage).toHaveBeenCalledWith('/tmp/test.png');
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printImage() passes through options to renderImage', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printImage(Buffer.alloc(100), MEDIA[259]!, {
      threshold: 100,
      dither: true,
      invert: true,
      rotate: 90,
    });
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printImage() passes PageOptions through to print', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.printImage(Buffer.alloc(100), MEDIA[259]!, { autoCut: true });
    expect(mockWrite).toHaveBeenCalledOnce();
  });

  it('printImage() throws when canvas is unavailable for a buffer', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('module not found'));
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await expect(printer.printImage(Buffer.alloc(10), MEDIA[259]!)).rejects.toThrow(
      'Cannot decode image buffer',
    );
  });

  it('printImage() throws when canvas is unavailable for a file path', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('module not found'));
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await expect(printer.printImage('/tmp/test.png', MEDIA[259]!)).rejects.toThrow(
      'Cannot load image file',
    );
  });

  it('close() delegates to transport close', async () => {
    const { BrotherQLPrinter } = await import('../printer.js');
    const printer = new BrotherQLPrinter(mockTransport, DEVICES.QL_820NWB, 'usb');
    await printer.close();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});

describe('openPrinter', () => {
  it('opens the first discovered printer when no options given', async () => {
    const { openPrinter } = await import('../printer.js');
    const printer = await openPrinter();
    expect(printer.device.name).toBe('QL-820NWB');
    expect(printer.transport).toBe('usb');
  });

  it('opens printer by vid and pid when specified', async () => {
    const { openPrinter } = await import('../printer.js');
    const printer = await openPrinter({ pid: DEVICES.QL_820NWB.pid, vid: DEVICES.QL_820NWB.vid });
    expect(printer.device.name).toBe('QL-820NWB');
    expect(printer.transport).toBe('usb');
  });

  it('throws for an unknown pid', async () => {
    const { openPrinter } = await import('../printer.js');
    await expect(openPrinter({ pid: 0x9999 })).rejects.toThrow('Unknown device');
  });

  it('throws when no printers are found', async () => {
    const { listPrinters } = await import('../discovery.js');
    vi.mocked(listPrinters).mockReturnValueOnce([]);
    const { openPrinter } = await import('../printer.js');
    await expect(openPrinter()).rejects.toThrow('No Brother QL printers found');
  });
});

describe('openPrinterTcp', () => {
  it('connects via TCP and returns a printer', async () => {
    const { openPrinterTcp } = await import('../printer.js');
    const printer = await openPrinterTcp('192.168.1.100');
    expect(printer.transport).toBe('tcp');
    expect(mockWrite).toHaveBeenCalledOnce();
    expect(mockRead).toHaveBeenCalledOnce();
  });

  it('uses custom port when specified', async () => {
    const { TcpTransport } = await import('../transport.js');
    const { openPrinterTcp } = await import('../printer.js');
    await openPrinterTcp('192.168.1.100', 4444);
    const connectMock = vi.mocked(TcpTransport).connect;
    expect(connectMock).toHaveBeenCalledWith('192.168.1.100', 4444);
  });
});
