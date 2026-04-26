import { describe, expect, it } from 'vitest';
import { getPixel } from '@mbtech-nl/bitmap';
import { isRedish, splitTwoColor } from '../colour.js';

function rgbaOf(
  width: number,
  height: number,
  [r, g, b, a]: [number, number, number, number],
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

function countInkPixels(bitmap: { widthPx: number; heightPx: number; data: Uint8Array }): number {
  let n = 0;
  for (let y = 0; y < bitmap.heightPx; y++) {
    for (let x = 0; x < bitmap.widthPx; x++) {
      if (getPixel(bitmap, x, y)) n++;
    }
  }
  return n;
}

describe('isRedish', () => {
  it('treats a strong red as red', () => {
    expect(isRedish(255, 0, 0, 255)).toBe(true);
  });

  it('captures anti-aliased red edges (50 % red on white)', () => {
    // Canvas anti-aliasing produces pinks like rgb(255,128,128) at the
    // edge of red glyphs — they must land on the red plane or solid red
    // text prints with white halos.
    expect(isRedish(255, 128, 128, 255)).toBe(true);
    expect(isRedish(255, 200, 200, 255)).toBe(true);
  });

  it('rejects very-faint pinks where red barely dominates (margin = 32)', () => {
    // 90 % white + 10 % red — the margin is below the dominance cut-off.
    expect(isRedish(255, 230, 230, 255)).toBe(false);
  });

  it('rejects warm greys that are not visually red', () => {
    expect(isRedish(200, 180, 180, 255)).toBe(false);
  });

  it('rejects yellows (red dominates blue but not green)', () => {
    expect(isRedish(255, 255, 0, 255)).toBe(false);
  });

  it('rejects very dark warm pixels (brightness floor = 96)', () => {
    // r dominates but is too dark — looks black, route to the black plane.
    expect(isRedish(80, 0, 0, 255)).toBe(false);
    expect(isRedish(96, 0, 0, 255)).toBe(true);
  });

  it('rejects transparent pixels (alpha < 128)', () => {
    expect(isRedish(255, 0, 0, 127)).toBe(false);
    expect(isRedish(255, 0, 0, 128)).toBe(true);
  });

  it('rejects black, white, and grey', () => {
    expect(isRedish(0, 0, 0, 255)).toBe(false);
    expect(isRedish(255, 255, 255, 255)).toBe(false);
    expect(isRedish(128, 128, 128, 255)).toBe(false);
  });
});

describe('splitTwoColor', () => {
  it('produces a fully solid red plane for solid red input (no dither speckle)', () => {
    const { black, red } = splitTwoColor(rgbaOf(8, 8, [255, 0, 0, 255]));
    // Every red-ish pixel sets a bit in the red plane — full coverage.
    expect(countInkPixels(red)).toBe(64);
    expect(countInkPixels(black)).toBe(0);
  });

  it('produces a fully solid black plane for solid black input', () => {
    const { black, red } = splitTwoColor(rgbaOf(8, 8, [0, 0, 0, 255]));
    expect(countInkPixels(black)).toBe(64);
    expect(countInkPixels(red)).toBe(0);
  });

  it('produces a fully solid black plane for a mid-grey input (dither default off)', () => {
    // RGB(60,60,60) has luminance ≈ 60; well below the 128 threshold so
    // every pixel sets a bit. Without dithering off, FS would speckle this
    // down to ~24 % coverage to preserve the average tone.
    const { black } = splitTwoColor(rgbaOf(8, 8, [60, 60, 60, 255]));
    expect(countInkPixels(black)).toBe(64);
  });

  it('dithers the black plane when explicitly enabled', () => {
    // Same mid-grey input — with dither on, FS spreads the tone and we
    // expect noticeably less than full coverage (and more than zero).
    const { black } = splitTwoColor(rgbaOf(16, 16, [60, 60, 60, 255]), { dither: true });
    expect(countInkPixels(black)).toBeLessThan(16 * 16);
    expect(countInkPixels(black)).toBeGreaterThan(0);
  });

  it('produces bitmaps matching the source dimensions', () => {
    const { black, red } = splitTwoColor(rgbaOf(16, 12, [128, 128, 128, 255]));
    expect(black.widthPx).toBe(16);
    expect(black.heightPx).toBe(12);
    expect(red.widthPx).toBe(16);
    expect(red.heightPx).toBe(12);
  });

  it('keeps every dot mono-coloured: no pixel ever lands in both planes', () => {
    // Mixed image: row 0 red, row 1 black, row 2 white, row 3 dark-red
    // (fails isRedish because r is too low, so it should land on black).
    const data = new Uint8Array(8 * 4 * 4);
    for (let x = 0; x < 8; x++) {
      // row 0 — red
      data[x * 4] = 255;
      data[x * 4 + 3] = 255;
      // row 1 — black
      data[(8 + x) * 4 + 3] = 255;
      // row 2 — white
      data[(16 + x) * 4] = 255;
      data[(16 + x) * 4 + 1] = 255;
      data[(16 + x) * 4 + 2] = 255;
      data[(16 + x) * 4 + 3] = 255;
      // row 3 — dark red (175,0,0); fails isRedish (r > 180 false)
      data[(24 + x) * 4] = 175;
      data[(24 + x) * 4 + 3] = 255;
    }
    const { black, red } = splitTwoColor({ width: 8, height: 4, data });
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 8; x++) {
        const inBlack = getPixel(black, x, y);
        const inRed = getPixel(red, x, y);
        // Mutual exclusion is the structural invariant the driver relies
        // on — never let it regress.
        expect(inBlack && inRed).toBe(false);
      }
    }
  });

  it('accepts custom threshold + dither options', () => {
    const { black, red } = splitTwoColor(rgbaOf(4, 4, [0, 0, 0, 255]), {
      threshold: 64,
      dither: false,
    });
    expect(black.widthPx).toBe(4);
    expect(red.widthPx).toBe(4);
  });
});
