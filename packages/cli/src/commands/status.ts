import chalk from 'chalk';
import { openPrinter, openPrinterTcp } from '@thermal-label/brother-ql-node';

export async function runStatus(options: { host?: string }): Promise<void> {
  const printer = options.host ? await openPrinterTcp(options.host) : await openPrinter();

  const status = await printer.getStatus();
  await printer.close();

  console.log(chalk.bold(`Printer: ${printer.device.name}`));
  console.log(`  Ready:        ${status.ready ? chalk.green('yes') : chalk.red('no')}`);
  console.log(`  Media width:  ${status.mediaWidthMm.toString()}mm`);
  console.log(`  Media type:   ${status.mediaType ?? chalk.dim('unknown')}`);

  if (status.errors.length > 0) {
    console.log(`  Errors:`);
    for (const err of status.errors) {
      console.log(`    ${chalk.red('✗')} ${err}`);
    }
  }

  if (status.editorLiteMode) {
    console.log(
      chalk.yellow('  ⚠ Editor Lite mode detected. Hold the Editor Lite button to disable.'),
    );
  }
}
