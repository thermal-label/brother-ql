import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usbOpen, tcpConnect, serialOpen } = vi.hoisted(() => ({
  usbOpen: vi.fn(),
  tcpConnect: vi.fn(),
  serialOpen: vi.fn(),
}));
vi.mock('@thermal-label/transport/node', () => ({
  UsbTransport: { open: usbOpen },
  TcpTransport: { connect: tcpConnect },
  SerialTransport: { open: serialOpen },
}));

vi.mock('usb', () => ({
  getDeviceList: vi.fn(() => []),
}));

import * as usb from 'usb';
import { discovery } from '../discovery.js';

function fakeTransport(): {
  connected: boolean;
  write: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
} {
  return {
    connected: true,
    write: vi.fn(),
    read: vi.fn(),
    close: vi.fn(),
  };
}

function makeUsbDevice(idVendor: number, idProduct: number, iSerialNumber = 0): unknown {
  return {
    deviceDescriptor: { idVendor, idProduct, iSerialNumber },
    busNumber: 1,
    deviceAddress: 2,
    open: vi.fn(),
    close: vi.fn(),
    getStringDescriptor: vi.fn(),
  };
}

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
  /* suppress */
});

beforeEach(() => {
  usbOpen.mockReset();
  tcpConnect.mockReset();
  serialOpen.mockReset();
  warnSpy.mockClear();
  vi.mocked(usb.getDeviceList).mockReset().mockReturnValue([]);
});

describe('BrotherQLDiscovery', () => {
  it('exposes the brother-ql family', () => {
    expect(discovery.family).toBe('brother-ql');
  });

  describe('listPrinters', () => {
    it('returns known Brother QL devices from USB enumeration', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x20a7) as never]);
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.device.name).toBe('QL-820NWB');
      expect(printers[0]!.transport).toBe('usb');
      expect(printers[0]!.connectionId).toBe('1.2');
    });

    it('excludes unknown (non-Brother) USB devices', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x1234, 0x5678) as never]);
      expect(await discovery.listPrinters()).toHaveLength(0);
    });

    it('excludes mass-storage PIDs and warns', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x20aa) as never]);
      expect(await discovery.listPrinters()).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledOnce();
    });
  });

  describe('openPrinter', () => {
    it('opens a USB printer via UsbTransport', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x20a7) as never]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter();
      expect(printer.device.pid).toBe(0x20a7);
      expect(usbOpen).toHaveBeenCalledWith(0x04f9, 0x20a7);
    });

    it('throws when no matching device is attached', async () => {
      await expect(discovery.openPrinter()).rejects.toThrow(
        'No compatible Brother QL printer found.',
      );
    });

    it('opens a TCP printer when host is provided', async () => {
      tcpConnect.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ host: '192.168.1.100' });
      expect(printer.transportType).toBe('tcp');
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.100', undefined);
    });

    it('passes port override to TcpTransport', async () => {
      tcpConnect.mockResolvedValue(fakeTransport());

      await discovery.openPrinter({ host: '10.0.0.5', port: 9101 });
      expect(tcpConnect).toHaveBeenCalledWith('10.0.0.5', 9101);
    });

    it('opens a serial printer when path is provided', async () => {
      serialOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ path: '/dev/rfcomm0' });
      expect(printer.transportType).toBe('serial');
      expect(serialOpen).toHaveBeenCalledWith('/dev/rfcomm0', undefined);
    });

    it('forwards baudRate to SerialTransport', async () => {
      serialOpen.mockResolvedValue(fakeTransport());

      await discovery.openPrinter({ path: 'COM3', baudRate: 115200 });
      expect(serialOpen).toHaveBeenCalledWith('COM3', 115200);
    });
  });
});
