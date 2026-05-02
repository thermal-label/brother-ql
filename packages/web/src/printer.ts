import {
  DEFAULT_MEDIA,
  DEVICES,
  ROTATE_DIRECTION,
  STATUS_REQUEST,
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
import { MediaNotSpecifiedError } from '@thermal-label/contracts';
import { WebUsbTransport } from '@thermal-label/transport/web';

// Detect transport errors across module boundaries — under pnpm link /
// multi-version installs `instanceof` checks against the contracts
// classes can return false even for the right class. The contracts
// classes pin `this.name`, so name-checking is the portable test.
function isTransportClosedError(err: unknown): boolean {
  return err instanceof Error && err.name === 'TransportClosedError';
}

const STATUS_BYTE_COUNT = 32;
// Brother QL printers push unsolicited 32-byte status frames on lid
// open/close, media insert, end of job, errors, etc. We run a
// persistent read loop that picks up every frame, parses it, and
// notifies subscribers — instant updates with no polling. `getStatus()`
// writes ESC iS and awaits the next frame from the same stream.
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
    const pageOptions = options?.highRes === true ? { highResolution: true } : undefined;

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
        ...(pageOptions ? { options: pageOptions } : {}),
      };
    } else {
      const bitmap = flipHorizontal(renderImage(image, { dither: true, rotate }));
      page = {
        bitmap,
        media: resolvedMedia,
        ...(pageOptions ? { options: pageOptions } : {}),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- every brother-ql device has at least one engine (data invariant)
    const engine = this.device.engines[0]!;
    const bytes = encodeJobForEngine([page], {}, engine, this.device.name);
    await this.writeChunked(bytes);
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
   */
  async getStatus(): Promise<BrotherQLStatus> {
    const next = this.nextStatusFrame(STATUS_RESPONSE_TIMEOUT_MS);
    await this.transport.write(STATUS_REQUEST);
    return next;
  }

  /**
   * Subscribe to push-based status updates. Brother QL printers emit
   * unsolicited frames on lid open/close, media insert, errors, and
   * end-of-job — each one fires `cb` synchronously after parsing.
   * Returns an unsubscribe function.
   */
  onStatus(cb: (status: BrotherQLStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
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
 */
export async function requestPrinter(options: RequestOptions = {}): Promise<WebBrotherQLPrinter> {
  const filters = options.filters ?? DEFAULT_FILTERS;
  const usbDevice = await navigator.usb.requestDevice({ filters });
  return fromUSBDevice(usbDevice);
}

/**
 * Wrap an already-selected `USBDevice`.
 *
 * @throws when the VID/PID is not in the Brother QL registry.
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
