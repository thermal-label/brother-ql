import { renderImage, renderMultiPlaneImage } from '@mbtech-nl/bitmap';
import type { LabelBitmap, RawImageData } from '@mbtech-nl/bitmap';
import type { PreviewResult } from '@thermal-label/contracts';
import type { BrotherQLMedia } from './types.js';
import { BROTHER_QL_TWO_COLOR_PALETTE } from './palette.js';

/**
 * Offline preview without a live printer connection.
 *
 * Two-colour aware: when `media.colorCapable` is true (DK-22251), the
 * image is split into a black and a red plane via
 * `renderMultiPlaneImage()` — exactly what `print()` does for that
 * media. Single-colour media returns one black plane.
 */
export function createPreviewOffline(image: RawImageData, media: BrotherQLMedia): PreviewResult {
  if (media.colorCapable) {
    const planes = renderMultiPlaneImage(image, {
      palette: BROTHER_QL_TWO_COLOR_PALETTE,
    }) as Record<'black' | 'red', LabelBitmap>;
    return {
      planes: [
        { name: 'black', bitmap: planes.black, displayColor: '#000000' },
        { name: 'red', bitmap: planes.red, displayColor: '#ff0000' },
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
