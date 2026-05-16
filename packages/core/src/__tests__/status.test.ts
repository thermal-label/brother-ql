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
    phaseType: number;
    notification: number;
    byte25: number;
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
  bytes[19] = overrides?.phaseType ?? 0x00;
  bytes[22] = overrides?.notification ?? 0x00;
  bytes[25] = overrides?.byte25 ?? 0;
  return bytes;
}

/**
 * Verbatim 32-byte captures from scripts/STATUS-CAPTURE.md. These lock
 * in the byte-25 two-color flag against the registry — without them,
 * the DK-22251/DK-22205 detection ambiguity could silently regress.
 */
function captureBytes(values: readonly number[]): Uint8Array {
  if (values.length !== 32) throw new Error(`expected 32 bytes, got ${values.length.toString()}`);
  return Uint8Array.from(values);
}

const CAPTURE_DK_22251 = captureBytes([
  0x80, 0x20, 0x42, 0x34, 0x41, 0x30, 0x04, 0x00, 0x00, 0x00, 0x3e, 0x0a, 0x00, 0x00, 0x23, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x81, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const CAPTURE_DK_22205 = captureBytes([
  0x80, 0x20, 0x42, 0x34, 0x41, 0x30, 0x04, 0x00, 0x00, 0x00, 0x3e, 0x0a, 0x00, 0x00, 0x15, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const CAPTURE_DK_11201 = captureBytes([
  0x80, 0x20, 0x42, 0x34, 0x41, 0x30, 0x04, 0x00, 0x00, 0x00, 0x1d, 0x0b, 0x00, 0x00, 0x01, 0x00,
  0x00, 0x5a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const CAPTURE_DK_22214 = captureBytes([
  0x80, 0x20, 0x42, 0x34, 0x41, 0x30, 0x04, 0x00, 0x00, 0x00, 0x0c, 0x0a, 0x00, 0x00, 0x1a, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

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
    const status = parseStatus(makeStatusBytes({ mediaWidthMm: 100, mediaTypeByte: 0x0a }));
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

  it('byte 25 bit 7 set → resolves to DK-22251 (two-color, palette set)', () => {
    const status = parseStatus(
      makeStatusBytes({ mediaWidthMm: 62, mediaTypeByte: 0x0a, byte25: 0x81 }),
    );
    expect(status.detectedMedia?.id).toBe(251);
    expect(status.detectedMedia?.palette).toBeDefined();
  });

  it('byte 25 bit 7 clear → resolves to DK-22205 (single-color, no palette)', () => {
    const status = parseStatus(
      makeStatusBytes({ mediaWidthMm: 62, mediaTypeByte: 0x0a, byte25: 0x01 }),
    );
    expect(status.detectedMedia?.id).toBe(259);
    expect(status.detectedMedia?.palette).toBeUndefined();
  });

  it('detectedMedia is omitted when no media is loaded', () => {
    const status = parseStatus(makeStatusBytes({ mediaWidthMm: 0, mediaTypeByte: 0 }));
    expect(status.detectedMedia).toBeUndefined();
  });
});

describe('parseStatus — details[]', () => {
  it('always emits a Print phase row', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.details).toBeDefined();
    const phase = status.details?.find(d => d.label === 'Print phase');
    expect(phase).toEqual({ label: 'Print phase', value: 'receiving' });
  });

  it('Print phase is "receiving" when byte 19 is 0x00', () => {
    const status = parseStatus(makeStatusBytes({ phaseType: 0x00 }));
    expect(status.details?.find(d => d.label === 'Print phase')?.value).toBe('receiving');
  });

  it('Print phase is "printing" when byte 19 is 0x01', () => {
    const status = parseStatus(makeStatusBytes({ phaseType: 0x01 }));
    expect(status.details?.find(d => d.label === 'Print phase')?.value).toBe('printing');
  });

  it('no Head cooling row when byte 22 is 0x00 (none)', () => {
    const status = parseStatus(makeStatusBytes({ notification: 0x00 }));
    expect(status.details?.some(d => d.label === 'Head cooling')).toBe(false);
  });

  it('emits a warn-severity Head cooling row when cooling started (0x03)', () => {
    const status = parseStatus(makeStatusBytes({ notification: 0x03 }));
    expect(status.details?.find(d => d.label === 'Head cooling')).toEqual({
      label: 'Head cooling',
      value: 'cooling started',
      severity: 'warn',
    });
  });

  it('emits an info Head cooling row when cooling finished (0x04)', () => {
    const status = parseStatus(makeStatusBytes({ notification: 0x04 }));
    const cooling = status.details?.find(d => d.label === 'Head cooling');
    expect(cooling).toEqual({ label: 'Head cooling', value: 'cooling finished' });
    expect(cooling?.severity).toBeUndefined();
  });

  it('no Editor Lite row when editorLiteMode is false', () => {
    const status = parseStatus(makeStatusBytes());
    expect(status.editorLiteMode).toBe(false);
    expect(status.details?.some(d => d.label === 'Editor Lite mode')).toBe(false);
  });

  it('details carries both phase and cooling rows while printing + cooling', () => {
    const status = parseStatus(makeStatusBytes({ phaseType: 0x01, notification: 0x03 }));
    expect(status.details).toEqual([
      { label: 'Print phase', value: 'printing' },
      { label: 'Head cooling', value: 'cooling started', severity: 'warn' },
    ]);
  });
});

describe('parseStatus — real hardware captures', () => {
  it('DK-22251 (62mm two-color continuous) resolves to id 251 with palette', () => {
    const status = parseStatus(CAPTURE_DK_22251);
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(251);
    expect(status.detectedMedia?.palette).toBeDefined();
    expect(status.errors).toEqual([]);
  });

  it('DK-22205 (62mm single-color continuous) resolves to id 259, NOT 251', () => {
    const status = parseStatus(CAPTURE_DK_22205);
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(259);
    expect(status.detectedMedia?.palette).toBeUndefined();
    expect(status.errors).toEqual([]);
  });

  it('DK-11201 (29×90mm die-cut) resolves to id 271', () => {
    const status = parseStatus(CAPTURE_DK_11201);
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(271);
    expect(status.errors).toEqual([]);
  });

  it('DK-22214 (12mm continuous) resolves to id 257', () => {
    const status = parseStatus(CAPTURE_DK_22214);
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(257);
    expect(status.errors).toEqual([]);
  });
});

describe('STATUS_REQUEST', () => {
  it('is the correct byte sequence', () => {
    expect(Array.from(STATUS_REQUEST)).toEqual([0x1b, 0x69, 0x53]);
  });
});
