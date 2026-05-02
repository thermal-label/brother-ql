import {
  DEFAULT_MEDIA,
  ROTATE_DIRECTION,
  STATUS_REQUEST,
  createPreviewOffline,
  encodeJob,
  encodeJobForEngine,
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
  TransportType,
} from '@thermal-label/brother-ql-core';
import { MediaNotSpecifiedError } from '@thermal-label/contracts';

const STATUS_BYTE_COUNT = 32;
const STATUS_POLL_INTERVAL_MS = 150;
const STATUS_POLL_ATTEMPTS = 10;

// Empirical: a single libusb bulk transfer of an entire raster job (~50 kB
// uncompressed two-colour at 280 rows) reliably hangs the QL-820NWBc
// firmware mid-print. Chunking the OUT pipe to ~1 kB with a 20 ms gap
// keeps the printer's input ring buffer drained at roughly its raster
// processing rate (~175 bytes/ms at 80 mm/s feed). Adds about 1 s to a
// 50 kB job, which is negligible compared to physical print time.
//
// Python `brother_ql` users hit this less often because the typical CLI
// path writes through `/dev/usb/lpN` where the kernel's usblp driver
// provides flow control; libusb bypasses that.
const USB_CHUNK_SIZE = 1024;
const USB_CHUNK_DELAY_MS = 20;

/**
 * Node.js driver for Brother QL label printers.
 *
 * Implements `PrinterAdapter`. Callers get a printer instance from
 * `discovery.openPrinter()` (USB or TCP) and interact solely through
 * the adapter surface: `print(rgba, media?, options?)`, `createPreview`,
 * `getStatus`, `close`.
 *
 * Multi-ink media (DK-22251) is handled transparently — when the
 * resolved media carries a `palette`, the driver runs the bitmap
 * library's `renderMultiPlaneImage()` internally before encoding.
 *
 * Orientation is auto-decided via `pickRotation`: landscape input on
 * media tagged `defaultOrientation: 'horizontal'` rotates 90° CW so
 * the visual reads along the tape feed direction. Override per-call
 * with `options.rotate`.
 */
export class BrotherQLPrinter implements PrinterAdapter {
  readonly family = 'brother-ql' as const;
  readonly device: BrotherQLDevice;
  readonly transportType: TransportType;

  private readonly transport: Transport;
  private lastStatus: BrotherQLStatus | undefined;

  constructor(device: BrotherQLDevice, transport: Transport, transportType: TransportType) {
    this.device = device;
    this.transport = transport;
    this.transportType = transportType;
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
    if (!resolvedMedia) {
      throw new MediaNotSpecifiedError();
    }

    const rotate = pickRotation(image, resolvedMedia, ROTATE_DIRECTION, options?.rotate);

    // Brother QL print head: pin 0 (the first pin in each raster row) sits
    // on the right side of the printed face when the leading edge is held
    // up. Mirror the rendered bitmap so the input image's x-axis matches
    // the printed x-axis. Verified on QL-820NWBc + DK-22251.
    const pageOptions =
      options?.highRes === true ? { highResolution: true } : undefined;

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

    const engine = this.device.engines[0];
    const bytes = engine
      ? encodeJobForEngine([page], {}, engine, this.device.name)
      : encodeJob([page]);
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
   * Poll the status endpoint until 32 bytes are available.
   *
   * The USB `transferAsync()` call resolves immediately with 0 bytes if
   * the printer hasn't queued a response yet, so retry with a short
   * delay up to `STATUS_POLL_ATTEMPTS` times.
   */
  async getStatus(): Promise<BrotherQLStatus> {
    await this.transport.write(STATUS_REQUEST);
    for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt++) {
      await new Promise<void>(r => setTimeout(r, STATUS_POLL_INTERVAL_MS));
      const bytes = await this.transport.read(STATUS_BYTE_COUNT);
      if (bytes.length >= STATUS_BYTE_COUNT) {
        const status = parseStatus(bytes, this.device.engines[0]);
        this.lastStatus = status;
        return status;
      }
    }
    throw new Error('Printer did not respond to status request within 1.5s');
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}
