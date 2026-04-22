# Node.js Guide

## Install

```bash
pnpm add @thermal-label/brother-ql-node
# Optional: image file printing
pnpm add @napi-rs/canvas
```

## Quick example

```ts
import { openPrinter, findMedia } from '@thermal-label/brother-ql-node';

const media = findMedia(259)!;
const printer = await openPrinter();
await printer.printText('Hello QL!', media);
await printer.close();
```

## Discover printers

```ts
import { listPrinters } from '@thermal-label/brother-ql-node';

const printers = listPrinters();
for (const { device, serialNumber, path } of printers) {
  console.log(`${device.name} — SN: ${serialNumber ?? 'unknown'} — path: ${path}`);
}
```

`listPrinters()` skips printers in Editor Lite (mass storage) mode and logs a warning with instructions to disable it.

## USB connection

```ts
import { openPrinter } from '@thermal-label/brother-ql-node';

// First connected printer
const printer = await openPrinter();

// Target by serial number
const printer = await openPrinter({ serialNumber: 'SN001234' });

// Target by PID (advanced)
const printer = await openPrinter({ pid: 0x20a7 });
```

## TCP/network connection

```ts
import { openPrinterTcp } from '@thermal-label/brother-ql-node';

const printer = await openPrinterTcp('192.168.1.100');
// Custom port (default: 9100)
const printer = await openPrinterTcp('192.168.1.100', 9100);
```

## Print text

```ts
await printer.printText('Hello', media, {
  invert: false, // white text on black
  scaleX: 1, // integer horizontal scale
  scaleY: 2, // integer vertical scale
  autoCut: true, // auto-cut after label
});
```

### `printText` options

| Option       | Type      | Default | Description                    |
| ------------ | --------- | ------- | ------------------------------ |
| `invert`     | `boolean` | `false` | White text on black background |
| `scaleX`     | `number`  | `1`     | Horizontal pixel scale         |
| `scaleY`     | `number`  | `1`     | Vertical pixel scale           |
| `autoCut`    | `boolean` | `true`  | Cut after label                |
| `cutAtEnd`   | `boolean` | `true`  | Cut at end of job              |
| `marginDots` | `number`  | `35`    | Feed margin in dots (35 = 3mm) |

## Print images

```ts
// From file path (requires @napi-rs/canvas)
await printer.printImage('/path/to/label.png', media);

// From a Buffer (requires @napi-rs/canvas for PNG/JPEG decode)
await printer.printImage(imageBuffer, media, {
  threshold: 128, // B&W threshold
  dither: true, // Floyd-Steinberg dithering
  invert: false,
});
```

### `printImage` options

| Option      | Type              | Default | Description               |
| ----------- | ----------------- | ------- | ------------------------- |
| `threshold` | `number`          | `128`   | B&W threshold (0–255)     |
| `dither`    | `boolean`         | `false` | Floyd-Steinberg dithering |
| `invert`    | `boolean`         | `false` | Invert black/white        |
| `rotate`    | `0\|90\|180\|270` | `0`     | Rotate before rendering   |
| `autoCut`   | `boolean`         | `true`  | Cut after label           |

## Two-color printing

Requires a QL-800, QL-810W, or QL-820NWB and DK-22251 labels (black + red).

```ts
import { openPrinter, findMedia, renderImage, rotateBitmap } from '@thermal-label/brother-ql-node';

const media = findMedia(259)!;
const printer = await openPrinter();

// Pre-render bitmaps from RawImageData
const blackBitmap = rotateBitmap(renderImage(blackRawImage), 90);
const redBitmap = rotateBitmap(renderImage(redRawImage), 90);

await printer.printTwoColor(blackBitmap, redBitmap, media);
await printer.close();
```

`printTwoColor` throws `UnsupportedOperationError` if the connected device does not support two-color printing.

## Multi-printer targeting

```ts
import { listPrinters, openPrinter } from '@thermal-label/brother-ql-node';

const printers = listPrinters();
for (const { serialNumber } of printers) {
  if (!serialNumber) continue;
  const p = await openPrinter({ serialNumber });
  await p.printText(`Label for ${serialNumber}`, media);
  await p.close();
}
```

## Status checks

```ts
const status = await printer.getStatus();
console.log(`Ready: ${status.ready}`);
console.log(`Media: ${status.mediaWidthMm}mm ${status.mediaType ?? 'unknown'}`);
if (status.errors.length > 0) {
  console.error('Errors:', status.errors.join(', '));
}
```

## API summary

| Export                        | Description                 |
| ----------------------------- | --------------------------- |
| `openPrinter(options?)`       | Open USB printer            |
| `openPrinterTcp(host, port?)` | Open TCP printer            |
| `listPrinters()`              | List connected USB printers |
| `BrotherQLPrinter`            | Printer class               |
| `findMedia(id)`               | Look up media by numeric ID |
| `findMediaByWidth(mm, type)`  | Look up media by width      |
| `DEVICES`                     | Device descriptor registry  |
| `MEDIA`                       | Media descriptor registry   |
| `renderText(text, options?)`  | Render 1bpp text bitmap     |
| `renderImage(raw, options?)`  | Render 1bpp image bitmap    |
| `rotateBitmap(bitmap, deg)`   | Rotate bitmap 90/180/270°   |
