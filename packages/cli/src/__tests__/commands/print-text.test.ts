import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';

const mockPrintText = vi.fn().mockImplementation(() => Promise.resolve());
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());
const mockPrinter = { printText: mockPrintText, close: mockClose };

vi.mock('@thermal-label/brother-ql-node', async (importOriginal) => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    openPrinter: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
    findMedia: vi.fn((id: number) => mod.findMedia(id)),
  };
});

beforeEach(() => {
  mockPrintText.mockClear().mockImplementation(() => Promise.resolve());
  mockClose.mockClear().mockImplementation(() => Promise.resolve());
});

describe('print text command', () => {
  it('calls printText with correct args', async () => {
    const { runPrintText } = await import('../../commands/print-text.js');
    await runPrintText('Hello', { media: '259', invert: true, cut: true });
    expect(mockPrintText).toHaveBeenCalledOnce();
    const [text, media, opts] = mockPrintText.mock.calls[0] as unknown[];
    expect(text).toBe('Hello');
    expect((media as { id: number }).id).toBe(259);
    expect((opts as { invert: boolean }).invert).toBe(true);
  });

  it('throws on unknown media ID', async () => {
    const { runPrintText } = await import('../../commands/print-text.js');
    await expect(runPrintText('Hello', { media: '9999' })).rejects.toThrow('Unknown media ID');
  });
});
