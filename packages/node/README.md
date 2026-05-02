# @thermal-label/brother-ql-node

Node.js USB and TCP driver for Brother QL label printers.

## Install

```bash
pnpm add @thermal-label/brother-ql-node
```

For image file support (PNG/JPEG), also install:

```bash
pnpm add @napi-rs/canvas
```

## Quick Start

```ts
import { openPrinter, MEDIA } from '@thermal-label/brother-ql-node';

const printer = await openPrinter();
await printer.printText('Hello QL', MEDIA[259]!);
await printer.close();
```

## Discover Printers

```ts
import { listPrinters } from '@thermal-label/brother-ql-node';
const printers = listPrinters();
console.log(printers);
```

## Print an Image

```ts
await printer.printImage('/path/to/image.png', MEDIA[259]!);
```

## Two-Color Printing (QL-800 series)

```ts
import { openPrinter, MEDIA, renderText } from '@thermal-label/brother-ql-node';
import { createBitmap } from '@mbtech-nl/bitmap';

const printer = await openPrinter();
const media = MEDIA[259]!;
const black = renderText('Hello', { scaleX: 2, scaleY: 2 });
const red = renderText('World', { scaleX: 2, scaleY: 2 });
await printer.printTwoColor(black, red, media);
await printer.close();
```

## TCP/Network Printing

```ts
import { openPrinterTcp, MEDIA } from '@thermal-label/brother-ql-node';

const printer = await openPrinterTcp('192.168.1.100');
await printer.printText('Hello Network', MEDIA[259]!);
await printer.close();
```

## Requirements

- Node.js `>=20.9.0` (Node 24 LTS recommended)
- Linux: add a udev rule for raw USB access without `sudo`:
  ```
  SUBSYSTEM=="usb", ATTRS{idVendor}=="04f9", MODE="0666"
  ```
- `@napi-rs/canvas` is optional — required only for image file decoding

## License

MIT © Mannes Brak
