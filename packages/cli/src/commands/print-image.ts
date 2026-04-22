import { openPrinter, openPrinterTcp, findMedia } from '@thermal-label/brother-ql-node';

interface PrintImageOptions {
  media: string;
  threshold?: string;
  dither?: boolean;
  invert?: boolean;
  rotate?: string;
  cut?: boolean;
  host?: string;
  serial?: string;
}

export async function runPrintImage(file: string, options: PrintImageOptions): Promise<void> {
  const mediaId = Number.parseInt(options.media, 10);
  const media = findMedia(mediaId);
  if (!media) throw new Error(`Unknown media ID: ${options.media}`);

  const rotate = options.rotate
    ? (Number.parseInt(options.rotate, 10) as 0 | 90 | 180 | 270)
    : undefined;

  const printer = options.host
    ? await openPrinterTcp(options.host)
    : await openPrinter({
        ...(options.serial ? { serialNumber: options.serial } : {}),
      });

  await printer.printImage(file, media, {
    ...(options.threshold ? { threshold: Number.parseInt(options.threshold, 10) } : {}),
    ...(options.dither ? { dither: true } : {}),
    ...(options.invert ? { invert: true } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
    autoCut: options.cut !== false,
  });

  await printer.close();
}
