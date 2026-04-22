import { openPrinter, openPrinterTcp, findMedia, renderImage } from '@thermal-label/brother-ql-node';
import { rotateBitmap } from '@mbtech-nl/bitmap';
import { readFile } from 'node:fs/promises';

interface PrintTwoColorOptions {
  media: string;
  cut?: boolean;
  host?: string;
  serial?: string;
  threshold?: string;
  dither?: boolean;
  invert?: boolean;
}

export async function runPrintTwoColor(
  blackFile: string,
  redFile: string,
  options: PrintTwoColorOptions,
): Promise<void> {
  const mediaId = Number.parseInt(options.media, 10);
  const media = findMedia(mediaId);
  if (!media) throw new Error(`Unknown media ID: ${options.media}`);

  const threshold = options.threshold ? Number.parseInt(options.threshold, 10) : undefined;
  const renderOpts = {
    ...(threshold !== undefined ? { threshold } : {}),
    ...(options.dither ? { dither: true } : {}),
    ...(options.invert ? { invert: true } : {}),
  };

  const [blackBuf, redBuf] = await Promise.all([
    readFile(blackFile),
    readFile(redFile),
  ]);

  // Decode via @napi-rs/canvas if available, otherwise error
  interface CanvasMod {
    loadImage: (src: Buffer) => Promise<{ width: number; height: number }>;
    createCanvas: (w: number, h: number) => {
      getContext: (type: '2d') => {
        drawImage: (img: unknown, x: number, y: number) => void;
        getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
      };
    };
  }

  const canvasSpecifier = '@napi-rs/canvas';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const canvasMod: CanvasMod = await import(canvasSpecifier).catch(() => {
    throw new Error('Image decoding requires @napi-rs/canvas. Install it: pnpm add @napi-rs/canvas');
  });
  const { loadImage, createCanvas } = canvasMod;

  async function decode(buf: Buffer): Promise<{ width: number; height: number; data: Uint8Array }> {
    const img = await loadImage(buf);
    const canvasEl = createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return { width: img.width, height: img.height, data: new Uint8Array(imageData.data.buffer) };
  }

  const [blackRaw, redRaw] = await Promise.all([decode(blackBuf), decode(redBuf)]);

  const blackBitmap = rotateBitmap(renderImage(blackRaw, renderOpts), 90);
  const redBitmap = rotateBitmap(renderImage(redRaw, renderOpts), 90);

  const printer = options.host
    ? await openPrinterTcp(options.host)
    : await openPrinter({
        ...(options.serial ? { serialNumber: options.serial } : {}),
      });

  await printer.printTwoColor(blackBitmap, redBitmap, media, {
    autoCut: options.cut !== false,
  });

  await printer.close();
}
