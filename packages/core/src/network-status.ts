import type { PrintEngine, PrinterError, StatusDetail } from '@thermal-label/contracts';
import type { BrotherQLMedia, BrotherQLStatus } from './types.js';
import { findMediaByDimensions, MEDIA } from './media.js';

/**
 * Values read from the standard Printer-MIB / Host-Resources-MIB
 * (RFC 3805 / RFC 2790) of a network print server. Port 9100 carries
 * no status, so this is the only status source on TCP; see plan 17.
 */
export interface PrinterMibStatus {
  /** hrPrinterStatus: 1 other, 2 unknown, 3 idle, 4 printing, 5 warmup. */
  printerStatus: number;
  /** hrPrinterDetectedErrorState: 0–2 octets, bit 0 = MSB of octet 0. */
  errorState: Uint8Array;
  /** prtInputMediaName, e.g. `29mm x 90mm / 1.1" x 3.5"` or `62mm / 2.4"`. */
  mediaName: string;
  /** prtInputMediaDimFeedDir (length) / XFeedDir (width) in `dimUnit`; negative = unknown. */
  feedDir?: number;
  xFeedDir?: number;
  /** prtInputDimUnit: 3 = ten-thousandths of an inch, 4 = micrometres. */
  dimUnit?: number;
}

const PRINTER_STATE: Record<number, string> = {
  1: 'other',
  2: 'unknown',
  3: 'idle',
  4: 'printing',
  5: 'warmup',
};

/** RFC 2790 hrPrinterDetectedErrorState bit names, index = bit. */
const ERROR_STATE_BITS = [
  'lowPaper',
  'noPaper',
  'lowToner',
  'noToner',
  'doorOpen',
  'jammed',
  'offline',
  'serviceRequested',
  'inputTrayMissing',
  'outputTrayMissing',
  'markerSupplyMissing',
  'outputNearFull',
  'outputFull',
  'inputTrayEmpty',
  'overduePreventMaint',
] as const;

/** Bit → contracts error code + message; unlisted set bits become `system_error`. */
const ERROR_STATE_CODES: Record<number, { code: string; message: string }> = {
  1: { code: 'no_media', message: 'No media' },
  4: { code: 'cover_open', message: 'Cover open' },
  5: { code: 'cutter_jam', message: 'Jammed' },
  6: { code: 'not_ready', message: 'Offline' },
  7: { code: 'system_error', message: 'Service requested' },
  13: { code: 'no_media', message: 'Input tray empty' },
};

/** Warning-only bits: reported as a details row, never an error. */
const ERROR_STATE_WARNINGS: Record<number, string> = {
  0: 'Media low',
};

function errorStateBit(errorState: Uint8Array, bit: number): boolean {
  const octet = errorState[bit >> 3];
  return octet !== undefined && (octet & (0x80 >> (bit & 7))) !== 0;
}

/**
 * Parse the metric half of a Brother `prtInputMediaName`.
 * `"29mm x 90mm / …"` → 29×90 die-cut, `"62mm / …"` → 62 continuous.
 * The `Dia` form is the reference's naming for round labels and is
 * unverified on the wire. Anything else → `undefined`.
 */
export function parseMediaName(name: string): { widthMm: number; heightMm?: number } | undefined {
  const metric = name.split('/')[0] ?? '';
  const m = /^\s*(\d+(?:\.\d+)?)\s*mm(?:\s*(?:[x×]\s*(\d+(?:\.\d+)?)\s*mm|(dia)))?\s*$/i.exec(
    metric,
  );
  if (!m?.[1]) return undefined;
  const widthMm = Number(m[1]);
  if (m[3]) return { widthMm, heightMm: widthMm };
  return m[2] === undefined ? { widthMm } : { widthMm, heightMm: Number(m[2]) };
}

function dimToMm(value: number, unit: number): number | undefined {
  if (unit === 3) return Math.round(value * 0.00254);
  if (unit === 4) return Math.round(value / 1000);
  return undefined;
}

/** Dim OIDs win when the agent fills them; the name string is the fallback. */
function resolveDimensions(
  input: PrinterMibStatus,
): { widthMm: number; heightMm: number } | undefined {
  const { xFeedDir, feedDir, dimUnit } = input;
  if (xFeedDir !== undefined && xFeedDir >= 0 && dimUnit !== undefined) {
    const widthMm = dimToMm(xFeedDir, dimUnit);
    if (widthMm !== undefined) {
      const heightMm = feedDir !== undefined && feedDir >= 0 ? dimToMm(feedDir, dimUnit) : 0;
      return { widthMm, heightMm: heightMm ?? 0 };
    }
  }
  const parsed = parseMediaName(input.mediaName);
  return parsed && { widthMm: parsed.widthMm, heightMm: parsed.heightMm ?? 0 };
}

/**
 * Whether a roll of this width and type also exists as a two-colour
 * variant (62 mm continuous: DK-22205 vs DK-22251). Those are
 * indistinguishable over the network, so callers warn.
 */
export function hasTwoColourSibling(media: BrotherQLMedia): boolean {
  return Object.values(MEDIA).some(
    m => m.palette !== undefined && m.type === media.type && m.widthMm === media.widthMm,
  );
}

/**
 * Map Printer-MIB values onto the driver's status. `ready` requires
 * an idle or printing state and no error bits. Two-colour rolls are
 * invisible on every network surface (DK-22251 reads as 62 mm
 * continuous), so the single-colour sibling is resolved and a `warn`
 * row says so.
 */
export function statusFromPrinterMib(
  input: PrinterMibStatus,
  engine?: Pick<PrintEngine, 'headDots' | 'mediaCompatibility'>,
): BrotherQLStatus {
  const errors: PrinterError[] = [];
  const details: StatusDetail[] = [
    { label: 'Printer state', value: PRINTER_STATE[input.printerStatus] ?? 'unknown' },
  ];

  for (const [bit, name] of ERROR_STATE_BITS.entries()) {
    if (!errorStateBit(input.errorState, bit)) continue;
    const warning = ERROR_STATE_WARNINGS[bit];
    if (warning !== undefined) {
      details.push({ label: 'Media', value: warning, severity: 'warn' });
      continue;
    }
    errors.push(ERROR_STATE_CODES[bit] ?? { code: 'system_error', message: name });
  }

  const dims = resolveDimensions(input);
  const detected = dims
    ? findMediaByDimensions(dims.widthMm, dims.heightMm, false, engine)
    : undefined;
  if (detected === undefined) {
    details.push({
      label: 'Media',
      value: `not recognised: ${JSON.stringify(input.mediaName)}`,
      severity: 'warn',
    });
  } else if (hasTwoColourSibling(detected)) {
    details.push({ label: 'Two-colour', value: 'not detectable over network', severity: 'warn' });
  }

  const state = input.printerStatus;
  return {
    ready: (state === 3 || state === 4) && errors.length === 0,
    mediaLoaded: detected !== undefined,
    ...(detected === undefined ? {} : { detectedMedia: detected }),
    errors,
    details,
    rawBytes: new Uint8Array(0),
  };
}
