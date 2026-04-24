# Web Guide

`@thermal-label/brother-ql-web` talks to Brother QL printers directly
from Chrome or Edge via the
[WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API),
and — for the QL-820NWB / 820NWBc — via the
[Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
over the OS-level Bluetooth-SPP pairing. No backend, no native
drivers. Implements the same `PrinterAdapter` the Node.js driver does,
backed by `WebUsbTransport` / `WebSerialTransport` from
`@thermal-label/transport/web`.

## Browser support

| Browser    | WebUSB | Web Serial |
| ---------- | :----: | :--------: |
| Chrome 61+ |   ✅   |     ✅     |
| Edge 79+   |   ✅   |     ✅     |
| Firefox    |   ❌   |     ❌     |
| Safari     |   ❌   |     ❌     |

Requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
(`https://` or `localhost`) and a user gesture (click / keypress)
for the initial pairing prompt.

## Install

```bash
pnpm add @thermal-label/brother-ql-web
```

## Quick start

```ts
import { requestPrinter } from '@thermal-label/brother-ql-web';
import { MEDIA } from '@thermal-label/brother-ql-core';

// Must run from a user gesture.
const printer = await requestPrinter();
try {
  await printer.print(image, MEDIA[259]); // 62mm continuous
} finally {
  await printer.close();
}
```

`image` is `RawImageData` — `{ width, height, data }` with `data` as
an RGBA `Uint8Array`. Build one from a canvas `ImageData`:

```ts
const bmp = await createImageBitmap(file);
const canvas = new OffscreenCanvas(bmp.width, bmp.height);
const ctx = canvas.getContext('2d')!;
ctx.drawImage(bmp, 0, 0);
const id = ctx.getImageData(0, 0, bmp.width, bmp.height);
const image = { width: id.width, height: id.height, data: new Uint8Array(id.data.buffer) };
```

---

## Two-colour (DK-22251)

Same call — the driver reads `media.colorCapable` and runs
`splitTwoColor()` before encoding. Red pixels (`r > 180 && g < 100 &&
b < 100`) go to the red plane, everything else to black. Overlaps
resolve in favour of black.

```ts
await printer.print(image, MEDIA[251]);
```

QL-800 / QL-810W / QL-820NWB are the models with the red print head.

---

## Bluetooth (QL-820NWB)

The 820 series exposes classic Bluetooth SPP, not BLE/GATT — so Web
Bluetooth is not applicable. After pairing the printer through the
OS Bluetooth settings, it surfaces as a serial port. Use the
`@thermal-label/transport/web` `WebSerialTransport` in a minimal
wrapper:

```ts
import { WebSerialTransport } from '@thermal-label/transport/web';
import {
  DEVICES,
  encodeJob,
  splitTwoColor,
  renderImage,
  STATUS_REQUEST,
  parseStatus,
  MEDIA,
  type BrotherQLStatus,
} from '@thermal-label/brother-ql-core';

// User-gesture pick
const port = await navigator.serial.requestPort();
const transport = await WebSerialTransport.fromPort(port);

// Reuse the driver's encode path by constructing the page explicitly
const media = MEDIA[259];
const bitmap = renderImage(image, { dither: true });
await transport.write(encodeJob([{ bitmap, media }]));
```

A first-class `openSerialPrinter()` helper for the web package is a
follow-up — the node `discovery.openPrinter({ path })` covers the
common case today.

---

## React example

```tsx
import { useState } from 'react';
import { requestPrinter, type WebBrotherQLPrinter } from '@thermal-label/brother-ql-web';
import { MEDIA } from '@thermal-label/brother-ql-core';

export function PrintButton({
  image,
}: {
  image: { width: number; height: number; data: Uint8Array };
}) {
  const [printer, setPrinter] = useState<WebBrotherQLPrinter | null>(null);

  async function connect() {
    setPrinter(await requestPrinter());
  }

  async function print() {
    if (!printer) return;
    await printer.print(image, MEDIA[259]);
  }

  async function disconnect() {
    if (!printer) return;
    await printer.close();
    setPrinter(null);
  }

  return (
    <div>
      <button onClick={connect} disabled={!!printer}>
        Connect
      </button>
      <button onClick={print} disabled={!printer}>
        Print
      </button>
      <button onClick={disconnect} disabled={!printer}>
        Disconnect
      </button>
    </div>
  );
}
```

---

## Status

```ts
const status = await printer.getStatus();

status.ready; // printer idle and error-free
status.mediaLoaded; // roll detected
status.detectedMedia; // BrotherQLMedia — auto-populated from the 32-byte response
status.editorLiteMode; // driver extension — true when 820NWB is in Editor Lite
status.errors; // PrinterError[] — same codes as the node driver
```

---

## How it works

1. `requestPrinter()` calls `navigator.usb.requestDevice({ filters })`
   with the Brother QL VID/PIDs.
2. `WebUsbTransport.fromDevice()` opens the device, selects the
   active configuration, claims interface 0, and resolves the bulk
   IN/OUT endpoints from the interface descriptor.
3. `print()` runs `renderImage` (or `splitTwoColor`) depending on
   media, then calls `encodeJob()` from
   `@thermal-label/brother-ql-core` — byte-for-byte identical to the
   Node.js driver.

---

## Pre-obtained USBDevice

```ts
import { fromUSBDevice } from '@thermal-label/brother-ql-web';

const [device] = await navigator.usb.getDevices();
if (device) {
  const printer = await fromUSBDevice(device);
}
```

`fromUSBDevice` is async — it hands the device to
`WebUsbTransport.fromDevice()`, which opens and claims it for you.

---

## API summary

| Export                     | Description                           |
| -------------------------- | ------------------------------------- |
| `requestPrinter(options?)` | Show USB picker and open the printer  |
| `fromUSBDevice(device)`    | Wrap a pre-paired `USBDevice` (async) |
| `WebBrotherQLPrinter`      | Adapter class                         |
| `DEFAULT_FILTERS`          | Brother QL VID/PID filter set         |

See the live demo at [/demo](/demo) — connect a real printer to print
directly from the browser.
