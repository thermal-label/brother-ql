import { openPrinter, openPrinterTcp, findMedia } from '@thermal-label/brother-ql-node';

interface PrintTextOptions {
  media: string;
  invert?: boolean;
  scaleX?: string;
  scaleY?: string;
  cut?: boolean;
  host?: string;
  serial?: string;
}

export async function runPrintText(text: string, options: PrintTextOptions): Promise<void> {
  const mediaId = Number.parseInt(options.media, 10);
  const media = findMedia(mediaId);
  if (!media)
    throw new Error(
      `Unknown media ID: ${options.media}. Run 'brother-ql list' to discover printers.`,
    );

  const printer = options.host
    ? await openPrinterTcp(options.host)
    : await openPrinter({
        ...(options.serial ? { serialNumber: options.serial } : {}),
      });

  await printer.printText(text, media, {
    ...(options.invert ? { invert: true } : {}),
    ...(options.scaleX ? { scaleX: Number.parseInt(options.scaleX, 10) } : {}),
    ...(options.scaleY ? { scaleY: Number.parseInt(options.scaleY, 10) } : {}),
    autoCut: options.cut !== false,
  });

  await printer.close();
  console.log('Label printed.');
}
