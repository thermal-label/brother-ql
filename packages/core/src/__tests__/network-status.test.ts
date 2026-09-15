import { describe, it, expect } from 'vitest';
import { parseMediaName, statusFromPrinterMib, type PrinterMibStatus } from '../network-status.js';

/** Bench values, QL-820NWBc 2026-09-15 (plan 17 Context). */
const DK_11201_NAME = '29mm x 90mm / 1.1" x 3.5"';
const DK_22205_NAME = '62mm / 2.4"';

function mib(overrides: Partial<PrinterMibStatus> = {}): PrinterMibStatus {
  return {
    printerStatus: 3,
    errorState: new Uint8Array([0x00]),
    mediaName: DK_22205_NAME,
    feedDir: -1,
    xFeedDir: -1,
    ...overrides,
  };
}

/** Octets with the given RFC 2790 bit numbers set (bit 0 = MSB of octet 0). */
function errorBits(...bits: number[]): Uint8Array {
  const octets = new Uint8Array(2);
  for (const bit of bits) octets[bit >> 3] = (octets[bit >> 3] ?? 0) | (0x80 >> (bit & 7));
  return octets;
}

describe('parseMediaName', () => {
  it.each([
    [DK_11201_NAME, { widthMm: 29, heightMm: 90 }],
    [DK_22205_NAME, { widthMm: 62 }],
    ['17mm x 54mm / 0.66" x 2.1"', { widthMm: 17, heightMm: 54 }],
    ['62mm', { widthMm: 62 }],
    ['24mm Dia / 0.9" Dia', { widthMm: 24, heightMm: 24 }],
    ['29 mm × 90 mm', { widthMm: 29, heightMm: 90 }],
  ])('%s', (name, expected) => {
    expect(parseMediaName(name)).toEqual(expected);
  });

  it.each(['', 'garbage', '2.4"', 'mm', '62 / 2.4"', 'Roll 62'])('rejects %j', name => {
    expect(parseMediaName(name)).toBeUndefined();
  });
});

describe('statusFromPrinterMib', () => {
  it('idle, no errors, 62 mm continuous → ready with DK-22205 and the two-colour warning', () => {
    const status = statusFromPrinterMib(mib());
    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.mediaLoaded).toBe(true);
    expect(status.detectedMedia?.id).toBe(259);
    expect(status.rawBytes).toHaveLength(0);
    expect(status.details).toContainEqual({
      label: 'Two-colour',
      value: 'not detectable over network',
      severity: 'warn',
    });
    expect(status.details?.find(d => d.label === 'Printer state')?.value).toBe('idle');
  });

  it('29×90 die-cut → DK-11201, no two-colour row', () => {
    const status = statusFromPrinterMib(mib({ mediaName: DK_11201_NAME }));
    expect(status.detectedMedia?.id).toBe(271);
    expect(status.details?.some(d => d.label === 'Two-colour')).toBe(false);
  });

  it('printing counts as ready; warmup, other and unknown do not', () => {
    expect(statusFromPrinterMib(mib({ printerStatus: 4 })).ready).toBe(true);
    expect(statusFromPrinterMib(mib({ printerStatus: 5 })).ready).toBe(false);
    expect(statusFromPrinterMib(mib({ printerStatus: 1 })).ready).toBe(false);
    expect(statusFromPrinterMib(mib({ printerStatus: 99 })).ready).toBe(false);
    expect(
      statusFromPrinterMib(mib({ printerStatus: 99 })).details?.find(
        d => d.label === 'Printer state',
      )?.value,
    ).toBe('unknown');
  });

  it.each([
    [1, 'no_media', 'No media'],
    [4, 'cover_open', 'Cover open'],
    [5, 'cutter_jam', 'Jammed'],
    [6, 'not_ready', 'Offline'],
    [7, 'system_error', 'Service requested'],
    [13, 'no_media', 'Input tray empty'],
    [8, 'system_error', 'inputTrayMissing'],
    [14, 'system_error', 'overduePreventMaint'],
  ])('error-state bit %i → %s', (bit, code, message) => {
    const status = statusFromPrinterMib(mib({ errorState: errorBits(bit) }));
    expect(status.errors).toEqual([{ code, message }]);
    expect(status.ready).toBe(false);
  });

  it('lowPaper is a warning row, not an error', () => {
    const status = statusFromPrinterMib(mib({ errorState: errorBits(0) }));
    expect(status.errors).toEqual([]);
    expect(status.ready).toBe(true);
    expect(status.details).toContainEqual({ label: 'Media', value: 'Media low', severity: 'warn' });
  });

  it('reads error state from 0, 1 and 2 octets', () => {
    expect(statusFromPrinterMib(mib({ errorState: new Uint8Array(0) })).errors).toEqual([]);
    expect(statusFromPrinterMib(mib({ errorState: new Uint8Array([0x08]) })).errors).toEqual([
      { code: 'cover_open', message: 'Cover open' },
    ]);
    expect(statusFromPrinterMib(mib({ errorState: new Uint8Array([0x00, 0x04]) })).errors).toEqual([
      { code: 'no_media', message: 'Input tray empty' },
    ]);
  });

  it('prefers Dim OIDs in ten-thousandths of an inch (unit 3)', () => {
    // 29 mm = 11417, 90 mm = 35433 ten-thousandths of an inch.
    const status = statusFromPrinterMib(
      mib({ mediaName: 'nonsense', xFeedDir: 11417, feedDir: 35433, dimUnit: 3 }),
    );
    expect(status.detectedMedia?.id).toBe(271);
  });

  it('prefers Dim OIDs in micrometres (unit 4)', () => {
    const status = statusFromPrinterMib(
      mib({ mediaName: 'nonsense', xFeedDir: 62000, feedDir: -1, dimUnit: 4 }),
    );
    expect(status.detectedMedia?.id).toBe(259);
  });

  it('falls back to the name when the Dim OIDs are negative or the unit is unknown', () => {
    expect(
      statusFromPrinterMib(mib({ mediaName: DK_11201_NAME, xFeedDir: -1, feedDir: -1, dimUnit: 3 }))
        .detectedMedia?.id,
    ).toBe(271);
    expect(
      statusFromPrinterMib(mib({ mediaName: DK_11201_NAME, xFeedDir: 11417, feedDir: 35433 }))
        .detectedMedia?.id,
    ).toBe(271);
  });

  it('unrecognised media name → no media, warn row with the raw string', () => {
    const status = statusFromPrinterMib(mib({ mediaName: 'Roll 62' }));
    expect(status.mediaLoaded).toBe(false);
    expect(status.detectedMedia).toBeUndefined();
    expect(status.details).toContainEqual({
      label: 'Media',
      value: 'not recognised: "Roll 62"',
      severity: 'warn',
    });
    expect(status.ready).toBe(true);
  });

  it('a recognised size with no registry entry → warn row, no media', () => {
    const status = statusFromPrinterMib(mib({ mediaName: '99mm x 99mm / x' }));
    expect(status.detectedMedia).toBeUndefined();
    expect(status.details?.some(d => d.value.startsWith('not recognised'))).toBe(true);
  });
});
