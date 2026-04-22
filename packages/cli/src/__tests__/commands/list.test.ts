import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEVICES } from '@thermal-label/brother-ql-node';
import type * as BrotherQLNode from '@thermal-label/brother-ql-node';

const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
  /* suppress */
});

vi.mock('@thermal-label/brother-ql-node', async importOriginal => {
  const mod = await importOriginal<typeof BrotherQLNode>();
  return {
    ...mod,
    listPrinters: vi.fn(() => []),
  };
});

beforeEach(() => {
  consoleSpy.mockClear();
});

describe('list command', () => {
  it('shows "no printers found" message when none connected', async () => {
    const { runList } = await import('../../commands/list.js');
    runList();
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('No Brother QL printers');
  });

  it('shows printer details when printers are connected', async () => {
    const { listPrinters } = await import('@thermal-label/brother-ql-node');
    vi.mocked(listPrinters).mockReturnValueOnce([
      { device: DEVICES.QL_820NWB, serialNumber: undefined, path: '1.5', transport: 'usb' },
      { device: DEVICES.QL_700, serialNumber: 'SN12345', path: '1.6', transport: 'usb' },
    ]);
    const { runList } = await import('../../commands/list.js');
    runList();
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('QL-820NWB');
    expect(output).toContain('QL-700');
    expect(output).toContain('SN12345');
  });

  it('shows no-autocut label for devices without autocutter', async () => {
    const { listPrinters } = await import('@thermal-label/brother-ql-node');
    vi.mocked(listPrinters).mockReturnValueOnce([
      { device: DEVICES.QL_550, serialNumber: undefined, path: '1.7', transport: 'usb' },
    ]);
    const { runList } = await import('../../commands/list.js');
    runList();
    const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('no-autocut');
  });
});
