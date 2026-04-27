import { renderImage, renderMultiPlaneImage } from '@mbtech-nl/bitmap';
import type { LabelBitmap, RawImageData } from '@mbtech-nl/bitmap';
import type { PreviewResult } from '@thermal-label/contracts';
import type { BrotherQLMedia } from './types.js';

/**
 * Offline preview without a live printer connection.
 *
 * Multi-ink aware: when `media.palette` is defined (DK-22251 today),
 * the image is split per-plane via `renderMultiPlaneImage()` — the
 * same code path `print()` takes for that media. Single-ink media
 * returns one black plane via dithered `renderImage`.
 */
export function createPreviewOffline(image: RawImageData, media: BrotherQLMedia): PreviewResult {
  if (media.palette) {
    const planes = renderMultiPlaneImage(image, {
      palette: media.palette,
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
