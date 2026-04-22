import { describe, it } from 'vitest';
import { createBitmap } from '@mbtech-nl/bitmap';

/*
 * Hardware verification checklist (QL-820NWB only):
 * - QL-820NWB powered on, connected via USB
 * - DK-22251 (black + red on white, 62mm continuous) label loaded
 * - Editor Lite mode disabled
 * - Run: BROTHER_INTEGRATION=1 pnpm test
 */
describe('Integration: print two-color (QL-820NWB)', () => {
  it.skipIf(!process.env.BROTHER_INTEGRATION)('prints a two-color label via USB', async () => {
    const { openPrinter, MEDIA, renderText } = await import('../../index.js');
    const printer = await openPrinter();

    if (!printer.device.twoColor) {
      console.warn(`Skipping two-color test: ${printer.device.name} does not support two-color.`);
      await printer.close();
      return;
    }

    const media = MEDIA[259];
    if (!media) throw new Error('Media 259 not found');

    const black = renderText('Hello', { scaleX: 2, scaleY: 2 });
    const red = createBitmap(black.widthPx, black.heightPx);

    await printer.printTwoColor(black, red, media);
    await printer.close();
  });
});
