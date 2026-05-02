import { getRow, createBitmap } from '@mbtech-nl/bitmap';
import type { PrintEngine } from '@thermal-label/contracts';
import { packBits } from './pack-bits.js';
import { resolveTapeGeometry } from './media.js';
import type {
  BrotherEngineCapabilities,
  BrotherQLMedia,
  PageData,
  JobOptions,
  PageOptions,
  TapeGeometry,
} from './types.js';

export function buildInvalidate(byteCount = 200): Uint8Array {
  return new Uint8Array(byteCount);
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
  highResFlagBit = 0x10,
): Uint8Array {
  let flags = 0x00;
  if (twoColor) flags |= 0x01;
  if (cutAtEnd) flags |= 0x08;
  if (highRes) flags |= highResFlagBit;
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

/**
 * Per-protocol wire-format constants.
 *
 * QL and PT raster differ in three numeric constants and one rule —
 * everything else (status request, raster opcode, PackBits, two-colour
 * plane encoding) is shared and lives in `encodeRasterJob`. Per the
 * plan §4.2 / §7, these are protocol-internal and do not leak onto
 * the device registry.
 *
 * - `feedMarginDots` — leading/trailing blank tape (`ESC i d`). QL = 35,
 *   PT = 14. Per `brother_label/devices.py` and Brother's PT raster
 *   manual; verify against print output during phase 4.
 * - `invalidateBytes` — leading invalidate sequence. QL is 200 by
 *   default but the encoder bumps it to 400 when the engine carries
 *   `capabilities.twoColor`. PT is always 200 (no two-colour PT model
 *   exists today).
 * - `highResFlagBit` — bit set in `ESC i K` flags when `highRes`
 *   is requested. QL uses bit 4 (0x10) for 300x600; PT uses bit 6
 *   (0x40) for 180x360 / 360x720 (per nbuchwitz/ptouch).
 * - `duplicateRasterLines` — when `highRes` is on, PT requires each
 *   raster line to be sent twice. QL's high-res mode does not.
 */
export interface RasterProtocolConfig {
  feedMarginDots: number;
  invalidateBytes: number;
  highResFlagBit: number;
  duplicateRasterLines: boolean;
}

export const QL_PROTOCOL_CONFIG: RasterProtocolConfig = {
  feedMarginDots: 35,
  invalidateBytes: 200,
  highResFlagBit: 0x10,
  duplicateRasterLines: false,
};

export const PT_PROTOCOL_CONFIG: RasterProtocolConfig = {
  feedMarginDots: 14,
  invalidateBytes: 200,
  highResFlagBit: 0x40,
  duplicateRasterLines: true,
};

/** Engine shape consumed by the encoder — narrow `Pick` so unit tests can synthesise minimal stubs. */
export type EncoderEngine = Pick<PrintEngine, 'protocol' | 'headDots'> & {
  capabilities?: BrotherEngineCapabilities;
};

/**
 * Cutter compression-required quirk.
 *
 * PT-E550W silently fails to cut when compression is disabled —
 * documented in nbuchwitz/ptouch:PTE550W ("E550W requires compression
 * ON for cutting to work"). Encoded as a per-name guard rather than a
 * registry capability so we don't promote a one-model bug into the
 * data shape.
 */
const COMPRESSION_REQUIRED_FOR_CUTTER = new Set(['PT-E550W']);

function maybeCheckCutterCompressionQuirk(
  deviceName: string | undefined,
  autoCut: boolean,
  compress: boolean,
): void {
  if (autoCut && !compress && deviceName && COMPRESSION_REQUIRED_FOR_CUTTER.has(deviceName)) {
    throw new Error(
      `${deviceName} requires compression to be enabled when autocut is on (per nbuchwitz/ptouch)`,
    );
  }
}

/**
 * Resolve per-page geometry for the encoder.
 *
 * QL paths take the flat fields off the media row directly; PT paths
 * delegate to `resolveTapeGeometry` so the head-family dispatch lives
 * in one place. `engine` is required for PT and ignored for QL.
 */
function resolveEncoderGeometry(
  media: BrotherQLMedia,
  engine: EncoderEngine | undefined,
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
  if (!engine) {
    throw new Error(
      `tape system "${media.tapeSystem}" requires an engine to resolve head-family geometry`,
    );
  }
  return resolveTapeGeometry(media, engine);
}

interface EncodeContext {
  config: RasterProtocolConfig;
  engine?: EncoderEngine | undefined;
  deviceName?: string | undefined;
}

function encodeRasterJob(pages: PageData[], options: JobOptions, ctx: EncodeContext): Uint8Array {
  const { config, engine, deviceName } = ctx;
  const copies = options.copies ?? 1;
  const chunks: Uint8Array[] = [];

  // Two-colour invalidate-byte derivation (§7.1): QL bumps to 400 when
  // the engine carries `twoColor`. PT has no two-colour models today;
  // its config keeps invalidateBytes at 200 regardless.
  const baseInvalidate = config.invalidateBytes;
  const twoColorInvalidateBoost =
    engine?.protocol === 'ql-raster' && engine.capabilities?.twoColor === true;
  const invalidateBytes = twoColorInvalidateBoost ? baseInvalidate * 2 : baseInvalidate;

  // Python brother_ql sequence: raster-mode first, then invalidate, then init, then
  // raster-mode again (matches observed working sequence for QL-820NWB).
  chunks.push(buildRasterMode());
  chunks.push(buildInvalidate(invalidateBytes));
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
    const compress = opts.compress ?? false;
    const { bitmap, media } = page;

    // High-res mode requires the engine to declare `capabilities.highResDpi`.
    if (highRes && engine && engine.capabilities?.highResDpi === undefined) {
      throw new Error(
        `${deviceName ?? 'device'} does not support high-res mode (engine.capabilities.highResDpi is not set)`,
      );
    }

    maybeCheckCutterCompressionQuirk(deviceName, autoCut, compress);

    // Per §7.3: PT high-res doubles the feed margin and duplicates
    // each raster line. QL high-res leaves both untouched.
    const baseMargin = opts.marginDots ?? config.feedMarginDots;
    const marginDots = config.duplicateRasterLines && highRes ? baseMargin * 2 : baseMargin;

    // Multi-ink media (e.g. DK-22251) requires two-color mode even for black-only jobs.
    // Auto-create an empty red plane when the tape demands it but caller didn't supply one.
    const multiInk = media.palette !== undefined;
    const twoColor = page.redBitmap !== undefined || multiInk;
    const redBitmap =
      page.redBitmap ?? (multiInk ? createBitmap(bitmap.widthPx, bitmap.heightPx) : undefined);

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
    chunks.push(buildExpandedMode(cutAtEnd, highRes, twoColor, config.highResFlagBit));
    chunks.push(buildMargin(marginDots));
    if (compress) chunks.push(buildCompression(true));

    // Each raster row must cover the full print head width (derived from media geometry).
    // leftMarginPins + printAreaDots + rightMarginPins = head pin count (720 / 1296 / 128 / 560).
    const geometry = resolveEncoderGeometry(media, engine);
    const leftMarginPins = geometry.leftMarginPins;
    const totalPins = leftMarginPins + geometry.printAreaDots + geometry.rightMarginPins;
    const rowByteLen = Math.ceil(totalPins / 8);

    // Rows interleaved per raster line (matches Python brother_ql behaviour).
    // Two-color: black row then red row for each line. Single-color: black only.
    // When `compress` is on, each row's bytes are PackBits-encoded and the
    // raster-row LEN byte carries the compressed length.
    //
    // Per §7.3: PT high-res duplicates each raster line. QL doesn't.
    const duplicate = config.duplicateRasterLines && highRes;
    for (let r = 0; r < rowCount; r++) {
      const blackSrc = getRow(bitmap, r);
      const blackBytes = new Uint8Array(rowByteLen);
      placeBits(blackSrc, bitmap.widthPx, blackBytes, leftMarginPins);
      const blackPayload = compress ? packBits(blackBytes) : blackBytes;
      const blackChunk = buildRasterRow(blackPayload, 'black', twoColor);
      chunks.push(blackChunk);
      if (duplicate) chunks.push(blackChunk);

      if (twoColor && redBitmap !== undefined) {
        const redSrc = getRow(redBitmap, r);
        const redBytes = new Uint8Array(rowByteLen);
        placeBits(redSrc, redBitmap.widthPx, redBytes, leftMarginPins);
        const redPayload = compress ? packBits(redBytes) : redBytes;
        const redChunk = buildRasterRow(redPayload, 'red', twoColor);
        chunks.push(redChunk);
        if (duplicate) chunks.push(redChunk);
      }
    }

    chunks.push(buildPrintCommand(isLastPage));
  }

  return concat(...chunks);
}

/**
 * Encode a QL job. Public legacy entry point — DK media only, no
 * engine awareness, two-colour invalidate-byte boost not applied.
 * Use `encodeJobForEngine` for PT or for QL with two-colour invalidate
 * derivation from `engine.capabilities.twoColor`.
 */
export function encodeJob(pages: PageData[], options: JobOptions = {}): Uint8Array {
  return encodeRasterJob(pages, options, { config: QL_PROTOCOL_CONFIG });
}

/**
 * Encode a job for a specific engine. Dispatches on `engine.protocol`:
 * `'ql-raster'` picks the QL config, `'pt-raster'` picks the PT config
 * and threads `engine.headDots` through to head-family geometry
 * resolution for TZe / HSe media.
 *
 * `deviceName` is optional; when supplied, it enables the per-name
 * cutter-compression guard for PT-E550W (§7.2 / §12.12).
 */
export function encodeJobForEngine(
  pages: PageData[],
  options: JobOptions,
  engine: EncoderEngine,
  deviceName?: string,
): Uint8Array {
  const config = engine.protocol === 'pt-raster' ? PT_PROTOCOL_CONFIG : QL_PROTOCOL_CONFIG;
  return encodeRasterJob(pages, options, { config, engine, deviceName });
}
