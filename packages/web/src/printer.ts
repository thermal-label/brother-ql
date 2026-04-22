import {
  type DeviceDescriptor,
  type JobOptions,
  type MediaDescriptor,
  type PageData,
  type PageOptions,
  type PrinterStatus,
  type TextPrintOptions,
  type ImagePrintOptions,
  encodeJob,
  findDevice,
  parseStatus,
  renderImage,
  renderText,
  rotateBitmap,
  STATUS_REQUEST,
} from '@thermal-label/brother-ql-core';

const BROTHER_VID = 0x04f9;
const USB_INTERFACE = 0;
const BULK_OUT_ENDPOINT = 2;
const BULK_IN_ENDPOINT = 1;
const STATUS_BYTE_COUNT = 32;
const CONFIGURATION_VALUE = 1;

export class WebBrotherQLPrinter {
  readonly device: USBDevice;
  readonly descriptor: DeviceDescriptor;

  constructor(device: USBDevice, descriptor: DeviceDescriptor) {
    this.device = device;
    this.descriptor = descriptor;
  }

  isConnected(): boolean {
    return this.device.opened;
  }

  async getStatus(): Promise<PrinterStatus> {
    await this.device.transferOut(BULK_OUT_ENDPOINT, STATUS_REQUEST);
    const result = await this.device.transferIn(BULK_IN_ENDPOINT, STATUS_BYTE_COUNT);
    if (!result.data) throw new Error('No status data received');
    return parseStatus(new Uint8Array(result.data.buffer));
  }

  async print(pages: PageData[], options?: JobOptions): Promise<void> {
    const bytes = encodeJob(pages, options);
    await this.device.transferOut(BULK_OUT_ENDPOINT, bytes);
  }

  async printText(text: string, media: MediaDescriptor, options?: TextPrintOptions): Promise<void> {
    const { invert, scaleX, scaleY, ...pageOptions } = options ?? {};
    const base = renderText(text, { scaleX: 1, scaleY: 1 });
    const autoScale = Math.max(1, Math.floor(media.printAreaDots / Math.max(base.widthPx, base.heightPx)));
    const rawBitmap = renderText(text, {
      ...(invert !== undefined ? { invert } : {}),
      scaleX: scaleX ?? autoScale,
      scaleY: scaleY ?? autoScale,
    });
    const bitmap = rotateBitmap(rawBitmap, 90);
    const page: PageData = {
      bitmap,
      media,
      ...(Object.keys(pageOptions).length > 0 ? { options: pageOptions } : {}),
    };
    await this.print([page]);
  }

  async printImage(
    imageData: ImageData,
    media: MediaDescriptor,
    options?: ImagePrintOptions,
  ): Promise<void> {
    const { threshold, dither, invert, rotate, ...pageOptions } = options ?? {};
    const rawImage = {
      width: imageData.width,
      height: imageData.height,
      data: new Uint8Array(imageData.data.buffer),
    };
    const rawBitmap = renderImage(rawImage, {
      ...(threshold !== undefined ? { threshold } : {}),
      ...(dither ? { dither: true } : {}),
      ...(invert ? { invert: true } : {}),
    });
    const rotationAngle = rotate ?? 0;
    const bitmap =
      rotationAngle === 0 ? rotateBitmap(rawBitmap, 90) : rotateBitmap(rawBitmap, rotationAngle);
    const page: PageData = {
      bitmap,
      media,
      ...(Object.keys(pageOptions).length > 0 ? { options: pageOptions } : {}),
    };
    await this.print([page]);
  }

  async printImageURL(
    url: string,
    media: MediaDescriptor,
    options?: ImagePrintOptions,
  ): Promise<void> {
    const response = await fetch(url);
    const blob = await response.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(bmp, 0, 0);
    const imageData = ctx.getImageData(0, 0, bmp.width, bmp.height);
    await this.printImage(imageData, media, options);
  }

  async printTwoColor(
    blackImageData: ImageData,
    redImageData: ImageData,
    media: MediaDescriptor,
    options?: PageOptions,
  ): Promise<void> {
    if (!this.descriptor.twoColor) {
      throw new Error(
        `Device ${this.descriptor.name} does not support two-color printing. ` +
          'Use a QL-800, QL-810W, or QL-820NWB.',
      );
    }
    const toRaw = (img: ImageData): { width: number; height: number; data: Uint8Array } => ({
      width: img.width,
      height: img.height,
      data: new Uint8Array(img.data.buffer),
    });
    const blackBitmap = rotateBitmap(renderImage(toRaw(blackImageData)), 90);
    const redBitmap = rotateBitmap(renderImage(toRaw(redImageData)), 90);
    const page: PageData = {
      bitmap: blackBitmap,
      redBitmap,
      media,
      ...(options !== undefined ? { options } : {}),
    };
    await this.print([page]);
  }

  async disconnect(): Promise<void> {
    await this.device.releaseInterface(USB_INTERFACE);
    await this.device.close();
  }
}

export async function openWebDevice(device: USBDevice): Promise<WebBrotherQLPrinter> {
  const descriptor = findDevice(BROTHER_VID, device.productId);
  if (!descriptor) {
    throw new Error(
      `Unsupported device: VID=${BROTHER_VID.toString(16)} PID=${device.productId.toString(16)}`,
    );
  }
  await device.open();
  await device.selectConfiguration(CONFIGURATION_VALUE);
  await device.claimInterface(USB_INTERFACE);
  return new WebBrotherQLPrinter(device, descriptor);
}
