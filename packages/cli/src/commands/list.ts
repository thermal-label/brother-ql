import chalk from 'chalk';
import { listPrinters } from '@thermal-label/brother-ql-node';

export function runList(): void {
  const printers = listPrinters();

  if (printers.length === 0) {
    console.log(chalk.yellow('No Brother QL printers found.'));
    console.log(
      chalk.dim(
        'If a printer is connected, it may be in Editor Lite mode. Hold the Editor Lite button to disable it.',
      ),
    );
    return;
  }

  console.log(chalk.bold(`Found ${printers.length.toString()} printer(s):\n`));
  for (const { device, path, serialNumber } of printers) {
    console.log(`  ${chalk.green(device.name)}  ${chalk.dim(`[${path}]`)}`);
    if (serialNumber) console.log(`    Serial: ${serialNumber}`);
    const features = [
      device.twoColor ? chalk.red('two-color') : null,
      device.network !== 'none' ? `network(${device.network})` : null,
      !device.autocut ? chalk.yellow('no-autocut') : null,
    ]
      .filter(Boolean)
      .join(', ');
    if (features) console.log(`    ${features}`);
  }
}
