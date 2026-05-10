import type { PrintEngine, PrinterError } from '@thermal-label/contracts';
import type { BrotherQLStatus } from './types.js';
import { findMediaByDimensions } from './media.js';

export const STATUS_REQUEST = new Uint8Array([0x1b, 0x69, 0x53]);

/** Error-info 1 bit → structured PrinterError code + human message. */
const ERROR_INFO_1: { bit: number; code: string; message: string }[] = [
  { bit: 0, code: 'no_media', message: 'No media' },
  { bit: 1, code: 'media_end', message: 'End of media' },
  { bit: 2, code: 'cutter_jam', message: 'Cutter jam' },
  { bit: 3, code: 'system_error', message: 'Weak battery' },
  { bit: 4, code: 'not_ready', message: 'Printer in use' },
  { bit: 6, code: 'system_error', message: 'High voltage adapter' },
  { bit: 7, code: 'system_error', message: 'Fan motor error' },
];

/** Error-info 2 bit → structured PrinterError code + human message. */
const ERROR_INFO_2: { bit: number; code: string; message: string }[] = [
  { bit: 0, code: 'wrong_media', message: 'Replace media' },
  { bit: 1, code: 'system_error', message: 'Expansion buffer full' },
  { bit: 2, code: 'system_error', message: 'Transmission error' },
  { bit: 3, code: 'system_error', message: 'Communication buffer full' },
  { bit: 4, code: 'cover_open', message: 'Cover open' },
  { bit: 5, code: 'not_ready', message: 'Cancel key pressed' },
  { bit: 6, code: 'media_end', message: 'Media cannot be fed' },
  { bit: 7, code: 'system_error', message: 'System error' },
];

/**
 * Parse a Brother QL 32-byte status response.
 *
 * Fields:
 *   byte 8  — error info 1 (bit mask, see ERROR_INFO_1)
 *   byte 9  — error info 2 (bit mask, see ERROR_INFO_2)
 *   byte 10 — media width (mm)
 *   byte 11 — media type (0x0A continuous, 0x0B die-cut)
 *   byte 17 — media length (mm), 0 for continuous
 *   byte 18 — status type (0x02 = error response)
 *   byte 25 — bit 7 set when the loaded roll is two-color (DK-22251);
 *             clear on single-color rolls. See scripts/STATUS-CAPTURE.md.
 *
 * `detectedMedia` is resolved against the media registry via
 * `findMediaByDimensions`. `editorLiteMode` is a driver-specific
 * extension on `BrotherQLStatus` — the status-type byte doesn't
 * actually report it, but keeping the field here means callers can
 * set it from other signals (e.g. mass-storage PID detected during
 * discovery) without changing the return type.
 */
export function parseStatus(
  bytes: Uint8Array,
  engine?: Pick<PrintEngine, 'headDots' | 'mediaCompatibility'>,
): BrotherQLStatus {
  if (bytes.length < 32) {
    throw new Error(`Status response too short: ${bytes.length.toString()} bytes`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const errInfo1 = view.getUint8(8);
  const errInfo2 = view.getUint8(9);
  const mediaWidthMm = view.getUint8(10);
  const mediaTypeByte = view.getUint8(11);
  const mediaLengthMm = view.getUint8(17);
  const statusType = view.getUint8(18);
  const twoColorFlag = (view.getUint8(25) & 0x80) !== 0;

  const errors: PrinterError[] = [];
  for (const { bit, code, message } of ERROR_INFO_1) {
    if (errInfo1 & (1 << bit)) errors.push({ code, message });
  }
  for (const { bit, code, message } of ERROR_INFO_2) {
    if (errInfo2 & (1 << bit)) errors.push({ code, message });
  }

  const mediaLoaded = mediaWidthMm > 0 && mediaTypeByte !== 0;
  const detected = mediaLoaded
    ? findMediaByDimensions(mediaWidthMm, mediaLengthMm, twoColorFlag, engine)
    : undefined;

  return {
    ready: errors.length === 0 && statusType !== 0x02,
    mediaLoaded,
    ...(detected === undefined ? {} : { detectedMedia: detected }),
    errors,
    editorLiteMode: false,
    rawBytes: bytes,
  };
}
