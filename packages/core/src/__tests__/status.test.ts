import { describe, it, expect } from 'vitest';
import { parseStatus, STATUS_REQUEST } from '../status.js';

function makeStatusBytes(
  overrides?: Partial<{
    errInfo1: number;
    errInfo2: number;
    mediaWidthMm: number;
    mediaLengthMm: number;
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
  bytes[17] = overrides?.mediaLengthMm ?? 0;
  bytes[18] = overrides?.statusType ?? 0x00;
  return bytes;
}

describe('parseStatus', () => {
  it('throws on short input', () => {
    expect(() => parseStatus(new Uint8Array(10))).toThrow('too short');
  });

  it('returns ready=true with no errors', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
  });

  it('resolves 62mm continuous to detectedMedia', () => {
    const status = parseStatus(makeStatusBytes({ mediaWidthMm: 62, mediaTypeByte: 0x0a }));
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(259);
    expect(status.detectedMedia?.widthMm).toBe(62);
    expect(status.detectedMedia?.type).toBe('continuous');
  });

  it('resolves 62x29mm die-cut to detectedMedia', () => {
    const status = parseStatus(
      makeStatusBytes({ mediaWidthMm: 62, mediaTypeByte: 0x0b, mediaLengthMm: 29 }),
    );
    expect(status.detectedMedia?.id).toBe(274);
    expect(status.detectedMedia?.type).toBe('die-cut');
    expect(status.detectedMedia?.heightMm).toBe(29);
  });

  it('leaves detectedMedia undefined for unknown media', () => {
    const status = parseStatus(
      makeStatusBytes({ mediaWidthMm: 100, mediaTypeByte: 0x0a }),
    );
    expect(status.detectedMedia).toBeUndefined();
  });

  it('leaves mediaLoaded=false when width is 0', () => {
    const status = parseStatus(makeStatusBytes({ mediaWidthMm: 0, mediaTypeByte: 0 }));
    expect(status.mediaLoaded).toBe(false);
  });

  it('surfaces no_media error code for err1 bit 0', () => {
    const status = parseStatus(makeStatusBytes({ errInfo1: 0b00000001 }));
    expect(status.errors.map(e => e.code)).toContain('no_media');
    expect(status.ready).toBe(false);
  });

  it('surfaces cover_open error code for err2 bit 4', () => {
    const status = parseStatus(makeStatusBytes({ errInfo2: 0b00010000 }));
    expect(status.errors.map(e => e.code)).toContain('cover_open');
    expect(status.ready).toBe(false);
  });

  it('surfaces cutter_jam error code for err1 bit 2', () => {
    const status = parseStatus(makeStatusBytes({ errInfo1: 0b00000100 }));
    expect(status.errors.map(e => e.code)).toContain('cutter_jam');
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

  it('editorLiteMode is on the BrotherQLStatus extension', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.editorLiteMode).toBe(false);
  });
});

describe('STATUS_REQUEST', () => {
  it('is the correct byte sequence', () => {
    expect(Array.from(STATUS_REQUEST)).toEqual([0x1b, 0x69, 0x53]);
  });
});
