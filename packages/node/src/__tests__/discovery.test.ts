import { describe, it, expect, vi, beforeEach } from 'vitest';

const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
  /* suppress */
});

vi.mock('usb', () => ({
  default: {
    getDeviceList: vi.fn(() => []),
  },
}));

beforeEach(() => {
  consoleSpy.mockClear();
});

describe('listPrinters', () => {
  it('returns known Brother QL devices from USB enumeration', async () => {
    const usb = await import('usb');
    vi.mocked(usb.default.getDeviceList).mockReturnValueOnce([
      {
        deviceDescriptor: { idVendor: 0x04f9, idProduct: 0x20a7 },
        busNumber: 1,
        deviceAddress: 3,
      } as never,
    ]);
    const { listPrinters } = await import('../discovery.js');
    const printers = listPrinters();
    expect(printers).toHaveLength(1);
    expect(printers[0]!.device.name).toBe('QL-820NWB');
    expect(printers[0]!.transport).toBe('usb');
  });

  it('excludes unknown (non-Brother) USB devices', async () => {
    const usb = await import('usb');
    vi.mocked(usb.default.getDeviceList).mockReturnValueOnce([
      {
        deviceDescriptor: { idVendor: 0x1234, idProduct: 0x5678 },
        busNumber: 1,
        deviceAddress: 1,
      } as never,
    ]);
    const { listPrinters } = await import('../discovery.js');
    const printers = listPrinters();
    expect(printers).toHaveLength(0);
  });

  it('excludes mass storage mode PIDs and logs a warning', async () => {
    const usb = await import('usb');
    vi.mocked(usb.default.getDeviceList).mockReturnValueOnce([
      {
        deviceDescriptor: { idVendor: 0x04f9, idProduct: 0x20aa },
        busNumber: 1,
        deviceAddress: 2,
      } as never,
    ]);
    const { listPrinters } = await import('../discovery.js');
    const printers = listPrinters();
    expect(printers).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]![0]).toContain('Editor Lite');
  });

  it('returns empty array when no printers connected', async () => {
    const { listPrinters } = await import('../discovery.js');
    const printers = listPrinters();
    expect(printers).toHaveLength(0);
  });

  it('excludes Brother devices with unrecognized non-mass-storage PID', async () => {
    const usb = await import('usb');
    vi.mocked(usb.default.getDeviceList).mockReturnValueOnce([
      {
        deviceDescriptor: { idVendor: 0x04f9, idProduct: 0x9999 },
        busNumber: 1,
        deviceAddress: 4,
      } as never,
    ]);
    const { listPrinters } = await import('../discovery.js');
    const printers = listPrinters();
    expect(printers).toHaveLength(0);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
