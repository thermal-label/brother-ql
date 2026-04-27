import { describe, it, expect } from 'vitest';
import { createBitmap } from '@mbtech-nl/bitmap';
import {
  buildInvalidate,
  buildInitialize,
  buildRasterMode,
  buildRasterRow,
  buildPrintCommand,
  buildPrintInfo,
  buildZeroRow,
  buildCompression,
  buildStatusNotification,
  buildVariousMode,
  buildExpandedMode,
  encodeJob,
} from '../protocol.js';
import type { PageData } from '../types.js';
import { MEDIA } from '../media.js';

describe('buildInvalidate', () => {
  it('returns exactly 200 zero bytes', () => {
    const buf = buildInvalidate();
    expect(buf.length).toBe(200);
    expect(buf.every(b => b === 0)).toBe(true);
  });
});

describe('buildInitialize', () => {
  it('returns [0x1B, 0x40]', () => {
    expect(Array.from(buildInitialize())).toEqual([0x1b, 0x40]);
  });
});

describe('buildRasterRow', () => {
  it('single-color black: [0x67][0x00][len][data]', () => {
    const payload = new Uint8Array(90).fill(0xaa);
    const row = buildRasterRow(payload, 'black');
    expect(row[0]).toBe(0x67);
    expect(row[1]).toBe(0x00);
    expect(row[2]).toBe(90);
    expect(row.length).toBe(93);
  });

  it('two-color black: [0x77][0x01][len][data]', () => {
    const payload = new Uint8Array(90);
    const row = buildRasterRow(payload, 'black', true);
    expect(row[0]).toBe(0x77);
    expect(row[1]).toBe(0x01);
    expect(row[2]).toBe(90);
  });

  it('two-color red: [0x77][0x02][len][data]', () => {
    const payload = new Uint8Array(90);
    const row = buildRasterRow(payload, 'red', true);
    expect(row[0]).toBe(0x77);
    expect(row[1]).toBe(0x02);
    expect(row[2]).toBe(90);
  });
});

describe('buildPrintCommand', () => {
  it('last page returns [0x1A]', () => {
    expect(Array.from(buildPrintCommand(true))).toEqual([0x1a]);
  });

  it('non-last page returns [0x0C]', () => {
    expect(Array.from(buildPrintCommand(false))).toEqual([0x0c]);
  });
});

describe('buildPrintInfo', () => {
  it('byte 5 contains correct media width, bytes 7-8 correct row count LE', () => {
    const media = MEDIA[259]!; // 62mm continuous
    const buf = buildPrintInfo(media, 200, 0);
    expect(buf[5]).toBe(62); // widthMm
    // rowCount 200 = 0xC8 at bytes 7-8
    expect(buf[7]).toBe(0xc8);
    expect(buf[8]).toBe(0x00);
  });

  it('page index is at byte 9', () => {
    const media = MEDIA[259]!;
    const buf = buildPrintInfo(media, 100, 3);
    expect(buf[9]).toBe(3);
  });

  it('die-cut media sets mediaType byte to 0x0b', () => {
    const media = MEDIA[271]!; // 29x90mm die-cut
    const buf = buildPrintInfo(media, 100, 0);
    expect(buf[4]).toBe(0x0b);
  });
});

describe('encodeJob', () => {
  const media62 = MEDIA[259]!; // 62mm, 696 printAreaDots

  function makePage(widthPx: number, heightPx: number): PageData {
    const bitmap = createBitmap(widthPx, heightPx);
    return { bitmap, media: media62 };
  }

  it('single page: contains ESC i a + 200 zero invalidate, ends with 0x1A', () => {
    const page = makePage(696, 50);
    const buf = encodeJob([page]);
    // Starts with ESC i a 01 (raster mode, 4 bytes) then 200 zero invalidate bytes
    expect(buf[0]).toBe(0x1b);
    expect(buf[1]).toBe(0x69);
    expect(buf[2]).toBe(0x61);
    expect(buf[3]).toBe(0x01);
    for (let i = 4; i < 204; i++) expect(buf[i]).toBe(0);
    expect(buf.at(-1)).toBe(0x1a);
  });

  it('two-page job: second page has control codes, ends with 0x1A', () => {
    const page1 = makePage(696, 10);
    const page2 = makePage(696, 10);
    const buf = encodeJob([page1, page2]);
    expect(buf.at(-1)).toBe(0x1a);
    // 0x0C should appear as the inter-page print command somewhere before the last byte
    const printCmds = [];
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0x0c) printCmds.push(i);
    }
    expect(printCmds.length).toBeGreaterThan(0);
  });

  it('two-color job: black rows [0x77,0x01,len], red rows [0x77,0x02,len], interleaved', () => {
    const bitmap = createBitmap(696, 5);
    const redBitmap = createBitmap(696, 5);
    const page: PageData = { bitmap, redBitmap, media: media62 };
    const buf = encodeJob([page]);
    const rowLen = 90;
    const blackRows: number[] = [];
    const redRows: number[] = [];
    for (let i = 0; i < buf.length - 2; i++) {
      if (buf[i] === 0x77 && buf[i + 1] === 0x01 && buf[i + 2] === rowLen) blackRows.push(i);
      if (buf[i] === 0x77 && buf[i + 1] === 0x02 && buf[i + 2] === rowLen) redRows.push(i);
    }
    expect(blackRows.length).toBe(5);
    expect(redRows.length).toBe(5);
    // Verify interleaving: each black row is immediately followed by a red row (93 bytes apart)
    for (let r = 0; r < 5; r++) {
      expect(redRows[r]! - blackRows[r]!).toBe(93); // 3 header + 90 data
    }
  });

  it('two-color job: throws if red bitmap dimensions mismatch', () => {
    const bitmap = createBitmap(720, 5);
    const redBitmap = createBitmap(720, 10); // different height
    const page: PageData = { bitmap, redBitmap, media: media62 };
    expect(() => encodeJob([page])).toThrow('identical dimensions');
  });

  it('copies option repeats the job', () => {
    const page = makePage(720, 2);
    const buf1 = encodeJob([page]);
    const buf2 = encodeJob([page], { copies: 2 });
    expect(buf2.length).toBeGreaterThan(buf1.length);
  });

  it('compress option includes compression command [0x4D, 0x02]', () => {
    const page: PageData = { ...makePage(696, 5), options: { compress: true } };
    const buf = encodeJob([page]);
    let found = false;
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0x4d && buf[i + 1] === 0x02) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('compress option PackBits-encodes each raster row (LEN < uncompressed size)', () => {
    // All-zero bitmap → every row is 90 zero bytes. PackBits collapses each
    // row to 2 wire bytes (0xA7 0x00), so the LEN byte in the row header
    // should be 2 instead of 90.
    const page: PageData = { ...makePage(696, 3), options: { compress: true } };
    const buf = encodeJob([page]);
    // Find single-color row headers (0x67 0x00 LEN). With compression on,
    // LEN should be 2 for each row, and the payload byte should be 0x00.
    const rowHeaders: number[] = [];
    for (let i = 0; i < buf.length - 4; i++) {
      if (buf[i] === 0x67 && buf[i + 1] === 0x00) {
        // Skip the byte sequence inside the 200-byte invalidate block
        // (which is also all zeros, so 0x67 won't appear there). Heuristic:
        // verify the next byte after LEN is the PackBits header 0xA7.
        if (buf[i + 2] === 2 && buf[i + 3] === 0xa7 && buf[i + 4] === 0x00) {
          rowHeaders.push(i);
        }
      }
    }
    expect(rowHeaders.length).toBe(3);
  });

  it('compress option two-color: both planes PackBits-encoded per row', () => {
    const bitmap = createBitmap(696, 2);
    const redBitmap = createBitmap(696, 2);
    const page: PageData = {
      bitmap,
      redBitmap,
      media: media62,
      options: { compress: true },
    };
    const buf = encodeJob([page]);
    const blackRows: number[] = [];
    const redRows: number[] = [];
    for (let i = 0; i < buf.length - 4; i++) {
      // Each compressed row is [0x77 0x01|0x02 0x02 0xA7 0x00] for an empty
      // 696-pin row (90 zero bytes → 2 PackBits bytes).
      if (buf[i] === 0x77 && buf[i + 2] === 2 && buf[i + 3] === 0xa7 && buf[i + 4] === 0x00) {
        if (buf[i + 1] === 0x01) blackRows.push(i);
        if (buf[i + 1] === 0x02) redRows.push(i);
      }
    }
    expect(blackRows.length).toBe(2);
    expect(redRows.length).toBe(2);
  });
});

describe('buildRasterMode', () => {
  it('returns correct bytes', () => {
    expect(Array.from(buildRasterMode())).toEqual([0x1b, 0x69, 0x61, 0x01]);
  });
});

describe('buildStatusNotification', () => {
  it('disabled returns [0x1B, 0x69, 0x21, 0x00]', () => {
    expect(Array.from(buildStatusNotification(false))).toEqual([0x1b, 0x69, 0x21, 0x00]);
  });

  it('enabled returns [0x1B, 0x69, 0x21, 0x01]', () => {
    expect(Array.from(buildStatusNotification(true))).toEqual([0x1b, 0x69, 0x21, 0x01]);
  });
});

describe('buildVariousMode', () => {
  it('autoCut=true returns 0x40 flag', () => {
    expect(buildVariousMode(true)[3]).toBe(0x40);
  });

  it('autoCut=false returns 0x00 flag', () => {
    expect(buildVariousMode(false)[3]).toBe(0x00);
  });
});

describe('buildExpandedMode', () => {
  it('cutAtEnd=true sets bit 3', () => {
    expect((buildExpandedMode(true, false)[3] ?? 0) & 0x08).toBe(0x08);
  });

  it('highRes=true sets bit 4', () => {
    expect((buildExpandedMode(false, true)[3] ?? 0) & 0x10).toBe(0x10);
  });

  it('twoColor=true sets bit 0', () => {
    expect((buildExpandedMode(false, false, true)[3] ?? 0) & 0x01).toBe(0x01);
  });

  it('both false returns 0x00 flags', () => {
    expect(buildExpandedMode(false, false)[3]).toBe(0x00);
  });
});

describe('buildPrintInfo twoColor flag', () => {
  it('always uses 0xCE valid flags (Python brother_ql behaviour for two-color capable models)', () => {
    const media = MEDIA[259]!;
    const buf = buildPrintInfo(media, 100, 0);
    expect(buf[3]).toBe(0xce);
  });
});

describe('buildZeroRow', () => {
  it('returns [0x5A]', () => {
    expect(Array.from(buildZeroRow())).toEqual([0x5a]);
  });
});

describe('buildCompression', () => {
  it('enabled returns [0x4D, 0x02]', () => {
    expect(Array.from(buildCompression(true))).toEqual([0x4d, 0x02]);
  });

  it('disabled returns [0x4D, 0x00]', () => {
    expect(Array.from(buildCompression(false))).toEqual([0x4d, 0x00]);
  });
});
