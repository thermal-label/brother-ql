import { describe, it, expect } from 'vitest';
import {
  MEDIA,
  defaultMediaForEngine,
  findMedia,
  findMediaByDimensions,
  findMediaByWidth,
  resolveTapeGeometry,
} from '../media.js';

const NARROW_PT_ENGINE = {
  protocol: 'pt-raster' as const,
  headDots: 128,
  mediaCompatibility: ['tze', 'hse-2to1', 'hse-3to1'],
};
const WIDE_PT_ENGINE = {
  protocol: 'pt-raster' as const,
  headDots: 560,
  mediaCompatibility: ['tze', 'hse-2to1', 'hse-3to1'],
};
const TZE_ONLY_PT_ENGINE = {
  protocol: 'pt-raster' as const,
  headDots: 560,
  mediaCompatibility: ['tze'],
};
const QL_ENGINE = {
  protocol: 'ql-raster' as const,
  headDots: 720,
  mediaCompatibility: ['dk'],
};

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

  it('every entry declares a tape system', () => {
    for (const m of Object.values(MEDIA)) {
      expect(m.tapeSystem, `entry ${m.id.toString()}`).toBeDefined();
    }
  });

  it('TZe ids occupy the 401-419 range, HSe 421-459', () => {
    for (const m of Object.values(MEDIA)) {
      if (m.tapeSystem === 'tze') {
        expect(m.id, m.name).toBeGreaterThanOrEqual(401);
        expect(m.id, m.name).toBeLessThanOrEqual(419);
      } else if (m.tapeSystem === 'hse-2to1') {
        expect(m.id, m.name).toBeGreaterThanOrEqual(421);
        expect(m.id, m.name).toBeLessThanOrEqual(439);
      } else if (m.tapeSystem === 'hse-3to1') {
        expect(m.id, m.name).toBeGreaterThanOrEqual(441);
        expect(m.id, m.name).toBeLessThanOrEqual(459);
      } else {
        expect(m.tapeSystem, m.name).toBe('dk');
      }
    }
  });

  it('TZe / HSe pin sums equal the head-family pin count', () => {
    for (const m of Object.values(MEDIA)) {
      if (m.tapeSystem === 'dk') continue;
      if (m.geometry?.narrow) {
        const { leftMarginPins, printAreaDots, rightMarginPins } = m.geometry.narrow;
        expect(
          leftMarginPins + printAreaDots + rightMarginPins,
          `${m.name} narrow head sum`,
        ).toBe(128);
      }
      if (m.geometry?.wide) {
        const { leftMarginPins, printAreaDots, rightMarginPins } = m.geometry.wide;
        expect(
          leftMarginPins + printAreaDots + rightMarginPins,
          `${m.name} wide head sum`,
        ).toBe(560);
      }
    }
  });

  it('36 mm TZe and 31 mm HSe-3:1 are wide-head only', () => {
    expect(MEDIA[407]!.geometry?.narrow).toBeUndefined();
    expect(MEDIA[407]!.geometry?.wide).toBeDefined();
    expect(MEDIA[445]!.geometry?.narrow).toBeUndefined();
    expect(MEDIA[445]!.geometry?.wide).toBeDefined();
  });
});

describe('findMediaByDimensions — engine gating', () => {
  it('legacy call (no engine) keeps DK-only behaviour for 12 mm continuous', () => {
    const m = findMediaByDimensions(12, 0);
    expect(m).toBeDefined();
    expect(m!.tapeSystem).toBe('dk');
    expect(m!.id).toBe(257);
  });

  it('QL engine for 12 mm returns the DK entry, never a TZe entry', () => {
    const m = findMediaByDimensions(12, 0, false, QL_ENGINE);
    expect(m!.tapeSystem).toBe('dk');
    expect(m!.id).toBe(257);
  });

  it('narrow PT engine for 12 mm returns the 128-dot TZe entry', () => {
    const m = findMediaByDimensions(12, 0, false, NARROW_PT_ENGINE);
    expect(m!.tapeSystem).toBe('tze');
    expect(m!.id).toBe(404);
    expect(m!.geometry?.narrow).toBeDefined();
  });

  it('wide PT engine for 12 mm returns the same TZe row (geometry resolves later)', () => {
    const m = findMediaByDimensions(12, 0, false, WIDE_PT_ENGINE);
    expect(m!.tapeSystem).toBe('tze');
    expect(m!.id).toBe(404);
    expect(m!.geometry?.wide).toBeDefined();
  });

  it('narrow PT engine cannot reach 36 mm TZe', () => {
    const m = findMediaByDimensions(36, 0, false, NARROW_PT_ENGINE);
    expect(m).toBeUndefined();
  });

  it('wide PT engine resolves 36 mm TZe', () => {
    const m = findMediaByDimensions(36, 0, false, WIDE_PT_ENGINE);
    expect(m!.id).toBe(407);
  });

  it('narrow PT engine cannot reach 31 mm HSe-3:1', () => {
    const m = findMediaByDimensions(31, 0, false, NARROW_PT_ENGINE);
    expect(m).toBeUndefined();
  });

  it('wide PT engine resolves 31 mm HSe-3:1', () => {
    const m = findMediaByDimensions(31, 0, false, WIDE_PT_ENGINE);
    expect(m!.id).toBe(445);
  });

  it('TZe-only PT engine never returns HSe entries', () => {
    expect(findMediaByDimensions(11.7, 0, false, TZE_ONLY_PT_ENGINE)).toBeUndefined();
    expect(findMediaByDimensions(5.2, 0, false, TZE_ONLY_PT_ENGINE)).toBeUndefined();
    expect(findMediaByDimensions(31, 0, false, TZE_ONLY_PT_ENGINE)).toBeUndefined();
  });

  it('TZe-only PT engine still resolves TZe widths', () => {
    const m = findMediaByDimensions(24, 0, false, TZE_ONLY_PT_ENGINE);
    expect(m!.tapeSystem).toBe('tze');
  });
});

describe('resolveTapeGeometry', () => {
  it('returns flat fields for DK entries regardless of engine head dots', () => {
    const dk = MEDIA[259]!;
    const geom = resolveTapeGeometry(dk, { headDots: 720 });
    expect(geom.printAreaDots).toBe(696);
  });

  it('routes TZe through narrow / wide based on engine.headDots', () => {
    const tze12 = MEDIA[404]!;
    const narrow = resolveTapeGeometry(tze12, { headDots: 128 });
    expect(narrow.printAreaDots).toBe(70);
    const wide = resolveTapeGeometry(tze12, { headDots: 560 });
    expect(wide.printAreaDots).toBe(150);
  });

  it('throws when the requested head family has no geometry', () => {
    expect(() => resolveTapeGeometry(MEDIA[407]!, { headDots: 128 })).toThrow(/narrow/);
    expect(() => resolveTapeGeometry(MEDIA[445]!, { headDots: 128 })).toThrow(/narrow/);
  });
});

describe('defaultMediaForEngine', () => {
  it('returns DK-22205 for QL engines', () => {
    expect(defaultMediaForEngine({ protocol: 'ql-raster' }).id).toBe(259);
  });

  it('returns 12 mm TZe for PT engines', () => {
    expect(defaultMediaForEngine({ protocol: 'pt-raster' }).id).toBe(404);
  });
});
