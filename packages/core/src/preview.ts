/* eslint-disable import-x/consistent-type-specifier-style */
import { renderImage, type RawImageData } from '@mbtech-nl/bitmap';
import type { PreviewResult } from '@thermal-label/contracts';
import { splitTwoColor } from './colour.js';
import { type BrotherQLMedia } from './types.js';

/**
 * Offline preview without a live printer connection.
 *
 * Two-colour aware: when `media.colorCapable` is true (DK-22251), the
 * image is split into a black and a red plane via `splitTwoColor()` —
 * exactly what `print()` does for that media. Single-colour media
 * returns one black plane.
 */
export function createPreviewOffline(image: RawImageData, media: BrotherQLMedia): PreviewResult {
  if (media.colorCapable) {
    const { black, red } = splitTwoColor(image);
    return {
      planes: [
        { name: 'black', bitmap: black, displayColor: '#000000' },
        { name: 'red', bitmap: red, displayColor: '#ff0000' },
      ],
      media,
      assumed: false,
    };
  }

  const bitmap = renderImage(image, { dither: true });
  return {
    planes: [{ name: 'black', bitmap, displayColor: '#000000' }],
    media,
    assumed: false,
  };
}
