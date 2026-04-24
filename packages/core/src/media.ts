import { type BrotherQLMedia, type MediaType } from './types.js';

/**
 * Registry of supported Brother QL consumables.
 *
 * Entries are keyed by the firmware media id — the same number the
 * printer reports in the 32-byte status response. `heightMm` is
 * omitted for continuous media (variable length) and set for die-cut
 * labels (fixed length). Only DK-22251 has `colorCapable: true` — the
 * driver uses that to run two-colour plane separation before sending
 * the raster.
 */
export const MEDIA: Record<number, BrotherQLMedia> = {
  // Continuous length tape
  257: {
    id: 257,
    name: '12mm continuous',
    type: 'continuous',
    widthMm: 12,
    colorCapable: false,
    printAreaDots: 106,
    leftMarginPins: 585,
    rightMarginPins: 29,
  },
  258: {
    id: 258,
    name: '29mm continuous (DK-22210)',
    type: 'continuous',
    widthMm: 29,
    colorCapable: false,
    printAreaDots: 306,
    leftMarginPins: 408,
    rightMarginPins: 6,
  },
  264: {
    id: 264,
    name: '38mm continuous (DK-22225)',
    type: 'continuous',
    widthMm: 38,
    colorCapable: false,
    printAreaDots: 413,
    leftMarginPins: 295,
    rightMarginPins: 12,
  },
  262: {
    id: 262,
    name: '50mm continuous (DK-22246)',
    type: 'continuous',
    widthMm: 50,
    colorCapable: false,
    printAreaDots: 554,
    leftMarginPins: 154,
    rightMarginPins: 12,
  },
  261: {
    id: 261,
    name: '54mm continuous (DK-22214)',
    type: 'continuous',
    widthMm: 54,
    colorCapable: false,
    printAreaDots: 590,
    leftMarginPins: 130,
    rightMarginPins: 0,
  },
  259: {
    id: 259,
    name: '62mm continuous (DK-22205)',
    type: 'continuous',
    widthMm: 62,
    colorCapable: false,
    printAreaDots: 696,
    leftMarginPins: 12,
    rightMarginPins: 12,
  },
  251: {
    id: 251,
    name: '62mm continuous two-color (DK-22251)',
    type: 'continuous',
    widthMm: 62,
    colorCapable: true,
    printAreaDots: 696,
    leftMarginPins: 12,
    rightMarginPins: 12,
  },
  260: {
    id: 260,
    name: '102mm continuous (DK-22243)',
    type: 'continuous',
    widthMm: 102,
    colorCapable: false,
    printAreaDots: 1164,
    leftMarginPins: 76,
    rightMarginPins: 56,
  },

  // Die-cut labels
  269: {
    id: 269,
    name: '17×54mm die-cut (DK-11204)',
    type: 'die-cut',
    widthMm: 17,
    heightMm: 54,
    colorCapable: false,
    printAreaDots: 165,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 566,
  },
  270: {
    id: 270,
    name: '17×87mm die-cut (DK-11203)',
    type: 'die-cut',
    widthMm: 17,
    heightMm: 87,
    colorCapable: false,
    printAreaDots: 165,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 956,
  },
  370: {
    id: 370,
    name: '23×23mm die-cut',
    type: 'die-cut',
    widthMm: 23,
    heightMm: 23,
    colorCapable: false,
    printAreaDots: 236,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 202,
  },
  271: {
    id: 271,
    name: '29×90mm die-cut (DK-11201)',
    type: 'die-cut',
    widthMm: 29,
    heightMm: 90,
    colorCapable: false,
    printAreaDots: 306,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 991,
  },
  272: {
    id: 272,
    name: '38×90mm die-cut (DK-11218)',
    type: 'die-cut',
    widthMm: 38,
    heightMm: 90,
    colorCapable: false,
    printAreaDots: 413,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 991,
  },
  367: {
    id: 367,
    name: '39×48mm die-cut (DK-11219)',
    type: 'die-cut',
    widthMm: 39,
    heightMm: 48,
    colorCapable: false,
    printAreaDots: 425,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 495,
  },
  374: {
    id: 374,
    name: '52×29mm die-cut',
    type: 'die-cut',
    widthMm: 52,
    heightMm: 29,
    colorCapable: false,
    printAreaDots: 578,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 271,
  },
  274: {
    id: 274,
    name: '62×29mm die-cut (DK-11209)',
    type: 'die-cut',
    widthMm: 62,
    heightMm: 29,
    colorCapable: false,
    printAreaDots: 696,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 271,
  },
  275: {
    id: 275,
    name: '62×100mm die-cut (DK-11202)',
    type: 'die-cut',
    widthMm: 62,
    heightMm: 100,
    colorCapable: false,
    printAreaDots: 696,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 1109,
  },
  365: {
    id: 365,
    name: '102×51mm die-cut (DK-11240)',
    type: 'die-cut',
    widthMm: 102,
    heightMm: 51,
    colorCapable: false,
    printAreaDots: 1164,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 526,
  },
  366: {
    id: 366,
    name: '102×152mm die-cut (DK-11241)',
    type: 'die-cut',
    widthMm: 102,
    heightMm: 152,
    colorCapable: false,
    printAreaDots: 1164,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 1660,
  },
  362: {
    id: 362,
    name: '12mm Ø die-cut',
    type: 'die-cut',
    widthMm: 12,
    heightMm: 12,
    colorCapable: false,
    printAreaDots: 94,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 94,
  },
  363: {
    id: 363,
    name: '24mm Ø die-cut (DK-11221)',
    type: 'die-cut',
    widthMm: 24,
    heightMm: 24,
    colorCapable: false,
    printAreaDots: 236,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 236,
  },
  273: {
    id: 273,
    name: '58mm Ø die-cut (DK-11207)',
    type: 'die-cut',
    widthMm: 58,
    heightMm: 58,
    colorCapable: false,
    printAreaDots: 618,
    leftMarginPins: 0,
    rightMarginPins: 0,
    dieCutMaskedAreaDots: 618,
  },
};

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
    const preferred = continuousMatches.find(m => m.colorCapable === twoColorMode);
    return preferred ?? continuousMatches[0];
  }
  return Object.values(MEDIA).find(
    m => m.type === 'die-cut' && m.widthMm === widthMm && m.heightMm === heightMm,
  );
}
