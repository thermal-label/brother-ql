import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransportTimeoutError, type Transport } from '@thermal-label/contracts';
import { DEVICES } from '@thermal-label/brother-ql-core';
import type * as TransportNode from '@thermal-label/transport/node';

const { snmpGet } = vi.hoisted(() => ({ snmpGet: vi.fn() }));
vi.mock('@thermal-label/transport/node', async importOriginal => {
  const actual = await importOriginal<typeof TransportNode>();
  return { PRINTER_MIB: actual.PRINTER_MIB, snmpGet };
});

import { PRINTER_MIB } from '@thermal-label/transport/node';
import { BrotherQLPrinter } from '../printer.js';

const HOST = '192.168.1.67';

function makeTransport(): { transport: Transport; written: Uint8Array[] } {
  const written: Uint8Array[] = [];
  const transport: Transport = {
    get connected() {
      return true;
    },
    write: vi.fn((data: Uint8Array) => {
      written.push(new Uint8Array(data));
      return Promise.resolve();
    }),
    read: vi.fn(() => Promise.resolve(new Uint8Array(0))),
    close: vi.fn(() => Promise.resolve()),
  };
  return { transport, written };
}

function str(value: string): { type: 'string'; value: string; raw: Uint8Array } {
  return { type: 'string', value, raw: new TextEncoder().encode(value) };
}

function int(value: number): { type: 'integer'; value: number } {
  return { type: 'integer', value };
}

/** The bench QL-820NWBc with DK-11201 loaded, idle, no errors. */
function benchStatus(): Record<string, unknown> {
  return {
    [PRINTER_MIB.hrPrinterStatus]: int(3),
    [PRINTER_MIB.hrPrinterDetectedErrorState]: { type: 'octets', raw: new Uint8Array([0]) },
    [PRINTER_MIB.prtInputMediaName]: str('29mm x 90mm / 1.1" x 3.5"'),
    [PRINTER_MIB.prtInputDimUnit]: int(4),
    [PRINTER_MIB.prtInputMediaDimFeedDir]: int(-1),
    [PRINTER_MIB.prtInputMediaDimXFeedDir]: int(-1),
  };
}

function solidRgba(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  return { width, height, data: new Uint8Array(width * height * 4).fill(0) };
}

function tcpPrinter(community?: string): { printer: BrotherQLPrinter; written: Uint8Array[] } {
  const { transport, written } = makeTransport();
  const printer = new BrotherQLPrinter(DEVICES.QL_820NWBc, transport, 'tcp', {
    host: HOST,
    ...(community === undefined ? {} : { community }),
  });
  return { printer, written };
}

beforeEach(() => {
  snmpGet.mockReset();
});

describe('BrotherQLPrinter over TCP: status', () => {
  it('getStatus() reads the Printer-MIB over SNMP and never touches the socket', async () => {
    snmpGet.mockResolvedValueOnce(benchStatus());
    const { transport, written } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWBc, transport, 'tcp', { host: HOST });

    const status = await printer.getStatus();
    expect(status.ready).toBe(true);
    expect(status.detectedMedia?.id).toBe(271);
    expect(status.rawBytes.length).toBe(0);
    expect(written).toHaveLength(0);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(transport.read)).not.toHaveBeenCalled();
    expect(snmpGet).toHaveBeenCalledWith(
      HOST,
      [
        PRINTER_MIB.hrPrinterStatus,
        PRINTER_MIB.hrPrinterDetectedErrorState,
        PRINTER_MIB.prtInputMediaName,
        PRINTER_MIB.prtInputDimUnit,
        PRINTER_MIB.prtInputMediaDimFeedDir,
        PRINTER_MIB.prtInputMediaDimXFeedDir,
      ],
      { community: 'public' },
    );
  });

  it('getStatus() forwards the community and tolerates missing objects', async () => {
    snmpGet.mockResolvedValueOnce({
      [PRINTER_MIB.hrPrinterStatus]: int(3),
      [PRINTER_MIB.prtInputMediaName]: str('62mm / 2.4"'),
    });
    const { printer } = tcpPrinter('office');

    const status = await printer.getStatus();
    expect(snmpGet.mock.calls[0]?.[2]).toEqual({ community: 'office' });
    expect(status.detectedMedia?.id).toBe(259);
    expect(status.errors).toEqual([]);
    expect(status.details?.map(d => d.label)).toContain('Two-colour');
  });

  it('getStatus() reads a bit string that decoded as printable text via raw', async () => {
    // 0x08 = doorOpen (bit 4) is printable ASCII (backspace is not, but
    // 0x08 lands in `octets`); use 0x40 '@' = lowToner... keep it real:
    // bit 4 doorOpen = 0x08 → octets, bit 1 noPaper = 0x40 → '@' string.
    snmpGet.mockResolvedValueOnce({
      ...benchStatus(),
      [PRINTER_MIB.hrPrinterDetectedErrorState]: str('@'),
    });
    const { printer } = tcpPrinter();
    const status = await printer.getStatus();
    expect(status.ready).toBe(false);
    expect(status.errors.map(e => e.code)).toEqual(['no_media']);
  });

  it('getStatus() feeds a later print() with the detected media', async () => {
    snmpGet.mockResolvedValueOnce(benchStatus());
    const { printer, written } = tcpPrinter();
    await printer.getStatus();
    await printer.print(solidRgba(64, 64));
    expect(written.length).toBeGreaterThan(0);
  });

  it('getStatus() wraps an SNMP failure with the port-9100 explanation', async () => {
    snmpGet.mockRejectedValueOnce(new TransportTimeoutError('tcp', 2000));
    const { printer } = tcpPrinter();
    await expect(printer.getStatus()).rejects.toThrow(
      /Could not read status from 192\.168\.1\.67 over SNMP \(Read timed out after 2000ms\); port 9100 carries no status/,
    );
  });

  it('getStatus() on a TCP printer built without its host says so', async () => {
    const { transport } = makeTransport();
    const printer = new BrotherQLPrinter(DEVICES.QL_820NWBc, transport, 'tcp');
    await expect(printer.getStatus()).rejects.toThrow(/constructed without its host/);
    expect(snmpGet).not.toHaveBeenCalled();
  });
});
