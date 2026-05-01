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

function makeUsbDevice(
  idVendor: number,
  idProduct: number,
  serialNumber?: string,
): {
  deviceDescriptor: { idVendor: number; idProduct: number; iSerialNumber: number };
  busNumber: number;
  deviceAddress: number;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getStringDescriptor: ReturnType<typeof vi.fn>;
} {
  return {
    deviceDescriptor: {
      idVendor,
      idProduct,
      iSerialNumber: serialNumber ? 3 : 0,
    },
    busNumber: 1,
    deviceAddress: 2,
    open: vi.fn(),
    close: vi.fn(),
    getStringDescriptor: vi.fn((_idx: number, cb: (err: null, value?: string) => void) => {
      cb(null, serialNumber);
    }),
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
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x209d) as never]);
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.device.name).toBe('QL-820NWBc');
      expect(printers[0]!.transport).toBe('usb');
      expect(printers[0]!.connectionId).toBe('1.2');
    });

    it('excludes unknown (non-Brother) USB devices', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x1234, 0x5678) as never]);
      expect(await discovery.listPrinters()).toHaveLength(0);
    });

    it('excludes Brother-VID devices with unknown PIDs', async () => {
      // Brother VID but not in the DEVICES registry and not a mass-storage PID
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x9999) as never]);
      expect(await discovery.listPrinters()).toHaveLength(0);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('excludes mass-storage PIDs and warns', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x20aa) as never]);
      expect(await discovery.listPrinters()).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('reads the serial number when iSerialNumber is set', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([
        makeUsbDevice(0x04f9, 0x209d, 'SN123') as never,
      ]);
      const [printer] = await discovery.listPrinters();
      expect(printer?.serialNumber).toBe('SN123');
    });

    it('swallows serial-read errors and leaves serialNumber undefined', async () => {
      const device = makeUsbDevice(0x04f9, 0x209d, 'ignored');
      device.getStringDescriptor.mockImplementation((_idx: number, cb: (err: Error) => void) => {
        cb(new Error('descriptor read failed'));
      });
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([device as never]);
      const [printer] = await discovery.listPrinters();
      expect(printer?.serialNumber).toBeUndefined();
    });
  });

  describe('openPrinter', () => {
    it('opens a USB printer via UsbTransport', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([makeUsbDevice(0x04f9, 0x209d) as never]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter();
      expect(printer.device.pid).toBe(0x209d);
      expect(usbOpen).toHaveBeenCalledWith(0x04f9, 0x209d);
    });

    it('filters by VID/PID when multiple devices are attached', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([
        makeUsbDevice(0x04f9, 0x209d) as never,
        makeUsbDevice(0x04f9, 0x209b) as never,
      ]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ vid: 0x04f9, pid: 0x209b });
      expect(printer.device.pid).toBe(0x209b);
      expect(usbOpen).toHaveBeenCalledWith(0x04f9, 0x209b);
    });

    it('filters by serialNumber when multiple devices share a PID', async () => {
      vi.mocked(usb.getDeviceList).mockReturnValueOnce([
        makeUsbDevice(0x04f9, 0x209d, 'SN-A') as never,
        makeUsbDevice(0x04f9, 0x209d, 'SN-TARGET') as never,
      ]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ serialNumber: 'SN-TARGET' });
      expect(printer.device.pid).toBe(0x209d);
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
