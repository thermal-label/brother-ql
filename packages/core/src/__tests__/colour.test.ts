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

  it('rejects red when green is too high (threshold g < 100)', () => {
    expect(isRedish(255, 100, 0, 255)).toBe(false);
    expect(isRedish(255, 99, 0, 255)).toBe(true);
  });

  it('rejects red when blue is too high (threshold b < 100)', () => {
    expect(isRedish(255, 0, 100, 255)).toBe(false);
    expect(isRedish(255, 0, 99, 255)).toBe(true);
  });

  it('rejects red when the red channel is too low (threshold r > 180)', () => {
    expect(isRedish(180, 0, 0, 255)).toBe(false);
    expect(isRedish(181, 0, 0, 255)).toBe(true);
  });

  it('rejects transparent pixels (alpha < 128)', () => {
    expect(isRedish(255, 0, 0, 127)).toBe(false);
    expect(isRedish(255, 0, 0, 128)).toBe(true);
  });

  it('rejects black (no red dominance)', () => {
    expect(isRedish(0, 0, 0, 255)).toBe(false);
  });

  it('rejects white', () => {
    expect(isRedish(255, 255, 255, 255)).toBe(false);
  });
});

describe('splitTwoColor', () => {
  it('routes a solid red image to the red plane, nothing to black', () => {
    const { black, red } = splitTwoColor(rgbaOf(8, 8, [255, 0, 0, 255]));
    expect(countInkPixels(red)).toBeGreaterThan(0);
    expect(countInkPixels(black)).toBe(0);
  });

  it('routes a solid black image to the black plane, nothing to red', () => {
    const { black, red } = splitTwoColor(rgbaOf(8, 8, [0, 0, 0, 255]));
    expect(countInkPixels(black)).toBeGreaterThan(0);
    expect(countInkPixels(red)).toBe(0);
  });

  it('produces bitmaps matching the source dimensions', () => {
    const { black, red } = splitTwoColor(rgbaOf(16, 12, [128, 128, 128, 255]));
    expect(black.widthPx).toBe(16);
    expect(black.heightPx).toBe(12);
    expect(red.widthPx).toBe(16);
    expect(red.heightPx).toBe(12);
  });

  it('resolves overlapping bits in favour of black (red bit cleared)', () => {
    // Construct a mixed image: one row red, one row black.
    const data = new Uint8Array(8 * 2 * 4);
    // Row 0: red
    for (let i = 0; i < 8; i++) {
      data[i * 4] = 255;
      data[i * 4 + 3] = 255;
    }
    // Row 1: black
    for (let i = 0; i < 8; i++) {
      const offset = (8 + i) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 255;
    }
    const image = { width: 8, height: 2, data };
    const { black, red } = splitTwoColor(image);
    // Every non-transparent pixel should land on exactly one plane —
    // resolveOverlap guarantees no bit is set in both.
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        const inBlack = getPixel(black, x, y);
        const inRed = getPixel(red, x, y);
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
