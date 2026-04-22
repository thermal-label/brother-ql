# Web (WebUSB) Guide

## Browser support

| Browser    | Support      |
| ---------- | ------------ |
| Chrome 61+ | ✅           |
| Edge 79+   | ✅           |
| Firefox    | ❌ No WebUSB |
| Safari     | ❌ No WebUSB |

Requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): `https://` or `localhost`. WebUSB is not available in iframes without the `allowusb` permission.

## Install

```bash
pnpm add @thermal-label/brother-ql-web
```

## Quick start

```ts
import { requestPrinter, findMedia } from '@thermal-label/brother-ql-web';

// Must be called in response to a user gesture (click, etc.)
const printer = await requestPrinter();
const media = findMedia(259)!;
await printer.printText('Hello WebUSB', media);
```

## React example

```tsx
import { useState } from 'react';
import { requestPrinter, findMedia, type WebBrotherQLPrinter } from '@thermal-label/brother-ql-web';

export function PrintButton() {
  const [printer, setPrinter] = useState<WebBrotherQLPrinter | null>(null);

  async function connect() {
    const p = await requestPrinter();
    setPrinter(p);
  }

  async function print() {
    if (!printer) return;
    const media = findMedia(259)!;
    await printer.printText('Hello from React', media);
  }

  return (
    <div>
      {printer ? (
        <button onClick={print}>Print</button>
      ) : (
        <button onClick={connect}>Connect printer</button>
      )}
    </div>
  );
}
```

## Two-color printing

```ts
import { requestPrinter, findMedia } from '@thermal-label/brother-ql-web';

const printer = await requestPrinter();
const media = findMedia(259)!;

// Get ImageData from canvas elements
const blackCtx = (document.getElementById('black') as HTMLCanvasElement).getContext('2d')!;
const redCtx = (document.getElementById('red') as HTMLCanvasElement).getContext('2d')!;
const { width, height } = blackCtx.canvas;

await printer.printTwoColor(
  blackCtx.getImageData(0, 0, width, height),
  redCtx.getImageData(0, 0, width, height),
  media,
);
```

`printTwoColor` throws if the connected printer doesn't support two-color printing (requires QL-800/810W/820NWB).

## Print from URL

```ts
await printer.printImageURL('https://example.com/label.png', media, {
  threshold: 128,
  dither: true,
});
```

Uses `fetch` + `createImageBitmap` + `OffscreenCanvas` internally — no server-side rendering required.

## How it works

1. `requestPrinter()` calls `navigator.usb.requestDevice({ filters })` with all known Brother QL PIDs
2. The user picks a printer from the browser's native dialog
3. The package calls `open()`, `selectConfiguration(1)`, and `claimInterface(0)`
4. Print data is sent via `transferOut()` to endpoint 2 (bulk OUT)
5. Status responses are read via `transferIn()` from endpoint 1 (bulk IN)

The byte protocol is **byte-for-byte identical** to the USB stream used by the Node.js package — the same `encodeJob()` function from `@thermal-label/brother-ql-core` is used.

## Using a pre-obtained USBDevice

```ts
import { fromUSBDevice } from '@thermal-label/brother-ql-web';

// If you already have a USBDevice from navigator.usb.getDevices()
const devices = await navigator.usb.getDevices();
const device = devices[0];
if (device) {
  const printer = fromUSBDevice(device);
  // Note: fromUSBDevice does not open/claim the device — you must do it first
}
```

## API summary

| Export                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `requestPrinter(options?)`   | Show USB picker and open printer     |
| `fromUSBDevice(device)`      | Wrap an existing USBDevice           |
| `WebBrotherQLPrinter`        | Printer class                        |
| `findMedia(id)`              | Look up media by numeric ID          |
| `renderText(text, options?)` | Render 1bpp text bitmap (from core)  |
| `renderImage(raw, options?)` | Render 1bpp image bitmap (from core) |
| `rotateBitmap(bitmap, deg)`  | Rotate bitmap (from core)            |
| `DEVICES`                    | Device descriptor registry           |
| `MEDIA`                      | Media descriptor registry            |

See the live demo at [/demo](/demo) — connect a real printer to print directly from the browser.
