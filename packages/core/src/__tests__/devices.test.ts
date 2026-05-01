import { describe, it, expect } from 'vitest';
import { DEVICES, findDevice, getUsbIds, isMassStorageMode } from '../devices.js';

describe('findDevice', () => {
  it('returns correct entry for QL-820NWBc (PID shared with QL-820NWB)', () => {
    const dev = findDevice(0x04f9, 0x209d);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-820NWBc');
    expect(dev!.engines[0]?.capabilities?.twoColor).toBe(true);
  });

  it('returns correct entry for QL-1100', () => {
    const dev = findDevice(0x04f9, 0x20a7);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-1100');
    expect(dev!.engines[0]?.headDots).toBe(1296);
  });

  it('returns correct entry for QL-500', () => {
    const dev = findDevice(0x04f9, 0x2013);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-500');
    // QL-500 has no autocut — the capability flag is absent.
    expect(dev!.engines[0]?.capabilities?.autocut).toBeUndefined();
  });

  it('returns undefined for unknown PID', () => {
    expect(findDevice(0x04f9, 0x9999)).toBeUndefined();
  });

  it('returns undefined for unknown VID', () => {
    expect(findDevice(0x1234, 0x209d)).toBeUndefined();
  });
});

describe('isMassStorageMode', () => {
  it('returns true for 0x20a9 (QL-1100 mass storage)', () => {
    expect(isMassStorageMode(0x20a9)).toBe(true);
  });

  it('returns true for 0x20aa (QL-1110NWB mass storage)', () => {
    expect(isMassStorageMode(0x20aa)).toBe(true);
  });

  it('returns true for 0x20ac (QL-1115NWB mass storage)', () => {
    expect(isMassStorageMode(0x20ac)).toBe(true);
  });

  it('returns false for all printer-class PIDs', () => {
    for (const dev of Object.values(DEVICES)) {
      const ids = getUsbIds(dev);
      if (ids) expect(isMassStorageMode(ids.pid)).toBe(false);
    }
  });
});

describe('Device registry invariants', () => {
  it('every two-color device has a 720-dot engine', () => {
    for (const dev of Object.values(DEVICES)) {
      if (dev.engines[0]?.capabilities?.twoColor) {
        expect(dev.engines[0]?.headDots).toBe(720);
      }
    }
  });

  it('every device with headDots 1296 belongs to the QL-1xxx series', () => {
    for (const dev of Object.values(DEVICES)) {
      if (dev.engines[0]?.headDots === 1296) {
        expect(dev.name).toMatch(/^QL-1\d{3}/);
      }
    }
  });

  it('every device belongs to the brother-ql family', () => {
    for (const dev of Object.values(DEVICES)) {
      expect(dev.family).toBe('brother-ql');
    }
  });

  it('every device declares a USB transport with hex-string vid+pid', () => {
    for (const dev of Object.values(DEVICES)) {
      expect(dev.transports.usb).toBeDefined();
      expect(dev.transports.usb!.vid).toMatch(/^0x[0-9a-f]+$/);
      expect(dev.transports.usb!.pid).toMatch(/^0x[0-9a-f]+$/);
    }
  });
});
