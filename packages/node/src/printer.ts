import {
  encodeJob,
  findDevice,
  renderText,
  renderImage,
  type DeviceDescriptor,
  type MediaDescriptor,
  type PageData,
  type PageOptions,
  type JobOptions,
  type PrinterStatus,
  type LabelBitmap,
  type RawImageData,
  type TextPrintOptions,
  type ImagePrintOptions,
} from '@thermal-label/brother-ql-core';
import { rotateBitmap } from '@mbtech-nl/bitmap';
import { UsbTransport, TcpTransport, type Transport } from './transport.js';
import { parseStatus, STATUS_REQUEST } from './status.js';
import { listPrinters } from './discovery.js';
import { UnsupportedOperationError } from './errors.js';
import { type OpenOptions } from './types.js';

const BROTHER_VID = 0x04f9;

export class BrotherQLPrinter {
  readonly device: DeviceDescriptor;
  readonly transport: 'usb' | 'tcp';
  private readonly _transport: Transport;

  constructor(transport: Transport, device: DeviceDescriptor, transportType: 'usb' | 'tcp') {
    this._transport = transport;
    this.device = device;
    this.transport = transportType;
  }

  async getStatus(): Promise<PrinterStatus> {
    await this._transport.write(STATUS_REQUEST);
    // The USB IN endpoint (transferAsync) resolves immediately with 0 bytes if
    // the printer hasn't queued its response yet. Retry until we have 32 bytes.
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise<void>(r => setTimeout(r, 150));
      const bytes = await this._transport.read(32);
      if (bytes.length >= 32) return parseStatus(bytes);
    }
    throw new Error('Printer did not respond to status request within 1.5s');
  }

  async print(pages: PageData[], options?: JobOptions): Promise<void> {
    const data = encodeJob(pages, options);
    await this._transport.write(data);
  }

  async printText(text: string, media: MediaDescriptor, options?: TextPrintOptions): Promise<void> {
    const { invert, scaleX, scaleY, ...pageOptions } = options ?? {};
    // Scale so the label is roughly square: largest integer scale where neither the tape
    // width (base.heightPx axis) nor the label length (base.widthPx axis) exceeds printAreaDots.
    const base = renderText(text, { scaleX: 1, scaleY: 1 });
    const autoScale = Math.max(
      1,
      Math.floor(media.printAreaDots / Math.max(base.widthPx, base.heightPx)),
    );
    const effectiveScaleY = scaleY ?? autoScale;
    const effectiveScaleX = scaleX ?? autoScale;
    const rawBitmap = renderText(text, {
      ...(invert !== undefined ? { invert } : {}),
      scaleX: effectiveScaleX,
      scaleY: effectiveScaleY,
    });
    const bitmap = rotateBitmap(rawBitmap, 270);
    const page: PageData = {
      bitmap,
      media,
      ...(Object.keys(pageOptions).length > 0 ? { options: pageOptions } : {}),
    };
    await this.print([page]);
  }

  async printImage(
    image: Buffer | string,
    media: MediaDescriptor,
    options?: ImagePrintOptions,
  ): Promise<void> {
    const { threshold, dither, invert, rotate, ...pageOptions } = options ?? {};
    let rawImageData: RawImageData;

    if (typeof image === 'string') {
      rawImageData = await loadImageFile(image);
    } else {
      rawImageData = await decodeBuffer(image);
    }

    const rawBitmap = renderImage(rawImageData, {
      ...(threshold !== undefined ? { threshold } : {}),
      ...(dither !== undefined ? { dither } : {}),
      ...(invert !== undefined ? { invert } : {}),
      ...(rotate !== undefined ? { rotate } : {}),
    });
    const bitmap = rotateBitmap(rawBitmap, 270);
    const page: PageData = {
      bitmap,
      media,
      ...(Object.keys(pageOptions).length > 0 ? { options: pageOptions } : {}),
    };
    await this.print([page]);
  }

  async printTwoColor(
    black: LabelBitmap,
    red: LabelBitmap,
    media: MediaDescriptor,
    options?: PageOptions,
  ): Promise<void> {
    if (!this.device.twoColor) {
      throw new UnsupportedOperationError(
        `${this.device.name} does not support two-color printing. ` +
          'Two-color printing requires a QL-800, QL-810W, or QL-820NWB with DK-22251 labels.',
      );
    }
    const page: PageData = {
      bitmap: black,
      redBitmap: red,
      media,
      ...(options !== undefined ? { options } : {}),
    };
    await this.print([page]);
  }

  async close(): Promise<void> {
    await this._transport.close();
  }
}

export async function openPrinter(options?: OpenOptions): Promise<BrotherQLPrinter> {
  const { vid = BROTHER_VID, pid } = options ?? {};

  if (pid) {
    const device = findDevice(vid, pid);
    if (!device) throw new Error(`Unknown device: ${vid.toString(16)}:${pid.toString(16)}`);
    const transport = await UsbTransport.open(vid, pid);
    return new BrotherQLPrinter(transport, device, 'usb');
  }

  const printers = listPrinters();
  if (printers.length === 0) throw new Error('No Brother QL printers found');
  const info = printers[0];
  if (!info) throw new Error('No Brother QL printers found');
  const transport = await UsbTransport.open(info.device.vid, info.device.pid);
  return new BrotherQLPrinter(transport, info.device, 'usb');
}

export async function openPrinterTcp(host: string, port = 9100): Promise<BrotherQLPrinter> {
  const transport = await TcpTransport.connect(host, port);
  // We can't know the device descriptor from TCP alone — request status and detect
  // Fall back to a generic QL-820NWB descriptor (most capable, verified by maintainer)
  const status = await (async () => {
    await transport.write(new Uint8Array([0x1b, 0x69, 0x53]));
    return transport.read(32);
  })();

  const mediaWidthMm = status[10] ?? 0;
  // Try to find a matching device by network capability
  const { DEVICES } = await import('@thermal-label/brother-ql-core');
  const networkDevice = Object.values(DEVICES).find(d => d.network !== 'none');
  const device = networkDevice ?? DEVICES.QL_820NWB;

  void mediaWidthMm; // may be used for smarter detection in future

  return new BrotherQLPrinter(transport, device, 'tcp');
}

async function loadImageFile(filePath: string): Promise<RawImageData> {
  try {
    const canvas = await import('@napi-rs/canvas');
    const img = await canvas.loadImage(filePath);
    const canvasEl = canvas.createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return {
      width: img.width,
      height: img.height,
      data: new Uint8Array(imageData.data.buffer),
    };
  } catch {
    throw new Error(
      'Cannot load image file: install @napi-rs/canvas for image file support, ' +
        'or pass a pre-decoded RawImageData to print().',
    );
  }
}

async function decodeBuffer(buffer: Buffer): Promise<RawImageData> {
  try {
    const canvas = await import('@napi-rs/canvas');
    const img = await canvas.loadImage(buffer);
    const canvasEl = canvas.createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return {
      width: img.width,
      height: img.height,
      data: new Uint8Array(imageData.data.buffer),
    };
  } catch {
    throw new Error(
      'Cannot decode image buffer: install @napi-rs/canvas for PNG/JPEG decoding, ' +
        'or pass a pre-decoded RawImageData to print().',
    );
  }
}
