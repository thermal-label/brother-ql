import { describe, it, expect } from 'vitest';
import { parseStatus, STATUS_REQUEST } from '../status.js';

function makeStatusBytes(
  overrides?: Partial<{
    errInfo1: number;
    errInfo2: number;
    mediaWidthMm: number;
    mediaTypeByte: number;
    statusType: number;
  }>,
): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes[0] = 0x80;
  bytes[1] = 0x20;
  bytes[2] = 0x42;
  bytes[3] = 0x30;
  bytes[8] = overrides?.errInfo1 ?? 0;
  bytes[9] = overrides?.errInfo2 ?? 0;
  bytes[10] = overrides?.mediaWidthMm ?? 62;
  bytes[11] = overrides?.mediaTypeByte ?? 0x0a;
  bytes[14] = overrides?.statusType ?? 0x00;
  return bytes;
}

describe('parseStatus', () => {
  it('throws on short input', () => {
    expect(() => parseStatus(new Uint8Array(10))).toThrow('too short');
  });

  it('returns ready=true with no errors', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.ready).toBe(true);
    expect(status.errors).toHaveLength(0);
  });

  it('parses media width and type', () => {
    const status = parseStatus(makeStatusBytes({ mediaWidthMm: 62, mediaTypeByte: 0x0a }));
    expect(status.mediaWidthMm).toBe(62);
    expect(status.mediaType).toBe('continuous');
  });

  it('parses die-cut media type', () => {
    const status = parseStatus(makeStatusBytes({ mediaTypeByte: 0x0b }));
    expect(status.mediaType).toBe('die-cut');
  });

  it('returns null mediaType for unknown byte', () => {
    const status = parseStatus(makeStatusBytes({ mediaTypeByte: 0xff }));
    expect(status.mediaType).toBeNull();
  });

  it('parses error info 1 bits', () => {
    const status = parseStatus(makeStatusBytes({ errInfo1: 0b00000001 })); // No media
    expect(status.errors).toContain('No media');
    expect(status.ready).toBe(false);
  });

  it('parses error info 2 bits', () => {
    const status = parseStatus(makeStatusBytes({ errInfo2: 0b00010000 })); // Cover open
    expect(status.errors).toContain('Cover open');
    expect(status.ready).toBe(false);
  });

  it('ready=false when statusType is error (0x02)', () => {
    const status = parseStatus(makeStatusBytes({ statusType: 0x02 }));
    expect(status.ready).toBe(false);
  });

  it('rawBytes contains the full 32-byte input', () => {
    const bytes = makeStatusBytes();
    const status = parseStatus(bytes);
    expect(status.rawBytes).toEqual(bytes);
  });

  it('editorLiteMode is false (detected at discovery time, not from status bytes)', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.editorLiteMode).toBe(false);
  });
});

describe('STATUS_REQUEST', () => {
  it('is the correct byte sequence', () => {
    expect(Array.from(STATUS_REQUEST)).toEqual([0x1b, 0x69, 0x53]);
  });
});
