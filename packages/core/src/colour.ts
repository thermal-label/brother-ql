import { renderImage, type LabelBitmap, type RawImageData } from '@mbtech-nl/bitmap';

export interface TwoColorResult {
  black: LabelBitmap;
  red: LabelBitmap;
}

export interface TwoColorOptions {
  threshold?: number;
  dither?: boolean;
}

/**
 * A pixel is "red-ish" when the red channel clearly dominates and
 * alpha is opaque enough to matter. The thresholds come from testing
 * against DK-22251 output — wider tolerances let non-red warm tones
 * bleed into the red plane.
 */
export function isRedish(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return false;
  return r > 180 && g < 100 && b < 100;
}

function extractRedPixels(image: RawImageData): RawImageData {
  const src = image.data;
  const dst = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const a = src[i + 3] ?? 0;
    if (isRedish(r, g, b, a)) {
      dst[i] = r;
      dst[i + 1] = g;
      dst[i + 2] = b;
      dst[i + 3] = a;
    }
  }
  return { data: dst, width: image.width, height: image.height };
}

function extractNonRedPixels(image: RawImageData): RawImageData {
  const src = image.data;
  const dst = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const a = src[i + 3] ?? 0;
    if (!isRedish(r, g, b, a)) {
      dst[i] = r;
      dst[i + 1] = g;
      dst[i + 2] = b;
      dst[i + 3] = a;
    }
  }
  return { data: dst, width: image.width, height: image.height };
}

/**
 * Where both planes have a set bit at the same position, black wins.
 * Done by masking the red bits with the inverse of the black bits.
 */
function resolveOverlap(black: LabelBitmap, red: LabelBitmap): void {
  const blackData = black.data;
  const redData = red.data;
  const len = Math.min(blackData.length, redData.length);
  for (let i = 0; i < len; i++) {
    redData[i] = (redData[i] ?? 0) & ~(blackData[i] ?? 0);
  }
}

/**
 * Split an RGBA image into black and red 1bpp planes for Brother QL
 * two-colour media (DK-22251).
 *
 * The rendering path matches `renderImage(image, { dither: true })`
 * used by `print()` for single-colour media, so overall print density
 * stays consistent regardless of media.
 */
export function splitTwoColor(image: RawImageData, options?: TwoColorOptions): TwoColorResult {
  const { threshold = 128, dither = true } = options ?? {};

  const blackImage = extractNonRedPixels(image);
  const redImage = extractRedPixels(image);

  const black = renderImage(blackImage, { threshold, dither });
  const red = renderImage(redImage, { threshold, dither });

  resolveOverlap(black, red);

  return { black, red };
}
