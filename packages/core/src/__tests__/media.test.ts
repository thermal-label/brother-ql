import { describe, it, expect } from 'vitest';
import { MEDIA, findMedia, findMediaByWidth } from '../media.js';

describe('findMedia', () => {
  it('returns correct descriptor for 62mm continuous (ID 259)', () => {
    const m = findMedia(259);
    expect(m).toBeDefined();
    expect(m!.widthMm).toBe(62);
    expect(m!.type).toBe('continuous');
    expect(m!.heightMm).toBeUndefined();
  });

  it('returns correct descriptor for 62x29mm die-cut (ID 274)', () => {
    const m = findMedia(274);
    expect(m).toBeDefined();
    expect(m!.type).toBe('die-cut');
    expect(m!.heightMm).toBe(29);
  });

  it('returns undefined for unknown ID', () => {
    expect(findMedia(9999)).toBeUndefined();
  });
});

describe('findMediaByWidth', () => {
  it('returns all 62mm continuous options', () => {
    const results = findMediaByWidth(62, 'continuous');
    expect(results.length).toBeGreaterThan(0);
    for (const m of results) {
      expect(m.widthMm).toBe(62);
      expect(m.type).toBe('continuous');
    }
  });

  it('returns die-cut for 62mm die-cut', () => {
    const results = findMediaByWidth(62, 'die-cut');
    expect(results.length).toBeGreaterThan(0);
    for (const m of results) {
      expect(m.type).toBe('die-cut');
    }
  });

  it('returns empty array for unknown width', () => {
    expect(findMediaByWidth(999, 'continuous')).toHaveLength(0);
  });
});

describe('Media registry invariants', () => {
  it('die-cut media has a heightMm', () => {
    for (const m of Object.values(MEDIA)) {
      if (m.type === 'die-cut') {
        expect(m.heightMm).toBeDefined();
        expect(m.heightMm!).toBeGreaterThan(0);
      }
    }
  });

  it('continuous media omits heightMm', () => {
    for (const m of Object.values(MEDIA)) {
      if (m.type === 'continuous') {
        expect(m.heightMm).toBeUndefined();
      }
    }
  });

  it('only DK-22251 carries a multi-ink palette', () => {
    for (const m of Object.values(MEDIA)) {
      if (m.id === 251) {
        expect(m.palette).toBeDefined();
        const palette = m.palette!;
        expect(palette).toHaveLength(2);
        expect(palette[0]!.name).toBe('black');
        expect(palette[1]!.name).toBe('red');
      } else {
        expect(m.palette).toBeUndefined();
      }
    }
  });

  it('rectangular die-cut entries declare defaultOrientation: horizontal', () => {
    const rectangularDieCutIds = [269, 270, 370, 271, 272, 367, 374, 274, 275, 365, 366];
    for (const id of rectangularDieCutIds) {
      const m = MEDIA[id]!;
      expect(m, `entry ${id.toString()}`).toBeDefined();
      expect(m.defaultOrientation, `entry ${id.toString()}`).toBe('horizontal');
    }
  });

  it('round die-cut entries set cornerRadiusMm to widthMm / 2', () => {
    const roundDieCutIds = [362, 363, 273];
    for (const id of roundDieCutIds) {
      const m = MEDIA[id]!;
      expect(m, `entry ${id.toString()}`).toBeDefined();
      expect(m.cornerRadiusMm, `entry ${id.toString()}`).toBe(m.widthMm / 2);
    }
  });

  it('all IDs are unique', () => {
    const ids = Object.values(MEDIA).map(m => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
