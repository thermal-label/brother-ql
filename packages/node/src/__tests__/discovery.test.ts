import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICES, MEDIA, getUsbIds } from '@thermal-label/brother-ql-core';
import type * as TransportNode from '@thermal-label/transport/node';
import {
  DeviceIdentificationRequiredError,
  DeviceNotFoundError,
  TransportTimeoutError,
  type DeviceEntry,
} from '@thermal-label/contracts';
import type { BrotherQLPrinter } from '../printer.js';

const { usbOpen, tcpConnect, serialOpen, enumerate, enumerateNetwork, identify, snmpGet } =
  vi.hoisted(() => ({
    usbOpen: vi.fn(),
    tcpConnect: vi.fn(),
    serialOpen: vi.fn(),
    enumerate: vi.fn(),
    enumerateNetwork: vi.fn(),
    identify: vi.fn(),
    snmpGet: vi.fn(),
  }));
vi.mock('@thermal-label/transport/node', async importOriginal => {
  const actual = await importOriginal<typeof TransportNode>();
  return {
    PRINTER_MIB: actual.PRINTER_MIB,
    UsbTransport: { open: usbOpen },
    TcpTransport: { connect: tcpConnect },
    SerialTransport: { open: serialOpen },
    enumerateUsbDevices: enumerate,
    enumerateNetworkDevices: enumerateNetwork,
    identifyNetworkDevice: identify,
    snmpGet,
  };
});

import { PRINTER_MIB } from '@thermal-label/transport/node';
import { BrotherQLDiscovery, discovery } from '../discovery.js';

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

/** The bench QL-820NWBc as `enumerateNetworkDevices` / `identifyNetworkDevice` report it. */
function networked(
  host = '192.168.1.67',
  serialNumber: string | null = 'M5G679125',
): TransportNode.EnumeratedNetworkDevice {
  return {
    descriptor: DEVICES.QL_820NWBc,
    host,
    port: 9100,
    ...(serialNumber === null ? {} : { serialNumber }),
    modelName: 'Brother QL-820NWB',
    connectionId: `${host}:9100`,
  };
}

beforeEach(() => {
  usbOpen.mockReset();
  tcpConnect.mockReset();
  serialOpen.mockReset();
  enumerate.mockReset().mockResolvedValue([]);
  enumerateNetwork.mockReset().mockResolvedValue([]);
  identify.mockReset();
  snmpGet.mockReset().mockResolvedValue({});
});

describe('BrotherQLDiscovery', () => {
  it('exposes the brother-ql family', () => {
    expect(discovery.family).toBe('brother-ql');
  });

  it('exposes the media catalog', () => {
    const media = discovery.listMedia();
    expect(media.length).toBe(Object.keys(MEDIA).length);
    expect(media).toContain(MEDIA[259]);
  });

  describe('listPrinters', () => {
    it('returns known Brother QL devices from USB enumeration', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.device.name).toBe('QL-820NWBc');
      expect(printers[0]!.transport).toBe('usb');
      expect(printers[0]!.connectionId).toBe('1:2');
      expect(printers[0]!.host).toBeUndefined();
    });

    it('returns nothing when neither half finds a device', async () => {
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

    it('lists network printers after USB ones, with host/port and serial', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d, 'SN-USB')]);
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      const printers = await discovery.listPrinters();
      expect(printers.map(p => p.transport)).toEqual(['usb', 'tcp']);
      expect(printers[1]).toMatchObject({
        device: DEVICES.QL_820NWBc,
        serialNumber: 'M5G679125',
        host: '192.168.1.67',
        port: 9100,
        connectionId: '192.168.1.67:9100',
      });
      expect(enumerateNetwork).toHaveBeenCalledWith(Object.values(DEVICES), {});
    });

    it('omits serialNumber on a network printer whose agent has none', async () => {
      enumerateNetwork.mockResolvedValueOnce([networked('10.0.0.9', null)]);
      const [printer] = await discovery.listPrinters();
      expect(printer).not.toHaveProperty('serialNumber');
    });

    it('still lists network printers when the usb addon is missing', async () => {
      enumerate.mockRejectedValueOnce(new Error("Cannot find package 'usb'"));
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.transport).toBe('tcp');
    });

    it('still lists USB printers when the network scan fails', async () => {
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      enumerateNetwork.mockRejectedValueOnce(new Error('EACCES'));
      const printers = await discovery.listPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0]!.transport).toBe('usb');
    });

    it('rejects with the USB error when both halves fail', async () => {
      enumerate.mockRejectedValueOnce(new Error("Cannot find package 'usb'"));
      enumerateNetwork.mockRejectedValueOnce(new Error('EACCES'));
      await expect(discovery.listPrinters()).rejects.toThrow("Cannot find package 'usb'");
    });

    it('skips the network scan with { network: false }', async () => {
      const usbOnly = new BrotherQLDiscovery({ network: false });
      enumerate.mockResolvedValueOnce([enumerated(0x04f9, 0x209d)]);
      expect(await usbOnly.listPrinters()).toHaveLength(1);
      expect(enumerateNetwork).not.toHaveBeenCalled();
    });

    it('forwards the constructor community to the scan', async () => {
      await new BrotherQLDiscovery({ community: 'office' }).listPrinters();
      expect(enumerateNetwork).toHaveBeenCalledWith(Object.values(DEVICES), {
        community: 'office',
      });
    });
  });

  describe('openPrinter (USB)', () => {
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
      expect(enumerateNetwork).not.toHaveBeenCalled();
    });

    it('throws DeviceNotFoundError when no matching device is attached', async () => {
      await expect(discovery.openPrinter()).rejects.toBeInstanceOf(DeviceNotFoundError);
      expect(enumerateNetwork).not.toHaveBeenCalled();
    });

    it('falls back to the network scan for a serial number USB does not have', async () => {
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      tcpConnect.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ serialNumber: 'M5G679125' });
      expect(printer.transportType).toBe('tcp');
      expect(printer.device).toBe(DEVICES.QL_820NWBc);
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.67', 9100);
      // The scan already identified the model: no second SNMP round trip.
      expect(identify).not.toHaveBeenCalled();
    });

    it('throws DeviceNotFoundError when the serial is on neither transport', async () => {
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      await expect(discovery.openPrinter({ serialNumber: 'nope' })).rejects.toBeInstanceOf(
        DeviceNotFoundError,
      );
    });

    it('does not scan the network for a serial with { network: false }', async () => {
      const usbOnly = new BrotherQLDiscovery({ network: false });
      await expect(usbOnly.openPrinter({ serialNumber: 'M5G679125' })).rejects.toBeInstanceOf(
        DeviceNotFoundError,
      );
      expect(enumerateNetwork).not.toHaveBeenCalled();
    });

    it('surfaces the usb addon error when USB is the only option', async () => {
      enumerate.mockRejectedValueOnce(new Error("Cannot find package 'usb'"));
      await expect(discovery.openPrinter()).rejects.toThrow("Cannot find package 'usb'");
    });

    it('reaches a network printer by serial even when the usb addon is missing', async () => {
      enumerate.mockRejectedValueOnce(new Error("Cannot find package 'usb'"));
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      tcpConnect.mockResolvedValue(fakeTransport());
      const printer = await discovery.openPrinter({ serialNumber: 'M5G679125' });
      expect(printer.transportType).toBe('tcp');
    });
  });

  describe('openPrinter (TCP)', () => {
    it('identifies the model over SNMP, then connects', async () => {
      identify.mockResolvedValueOnce(networked());
      tcpConnect.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ host: '192.168.1.67' });
      expect(printer.transportType).toBe('tcp');
      expect(printer.device).toBe(DEVICES.QL_820NWBc);
      expect(identify).toHaveBeenCalledWith('192.168.1.67', Object.values(DEVICES), {});
      expect(identify.mock.invocationCallOrder[0]).toBeLessThan(
        tcpConnect.mock.invocationCallOrder[0]!,
      );
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.67', undefined);
    });

    it('passes port and community through', async () => {
      identify.mockResolvedValueOnce(networked('10.0.0.5'));
      tcpConnect.mockResolvedValue(fakeTransport());

      await discovery.openPrinter({ host: '10.0.0.5', port: 9101, snmpCommunity: 'office' });
      expect(identify).toHaveBeenCalledWith('10.0.0.5', Object.values(DEVICES), {
        community: 'office',
      });
      expect(tcpConnect).toHaveBeenCalledWith('10.0.0.5', 9101);
    });

    it('uses the discovery community for identify and the status side channel', async () => {
      identify.mockResolvedValueOnce(networked());
      tcpConnect.mockResolvedValue(fakeTransport());

      const office = new BrotherQLDiscovery({ community: 'office' });
      const printer = await office.openPrinter({ host: '192.168.1.67' });
      expect(identify).toHaveBeenCalledWith('192.168.1.67', Object.values(DEVICES), {
        community: 'office',
      });
      await expect(printer.getStatus()).resolves.toBeDefined();
      expect(snmpGet).toHaveBeenCalledWith('192.168.1.67', expect.any(Array), {
        community: 'office',
      });
    });

    it('per-call snmpCommunity wins over the discovery community', async () => {
      identify.mockResolvedValueOnce(networked());
      tcpConnect.mockResolvedValue(fakeTransport());

      const office = new BrotherQLDiscovery({ community: 'office' });
      const printer = await office.openPrinter({ host: '192.168.1.67', snmpCommunity: 'lab' });
      expect(identify).toHaveBeenCalledWith('192.168.1.67', Object.values(DEVICES), {
        community: 'lab',
      });
      await expect(printer.getStatus()).resolves.toBeDefined();
      expect(snmpGet).toHaveBeenCalledWith('192.168.1.67', expect.any(Array), {
        community: 'lab',
      });
    });

    it('carries the discovery community into a serial-number network re-open', async () => {
      enumerateNetwork.mockResolvedValueOnce([networked()]);
      tcpConnect.mockResolvedValue(fakeTransport());

      const office = new BrotherQLDiscovery({ community: 'office' });
      const printer = await office.openPrinter({ serialNumber: 'M5G679125' });
      expect(enumerateNetwork).toHaveBeenCalledWith(Object.values(DEVICES), {
        community: 'office',
      });
      await expect(printer.getStatus()).resolves.toBeDefined();
      expect(snmpGet).toHaveBeenCalledWith('192.168.1.67', expect.any(Array), {
        community: 'office',
      });
    });

    it('deviceKey wins: no SNMP, that descriptor', async () => {
      tcpConnect.mockResolvedValue(fakeTransport());

      const printer = await discovery.openPrinter({ host: '192.168.1.67', deviceKey: 'PT_E550W' });
      expect(printer.device).toBe(DEVICES.PT_E550W);
      expect(identify).not.toHaveBeenCalled();
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.67', undefined);
    });

    it('rejects an unknown deviceKey before connecting', async () => {
      await expect(
        discovery.openPrinter({ host: '192.168.1.67', deviceKey: 'QL_9999' }),
      ).rejects.toThrow(/Unknown deviceKey "QL_9999".*TCP-capable Brother QL keys: .*QL_820NWBc/);
      expect(tcpConnect).not.toHaveBeenCalled();
    });

    it('rejects a deviceKey without a TCP transport before connecting', async () => {
      await expect(
        discovery.openPrinter({ host: '192.168.1.67', deviceKey: 'QL_700' }),
      ).rejects.toThrow(/QL_700 has no tcp transport/);
      expect(tcpConnect).not.toHaveBeenCalled();
    });

    it('throws DeviceIdentificationRequiredError naming the model when SNMP answers with a stranger', async () => {
      snmpGet.mockResolvedValueOnce({
        [PRINTER_MIB.hrDeviceDescr]: {
          type: 'string',
          value: 'DYMO LabelWriter 550',
          raw: new Uint8Array(),
        },
      });

      const err = await discovery.openPrinter({ host: '192.168.1.80' }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DeviceIdentificationRequiredError);
      const typed = err as DeviceIdentificationRequiredError;
      expect(typed.message).toMatch(
        /192\.168\.1\.80 reports "DYMO LabelWriter 550", which is not in the brother-ql registry/,
      );
      expect(typed.message).toMatch(/Pass deviceKey, one of: .*PT_E550W.*QL_820NWBc/);
      // The CLI decides whether to suggest --media by sniffing the
      // message; a stranger on SNMP still has readable status.
      expect(typed.message).not.toMatch(/no SNMP answer|status is unavailable/i);
      expect(typed.candidates.every(c => c.transports.tcp !== undefined)).toBe(true);
      expect(typed.candidates.map(c => c.key)).toContain('QL_820NWBc');
      expect(tcpConnect).not.toHaveBeenCalled();
    });

    it('names "a model" when the follow-up model read fails too', async () => {
      snmpGet.mockRejectedValueOnce(new Error('gone'));
      await expect(discovery.openPrinter({ host: '192.168.1.80' })).rejects.toThrow(
        /192\.168\.1\.80 reports a model, which is not/,
      );
    });

    it('throws DeviceIdentificationRequiredError saying SNMP did not answer', async () => {
      identify.mockRejectedValueOnce(new TransportTimeoutError('tcp', 2000));

      const err = await discovery.openPrinter({ host: '192.168.1.80' }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DeviceIdentificationRequiredError);
      expect((err as Error).message).toMatch(
        /No SNMP answer from 192\.168\.1\.80 \(Read timed out after 2000ms\).*status is unavailable, so pass media too/,
      );
      // Pinned: thermal-label-cli matches /no SNMP answer|status is unavailable/i
      // on this message to add `--media <id>` to its hint.
      expect((err as Error).message).toMatch(/no SNMP answer/i);
      expect((err as Error).message).toMatch(/status is unavailable/);
      expect(snmpGet).not.toHaveBeenCalled();
      expect(tcpConnect).not.toHaveBeenCalled();
    });

    it('continueWith(deviceKey) opens with that key and returns an adapter map', async () => {
      identify.mockRejectedValueOnce(new Error('no answer'));
      tcpConnect.mockResolvedValue(fakeTransport());

      const err = (await discovery
        .openPrinter({ host: '192.168.1.80', port: 9101 })
        .catch((e: unknown) => e)) as DeviceIdentificationRequiredError;
      const printers = await err.continueWith('QL_820NWBc');
      expect(Object.keys(printers)).toEqual(['primary']);
      expect((printers.primary as BrotherQLPrinter).device.key).toBe('QL_820NWBc');
      expect(identify).toHaveBeenCalledTimes(1);
      expect(tcpConnect).toHaveBeenCalledWith('192.168.1.80', 9101);
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
