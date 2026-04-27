# Getting Started

## Node.js

Install the Node.js package:

```bash
pnpm add @thermal-label/brother-ql-node
```

Print your first label:

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

const printer = await discovery.openPrinter();
try {
  // image is `RawImageData` — `{ width, height, data }` with `data` a
  // `Uint8Array` of RGBA pixels. Any image pipeline that produces
  // RGBA works: @napi-rs/canvas, sharp, or hand-built buffers.
  await printer.print(image, MEDIA[259]); // 62mm continuous
} finally {
  await printer.close();
}
```

### TCP (network-connected models)

```ts
const printer = await discovery.openPrinter({ host: '192.168.1.100' });
await printer.print(image, MEDIA[259]);
```

### Bluetooth (QL-820NWB)

The QL-820NWB / 820NWBc advertise classic Bluetooth (SPP), not BLE —
so Web Bluetooth isn't an option. Pair the printer through the OS
Bluetooth settings, then open the RFCOMM serial port the kernel
exposes:

```ts
// Linux: /dev/rfcomm0 after `bluetoothctl pair` + `rfcomm bind`
// Windows: auto-assigned COM<n> after pairing
// macOS: not supported — Apple removed classic Bluetooth SPP
const printer = await discovery.openPrinter({ path: '/dev/rfcomm0' });
await printer.print(image, MEDIA[259]);
```

### Two-colour (DK-22251)

Just pass the DK-22251 descriptor — the driver runs
`renderMultiPlaneImage()` from `@mbtech-nl/bitmap` internally and
sends both planes:

```ts
await printer.print(image, MEDIA[251]); // two-colour DK-22251
```

## Unified CLI

For ad-hoc printing, use
[`thermal-label-cli`](https://www.npmjs.com/package/thermal-label-cli).
It auto-detects every installed `@thermal-label/*-node` driver:

```bash
pnpm add -g thermal-label-cli @thermal-label/brother-ql-node
thermal-label list
thermal-label print ./label.png
```

## Browser (WebUSB)

```bash
pnpm add @thermal-label/brother-ql-web
```

```ts
import { requestPrinter } from '@thermal-label/brother-ql-web';
import { MEDIA } from '@thermal-label/brother-ql-core';

// Call from a user gesture (click, keypress).
const printer = await requestPrinter();
try {
  await printer.print(image, MEDIA[259]);
} finally {
  await printer.close();
}
```

Chrome 61+ or Edge 79+, served over HTTPS or `localhost`.

## Something not working?

::: warning Not printing on the first try?
That's normal. udev rules, ipp-usb conflicts, Editor Lite mode, and
the DK-22251 media ID catch most people.

**→ [See the troubleshooting guide](/troubleshooting)** — problems are
grouped by platform with step-by-step fixes.
:::

---

## Looking for a Python alternative?

[brother_ql](https://github.com/pklaus/brother_ql) is a mature
open-source Python tool for the same Brother QL printer family. If
your stack is Python-based, it may be a better fit.
