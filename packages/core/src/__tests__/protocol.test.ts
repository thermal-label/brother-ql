import { describe, it, expect } from 'vitest';
import { createBitmap } from '@mbtech-nl/bitmap';
import {
  buildInvalidate,
  buildInitialize,
  buildRasterMode,
  buildRasterRow,
  buildPrintCommand,
  buildPrintInfo,
  encodeJob,
} from '../protocol.js';
import { type PageData } from '../types.js';
import { MEDIA } from '../media.js';

describe('buildInvalidate', () => {
  it('returns exactly 400 zero bytes', () => {
    const buf = buildInvalidate();
    expect(buf.length).toBe(400);
    expect(buf.every((b) => b === 0)).toBe(true);
  });
});

describe('buildInitialize', () => {
  it('returns [0x1B, 0x40]', () => {
    expect(Array.from(buildInitialize())).toEqual([0x1b, 0x40]);
  });
});

describe('buildRasterRow', () => {
  it('black row: first byte 0x67, second 0x00, correct payload length', () => {
    const payload = new Uint8Array(90).fill(0xaa);
    const row = buildRasterRow(payload, 'black');
    expect(row[0]).toBe(0x67);
    expect(row[1]).toBe(0x00);
    expect(row.length).toBe(92);
  });

  it('red row: first byte 0x77, second 0x00', () => {
    const payload = new Uint8Array(90);
    const row = buildRasterRow(payload, 'red');
    expect(row[0]).toBe(0x77);
    expect(row[1]).toBe(0x00);
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
});

describe('encodeJob', () => {
  const media62 = MEDIA[259]!; // 62mm, 696 printAreaDots

  function makePage(widthPx: number, heightPx: number): PageData {
    const bitmap = createBitmap(widthPx, heightPx);
    return { bitmap, media: media62 };
  }

  it('single page: starts with 400 zeros, ends with 0x1A', () => {
    const page = makePage(720, 50);
    const buf = encodeJob([page]);
    // First 400 bytes are zeros (invalidate)
    for (let i = 0; i < 400; i++) expect(buf[i]).toBe(0);
    expect(buf.at(-1)).toBe(0x1a);
  });

  it('two-page job: second page has control codes, ends with 0x1A', () => {
    const page1 = makePage(720, 10);
    const page2 = makePage(720, 10);
    const buf = encodeJob([page1, page2]);
    expect(buf.at(-1)).toBe(0x1a);
    // 0x0C should appear as the inter-page print command somewhere before the last byte
    const printCmds = [];
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0x0c) printCmds.push(i);
    }
    expect(printCmds.length).toBeGreaterThan(0);
  });

  it('two-color job: black rows use 0x67, red rows use 0x77', () => {
    const bitmap = createBitmap(720, 5);
    const redBitmap = createBitmap(720, 5);
    const page: PageData = { bitmap, redBitmap, media: media62 };
    const buf = encodeJob([page]);
    const blackRows = [];
    const redRows = [];
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0x67 && buf[i + 1] === 0x00) blackRows.push(i);
      if (buf[i] === 0x77 && buf[i + 1] === 0x00) redRows.push(i);
    }
    expect(blackRows.length).toBe(5);
    expect(redRows.length).toBe(5);
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
    // With 2 copies we should have more bytes
    expect(buf2.length).toBeGreaterThan(buf1.length);
  });
});

describe('buildRasterMode', () => {
  it('returns correct bytes', () => {
    expect(Array.from(buildRasterMode())).toEqual([0x1b, 0x69, 0x61, 0x01]);
  });
});
