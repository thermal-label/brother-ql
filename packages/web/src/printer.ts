import {
  DEFAULT_MEDIA,
  DEVICES,
  STATUS_REQUEST,
  createPreviewOffline,
  encodeJob,
  findDevice,
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
} from '@thermal-label/brother-ql-core';
import { MediaNotSpecifiedError } from '@thermal-label/contracts';
import { buildUsbFilters } from '@thermal-label/transport';
import { WebUsbTransport } from '@thermal-label/transport/web';

const STATUS_BYTE_COUNT = 32;

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
 * Same two-colour handling as the node driver — `splitTwoColor()` runs
 * internally when the selected media is `colorCapable`.
 */
export class WebBrotherQLPrinter implements PrinterAdapter {
  readonly family = 'brother-ql' as const;
  readonly device: BrotherQLDevice;

  private readonly transport: Transport;
  private lastStatus: BrotherQLStatus | undefined;

  constructor(device: BrotherQLDevice, transport: Transport) {
    this.device = device;
    this.transport = transport;
  }

  get model(): string {
    return this.device.name;
  }

  get connected(): boolean {
    return this.transport.connected;
  }

  async print(image: RawImageData, media?: MediaDescriptor): Promise<void> {
    const resolvedMedia = (media ?? this.lastStatus?.detectedMedia) as BrotherQLMedia | undefined;
    if (!resolvedMedia) throw new MediaNotSpecifiedError();

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

  async getStatus(): Promise<BrotherQLStatus> {
    await this.transport.write(STATUS_REQUEST);
    const bytes = await this.transport.read(STATUS_BYTE_COUNT);
    const status = parseStatus(bytes);
    this.lastStatus = status;
    return status;
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

export const DEFAULT_FILTERS = buildUsbFilters(Object.values(DEVICES));

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
