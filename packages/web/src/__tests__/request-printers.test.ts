import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceIdentificationRequiredError } from '@thermal-label/contracts';
import { DEVICES } from '@thermal-label/brother-ql-core';
import { devicesForTransport, requestPrinters } from '../request-printers.js';
import { createMockUSBDevice } from './webusb-mock.js';

describe('requestPrinters(opts) — brother-ql generic factory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transport: bluetooth-spp', () => {
    it('throws DeviceIdentificationRequiredError when deviceKey omitted (no picker open)', async () => {
      // No navigator.serial stubbed — a picker call would TypeError.
      await expect(requestPrinters({ transport: 'bluetooth-spp' })).rejects.toBeInstanceOf(
        DeviceIdentificationRequiredError,
      );
    });

    it('candidates are filtered to bluetooth-spp-capable entries (QL_820NWBc, PT_P910BT)', async () => {
      try {
        await requestPrinters({ transport: 'bluetooth-spp' });
        throw new Error('expected DeviceIdentificationRequiredError');
      } catch (err) {
        if (!(err instanceof DeviceIdentificationRequiredError)) throw err;
        const keys = err.candidates.map(c => c.key);
        // Bench-confirmed SPP-capable models in the brother-ql registry.
        expect(keys).toContain(DEVICES.QL_820NWBc.key);
        expect(keys).toContain(DEVICES.PT_P910BT.key);
        for (const candidate of err.candidates) {
          expect(candidate.transports['bluetooth-spp']).toBeDefined();
        }
      }
    });

    it('rejects an unknown deviceKey on bluetooth-spp', async () => {
      await expect(
        requestPrinters({ transport: 'bluetooth-spp', deviceKey: 'NOT_A_KEY' }),
      ).rejects.toThrow(/unknown deviceKey/);
    });
  });

  describe('transport: serial', () => {
    it('throws because brother-ql does not declare serial', async () => {
      await expect(requestPrinters({ transport: 'serial' })).rejects.toThrow(/not declared/);
    });
  });

  describe('transport: bluetooth-gatt', () => {
    it('throws because brother-ql does not declare bluetooth-gatt', async () => {
      await expect(requestPrinters({ transport: 'bluetooth-gatt' })).rejects.toThrow(
        /not declared/,
      );
    });
  });

  describe('transport: usb — auto-identify', () => {
    it('returns a 1-key adapter map when the picked USBDevice matches a registry entry', async () => {
      // QL_820NWBc canonical VID/PID — registered.
      const known = DEVICES.QL_820NWBc.transports.usb;
      if (!known) throw new Error('QL_820NWBc missing usb transport in registry');
      const device = createMockUSBDevice({
        vendorId: Number.parseInt(known.vid, 16),
        productId: Number.parseInt(known.pid, 16),
      });
      const usbStub = {
        requestDevice: vi.fn().mockResolvedValue(device),
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      const printers = await requestPrinters({ transport: 'usb' });
      const roles = Object.keys(printers);
      expect(roles).toHaveLength(1);
      const printer = printers[roles[0]!]!;
      expect(printer.family).toBe('brother-ql');
      await printer.close();
    });

    it('throws DeviceIdentificationRequiredError when the picked device has unknown VID/PID', async () => {
      const device = createMockUSBDevice({ vendorId: 0xdead, productId: 0xbeef });
      const usbStub = {
        requestDevice: vi.fn().mockResolvedValue(device),
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      await expect(requestPrinters({ transport: 'usb' })).rejects.toBeInstanceOf(
        DeviceIdentificationRequiredError,
      );
    });

    it('continueWith resumes with the chosen deviceKey reusing the picked USBDevice', async () => {
      // Use a real Brother VID with an unknown PID — the registry
      // won't match, the picker fires once, and continueWith wraps
      // the same device with the operator's choice.
      const device = createMockUSBDevice({ vendorId: 0x04f9, productId: 0xabcd });
      const requestDevice = vi.fn().mockResolvedValue(device);
      const usbStub = {
        requestDevice,
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      try {
        await requestPrinters({ transport: 'usb' });
        throw new Error('expected DeviceIdentificationRequiredError');
      } catch (err) {
        if (!(err instanceof DeviceIdentificationRequiredError)) throw err;
        const printers = await err.continueWith(DEVICES.QL_820NWBc.key);
        const roles = Object.keys(printers);
        expect(roles).toHaveLength(1);
        // continueWith must not open the picker a second time.
        expect(requestDevice).toHaveBeenCalledTimes(1);
        await printers[roles[0]!]!.close();
      }
    });
  });
});

describe('devicesForTransport — brother-ql', () => {
  it('returns only entries declaring the given transport', () => {
    for (const entry of devicesForTransport('usb')) {
      expect(entry.transports.usb).toBeDefined();
    }
    for (const entry of devicesForTransport('bluetooth-spp')) {
      expect(entry.transports['bluetooth-spp']).toBeDefined();
    }
  });
});
