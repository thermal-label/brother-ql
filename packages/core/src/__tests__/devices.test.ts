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

describe('PT-* device entries', () => {
  const PT_KEYS = ['PT_E550W', 'PT_P750W', 'PT_P900', 'PT_P900W', 'PT_P950NW', 'PT_P910BT'];

  it('every PT entry resolves by (vid, pid)', () => {
    const expected: Record<string, number> = {
      PT_E550W: 0x2060,
      PT_P750W: 0x2062,
      PT_P900: 0x2083,
      PT_P900W: 0x2085,
      PT_P950NW: 0x2086,
      PT_P910BT: 0x20c7,
    };
    for (const key of PT_KEYS) {
      const pid = expected[key]!;
      const dev = findDevice(0x04f9, pid);
      expect(dev, key).toBeDefined();
      expect(dev!.key).toBe(key);
    }
  });

  it('every PT engine uses the pt-raster protocol', () => {
    for (const key of PT_KEYS) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      expect(dev.engines[0]?.protocol, key).toBe('pt-raster');
    }
  });

  it('every PT engine has headDots in {128, 560}', () => {
    for (const key of PT_KEYS) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      expect([128, 560]).toContain(dev.engines[0]?.headDots);
    }
  });

  it('PT high-res dpi is exactly 2× the native dpi', () => {
    for (const key of PT_KEYS) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      const engine = dev.engines[0]!;
      const dpi = engine.dpi as number;
      const highResDpi = engine.capabilities?.highResDpi as number | undefined;
      expect(highResDpi, `${key} highResDpi`).toBeDefined();
      expect(highResDpi).toBe(dpi * 2);
    }
  });

  it('128-dot family is 180 dpi, 560-dot family is 360 dpi', () => {
    for (const key of PT_KEYS) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      const engine = dev.engines[0]!;
      if (engine.headDots === 128) expect(engine.dpi).toBe(180);
      else if (engine.headDots === 560) expect(engine.dpi).toBe(360);
    }
  });

  it('every PT entry ships untested', () => {
    for (const key of PT_KEYS) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      expect(dev.support?.status).toBe('untested');
    }
  });

  it('PT-P910BT is TZe-only (no HSe in mediaCompatibility)', () => {
    const dev = DEVICES.PT_P910BT!;
    expect(dev.engines[0]?.mediaCompatibility).toEqual(['tze']);
  });

  it('all other PT models declare TZe + HSe 2:1 + HSe 3:1', () => {
    for (const key of ['PT_E550W', 'PT_P750W', 'PT_P900', 'PT_P900W', 'PT_P950NW']) {
      const dev = DEVICES[key as keyof typeof DEVICES]!;
      expect(dev.engines[0]?.mediaCompatibility, key).toEqual([
        'tze',
        'hse-2to1',
        'hse-3to1',
      ]);
    }
  });

  it('PT-P750W carries both printer PID 0x2062 and mass-storage PID 0x2065', () => {
    const dev = DEVICES.PT_P750W!;
    expect(dev.transports.usb?.pid).toBe('0x2062');
    expect(dev.capabilities?.massStoragePid).toBe('0x2065');
    expect(isMassStorageMode(0x2065)).toBe(true);
  });

  it('PT-P910BT declares bluetooth-spp transport', () => {
    const dev = DEVICES.PT_P910BT!;
    expect(dev.transports['bluetooth-spp']).toBeDefined();
    expect(dev.transports['bluetooth-spp']?.namePrefix).toBe('PT-P910');
  });

  it('PT-P900 is USB-only (no tcp / bluetooth)', () => {
    const dev = DEVICES.PT_P900!;
    expect(Object.keys(dev.transports).sort()).toEqual(['usb']);
  });
});
