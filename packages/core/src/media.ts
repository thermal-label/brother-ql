import type { PrintEngine } from '@thermal-label/contracts';
import type { BrotherQLMedia, MediaType, TapeGeometry } from './types.js';
import { MEDIA } from './media.generated.js';

export { MEDIA };

/**
 * Resolve per-head-family geometry for a media entry against the
 * engine that's about to print it.
 *
 * DK entries fall back to the flat `printAreaDots` / `leftMarginPins` /
 * `rightMarginPins` fields on the entry — the same values every QL
 * code path read before the head-family split landed. TZe and HSe
 * entries dispatch on `engine.headDots`: 128 picks `geometry.narrow`,
 * anything else picks `geometry.wide`. Throws when the requested head
 * family has no entry (e.g. 36 mm TZe on a 128-dot head, or any HSe
 * on PT-P910BT — those engines simply shouldn't reach this call site
 * because `findMediaByDimensions` gates them upstream).
 */
export function resolveTapeGeometry(
  media: BrotherQLMedia,
  engine: Pick<PrintEngine, 'headDots'>,
): TapeGeometry {
  if (media.tapeSystem === 'dk') {
    if (
      typeof media.printAreaDots !== 'number' ||
      typeof media.leftMarginPins !== 'number' ||
      typeof media.rightMarginPins !== 'number'
    ) {
      throw new Error(`DK media ${media.id.toString()} missing flat geometry fields`);
    }
    return {
      printAreaDots: media.printAreaDots,
      leftMarginPins: media.leftMarginPins,
      rightMarginPins: media.rightMarginPins,
    };
  }
  const family = engine.headDots === 128 ? 'narrow' : 'wide';
  const geometry = media.geometry?.[family];
  if (!geometry) {
    throw new Error(
      `${media.name} not supported on a ${engine.headDots.toString()}-dot head (no \`geometry.${family}\` entry)`,
    );
  }
  return geometry;
}

/**
 * Default media when `createPreview()` is called without media and
 * without a detected roll. 62mm continuous (DK-22205) is the common
 * single-colour shipping roll.
 */
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DK-22205 is a hard-coded registry key
export const DEFAULT_MEDIA: BrotherQLMedia = MEDIA[259]!;

export function findMedia(id: number): BrotherQLMedia | undefined {
  return MEDIA[id];
}

export function findMediaByWidth(widthMm: number, type: MediaType): BrotherQLMedia[] {
  return Object.values(MEDIA).filter(m => m.widthMm === widthMm && m.type === type);
}

/**
 * Match status-response dimensions to a media registry entry.
 *
 * @param widthMm     media width in mm (status byte 10)
 * @param heightMm    media length in mm (status byte 17) — 0 = continuous
 * @param twoColorMode true when the status response indicates the
 *                     printer is configured for two-colour media. When
 *                     both DK-22205 (259) and DK-22251 (251) match the
 *                     dimensions, the flag picks the right one.
 */
export function findMediaByDimensions(
  widthMm: number,
  heightMm: number,
  twoColorMode = false,
): BrotherQLMedia | undefined {
  if (heightMm === 0) {
    const continuousMatches = Object.values(MEDIA).filter(
      m => m.type === 'continuous' && m.widthMm === widthMm,
    );
    if (continuousMatches.length === 0) return undefined;
    const preferred = continuousMatches.find(m => (m.palette !== undefined) === twoColorMode);
    return preferred ?? continuousMatches[0];
  }
  return Object.values(MEDIA).find(
    m => m.type === 'die-cut' && m.widthMm === widthMm && m.heightMm === heightMm,
  );
}
