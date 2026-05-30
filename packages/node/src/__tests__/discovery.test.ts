import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICES, getUsbIds } from '@thermal-label/brother-ql-core';
import type { DeviceEntry } from '@thermal-label/contracts';

const { usbOpen, tcpConnect, serialOpen, enumerate } = vi.hoisted(() => ({
  usbOpen: vi.fn(),
  tcpConnect: vi.fn(),
  serialOpen: vi.fn(),
  enumerate: vi.fn(),
}));
vi.mock('@thermal-label/transport/node', () => ({
  UsbTransport: { open: usbOpen },
  TcpTransport: { connect: tcpConnect },
  SerialTransport: { open: serialOpen },
  enumerateUsbDevices: enumerate,
}));

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

/**
 * Build an `EnumeratedUsbDevice` (the shape the transport helper returns)
 * for the device whose USB ids are `vid`/`pid`. Returns `undefined` when the
 * vid/pid is not in the registry — modelling the helper silently dropping
 * unknown devices, including a same-VID Editor-Lite mass-storage PID.
 */
function enumerated(
  vid: number,
  pid: number,
  serialNumber?: string,
): { descriptor: DeviceEntry; serialNumber?: string; connectionId: string } | undefined {
  const descriptor = Object.values(DEVICES).find(d => {
    const ids = getUsbIds(d);
    return ids?.vid === vid && ids.pid === pid;
  });
  if (!descriptor) return undefined;
  return {
    descriptor,
    ...(serialNumber === undefined ? {} : { serialNumber }),
    connectionId: '1:2',
  };
}

beforeEach(() => {
  usbOpen.mockReset();
  tcpConnect.mockReset();
  serialOpen.mockReset();
  enumerate.mockReset().mockResolvedValue([]);
});

describe('BrotherQLDiscovery', () => {
  it('exposes the brother-ql family', () => {
    expect(discovery.family).toBe('brother-ql');
  });

  describe('listPrinters', () => {
    it('returns known Brother QL devices from USB enumeration', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.device.name).toBe('QL-820NWBc');
      expect(printers[0]!.transport).toBe('usb');
      expect(printers[0]!.connectionId).toBe('1:2');
    });

    it('returns nothing when no compatible device is enumerated', async () => {
      // Unknown devices (non-Brother, unknown Brother PIDs, and same-VID
      // Editor-Lite mass-storage PIDs alike) never reach the helper's
      // output, so they simply do not appear.
      enumerate.mockResolvedValueOnce([]);
      expect(await discovery.listPrinters()).toHaveLength(0);
    });

    it('omits a same-VID mass-storage device — it is never enumerated', async () => {
      // The Editor-Lite mass-storage PID is outside the registry, so the
      // shared helper drops it like any unknown device: no entry, no warning.
      expect(enumerated(0x04f9, 0x20aa)).toBeUndefined();
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x20aa)].filter(Boolean));
      expect(await discovery.listPrinters()).toHaveLength(0);
    });

    it('surfaces the serial number reported by the helper', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d, 'SN123')]);
      const [printer] = await discovery.listPrinters();
      expect(printer?.serialNumber).toBe('SN123');
    });

    it('leaves serialNumber undefined when the helper reports none', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      const [printer] = await discovery.listPrinters();
      expect(printer?.serialNumber).toBeUndefined();
    });
  });

  describe('openPrinter', () => {
    it('opens a USB printer via UsbTransport', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter();
      expect(printer.device.transports.usb?.pid).toBe('0x209d');
      expect(usbOpen).toHaveBeenCalledWith(0x04f9, 0x209d);
    });

    it('filters by VID/PID when multiple devices are attached', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d), enumerated(0x04f9, 0x209b)]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ vid: 0x04f9, pid: 0x209b });
      expect(printer.device.transports.usb?.pid).toBe('0x209b');
      expect(usbOpen).toHaveBeenCalledWith(0x04f9, 0x209b);
    });

    it('filters by serialNumber when multiple devices share a PID', async () => {
      enumerate.mockResolvedValueOnce([
        enumerated(0x04f9, 0x209d, 'SN-A'),
        enumerated(0x04f9, 0x209d, 'SN-TARGET'),
      ]);
      usbOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ serialNumber: 'SN-TARGET' });
      expect(printer.device.transports.usb?.pid).toBe('0x209d');
    });

    it('throws DeviceNotFoundError when no matching device is attached', async () => {
      await expect(discovery.openPrinter()).rejects.toThrow('No compatible device found');
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
