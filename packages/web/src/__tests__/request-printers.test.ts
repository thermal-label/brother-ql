import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceIdentificationRequiredError } from '@thermal-label/contracts';
import { DEVICES } from '@thermal-label/brother-ql-core';
import { devicesForTransport, requestPrinters } from '../request-printers.js';
import { createMockUSBDevice } from './webusb-mock.js';

/**
 * Minimal Web Serial `SerialPort` double for the Web Serial picker
 * path. Typed structurally (not as the DOM `SerialPort`) because the
 * web package only pulls in `w3c-web-usb`, not `w3c-web-serial`.
 *
 * `WebSerialTransport.fromPort` opens the port and locks a
 * reader/writer; its pump loop awaits `reader.read()` indefinitely.
 * This double's reader hangs until `cancel()` fires (mirroring a real
 * idle SPP link) so `close()` can unwind the pump cleanly.
 */
function createMockSerialPort(): unknown {
  let cancelReader: (() => void) | undefined;
  const reader = {
    read: () =>
      new Promise<{ value: Uint8Array; done: boolean }>(resolve => {
        cancelReader = () => {
          resolve({ value: new Uint8Array(0), done: true });
        };
      }),
    cancel: () => {
      cancelReader?.();
      return Promise.resolve();
    },
    releaseLock: () => {
      /* no-op */
    },
  };
  const writer = {
    write: () => Promise.resolve(),
    close: () => Promise.resolve(),
    releaseLock: () => {
      /* no-op */
    },
  };
  return {
    open: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
  };
}

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

    it('rejects a deviceKey for a model that does not declare bluetooth-spp', async () => {
      // PT_P750W is a registered USB-only model — no bluetooth-spp entry.
      expect(DEVICES.PT_P750W.transports['bluetooth-spp']).toBeUndefined();
      await expect(
        requestPrinters({ transport: 'bluetooth-spp', deviceKey: DEVICES.PT_P750W.key }),
      ).rejects.toThrow(/does not declare bluetooth-spp/);
    });

    it('opens the Web Serial picker and returns a 1-key adapter map for a known SPP model', async () => {
      const port = createMockSerialPort();
      const requestPort = vi.fn().mockResolvedValue(port);
      vi.stubGlobal('navigator', { serial: { requestPort } });

      const printers = await requestPrinters({
        transport: 'bluetooth-spp',
        deviceKey: DEVICES.QL_820NWBc.key,
      });

      const roles = Object.keys(printers);
      expect(roles).toHaveLength(1);
      expect(roles[0]).toBe(DEVICES.QL_820NWBc.engines[0]!.role);
      expect(printers[roles[0]!]!.family).toBe('brother-ql');
      expect(requestPort).toHaveBeenCalledOnce();
      await printers[roles[0]!]!.close();
    });

    it('continueWith opens the Web Serial picker with the operator-chosen SPP model', async () => {
      const port = createMockSerialPort();
      const requestPort = vi.fn().mockResolvedValue(port);
      vi.stubGlobal('navigator', { serial: { requestPort } });

      try {
        await requestPrinters({ transport: 'bluetooth-spp' });
        throw new Error('expected DeviceIdentificationRequiredError');
      } catch (err) {
        if (!(err instanceof DeviceIdentificationRequiredError)) throw err;
        // No picker is opened until the operator resolves the choice.
        expect(requestPort).not.toHaveBeenCalled();
        const printers = await err.continueWith(DEVICES.PT_P910BT.key);
        const roles = Object.keys(printers);
        expect(roles).toHaveLength(1);
        expect(requestPort).toHaveBeenCalledOnce();
        await printers[roles[0]!]!.close();
      }
    });

    it('continueWith rejects an unknown deviceKey', async () => {
      try {
        await requestPrinters({ transport: 'bluetooth-spp' });
        throw new Error('expected DeviceIdentificationRequiredError');
      } catch (err) {
        if (!(err instanceof DeviceIdentificationRequiredError)) throw err;
        await expect(err.continueWith('NOT_A_KEY')).rejects.toThrow(/unknown deviceKey/);
      }
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

    it('uses an explicit deviceKey to wrap the picked USBDevice without registry auto-match', async () => {
      // Pass a deviceKey alongside a device whose VID/PID would NOT
      // auto-match — the explicit key takes the priority branch.
      const device = createMockUSBDevice({ vendorId: 0x04f9, productId: 0xabcd });
      const usbStub = {
        requestDevice: vi.fn().mockResolvedValue(device),
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      const printers = await requestPrinters({
        transport: 'usb',
        deviceKey: DEVICES.QL_820NWBc.key,
      });
      const roles = Object.keys(printers);
      expect(roles).toHaveLength(1);
      expect(roles[0]).toBe(DEVICES.QL_820NWBc.engines[0]!.role);
      await printers[roles[0]!]!.close();
    });

    it('rejects an explicit unknown deviceKey on usb', async () => {
      const device = createMockUSBDevice({ vendorId: 0x04f9, productId: 0x209d });
      const usbStub = {
        requestDevice: vi.fn().mockResolvedValue(device),
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      await expect(requestPrinters({ transport: 'usb', deviceKey: 'NOT_A_KEY' })).rejects.toThrow(
        /unknown deviceKey/,
      );
    });

    it('continueWith rejects an unknown deviceKey on the usb path', async () => {
      const device = createMockUSBDevice({ vendorId: 0x04f9, productId: 0xabcd });
      const usbStub = {
        requestDevice: vi.fn().mockResolvedValue(device),
        getDevices: vi.fn().mockResolvedValue([device]),
      };
      vi.stubGlobal('navigator', { usb: usbStub });

      try {
        await requestPrinters({ transport: 'usb' });
        throw new Error('expected DeviceIdentificationRequiredError');
      } catch (err) {
        if (!(err instanceof DeviceIdentificationRequiredError)) throw err;
        await expect(err.continueWith('NOT_A_KEY')).rejects.toThrow(/unknown deviceKey/);
      }
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
