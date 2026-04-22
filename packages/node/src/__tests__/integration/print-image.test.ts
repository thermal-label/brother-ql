import { describe, it } from 'vitest';
import { join } from 'node:path';

/*
 * Hardware verification checklist:
 * - Printer is powered on and connected via USB
 * - 62mm continuous label loaded
 * - Set BROTHER_INTEGRATION_IMAGE to a PNG/JPEG file path (optional)
 * - Run: BROTHER_INTEGRATION=1 pnpm test
 */
describe('Integration: print image', () => {
  it.skipIf(!process.env.BROTHER_INTEGRATION)('prints an image label via USB', async () => {
    const { openPrinter, MEDIA } = await import('../../index.js');
    const imagePath = process.env.BROTHER_INTEGRATION_IMAGE ?? join(import.meta.dirname, 'test.png');
    const printer = await openPrinter();
    const media = MEDIA[259];
    if (!media) throw new Error('Media 259 not found');
    await printer.printImage(imagePath, media);
    await printer.close();
  });
});
