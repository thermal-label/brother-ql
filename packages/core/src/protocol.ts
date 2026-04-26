import { getRow, createBitmap } from '@mbtech-nl/bitmap';
import { packBits } from './pack-bits.js';
import { type BrotherQLMedia, type PageData, type JobOptions, type PageOptions } from './types.js';

export function buildInvalidate(): Uint8Array {
  return new Uint8Array(200);
}

export function buildStatusRequest(): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x53]);
}

export function buildInitialize(): Uint8Array {
  return new Uint8Array([0x1b, 0x40]);
}

export function buildRasterMode(): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x61, 0x01]);
}

export function buildStatusNotification(enabled: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x21, enabled ? 0x01 : 0x00]);
}

export function buildPrintInfo(
  media: BrotherQLMedia,
  rowCount: number,
  pageIndex: number,
): Uint8Array {
  const mediaType = media.type === 'continuous' ? 0x0a : 0x0b;
  // 0xCE is what Python brother_ql uses for QL-820NWB (two-color capable model) regardless of
  // whether the job uses two colors. Single-color models (QL-700 etc.) use 0x8E instead.
  // We always use 0xCE here; callers can override per-device if needed.
  const validFlags = 0xce;
  const buf = new Uint8Array(13);
  buf[0] = 0x1b;
  buf[1] = 0x69;
  buf[2] = 0x7a;
  buf[3] = validFlags;
  buf[4] = mediaType;
  buf[5] = media.widthMm;
  buf[6] = media.heightMm ?? 0;
  // rowCount little-endian at bytes 7-8 (offsets 4-5 in param block)
  buf[7] = rowCount & 0xff;
  buf[8] = (rowCount >> 8) & 0xff;
  buf[9] = pageIndex;
  buf[10] = 0x00;
  buf[11] = 0x00;
  buf[12] = 0x00;
  return buf;
}

export function buildVariousMode(autoCut: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x4d, autoCut ? 0x40 : 0x00]);
}

export function buildExpandedMode(
  cutAtEnd: boolean,
  highRes: boolean,
  twoColor = false,
): Uint8Array {
  let flags = 0x00;
  if (twoColor) flags |= 0x01;
  if (cutAtEnd) flags |= 0x08;
  if (highRes) flags |= 0x10;
  return new Uint8Array([0x1b, 0x69, 0x4b, flags]);
}

export function buildCutEach(n: number): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x41, n & 0xff]);
}

export function buildMargin(dots: number): Uint8Array {
  return new Uint8Array([0x1b, 0x69, 0x64, dots & 0xff, (dots >> 8) & 0xff]);
}

export function buildCompression(enabled: boolean): Uint8Array {
  return new Uint8Array([0x4d, enabled ? 0x02 : 0x00]);
}

// Single-color: [0x67][0x00][len][data]
// Two-color black: [0x77][0x01][len][data]  — interleaved per-row with red
// Two-color red:   [0x77][0x02][len][data]
export function buildRasterRow(
  rowBytes: Uint8Array,
  color: 'black' | 'red',
  twoColor = false,
): Uint8Array {
  const buf = new Uint8Array(3 + rowBytes.length);
  if (twoColor) {
    buf[0] = 0x77;
    buf[1] = color === 'black' ? 0x01 : 0x02;
  } else {
    buf[0] = 0x67;
    buf[1] = 0x00;
  }
  buf[2] = rowBytes.length;
  buf.set(rowBytes, 3);
  return buf;
}

export function buildZeroRow(): Uint8Array {
  return new Uint8Array([0x5a]);
}

export function buildPrintCommand(isLastPage: boolean): Uint8Array {
  return new Uint8Array([isLastPage ? 0x1a : 0x0c]);
}

// Copy srcWidthPx bits from src (MSB-first packed) into dst at bit offset dstOffsetBits.
function placeBits(
  src: Uint8Array,
  srcWidthPx: number,
  dst: Uint8Array,
  dstOffsetBits: number,
): void {
  for (let px = 0; px < srcWidthPx; px++) {
    const srcBit = ((src[px >> 3] ?? 0) >> (7 - (px & 7))) & 1;
    if (srcBit) {
      const dstPx = dstOffsetBits + px;
      const byteIdx = dstPx >> 3;
      if (byteIdx < dst.length) dst[byteIdx] = (dst[byteIdx] ?? 0) | (1 << (7 - (dstPx & 7)));
    }
  }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

export function encodeJob(pages: PageData[], options: JobOptions = {}): Uint8Array {
  const copies = options.copies ?? 1;
  const chunks: Uint8Array[] = [];

  // Python brother_ql sequence: raster-mode first, then 200-byte invalidate, then init, then
  // raster-mode again (matches observed working sequence for QL-820NWB).
  chunks.push(buildRasterMode());
  chunks.push(buildInvalidate());
  chunks.push(buildInitialize());

  const allPageInstances: PageData[] = [];
  for (let c = 0; c < copies; c++) {
    for (const page of pages) {
      allPageInstances.push(page);
    }
  }

  for (const [i, page] of allPageInstances.entries()) {
    const isLastPage = i === allPageInstances.length - 1;
    const opts: PageOptions = page.options ?? {};
    const autoCut = opts.autoCut ?? true;
    const cutAtEnd = opts.cutAtEnd ?? true;
    const highRes = opts.highResolution ?? false;
    const marginDots = opts.marginDots ?? 35;
    const compress = opts.compress ?? false;
    const { bitmap, media } = page;

    // colorCapable media (e.g. DK-22251) requires two-color mode even for black-only jobs.
    // Auto-create an empty red plane when the tape demands it but caller didn't supply one.
    const twoColor = page.redBitmap !== undefined || media.colorCapable;
    const redBitmap =
      page.redBitmap ??
      (media.colorCapable ? createBitmap(bitmap.widthPx, bitmap.heightPx) : undefined);

    if (twoColor && redBitmap !== undefined) {
      if (bitmap.widthPx !== redBitmap.widthPx || bitmap.heightPx !== redBitmap.heightPx) {
        throw new Error('Two-color bitmaps must have identical dimensions');
      }
    }

    const rowCount = bitmap.heightPx;

    chunks.push(buildRasterMode());
    chunks.push(buildStatusRequest());
    chunks.push(buildPrintInfo(media, rowCount, i));
    chunks.push(buildVariousMode(autoCut));
    chunks.push(buildCutEach(1));
    chunks.push(buildExpandedMode(cutAtEnd, highRes, twoColor));
    chunks.push(buildMargin(marginDots));
    if (compress) chunks.push(buildCompression(true));

    // Each raster row must cover the full print head width (derived from media geometry).
    // leftMarginPins + printAreaDots + rightMarginPins = head pin count (720 or 1296).
    const totalPins = media.leftMarginPins + media.printAreaDots + media.rightMarginPins;
    const rowByteLen = Math.ceil(totalPins / 8);

    // Rows interleaved per raster line (matches Python brother_ql behaviour).
    // Two-color: black row then red row for each line. Single-color: black only.
    // When `compress` is on, each row's bytes are PackBits-encoded and the
    // raster-row LEN byte carries the compressed length. The printer was
    // already switched into compression mode by `buildCompression(true)`
    // above, so it expects every subsequent row to be PackBits.
    for (let r = 0; r < rowCount; r++) {
      const blackSrc = getRow(bitmap, r);
      const blackBytes = new Uint8Array(rowByteLen);
      placeBits(blackSrc, bitmap.widthPx, blackBytes, media.leftMarginPins);
      const blackPayload = compress ? packBits(blackBytes) : blackBytes;
      chunks.push(buildRasterRow(blackPayload, 'black', twoColor));

      if (twoColor && redBitmap !== undefined) {
        const redSrc = getRow(redBitmap, r);
        const redBytes = new Uint8Array(rowByteLen);
        placeBits(redSrc, redBitmap.widthPx, redBytes, media.leftMarginPins);
        const redPayload = compress ? packBits(redBytes) : redBytes;
        chunks.push(buildRasterRow(redPayload, 'red', twoColor));
      }
    }

    chunks.push(buildPrintCommand(isLastPage));
  }

  return concat(...chunks);
}
