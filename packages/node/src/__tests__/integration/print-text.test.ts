import { describe, it } from 'vitest';

/*
 * Hardware verification checklist:
 * - Printer is powered on and connected via USB
 * - Label is loaded (any width)
 * - Editor Lite mode is disabled
 * - Run: BROTHER_INTEGRATION=1 pnpm test
 *
 * Expected result:
 * - Label prints with text "Hello QL Integration Test"
 * - Auto-cut fires after label
 * - No error thrown
 */
describe('Integration: print text', () => {
  it.skipIf(!process.env.BROTHER_INTEGRATION)('prints a text label via USB', async () => {
    const { openPrinter, MEDIA } = await import('../../index.js');
    const printer = await openPrinter();
    const media = MEDIA[259];
    if (!media) throw new Error('Media 259 not found');
    await printer.printText('Hello QL Integration Test', media);
    await printer.close();
  });
});
