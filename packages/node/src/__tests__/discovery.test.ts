import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICES, getUsbIds } from '@thermal-label/brother-ql-core';
import {
  DeviceIdentificationRequiredError,
  DeviceNotFoundError,
  type DeviceEntry,
} from '@thermal-label/contracts';
import type { BrotherQLPrinter } from '../printer.js';

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
      await expect(discovery.openPrinter()).rejects.toBeInstanceOf(DeviceNotFoundError);
    });
  });

  describe('openPrinter (TCP)', () => {
    it('opens with the descriptor named by deviceKey', async () => {
      tcpConnect.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({
        host: '192.168.1.100',
        deviceKey: 'QL_820NWBc',
      });
      expect(printer.transportType).toBe('tcp');
      expect(printer.device).toBe(DEVICES.QL_820NWBc);
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.100', undefined);
    });

    it('passes port override to TcpTransport', async () => {
      tcpConnect.mockResolvedValue(fakeTransport());

      await discovery.openPrinter({ host: '10.0.0.5', port: 9101, deviceKey: 'PT_E550W' });
      expect(tcpConnect).toHaveBeenCalledWith('10.0.0.5', 9101);
    });

    it('throws DeviceIdentificationRequiredError without deviceKey, before connecting', async () => {
      const err = await discovery.openPrinter({ host: '192.168.1.100' }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DeviceIdentificationRequiredError);
      const typed = err as DeviceIdentificationRequiredError;
      expect(typed.message).toMatch(/Port 9100 on 192\.168\.1\.100 carries no model signal/);
      expect(typed.message).toMatch(/Pass deviceKey, one of: .*PT_E550W.*QL_820NWBc/);
      expect(typed.candidates.every(c => c.transports.tcp !== undefined)).toBe(true);
      expect(tcpConnect).not.toHaveBeenCalled();

      tcpConnect.mockResolvedValue(fakeTransport());
      const printers = await typed.continueWith('QL_820NWBc');
      expect(Object.keys(printers)).toEqual(['primary']);
      expect((printers.primary as BrotherQLPrinter).device.key).toBe('QL_820NWBc');
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.100', undefined);
    });

    it('rejects an unknown deviceKey before connecting', async () => {
      await expect(
        discovery.openPrinter({ host: '192.168.1.100', deviceKey: 'QL_9999' }),
      ).rejects.toThrow(/Unknown deviceKey "QL_9999".*TCP-capable Brother QL keys: .*QL_820NWBc/);
      expect(tcpConnect).not.toHaveBeenCalled();
    });

    it('rejects a deviceKey without a TCP transport before connecting', async () => {
      await expect(
        discovery.openPrinter({ host: '192.168.1.100', deviceKey: 'QL_700' }),
      ).rejects.toThrow(/QL_700 has no tcp transport/);
      expect(tcpConnect).not.toHaveBeenCalled();
    });
  });

  describe('openPrinter (serial)', () => {
    it('opens a serial printer with serialPath + deviceKey', async () => {
      serialOpen.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({
        serialPath: '/dev/rfcomm0',
        deviceKey: 'QL_820NWBc',
      });
      expect(printer.transportType).toBe('serial');
      expect(printer.device).toBe(DEVICES.QL_820NWBc);
      expect(serialOpen).toHaveBeenCalledWith('/dev/rfcomm0', undefined);
    });

    it('still accepts the deprecated path alias and forwards baudRate', async () => {
      serialOpen.mockResolvedValue(fakeTransport());

      await discovery.openPrinter({ path: 'COM3', baudRate: 115200, deviceKey: 'PT_P910BT' });
      expect(serialOpen).toHaveBeenCalledWith('COM3', 115200);
    });

    it('throws DeviceIdentificationRequiredError without deviceKey, before opening the port', async () => {
      const err = await discovery
        .openPrinter({ serialPath: '/dev/rfcomm0' })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DeviceIdentificationRequiredError);
      const typed = err as DeviceIdentificationRequiredError;
      expect(typed.message).toMatch(/Serial port \/dev\/rfcomm0 carries no model signal/);
      expect(typed.candidates.map(c => c.key).sort()).toEqual(['PT_P910BT', 'QL_820NWBc']);
      expect(serialOpen).not.toHaveBeenCalled();

      serialOpen.mockResolvedValue(fakeTransport());
      const printers = await typed.continueWith('QL_820NWBc');
      expect((printers.primary as BrotherQLPrinter).transportType).toBe('serial');
    });

    it('rejects a deviceKey without a serial transport', async () => {
      await expect(
        discovery.openPrinter({ serialPath: '/dev/rfcomm0', deviceKey: 'QL_700' }),
      ).rejects.toThrow(
        /QL_700 has no serial transport.*Serial-capable keys: PT_P910BT, QL_820NWBc/,
      );
      expect(serialOpen).not.toHaveBeenCalled();
    });
  });
});
