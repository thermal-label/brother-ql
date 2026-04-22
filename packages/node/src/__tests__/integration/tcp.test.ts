import { describe, it } from 'vitest';

/*
 * Hardware verification checklist:
 * - Network-capable Brother QL printer on the same network
 * - Set BROTHER_TCP_HOST to the printer's IP address
 * - Run: BROTHER_INTEGRATION=1 BROTHER_TCP_HOST=192.168.1.x pnpm test
 */
describe('Integration: TCP transport', () => {
  it.skipIf(!process.env.BROTHER_INTEGRATION || !process.env.BROTHER_TCP_HOST)(
    'prints a text label via TCP',
    async () => {
      const { openPrinterTcp, MEDIA } = await import('../../index.js');
      const host = process.env.BROTHER_TCP_HOST!;
      const printer = await openPrinterTcp(host);
      const media = MEDIA[259];
      if (!media) throw new Error('Media 259 not found');
      await printer.printText('Hello TCP Integration Test', media);
      await printer.close();
    },
  );
});
