import { getRow } from '@mbtech-nl/bitmap';
import { type MediaDescriptor, type PageData, type JobOptions, type PageOptions } from './types.js';

export function buildInvalidate(): Uint8Array {
  return new Uint8Array(400);
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
  media: MediaDescriptor,
  rowCount: number,
  pageIndex: number,
  twoColor = false,
): Uint8Array {
  const mediaType = media.type === 'continuous' ? 0x0a : 0x0b;
  // Valid flags: bit1=mediaWidth, bit2=mediaType, bit6=recovery, plus two-color flag if needed
  const validFlags = twoColor ? 0xce : 0x86;
  const buf = new Uint8Array(13);
  buf[0] = 0x1b;
  buf[1] = 0x69;
  buf[2] = 0x7a;
  buf[3] = validFlags;
  buf[4] = mediaType;
  buf[5] = media.widthMm;
  buf[6] = media.lengthMm;
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

export function buildExpandedMode(cutAtEnd: boolean, highRes: boolean): Uint8Array {
  let flags = 0x00;
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

export function buildRasterRow(rowBytes: Uint8Array, color: 'black' | 'red'): Uint8Array {
  const cmd = color === 'red' ? 0x77 : 0x67;
  const buf = new Uint8Array(2 + rowBytes.length);
  buf[0] = cmd;
  buf[1] = 0x00;
  buf.set(rowBytes, 2);
  return buf;
}

export function buildZeroRow(): Uint8Array {
  return new Uint8Array([0x5a]);
}

export function buildPrintCommand(isLastPage: boolean): Uint8Array {
  return new Uint8Array([isLastPage ? 0x1a : 0x0c]);
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
    const twoColor = page.redBitmap !== undefined;

    const { bitmap, redBitmap, media } = page;

    if (twoColor && redBitmap !== undefined) {
      if (bitmap.widthPx !== redBitmap.widthPx || bitmap.heightPx !== redBitmap.heightPx) {
        throw new Error('Two-color bitmaps must have identical dimensions');
      }
    }

    const rowCount = bitmap.heightPx;

    chunks.push(buildRasterMode());
    chunks.push(buildStatusNotification(false));
    chunks.push(buildPrintInfo(media, rowCount, i, twoColor));
    chunks.push(buildVariousMode(autoCut));
    chunks.push(buildCutEach(1));
    chunks.push(buildExpandedMode(cutAtEnd, highRes));
    chunks.push(buildMargin(marginDots));
    if (compress) chunks.push(buildCompression(true));

    // getRow returns packed bytes for one row — length = ceil(widthPx / 8)
    const rowWidth = bitmap.widthPx;
    const rowByteLen = Math.ceil(rowWidth / 8);

    // Black rows
    for (let r = 0; r < rowCount; r++) {
      const row = getRow(bitmap, r);
      const rowBytes = new Uint8Array(rowByteLen);
      rowBytes.set(row.slice(0, rowByteLen));
      chunks.push(buildRasterRow(rowBytes, 'black'));
    }

    // Red rows (two-color only) — all after all black rows
    if (twoColor && redBitmap !== undefined) {
      const redRowByteLen = Math.ceil(redBitmap.widthPx / 8);
      for (let r = 0; r < rowCount; r++) {
        const row = getRow(redBitmap, r);
        const rowBytes = new Uint8Array(redRowByteLen);
        rowBytes.set(row.slice(0, redRowByteLen));
        chunks.push(buildRasterRow(rowBytes, 'red'));
      }
    }

    chunks.push(buildPrintCommand(isLastPage));
  }

  return concat(...chunks);
}
