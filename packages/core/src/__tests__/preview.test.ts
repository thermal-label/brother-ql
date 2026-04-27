import { describe, expect, it } from 'vitest';
import { MEDIA } from '../media.js';
import { createPreviewOffline } from '../preview.js';

function solidRgba(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return { width, height, data };
}

describe('createPreviewOffline', () => {
  it('returns a single black plane for single-colour media', () => {
    const image = solidRgba(8, 8, [0, 0, 0, 255]);
    const preview = createPreviewOffline(image, MEDIA[259]!);
    expect(preview.planes).toHaveLength(1);
    expect(preview.planes[0]!.name).toBe('black');
    expect(preview.planes[0]!.displayColor).toBe('#000000');
    expect(preview.media).toBe(MEDIA[259]);
    expect(preview.assumed).toBe(false);
  });

  it('returns black + red planes for multi-ink media (DK-22251)', () => {
    const image = solidRgba(8, 8, [255, 0, 0, 255]);
    const preview = createPreviewOffline(image, MEDIA[251]!);
    expect(preview.planes.map(p => p.name)).toEqual(['black', 'red']);
    expect(preview.planes[1]!.displayColor).toBe('#ff0000');
    expect(preview.media).toBe(MEDIA[251]);
    expect(preview.assumed).toBe(false);
  });

  it('planes share the source image dimensions', () => {
    const image = solidRgba(24, 12, [128, 128, 128, 255]);
    const preview = createPreviewOffline(image, MEDIA[251]!);
    for (const plane of preview.planes) {
      expect(plane.bitmap.widthPx).toBe(24);
      expect(plane.bitmap.heightPx).toBe(12);
    }
  });
});
