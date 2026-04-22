import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEVICES } from '@thermal-label/brother-ql-core';
import { fromUSBDevice } from '../request.js';
import { createMockUSBDevice } from './webusb-mock.js';

const mockRequestDevice = vi.fn();
Object.defineProperty(globalThis, 'navigator', {
  value: { usb: { requestDevice: mockRequestDevice } },
  writable: true,
});

beforeEach(() => {
  mockRequestDevice.mockClear();
});

describe('requestPrinter', () => {
  it('passes all known printer-class PIDs to requestDevice', async () => {
    const { device } = createMockUSBDevice({ productId: 0x20a7 });
    mockRequestDevice.mockResolvedValueOnce(device);

    const { requestPrinter } = await import('../request.js');
    await requestPrinter();

    expect(mockRequestDevice).toHaveBeenCalledOnce();
    const [opts] = mockRequestDevice.mock.calls[0] as [{ filters: { vendorId: number; productId: number }[] }];
    const pids = opts.filters.map((f) => f.productId);

    for (const d of Object.values(DEVICES)) {
      expect(pids).toContain(d.pid);
    }
  });

  it('does not include mass-storage PIDs in filters', async () => {
    const { device } = createMockUSBDevice({ productId: 0x20a7 });
    mockRequestDevice.mockResolvedValueOnce(device);

    const { requestPrinter } = await import('../request.js');
    await requestPrinter();

    const [opts] = mockRequestDevice.mock.calls[0] as [{ filters: { productId: number }[] }];
    const pids = opts.filters.map((f) => f.productId);
    expect(pids).not.toContain(0x20aa);
    expect(pids).not.toContain(0x20ab);
  });
});

describe('fromUSBDevice', () => {
  it('returns WebBrotherQLPrinter for known device', () => {
    const { device } = createMockUSBDevice({ productId: 0x20a7 });
    const printer = fromUSBDevice(device);
    expect(printer.descriptor.name).toBe('QL-820NWB');
  });

  it('throws for unknown product ID', () => {
    const { device } = createMockUSBDevice({ productId: 0x9999 });
    expect(() => fromUSBDevice(device)).toThrow('Unsupported device');
  });
});
