import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';

const mockGetStatus = vi.fn();
const mockClose = vi.fn().mockImplementation(() => Promise.resolve());
const mockPrinter = {
  device: { name: 'QL-820NWB' },
  getStatus: mockGetStatus,
  close: mockClose,
};

vi.mock('@thermal-label/brother-ql-node', async importOriginal => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    openPrinter: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
    openPrinterTcp: vi.fn().mockImplementation(() => Promise.resolve(mockPrinter)),
  };
});

const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
  /* suppress */
});

beforeEach(() => {
  consoleSpy.mockClear();
  mockGetStatus.mockClear();
  mockClose.mockClear().mockImplementation(() => Promise.resolve());
});

describe('status command', () => {
  it('displays ready status', async () => {
    mockGetStatus.mockResolvedValueOnce({
      ready: true,
      mediaWidthMm: 62,
      mediaType: 'continuous',
      errors: [],
      editorLiteMode: false,
      rawBytes: new Uint8Array(32),
    });
    const { runStatus } = await import('../../commands/status.js');
    await runStatus({});
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('QL-820NWB');
    expect(output).toContain('62mm');
  });

  it('displays error state with null media type', async () => {
    mockGetStatus.mockResolvedValueOnce({
      ready: false,
      mediaWidthMm: 0,
      mediaType: null,
      errors: ['No media', 'Cover open'],
      editorLiteMode: false,
      rawBytes: new Uint8Array(32),
    });
    const { runStatus } = await import('../../commands/status.js');
    await runStatus({});
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('No media');
    expect(output).toContain('Cover open');
  });

  it('connects via TCP when host is specified', async () => {
    mockGetStatus.mockResolvedValueOnce({
      ready: true,
      mediaWidthMm: 62,
      mediaType: 'continuous',
      errors: [],
      editorLiteMode: false,
      rawBytes: new Uint8Array(32),
    });
    const { openPrinterTcp } = await import('@thermal-label/brother-ql-node');
    const { runStatus } = await import('../../commands/status.js');
    await runStatus({ host: '192.168.1.100' });
    expect(vi.mocked(openPrinterTcp)).toHaveBeenCalledWith('192.168.1.100');
  });

  it('displays Editor Lite warning when editorLiteMode is true', async () => {
    mockGetStatus.mockResolvedValueOnce({
      ready: false,
      mediaWidthMm: 62,
      mediaType: 'continuous',
      errors: [],
      editorLiteMode: true,
      rawBytes: new Uint8Array(32),
    });
    const { runStatus } = await import('../../commands/status.js');
    await runStatus({});
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('Editor Lite');
  });
});
