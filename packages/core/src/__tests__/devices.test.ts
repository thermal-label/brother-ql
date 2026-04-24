import { describe, it, expect } from 'vitest';
import { DEVICES, findDevice, isMassStorageMode } from '../devices.js';

describe('findDevice', () => {
  it('returns correct descriptor for QL-820NWB', () => {
    const dev = findDevice(0x04f9, 0x20a7);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-820NWB');
    expect(dev!.twoColor).toBe(true);
  });

  it('returns correct descriptor for QL-820NWBc', () => {
    const dev = findDevice(0x04f9, 0x209d);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-820NWBc');
    expect(dev!.twoColor).toBe(true);
  });

  it('returns correct descriptor for QL-500', () => {
    const dev = findDevice(0x04f9, 0x2013);
    expect(dev).toBeDefined();
    expect(dev!.name).toBe('QL-500');
    expect(dev!.autocut).toBe(false);
  });

  it('returns undefined for unknown PID', () => {
    expect(findDevice(0x04f9, 0x9999)).toBeUndefined();
  });

  it('returns undefined for unknown VID', () => {
    expect(findDevice(0x1234, 0x20a7)).toBeUndefined();
  });
});

describe('isMassStorageMode', () => {
  it('returns true for 0x20AA (QL-1100 mass storage)', () => {
    expect(isMassStorageMode(0x20aa)).toBe(true);
  });

  it('returns true for 0x20AB (QL-1110NWB mass storage)', () => {
    expect(isMassStorageMode(0x20ab)).toBe(true);
  });

  it('returns false for all printer-class PIDs', () => {
    for (const dev of Object.values(DEVICES)) {
      expect(isMassStorageMode(dev.pid)).toBe(false);
    }
  });
});

describe('Device registry invariants', () => {
  it('every two-color device has bytesPerRow 90', () => {
    for (const dev of Object.values(DEVICES)) {
      if (dev.twoColor) {
        expect(dev.bytesPerRow).toBe(90);
      }
    }
  });

  it('every device with headPins 1296 has bytesPerRow 162', () => {
    for (const dev of Object.values(DEVICES)) {
      if (dev.headPins === 1296) {
        expect(dev.bytesPerRow).toBe(162);
      }
    }
  });

  it('every device belongs to the brother-ql family', () => {
    for (const dev of Object.values(DEVICES)) {
      expect(dev.family).toBe('brother-ql');
    }
  });

  it('BLE UUIDs are placeholders until GATT sniffing (DECISIONS.md D9)', () => {
    for (const dev of Object.values(DEVICES)) {
      const bt = (dev as { bluetooth?: { serviceUuid: string } }).bluetooth;
      if (bt !== undefined) {
        expect(bt.serviceUuid).toBe('TBD');
      }
    }
  });
});
