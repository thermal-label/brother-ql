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

  const errors: string[] = [];
  const errInfo1 = bytes[8] ?? 0;
  const errInfo2 = bytes[9] ?? 0;

  for (const [bitStr, msg] of Object.entries(ERROR_INFO_1)) {
    if (errInfo1 & (1 << Number(bitStr))) errors.push(msg);
  }
  for (const [bitStr, msg] of Object.entries(ERROR_INFO_2)) {
    if (errInfo2 & (1 << Number(bitStr))) errors.push(msg);
  }

  const mediaWidthMm = bytes[10] ?? 0;
  const mediaTypeByte = bytes[11] ?? 0;

  let mediaType: MediaType | null = null;
  if (mediaTypeByte === 0x0a) mediaType = 'continuous';
  else if (mediaTypeByte === 0x0b) mediaType = 'die-cut';

  const statusType = bytes[14] ?? 0;
  const ready = errors.length === 0 && statusType !== 0x02;

  return {
    ready,
    mediaWidthMm,
    mediaType,
    errors,
    editorLiteMode: false,
    rawBytes: bytes,
  };
}

export const STATUS_REQUEST = new Uint8Array([0x1b, 0x69, 0x53]);
