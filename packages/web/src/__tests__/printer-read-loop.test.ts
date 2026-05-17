import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transport } from '@thermal-label/contracts';
import type * as BrotherQLCore from '@thermal-label/brother-ql-core';
import { findDevice } from '@thermal-label/brother-ql-core';
import { WebBrotherQLPrinter } from '../printer.js';

/**
 * Controllable `Transport` double for exercising the persistent
 * bulk-IN read loop's defensive branches: transient read errors and
 * the clean-close exit.
 *
 * Unlike the `RecordingTransport` in `printer.test.ts`, this double
 * lets each test script the exact `read()` outcome — a thrown error,
 * a frame, or an indefinite hang — so the catch arms the happy-path
 * tests never reach get covered.
 */
type ReadOutcome =
  | { kind: 'throw'; error: Error }
  | { kind: 'frame'; bytes: Uint8Array }
  | { kind: 'hang' };

class ScriptedTransport implements Transport {
  connected = true;
  readonly writes: Uint8Array[] = [];
  /** FIFO of scripted read outcomes; the last entry repeats once drained. */
  private readonly script: ReadOutcome[];

  constructor(script: ReadOutcome[]) {
    this.script = script;
  }

  write(data: Uint8Array): Promise<void> {
    this.writes.push(Uint8Array.from(data));
    return Promise.resolve();
  }

  read(): Promise<Uint8Array> {
    const outcome = this.script.length > 1 ? this.script.shift()! : this.script[0]!;
    if (outcome.kind === 'throw') return Promise.reject(outcome.error);
    if (outcome.kind === 'frame') return Promise.resolve(outcome.bytes);
    // 'hang' — never resolves; the read loop's while-guard exits on close.
    return new Promise<Uint8Array>(() => {
      /* intentionally never settles */
    });
  }

  close(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }
}

function transportClosedError(): Error {
  const err = new Error('Transport closed') as Error & { name: string };
  err.name = 'TransportClosedError';
  return err;
}

/** A well-formed 32-byte QL status frame with continuous 62 mm media loaded. */
function statusFrame(): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes[10] = 62; // media width mm
  bytes[11] = 0x0a; // continuous media type
  return bytes;
}

const QL_DEVICE = findDevice(0x04f9, 0x209d)!;

describe('WebBrotherQLPrinter read loop — defensive branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits the read loop silently when read() rejects with TransportClosedError', async () => {
    const transport = new ScriptedTransport([{ kind: 'throw', error: transportClosedError() }]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* suppress */
    });
    const printer = new WebBrotherQLPrinter(QL_DEVICE, transport);

    // Give the loop a few microtask turns to hit the catch and return.
    await new Promise<void>(r => setTimeout(r, 20));

    // A clean close → no backoff warning emitted.
    expect(warn).not.toHaveBeenCalled();
    await printer.close();
  });

  it('backs off and retries after a transient (non-close) read error', async () => {
    // First read throws a generic I/O error, then the pipe recovers and
    // delivers a real status frame; the loop must survive the throw and
    // keep reading.
    const transport = new ScriptedTransport([
      { kind: 'throw', error: new Error('USB pipe stalled') },
      { kind: 'frame', bytes: statusFrame() },
      { kind: 'hang' },
    ]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* suppress */
    });
    const printer = new WebBrotherQLPrinter(QL_DEVICE, transport);

    // READ_LOOP_BACKOFF_MS is 100 ms — wait past it so the retry lands.
    await new Promise<void>(r => setTimeout(r, 250));

    expect(warn).toHaveBeenCalledWith(
      '[brother-ql-web] status read error, backing off:',
      expect.any(Error),
    );
    // The recovered frame is parsed without throwing — read() was
    // re-entered after the backoff, proving the loop did not exit.
    expect(transport.writes).toHaveLength(0);
    await printer.close();
  });

  it('skips frames shorter than the 32-byte status size without parsing', async () => {
    const transport = new ScriptedTransport([
      { kind: 'frame', bytes: new Uint8Array(8) },
      { kind: 'hang' },
    ]);
    const printer = new WebBrotherQLPrinter(QL_DEVICE, transport);

    // No throw, no warning — the length guard drops the short frame and
    // the loop continues to the next (hanging) read.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* suppress */
    });
    await new Promise<void>(r => setTimeout(r, 50));
    expect(warn).not.toHaveBeenCalled();
    await printer.close();
  });
});

describe('WebBrotherQLPrinter read loop — parseStatus failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('@thermal-label/brother-ql-core');
  });

  it('logs and continues when parseStatus throws on a full-length frame', async () => {
    // parseStatus only rejects sub-32-byte frames in the real impl, and
    // the read loop's length guard already filters those — so a parse
    // failure on a full-length frame can only be induced by mocking the
    // core export. This drives the parse-failure catch with a real error.
    vi.resetModules();
    const actual = await vi.importActual<typeof BrotherQLCore>('@thermal-label/brother-ql-core');
    const parseStatus = vi.fn().mockImplementation(() => {
      throw new Error('corrupt status frame');
    });
    vi.doMock('@thermal-label/brother-ql-core', () => ({
      ...actual,
      parseStatus,
    }));
    const { WebBrotherQLPrinter: MockedPrinter } = await import('../printer.js');

    const transport = new ScriptedTransport([
      { kind: 'frame', bytes: statusFrame() },
      { kind: 'hang' },
    ]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* suppress */
    });
    const printer = new MockedPrinter(QL_DEVICE, transport);

    await new Promise<void>(r => setTimeout(r, 50));

    expect(parseStatus).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[brother-ql-web] failed to parse status frame:',
      expect.any(Error),
    );
    await printer.close();
  });
});

describe('WebBrotherQLPrinter getStatus() — timeout and steady-state paths', () => {
  it('rejects and re-arms the preamble when no status frame arrives in time', async () => {
    vi.useFakeTimers();
    try {
      // The transport never produces a frame, so nextStatusFrame's
      // timeout fires and getStatus() rethrows after flipping
      // parserReady back to false.
      const transport = new ScriptedTransport([{ kind: 'hang' }]);
      const printer = new WebBrotherQLPrinter(QL_DEVICE, transport);

      const pending = printer.getStatus();
      const assertion = expect(pending).rejects.toThrow(/did not respond to status request/);
      // STATUS_RESPONSE_TIMEOUT_MS is 1500 ms.
      await vi.advanceTimersByTimeAsync(1600);
      await assertion;

      // First (failed) attempt wrote the preamble (invalidate + init)
      // ahead of ESC iS — three writes total.
      expect(transport.writes).toHaveLength(3);
      await printer.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips the preamble on the second poll once the parser is confirmed ready', async () => {
    // A transport that answers every read with a fresh status frame —
    // the read loop hands each one to whichever getStatus() is awaiting.
    const transport = new ScriptedTransport([{ kind: 'frame', bytes: statusFrame() }]);
    const printer = new WebBrotherQLPrinter(QL_DEVICE, transport);

    const first = await printer.getStatus();
    expect(first.detectedMedia?.id).toBe(259);
    const afterFirst = transport.writes.length;

    const second = await printer.getStatus();
    expect(second.detectedMedia?.id).toBe(259);

    // First call sent invalidate + init + ESC iS (3 writes). With
    // parserReady now true, the second call sends only the bare ESC iS.
    expect(afterFirst).toBe(3);
    expect(transport.writes.length - afterFirst).toBe(1);
    await printer.close();
  });
});
