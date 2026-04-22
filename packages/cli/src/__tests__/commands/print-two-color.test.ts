import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';
import type * as BitmapMod from '@mbtech-nl/bitmap';

const mockPrintTwoColor = vi.fn().mockImplementation(() => Promise.resolve());
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());
const mockPrinter = { printTwoColor: mockPrintTwoColor, close: mockClose };

vi.mock('@thermal-label/brother-ql-node', async (importOriginal) => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    openPrinter: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
    findMedia: vi.fn((id: number) => mod.findMedia(id)),
    renderImage: vi.fn(() => ({ widthPx: 720, heightPx: 10, data: new Uint8Array(90 * 10) })),
  };
});

vi.mock('@mbtech-nl/bitmap', async (importOriginal) => {
  const mod = await importOriginal<typeof BitmapMod>();
  return {
    ...mod,
    rotateBitmap: vi.fn((bmp: unknown) => bmp),
  };
});

vi.mock('@napi-rs/canvas' as string, () => ({
  loadImage: vi.fn().mockImplementation(() =>
    Promise.resolve({ width: 100, height: 50 }),
  ),
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8Array(100 * 50 * 4) })),
    })),
  })),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockImplementation(() => Promise.resolve(Buffer.alloc(0))),
}));

beforeEach(() => {
  mockPrintTwoColor.mockClear().mockImplementation(() => Promise.resolve());
  mockClose.mockClear().mockImplementation(() => Promise.resolve());
});

describe('print two-color command', () => {
  it('loads both files and calls printTwoColor', async () => {
    const { runPrintTwoColor } = await import('../../commands/print-two-color.js');
    await runPrintTwoColor('/black.png', '/red.png', { media: '259' });
    expect(mockPrintTwoColor).toHaveBeenCalledOnce();
    const [black, red, media] = mockPrintTwoColor.mock.calls[0] as unknown[];
    expect(black).toBeDefined();
    expect(red).toBeDefined();
    expect((media as { id: number }).id).toBe(259);
  });

  it('throws on unknown media ID', async () => {
    const { runPrintTwoColor } = await import('../../commands/print-two-color.js');
    await expect(runPrintTwoColor('/b.png', '/r.png', { media: '9999' })).rejects.toThrow('Unknown media ID');
  });
});
