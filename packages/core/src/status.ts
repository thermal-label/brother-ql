import type { PrintEngine, PrinterError, StatusDetail } from '@thermal-label/contracts';
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
 *   byte 19 — phase type (0x00 receiving, 0x01 printing)
 *   byte 22 — notification (0x03 cooling started, 0x04 cooling finished)
 *   byte 25 — bit 7 set when the loaded roll is two-color (DK-22251);
 *             clear on single-color rolls. See scripts/STATUS-CAPTURE.md.
 *
 * `detectedMedia` is resolved against the media registry via
 * `findMediaByDimensions`.
 *
 * `details` carries the contracts-standard `StatusDetail[]` diagnostic
 * rows the harness renders verbatim: the print phase (always present)
 * and the head-cooling notification (only when the printer reports
 * one).
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
  const phaseType = view.getUint8(19);
  const notification = view.getUint8(22);
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
    details: buildStatusDetails(phaseType, notification),
    rawBytes: bytes,
  };
}

/**
 * Build the contracts-standard `StatusDetail[]` rows for a parsed
 * Brother QL status.
 *
 * - The print-phase row (byte 19) is always emitted — it is the most
 *   useful "is the device doing anything" signal for a stuck report.
 * - The head-cooling row (byte 22) is emitted only when the printer
 *   reports a cooling notification; `0x00` (none) produces no row so a
 *   normal idle status stays uncluttered. "Cooling started" is a
 *   `warn` (printing is paused), "cooling finished" is plain `info`.
 */
function buildStatusDetails(phaseType: number, notification: number): StatusDetail[] {
  const details: StatusDetail[] = [];

  details.push({
    label: 'Print phase',
    value: phaseType === 0x01 ? 'printing' : 'receiving',
  });

  if (notification === 0x03) {
    details.push({
      label: 'Head cooling',
      value: 'cooling started',
      severity: 'warn',
    });
  } else if (notification === 0x04) {
    details.push({
      label: 'Head cooling',
      value: 'cooling finished',
    });
  }

  return details;
}
