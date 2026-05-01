import { describe, it } from 'vitest';

const INTEGRATION = process.env.BROTHER_INTEGRATION === '1';

/*
 * Hardware verification — skipped unless BROTHER_INTEGRATION=1.
 *
 * Pre-reqs:
 * - Printer connected via USB (or TCP — set BROTHER_TCP_HOST)
 * - DK-22205 (62mm continuous) or DK-22251 (two-colour) loaded
 * - Editor Lite mode disabled on QL-820NWB
 */
describe.skipIf(!INTEGRATION)('Integration: brother-ql', () => {
  it('prints a single-colour label via USB', async () => {
    const { discovery } = await import('../../index.js');
    const { MEDIA } = await import('@thermal-label/brother-ql-core');
    const printer = await discovery.openPrinter();
    try {
      const image = {
        width: 696,
        height: 300,
        data: new Uint8Array(696 * 300 * 4).fill(0),
      };
      await printer.print(image, MEDIA[259]);
    } finally {
      await printer.close();
    }
  });

  it('prints a two-colour label when DK-22251 is loaded', async () => {
    const { discovery } = await import('../../index.js');
    const { MEDIA } = await import('@thermal-label/brother-ql-core');
    const printer = await discovery.openPrinter();
    try {
      if (!printer.device.engines[0]?.capabilities?.twoColor) {
        console.warn(`Skipping two-colour test: ${printer.device.name} is single-colour.`);
        return;
      }
      // Red-dominant test image
      const width = 696;
      const height = 200;
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 3] = 255;
      }
      await printer.print({ width, height, data }, MEDIA[251]);
    } finally {
      await printer.close();
    }
  });

  it('prints via TCP when BROTHER_TCP_HOST is set', async () => {
    const host = process.env.BROTHER_TCP_HOST;
    if (!host) return;
    const { discovery } = await import('../../index.js');
    const { MEDIA } = await import('@thermal-label/brother-ql-core');
    const printer = await discovery.openPrinter({ host });
    try {
      const image = {
        width: 696,
        height: 200,
        data: new Uint8Array(696 * 200 * 4).fill(0),
      };
      await printer.print(image, MEDIA[259]);
    } finally {
      await printer.close();
    }
  });
});
