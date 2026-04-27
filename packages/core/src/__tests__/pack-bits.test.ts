import { describe, expect, it } from 'vitest';
import { packBits } from '../pack-bits.js';

// Reference TIFF PackBits decoder. Used to round-trip arbitrary inputs and
// confirm the encoder emits a stream the canonical algorithm can decode.
function unpackBits(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < input.length) {
    const header = input[i]!;
    const signed = header > 127 ? header - 256 : header;
    if (signed >= 0) {
      const n = signed + 1;
      for (let j = 0; j < n; j++) out.push(input[i + 1 + j]!);
      i += 1 + n;
    } else if (signed >= -127) {
      const n = 1 - signed;
      for (let j = 0; j < n; j++) out.push(input[i + 1]!);
      i += 2;
    } else {
      i++; // signed === -128: no-op
    }
  }
  return new Uint8Array(out);
}

describe('packBits', () => {
  it('emits empty output for empty input', () => {
    expect(packBits(new Uint8Array(0)).length).toBe(0);
  });

  it('encodes a single byte as a 1-byte literal', () => {
    expect(Array.from(packBits(new Uint8Array([0x42])))).toEqual([0x00, 0x42]);
  });

  it('encodes a 2-byte repeat as 2 wire bytes', () => {
    // -(2-1) = -1 → 0xFF
    expect(Array.from(packBits(new Uint8Array([0x42, 0x42])))).toEqual([0xff, 0x42]);
  });

  it('compresses an all-zero 90-byte row to 2 bytes (the common case)', () => {
    const result = packBits(new Uint8Array(90));
    // -(90-1) = -89 = 0xA7
    expect(Array.from(result)).toEqual([0xa7, 0x00]);
  });

  it('caps repeat runs at 128 bytes — 130 zeros split into 128 + 2', () => {
    const result = packBits(new Uint8Array(130));
    // -(128-1) = -127 = 0x81; -(2-1) = -1 = 0xFF
    expect(Array.from(result)).toEqual([0x81, 0x00, 0xff, 0x00]);
  });

  it('caps literal runs at 128 bytes', () => {
    // 130 distinct bytes split into 128 + 2 literals.
    const input = new Uint8Array(130);
    for (let i = 0; i < 130; i++) input[i] = i & 0xff;
    const result = packBits(input);
    expect(result[0]).toBe(0x7f); // header for 128 literals
    expect(result[129]).toBe(0x01); // header for 2 literals
    expect(result.length).toBe(132);
  });

  it('mixes literal and repeat runs', () => {
    // A A B C D D D E
    const input = new Uint8Array([0x10, 0x10, 0x20, 0x30, 0x40, 0x40, 0x40, 0x50]);
    expect(Array.from(packBits(input))).toEqual([
      0xff,
      0x10, // -1: 2 repeats of 0x10
      0x01,
      0x20,
      0x30, // 1: 2 literals
      0xfe,
      0x40, // -2: 3 repeats of 0x40
      0x00,
      0x50, // 0: 1 literal
    ]);
  });

  it('round-trips a label-like row (margins + bar + scattered) through the spec decoder', () => {
    // Mimic a typical raster row: 12 zero-byte margin, 50 bytes of 0xFF
    // (solid bar), 12 mixed bytes (text), 16 zero-byte trailing margin.
    const original = new Uint8Array(90);
    for (let i = 12; i < 62; i++) original[i] = 0xff;
    for (let i = 62; i < 74; i++) original[i] = (i * 7) & 0xff;

    const compressed = packBits(original);
    const decoded = unpackBits(compressed);
    expect(Array.from(decoded)).toEqual(Array.from(original));
    // And it actually saves bytes — the whole point.
    expect(compressed.length).toBeLessThan(original.length);
  });
});
