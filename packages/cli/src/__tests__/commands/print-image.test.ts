import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';

const mockPrintImage = vi.fn().mockImplementation(() => Promise.resolve());
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());
const mockPrinter = { printImage: mockPrintImage, close: mockClose };

vi.mock('@thermal-label/brother-ql-node', async importOriginal => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    openPrinter: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
    openPrinterTcp: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
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

  it('connects via TCP when host is specified', async () => {
    const { openPrinterTcp } = await import('@thermal-label/brother-ql-node');
    const { runPrintImage } = await import('../../commands/print-image.js');
    await runPrintImage('/img.png', { media: '259', host: '192.168.1.1' });
    expect(vi.mocked(openPrinterTcp)).toHaveBeenCalledWith('192.168.1.1');
  });

  it('passes rotate option as a number', async () => {
    const { runPrintImage } = await import('../../commands/print-image.js');
    await runPrintImage('/img.png', { media: '259', rotate: '90' });
    const [, , opts] = mockPrintImage.mock.calls[0] as unknown[];
    expect((opts as { rotate: number }).rotate).toBe(90);
  });

  it('passes dither and invert options', async () => {
    const { runPrintImage } = await import('../../commands/print-image.js');
    await runPrintImage('/img.png', { media: '259', dither: true, invert: true });
    const [, , opts] = mockPrintImage.mock.calls[0] as unknown[];
    expect((opts as { dither: boolean }).dither).toBe(true);
    expect((opts as { invert: boolean }).invert).toBe(true);
  });

  it('passes serial number to openPrinter', async () => {
    const { openPrinter } = await import('@thermal-label/brother-ql-node');
    const { runPrintImage } = await import('../../commands/print-image.js');
    await runPrintImage('/img.png', { media: '259', serial: 'SN12345' });
    expect(vi.mocked(openPrinter)).toHaveBeenCalledWith({ serialNumber: 'SN12345' });
  });
});
