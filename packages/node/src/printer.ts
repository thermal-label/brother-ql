import {
  DEFAULT_MEDIA,
  STATUS_REQUEST,
  createPreviewOffline,
  encodeJob,
  flipHorizontal,
  parseStatus,
  renderImage,
  splitTwoColor,
  type BrotherQLDevice,
  type BrotherQLMedia,
  type BrotherQLStatus,
  type MediaDescriptor,
  type PageData,
  type PreviewOptions,
  type PreviewResult,
  type PrinterAdapter,
  type RawImageData,
  type Transport,
  type TransportType,
} from '@thermal-label/brother-ql-core';
import { MediaNotSpecifiedError } from '@thermal-label/contracts';

const STATUS_BYTE_COUNT = 32;
const STATUS_POLL_INTERVAL_MS = 150;
const STATUS_POLL_ATTEMPTS = 10;

/**
 * Node.js driver for Brother QL label printers.
 *
 * Implements `PrinterAdapter`. Callers get a printer instance from
 * `discovery.openPrinter()` (USB or TCP) and interact solely through
 * the adapter surface: `print(rgba, media?)`, `createPreview`,
 * `getStatus`, `close`.
 *
 * Two-colour media (DK-22251) is handled transparently — when
 * `media.colorCapable` is true, the driver runs `splitTwoColor()`
 * internally before encoding.
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

  async print(image: RawImageData, media?: MediaDescriptor): Promise<void> {
    const resolvedMedia = (media ?? this.lastStatus?.detectedMedia) as BrotherQLMedia | undefined;
    if (!resolvedMedia) {
      throw new MediaNotSpecifiedError();
    }

    // Brother QL print head: pin 0 (the first pin in each raster row) sits
    // on the right side of the printed face when the leading edge is held
    // up. Mirror the rendered bitmap so the input image's x-axis matches
    // the printed x-axis. Verified on QL-820NWBc + DK-22251.
    let page: PageData;
    if (resolvedMedia.colorCapable) {
      const { black, red } = splitTwoColor(image);
      page = {
        bitmap: flipHorizontal(black),
        redBitmap: flipHorizontal(red),
        media: resolvedMedia,
      };
    } else {
      const bitmap = flipHorizontal(renderImage(image, { dither: true }));
      page = { bitmap, media: resolvedMedia };
    }

    const bytes = encodeJob([page]);
    await this.transport.write(bytes);
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
        const status = parseStatus(bytes);
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
