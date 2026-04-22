import { Command } from 'commander';
import { runList } from './commands/list.js';
import { runStatus } from './commands/status.js';
import { runPrintText } from './commands/print-text.js';
import { runPrintImage } from './commands/print-image.js';
import { runPrintTwoColor } from './commands/print-two-color.js';

export function run(): void {
  const program = new Command();

  program.name('brother-ql').description('Brother QL label printer driver CLI').version('0.0.0');

  program
    .command('list')
    .description('list connected printers')
    .action(() => {
      runList();
    });

  program
    .command('status')
    .description('show printer status')
    .option('--host <ip>', 'use TCP transport instead of USB')
    .action((options: { host?: string }) => {
      runStatus(options).catch(handleError);
    });

  const print = program.command('print').description('print a label');

  print
    .command('text <text>')
    .description('print a text label')
    .requiredOption('-m, --media <id>', 'media ID (e.g. 259 for 62mm continuous)')
    .option('--invert', 'white text on black')
    .option('--scale-x <n>', 'horizontal scale (default 1)')
    .option('--scale-y <n>', 'vertical scale (default 1)')
    .option('--no-cut', 'disable auto-cut')
    .option('--host <ip>', 'use TCP transport')
    .option('--serial <sn>', 'target printer by serial number')
    .action((text: string, options: Record<string, unknown>) => {
      runPrintText(text, options as unknown as Parameters<typeof runPrintText>[1]).catch(
        handleError,
      );
    });

  print
    .command('image <file>')
    .description('print an image')
    .requiredOption('-m, --media <id>', 'media ID')
    .option('--threshold <0-255>', 'B&W threshold (default 128)')
    .option('--dither', 'Floyd-Steinberg dithering')
    .option('--invert', 'invert image')
    .option('--rotate <0|90|180|270>', 'rotate image')
    .option('--no-cut', 'disable auto-cut')
    .option('--host <ip>', 'use TCP transport')
    .option('--serial <sn>', 'target printer by serial number')
    .action((file: string, options: Record<string, unknown>) => {
      runPrintImage(file, options as unknown as Parameters<typeof runPrintImage>[1]).catch(
        handleError,
      );
    });

  print
    .command('two-color <black> <red>')
    .description('print a two-color label (QL-800 series)')
    .requiredOption('-m, --media <id>', 'media ID')
    .option('--no-cut', 'disable auto-cut')
    .option('--host <ip>', 'use TCP transport')
    .option('--serial <sn>', 'target printer by serial number')
    .option('--threshold <0-255>', 'B&W threshold')
    .option('--dither', 'Floyd-Steinberg dithering')
    .option('--invert', 'invert images')
    .action((black: string, red: string, options: Record<string, unknown>) => {
      runPrintTwoColor(
        black,
        red,
        options as unknown as Parameters<typeof runPrintTwoColor>[2],
      ).catch(handleError);
    });

  program.parse();
}

function handleError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${msg}`);
  process.exit(1);
}
