import {
  DEFAULT_MEDIA,
  DEVICES,
  ROTATE_DIRECTION,
  STATUS_REQUEST,
  buildInitialize,
  buildInvalidate,
  createPreviewOffline,
  encodeJobForEngine,
  findDevice,
  flipHorizontal,
  parseStatus,
  pickRotation,
  renderImage,
  renderMultiPlaneImage,
} from '@thermal-label/brother-ql-core';
import type {
  BrotherQLDevice,
  BrotherQLMedia,
  BrotherQLPrintOptions,
  BrotherQLStatus,
  LabelBitmap,
  MediaDescriptor,
  PageData,
  PreviewOptions,
  PreviewResult,
  PrinterAdapter,
  RawImageData,
  Transport,
} from '@thermal-label/brother-ql-core';
import { MediaNotSpecifiedError, pollingOnStatus, WriteSerializer } from '@thermal-label/contracts';
import { WebUsbTransport } from '@thermal-label/transport/web';

// Detect transport errors across module boundaries — under pnpm link /
// multi-version installs `instanceof` checks against the contracts
// classes can return false even for the right class. The contracts
// classes pin `this.name`, so name-checking is the portable test.
function isTransportClosedError(err: unknown): boolean {
  return err instanceof Error && err.name === 'TransportClosedError';
}

const STATUS_BYTE_COUNT = 32;
// A persistent read loop is the sole reader of the bulk-IN pipe: it
// parses every 32-byte status frame the printer emits and dispatches it
// to `statusListeners`. `getStatus()` writes ESC iS and awaits the next
// frame from that stream; spontaneous frames (lid open/close, media
// insert, end of job, errors) flow through the same loop. `onStatus()`
// is a polling shim over `getStatus()` — see that method.
const STATUS_RESPONSE_TIMEOUT_MS = 1500;
const READ_LOOP_BACKOFF_MS = 100;

// Same OUT-pipe chunking as the Node driver — see packages/node/src/printer.ts
// for the rationale. WebUSB rides the same libusb-style bulk transfer path,
// so the firmware buffer-overrun risk is identical.
const USB_CHUNK_SIZE = 1024;
const USB_CHUNK_DELAY_MS = 20;

export interface RequestOptions {
  filters?: USBDeviceFilter[];
}

/**
 * WebUSB `PrinterAdapter` for Brother QL printers.
 *
 * Mirrors the node driver's behaviour — `renderMultiPlaneImage()` runs
 * internally when the resolved media carries a `palette`, and
 * `pickRotation` auto-rotates landscape input on media tagged
 * `defaultOrientation: 'horizontal'`.
 */
export class WebBrotherQLPrinter implements PrinterAdapter {
  readonly family = 'brother-ql' as const;
  readonly device: BrotherQLDevice;

  private readonly transport: Transport;
  private lastStatus: BrotherQLStatus | undefined;
  private readonly statusListeners = new Set<(status: BrotherQLStatus) => void>();
  private readLoopStarted = false;
  private readLoopStopped = false;
  /**
   * Serialises every bulk-OUT operation (print + getStatus). Required
   * because `getStatus()` may write the QL preamble (`buildInvalidate` —
   * 200×0x00 + `ESC @`) to put the parser in a known state, and the
   * preamble's "invalidate" cancels any in-flight print job. Polling
   * concurrently with a print would shred the raster stream.
   *
   * Plan 15 A4: this was a hand-rolled `writeLock`/`runLocked` pair;
   * it is now the shared `WriteSerializer` from `@thermal-label/contracts`
   * so all four drivers serialise identically. Behaviour is unchanged —
   * `WriteSerializer.run()` is exactly the old `runLocked` semantics.
   */
  private readonly serializer = new WriteSerializer();
  /**
   * Whether the printer's command parser is in a known-clean state.
   * Set to `true` after a successful `getStatus()`; flipped back to
   * `false` on timeout so the next attempt re-sends the preamble. The
   * preamble (200-byte invalidate + `ESC @`) is only needed once per
   * session unless the parser falls back into a confused state.
   */
  private parserReady = false;

  constructor(device: BrotherQLDevice, transport: Transport) {
    this.device = device;
    this.transport = transport;
    this.startReadLoop();
  }

  get model(): string {
    return this.device.name;
  }

  get connected(): boolean {
    return this.transport.connected;
  }

  async print(
    image: RawImageData,
    media?: MediaDescriptor,
    options?: BrotherQLPrintOptions,
  ): Promise<void> {
    const resolvedMedia = (media ?? this.lastStatus?.detectedMedia) as BrotherQLMedia | undefined;
    if (!resolvedMedia) throw new MediaNotSpecifiedError();

    const rotate = pickRotation(image, resolvedMedia, ROTATE_DIRECTION, options?.rotate);

    // Brother QL print head: pin 0 (the first pin in each raster row) sits
    // on the right side of the printed face when the leading edge is held
    // up. Mirror the rendered bitmap so the input image's x-axis matches
    // the printed x-axis. Verified on QL-820NWBc + DK-22251.
    // PackBits compression on by default for the web path. Bench
    // experience: WebUSB pacing alone (1024 / 20 ms) isn't enough on
    // QL_700-class firmware — uncompressed raster rows can stall the
    // print engine even when bytes are arriving. Compression keeps
    // each row small enough to ride the firmware's buffer comfortably
    // and matches the encoding the Brother driver itself emits.
    const pageOptions = {
      compress: true,
      ...(options?.highRes === true ? { highResolution: true } : {}),
    };

    let page: PageData;
    if (resolvedMedia.palette) {
      const { black, red } = renderMultiPlaneImage(image, {
        palette: resolvedMedia.palette,
        rotate,
      }) as Record<'black' | 'red', LabelBitmap>;
      page = {
        bitmap: flipHorizontal(black),
        redBitmap: flipHorizontal(red),
        media: resolvedMedia,
        options: pageOptions,
      };
    } else {
      const bitmap = flipHorizontal(renderImage(image, { dither: true, rotate }));
      page = {
        bitmap,
        media: resolvedMedia,
        options: pageOptions,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- every brother-ql device has at least one engine (data invariant)
    const engine = this.device.engines[0]!;
    const bytes = encodeJobForEngine([page], {}, engine, this.device.name);
    await this.serializer.run(() => this.writeChunked(bytes));
  }

  private async writeChunked(bytes: Uint8Array): Promise<void> {
    for (let off = 0; off < bytes.length; off += USB_CHUNK_SIZE) {
      const end = Math.min(off + USB_CHUNK_SIZE, bytes.length);
      await this.transport.write(bytes.subarray(off, end));
      if (end < bytes.length) {
        await new Promise<void>(r => setTimeout(r, USB_CHUNK_DELAY_MS));
      }
    }
  }

  createPreview(image: RawImageData, options?: PreviewOptions): Promise<PreviewResult> {
    const override = options?.media as BrotherQLMedia | undefined;
    const detected = this.lastStatus?.detectedMedia as BrotherQLMedia | undefined;
    if (override) return Promise.resolve(createPreviewOffline(image, override));
    if (detected) return Promise.resolve(createPreviewOffline(image, detected));
    return Promise.resolve({
      ...createPreviewOffline(image, DEFAULT_MEDIA),
      assumed: true,
    });
  }

  /**
   * Send ESC iS and resolve with the next status frame the printer
   * emits. The read loop is the sole reader of the bulk-IN pipe —
   * `getStatus()` subscribes transiently, writes the request, and the
   * subscription receives the response (alongside any spontaneous
   * frames; see `onStatus()`).
   *
   * The QL preamble (200×0x00 invalidate + `ESC @` initialize) is
   * sent only when the parser hasn't been confirmed clean — first
   * call of the session, or after a previous timeout. Steady-state
   * polls send bare `ESC iS`. Bench observation: a freshly-opened QL
   * doesn't reply to bare `ESC iS` until the invalidate flushes any
   * stale parser state from a prior session.
   */
  async getStatus(): Promise<BrotherQLStatus> {
    return this.serializer.run(async () => {
      const next = this.nextStatusFrame(STATUS_RESPONSE_TIMEOUT_MS);
      if (!this.parserReady) {
        await this.transport.write(buildInvalidate());
        await this.transport.write(buildInitialize());
      }
      await this.transport.write(STATUS_REQUEST);
      try {
        const status = await next;
        this.parserReady = true;
        return status;
      } catch (err) {
        // Timeout / read failure — printer may be in a confused
        // state. Re-arm the preamble for the next attempt.
        this.parserReady = false;
        throw err;
      }
    });
  }

  /**
   * Subscribe to status updates. A polling shim built on
   * `pollingOnStatus` from contracts — it calls `getStatus()` on first
   * subscribe and then every `DEFAULT_POLLING_INTERVAL_MS`, matching the
   * labelwriter and labelmanager web drivers (plan 11 §`onStatus`
   * parity).
   *
   * An earlier revision skipped polling and relied solely on the
   * printer's unsolicited frames. That was a workaround for the Chromium
   * WebUSB sub-packet stall — `getStatus()`'s `read()` would hang, so
   * polling looked unreliable and was dropped. `WebUsbTransport.read()`
   * now rounds reads up to the endpoint packet size, so `getStatus()` is
   * dependable and polling is restored.
   */
  onStatus(cb: (status: BrotherQLStatus) => void): () => void {
    return pollingOnStatus(this, cb);
  }

  private nextStatusFrame(timeoutMs: number): Promise<BrotherQLStatus> {
    return new Promise<BrotherQLStatus>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.statusListeners.delete(handler);
        reject(
          new Error(`Printer did not respond to status request within ${String(timeoutMs)}ms`),
        );
      }, timeoutMs);
      const handler = (s: BrotherQLStatus): void => {
        clearTimeout(timer);
        this.statusListeners.delete(handler);
        resolve(s);
      };
      this.statusListeners.add(handler);
    });
  }

  private startReadLoop(): void {
    if (this.readLoopStarted) return;
    this.readLoopStarted = true;
    void this.readLoop();
  }

  private async readLoop(): Promise<void> {
    while (!this.readLoopStopped && this.transport.connected) {
      let bytes: Uint8Array;
      try {
        bytes = await this.transport.read(STATUS_BYTE_COUNT);
      } catch (err) {
        if (isTransportClosedError(err)) return;
        // If close() ran while the read was pending, the next iteration's
        // while-guard exits the loop — no early return needed.
        // Transient error — back off briefly to avoid hot-spinning.
        // eslint-disable-next-line no-console -- driver-level diagnostic
        console.warn('[brother-ql-web] status read error, backing off:', err);
        await new Promise<void>(r => setTimeout(r, READ_LOOP_BACKOFF_MS));
        continue;
      }
      if (bytes.length < STATUS_BYTE_COUNT) continue;
      let status: BrotherQLStatus;
      try {
        status = parseStatus(bytes, this.device.engines[0]);
      } catch (err) {
        // eslint-disable-next-line no-console -- driver-level diagnostic
        console.warn('[brother-ql-web] failed to parse status frame:', err);
        continue;
      }
      this.lastStatus = status;
      // Snapshot listeners so unsubscribes during dispatch don't skip siblings.
      const snapshot = Array.from(this.statusListeners);
      for (const cb of snapshot) {
        try {
          cb(status);
        } catch (err) {
          // eslint-disable-next-line no-console -- driver-level diagnostic
          console.warn('[brother-ql-web] status listener threw:', err);
        }
      }
    }
  }

  async close(): Promise<void> {
    this.readLoopStopped = true;
    this.statusListeners.clear();
    await this.transport.close();
  }
}

export const DEFAULT_FILTERS: USBDeviceFilter[] = Object.values(DEVICES)
  .map(d => d.transports.usb)
  .filter((t): t is { vid: string; pid: string } => t !== undefined)
  .map(t => ({ vendorId: parseInt(t.vid, 16), productId: parseInt(t.pid, 16) }));

/**
 * Show the browser's USB picker and wrap the selected device.
 *
 * Requires a user gesture. Opens the device and claims interface 0 via
 * `WebUsbTransport.fromDevice()`.
 *
 * Single-instance entry point — preserved for back-compat with existing
 * consumers (CLIs, ad-hoc scripts). For the symmetric driver-web shape
 * (1-key map keyed by engine role) call `requestPrinters()` instead;
 * the harness shell uses that path.
 *
 * @deprecated Use `requestPrinters({ transport: 'usb' })` from
 *   `./request-printers.ts`. Removed once consumers migrate (plan 11).
 */
export async function requestPrinter(options: RequestOptions = {}): Promise<WebBrotherQLPrinter> {
  const filters = options.filters ?? DEFAULT_FILTERS;
  const usbDevice = await navigator.usb.requestDevice({ filters });
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy alias chain; the deprecation guidance is aimed at external callers, not internal usage
  return fromUSBDevice(usbDevice);
}

/**
 * Show the browser's USB picker and return one `PrinterAdapter` per
 * drivable engine on the selected device, keyed by engine role.
 *
 * Brother QL devices are always single-engine — this returns a 1-key
 * record keyed by the device's `engines[0].role` (typically `'primary'`).
 *
 * @deprecated Use the generic `requestPrinters({ transport: 'usb' })`
 *   from `./request-printers.ts` — the legacy USB-only name is preserved
 *   as `requestPrintersUsbLegacy` for back-compat. Removed once
 *   consumers migrate (plan 11).
 */
export async function requestPrintersUsbLegacy(
  options: RequestOptions = {},
): Promise<Record<string, WebBrotherQLPrinter>> {
  const filters = options.filters ?? DEFAULT_FILTERS;
  const usbDevice = await navigator.usb.requestDevice({ filters });
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy alias chain
  return fromUSBDeviceAll(usbDevice);
}

/**
 * Wrap an already-selected `USBDevice`.
 *
 * @throws when the VID/PID is not in the Brother QL registry.
 *
 * @deprecated Use `requestPrinters({ transport: 'usb' })` from
 *   `./request-printers.ts`. Removed once consumers migrate (plan 11).
 */
export async function fromUSBDevice(usbDevice: USBDevice): Promise<WebBrotherQLPrinter> {
  const descriptor = findDevice(usbDevice.vendorId, usbDevice.productId);
  if (!descriptor) {
    throw new Error(
      `Unsupported USB device: VID=0x${usbDevice.vendorId.toString(16)} PID=0x${usbDevice.productId.toString(16)}`,
    );
  }
  const transport = await WebUsbTransport.fromDevice(usbDevice);
  return new WebBrotherQLPrinter(descriptor, transport);
}

/**
 * Wrap an already-selected `USBDevice` and return a 1-key adapter map
 * keyed by the device's `engines[0].role`. Public surface for
 * `requestPrinters()`; exported so harnesses that already hold a
 * `USBDevice` (e.g. picked-up via `navigator.usb.getDevices()` on a
 * returning visit) can skip the picker.
 *
 * Brother QL is single-engine and single-interface (IF 0).
 *
 * @deprecated Use `requestPrinters({ transport: 'usb' })` from
 *   `./request-printers.ts`. Removed once consumers migrate (plan 11).
 */
export async function fromUSBDeviceAll(
  usbDevice: USBDevice,
): Promise<Record<string, WebBrotherQLPrinter>> {
  const descriptor = findDevice(usbDevice.vendorId, usbDevice.productId);
  if (!descriptor) {
    throw new Error(
      `Unsupported USB device: VID=0x${usbDevice.vendorId.toString(16)} PID=0x${usbDevice.productId.toString(16)}`,
    );
  }
  const engine = descriptor.engines[0];
  if (!engine) {
    throw new Error(`Device ${descriptor.key} has no engines.`);
  }
  const transport = await WebUsbTransport.fromDevice(usbDevice);
  return { [engine.role]: new WebBrotherQLPrinter(descriptor, transport) };
}
