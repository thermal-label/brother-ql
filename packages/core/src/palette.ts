import type { PaletteEntry } from '@mbtech-nl/bitmap';

/**
 * Palette for DK-22251 (the only two-colour QL media). Hand to
 * `renderMultiPlaneImage` to get `{ black, red }` 1bpp planes that
 * `encodeJob` then sends as the two raster planes.
 *
 * Each source pixel is classified to the nearest entry (or to the
 * implicit white background) by the bitmap lib, which guarantees a dot
 * lands in at most one plane.
 */
export const BROTHER_QL_TWO_COLOR_PALETTE: readonly PaletteEntry[] = [
  { name: 'black', rgb: [0, 0, 0] },
  { name: 'red', rgb: [255, 0, 0] },
];
