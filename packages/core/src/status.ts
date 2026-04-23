import { type PrinterStatus, type MediaType } from './types.js';

const ERROR_INFO_1: Record<number, string> = {
  0: 'No media',
  1: 'End of media',
  2: 'Cutter jam',
  3: 'Weak battery',
  4: 'Printer in use',
  6: 'High voltage adapter',
  7: 'Fan motor error',
};

const ERROR_INFO_2: Record<number, string> = {
  0: 'Replace media',
  1: 'Expansion buffer full',
  2: 'Transmission error',
  3: 'Communication buffer full',
  4: 'Cover open',
  5: 'Cancel key',
  6: 'Media cannot be fed',
  7: 'System error',
};

export function parseStatus(bytes: Uint8Array): PrinterStatus {
  if (bytes.length < 32)
    throw new Error(`Status response too short: ${bytes.length.toString()} bytes`);

  // noUncheckedIndexedAccess forces `?? 0` fallbacks that are unreachable after
  // the length check above. DataView avoids the issue: getUint8 returns number.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const errors: string[] = [];
  const errInfo1 = view.getUint8(8);
  const errInfo2 = view.getUint8(9);

  for (const [bitStr, msg] of Object.entries(ERROR_INFO_1)) {
    if (errInfo1 & (1 << Number(bitStr))) errors.push(msg);
  }
  for (const [bitStr, msg] of Object.entries(ERROR_INFO_2)) {
    if (errInfo2 & (1 << Number(bitStr))) errors.push(msg);
  }

  const mediaWidthMm = view.getUint8(10);
  const mediaTypeByte = view.getUint8(11);
  const mediaLengthMm = view.getUint8(17);

  let mediaType: MediaType | null = null;
  if (mediaTypeByte === 0x0a) mediaType = 'continuous';
  else if (mediaTypeByte === 0x0b) mediaType = 'die-cut';

  // Status type is at byte 18, not 14. Byte 14 is an undocumented media-type
  // code that carries non-zero values and is not the status type field.
  const statusType = view.getUint8(18);
  const ready = errors.length === 0 && statusType !== 0x02;

  return {
    ready,
    mediaWidthMm,
    mediaLengthMm,
    mediaType,
    errors,
    editorLiteMode: false,
    rawBytes: bytes,
  };
}

export const STATUS_REQUEST = new Uint8Array([0x1b, 0x69, 0x53]);
