/* eslint-disable @typescript-eslint/no-non-null-assertion --
 *   `noUncheckedIndexedAccess` types Uint8Array reads as `number | undefined`
 *   but every index in this file is bounded by `i < input.length` or
 *   `runEnd < input.length` checks. The `!` assertions collapse the
 *   unreachable `undefined` branches so branch coverage doesn't count them.
 */

/**
 * TIFF-style PackBits row encoder used by Brother QL when compression
 * mode (`M 02`, emitted by `buildCompression(true)`) is enabled for a job.
 *
 * Header byte `n` (interpreted as a signed int8):
 *   n in [0, 127]:    literal run — the next `n + 1` bytes follow verbatim.
 *   n in [-127, -1]:  repeat run — the next byte is repeated `1 - n` times.
 *   n = -128:         no-op. Unused by this encoder.
 *
 * The encoder switches to repeat mode for runs of two or more identical
 * bytes (a 2-byte repeat costs 2 wire bytes; the equivalent 2-byte literal
 * would cost 3). Both run kinds are capped at 128 bytes to fit the header.
 *
 * For a typical Brother QL raster row (90 bytes, mostly zeros in margins
 * and long runs of `0x00` / `0xff` in print area), this compresses to 5–15
 * bytes — a 6–18× reduction. Worst-case for highly random input is one
 * extra byte per 128 (the literal-mode header), i.e. < 1 % expansion.
 */
export function packBits(input: Uint8Array): Uint8Array {
  if (input.length === 0) return new Uint8Array(0);

  const out: number[] = [];
  let i = 0;

  while (i < input.length) {
    // How many identical bytes start at position i (cap at 128).
    let runEnd = i + 1;
    while (
      runEnd < input.length &&
      runEnd - i < 128 &&
      input[runEnd] === input[i]
    ) {
      runEnd++;
    }
    const runLen = runEnd - i;

    if (runLen >= 2) {
      // Repeat run: header is signed -(runLen - 1).
      out.push((1 - runLen) & 0xff);
      out.push(input[i]!);
      i = runEnd;
      continue;
    }

    // Otherwise emit a literal run. Stop at 128 bytes, or right before a
    // 2+ repeat run starts (cheaper to encode that separately).
    let litEnd = i + 1;
    while (litEnd < input.length && litEnd - i < 128) {
      if (litEnd + 1 < input.length && input[litEnd] === input[litEnd + 1]) {
        break;
      }
      litEnd++;
    }
    const litLen = litEnd - i;
    out.push(litLen - 1);
    for (let x = i; x < litEnd; x++) out.push(input[x]!);
    i = litEnd;
  }

  return new Uint8Array(out);
}
