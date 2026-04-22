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

beforeEach(() => {
  mockWrite.mockClear().mockImplementation(() => Promise.resolve());
  mockRead.mockClear().mockResolvedValue(new Uint8Array(32).fill(0));
  mockClose.mockClear().mockImplementation(() => Promise.resolve());
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
});

describe('openPrinter', () => {
  it('opens the first discovered printer when no options given', async () => {
    const { openPrinter } = await import('../printer.js');
    const printer = await openPrinter();
    expect(printer.device.name).toBe('QL-820NWB');
    expect(printer.transport).toBe('usb');
  });
});
