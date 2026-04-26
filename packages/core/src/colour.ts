/* eslint-disable @typescript-eslint/no-non-null-assertion --
 *   Uint8Array indexed reads are typed `number | undefined` under
 *   `noUncheckedIndexedAccess`, but every index in this file is bounded
 *   by `src.length` (a multiple of 4). The `!` assertions collapse the
 *   unreachable `undefined` branches so branch coverage doesn't count
 *   them. See also `non-nullable-type-assertion-style` which rules out
 *   the alternative `as number` form.
 */
import { createBitmap, renderImage, type LabelBitmap, type RawImageData } from '@mbtech-nl/bitmap';

export interface TwoColorResult {
  black: LabelBitmap;
  red: LabelBitmap;
}

export interface TwoColorOptions {
  /** Luminance threshold (0-255) used by the black plane. Default 128. */
  threshold?: number;
  /**
   * Floyd–Steinberg dither the black plane. Default `false`.
   *
   * Labels are mostly line art and dithering speckles uniform mid-tones —
   * a solid red region (luminance ≈ 54) for example dithers down to ~21 %
   * coverage, which prints as a sparse pattern instead of a solid block.
   * Opt in when printing photos / continuous-tone images.
   *
   * The red plane is always a clean binary mask of `isRedish` pixels and
   * ignores this option.
   */
  dither?: boolean;
}

/**
 * A pixel is "red-ish" when the red channel clearly dominates green and
 * blue, the pixel is opaque, and red is bright enough that the human eye
 * would still call it red rather than black.
 *
 * The dominance margin (32) is small enough to capture anti-aliased
 * edges of red text/glyphs on white (e.g. `rgb(255, 128, 128)`) — strict
 * `g < 100 && b < 100` thresholds dropped those into the white halo and
 * left the red plane jagged. The margin is large enough to exclude warm
 * greys (`rgb(200, 180, 180)` etc.) that are not visually red.
 *
 * The brightness floor (96) keeps very-dark warm pixels — which look
 * black to a viewer — on the black plane.
 */
export function isRedish(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return false;
  const dominanceMargin = 32;
  return r > g + dominanceMargin && r > b + dominanceMargin && r >= 96;
}

/**
 * Split an RGBA image into black and red 1bpp planes for Brother QL
 * two-colour media (DK-22251).
 *
 * The red plane is built as a binary mask of `isRedish` pixels — never
 * dithered, so a solid red region prints as a solid red block. Red-ish
 * pixels are simultaneously substituted with white in the black-plane
 * input, which guarantees mutual exclusion by construction: every dot
 * lands in at most one plane.
 */
export function splitTwoColor(image: RawImageData, options?: TwoColorOptions): TwoColorResult {
  const { threshold = 128, dither = false } = options ?? {};

  const w = image.width;
  const h = image.height;
  const src = image.data;

  const red = createBitmap(w, h);
  const redRowBytes = Math.ceil(w / 8);
  const blackInput = new Uint8Array(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = src[i]!;
      const g = src[i + 1]!;
      const b = src[i + 2]!;
      const a = src[i + 3]!;
      if (isRedish(r, g, b, a)) {
        const byteIdx = y * redRowBytes + (x >> 3);
        red.data[byteIdx] = red.data[byteIdx]! | (1 << (7 - (x & 7)));
        // Force this pixel to white in the black-plane input so it can
        // never produce a black bit. The mutual-exclusion invariant — no
        // dot is two colours at once — is enforced here, structurally.
        blackInput[i] = 255;
        blackInput[i + 1] = 255;
        blackInput[i + 2] = 255;
        blackInput[i + 3] = 255;
      } else {
        blackInput[i] = r;
        blackInput[i + 1] = g;
        blackInput[i + 2] = b;
        blackInput[i + 3] = a;
      }
    }
  }

  const black = renderImage({ width: w, height: h, data: blackInput }, { threshold, dither });
  return { black, red };
}
