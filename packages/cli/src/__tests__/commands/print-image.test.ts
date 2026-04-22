import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';

const mockPrintImage = vi.fn().mockImplementation(() => Promise.resolve());
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());
const mockPrinter = { printImage: mockPrintImage, close: mockClose };

vi.mock('@thermal-label/brother-ql-node', async (importOriginal) => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    openPrinter: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
    findMedia: vi.fn((id: number) => mod.findMedia(id)),
  };
});

beforeEach(() => {
  mockPrintImage.mockClear().mockImplementation(() => Promise.resolve());
  mockClose.mockClear().mockImplementation(() => Promise.resolve());
});

describe('print image command', () => {
  it('calls printImage with correct args', async () => {
    const { runPrintImage } = await import('../../commands/print-image.js');
    await runPrintImage('/path/to/img.png', { media: '259', threshold: '128', cut: true });
    expect(mockPrintImage).toHaveBeenCalledOnce();
    const [file, media, opts] = mockPrintImage.mock.calls[0] as unknown[];
    expect(file).toBe('/path/to/img.png');
    expect((media as { id: number }).id).toBe(259);
    expect((opts as { threshold: number }).threshold).toBe(128);
  });

  it('throws on unknown media ID', async () => {
    const { runPrintImage } = await import('../../commands/print-image.js');
    await expect(runPrintImage('/img.png', { media: '9999' })).rejects.toThrow('Unknown media ID');
  });
});
