# Node.js Guide

`@thermal-label/brother-ql-node` implements the `PrinterAdapter`
interface from
[`@thermal-label/contracts`](https://www.npmjs.com/package/@thermal-label/contracts),
built on
[`@thermal-label/transport`](https://www.npmjs.com/package/@thermal-label/transport).
Single `print(image, media?, options?)` handles both single-ink and
multi-ink labels — the driver runs `renderMultiPlaneImage()` from
`@mbtech-nl/bitmap` internally whenever the resolved media carries a
`palette`, and auto-rotates landscape input on media tagged
`defaultOrientation: 'horizontal'`.

## Install

```bash
pnpm add @thermal-label/brother-ql-node
```

## Quick example

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

const printer = await discovery.openPrinter();
try {
  await printer.print(image, MEDIA[259]); // 62mm continuous
} finally {
  await printer.close();
}
```

---

## The adapter

`BrotherQLPrinter` implements `PrinterAdapter`:

| Method                                                        | Description                                            |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `print(image, media?)`                                        | Print one label (single- or two-colour)                |
| `createPreview(image, options?)`                              | Render 1bpp planes for UI previews                     |
| `getStatus()`                                                 | `BrotherQLStatus` — contracts shape + `editorLiteMode` |
| `close()`                                                     | Release the transport                                  |
| `family` / `model` / `device` / `transportType` / `connected` | Identification                                         |

---

## Discovery

```ts
import { discovery } from '@thermal-label/brother-ql-node';

const printers = await discovery.listPrinters();
// [{ device, serialNumber, transport: 'usb', connectionId: '1.3' }, ...]

// First connected USB printer
const printer = await discovery.openPrinter();

// Target by serial number
const specific = await discovery.openPrinter({ serialNumber: 'SN001234' });

// Target by VID/PID
const ql820 = await discovery.openPrinter({ pid: 0x20a7 });
```

`listPrinters()` skips printers in Editor Lite (mass-storage) mode —
you'll see a console warning telling you how to turn Editor Lite off.
Network printers (wifi/wired) are **not** surfaced by
`listPrinters()`; there's no mDNS implementation. Open them
explicitly:

### TCP

```ts
const printer = await discovery.openPrinter({ host: '192.168.1.100' });
// Custom port (default 9100)
const printer = await discovery.openPrinter({ host: '10.0.0.5', port: 9101 });
```

### Bluetooth (QL-820NWB / 820NWBc)

The 820 series uses classic Bluetooth (SPP), not BLE — so Web
Bluetooth is not an option. Pair the printer via the OS Bluetooth
settings, then open the RFCOMM serial port:

```ts
// Linux: /dev/rfcomm0 after `bluetoothctl pair` + `rfcomm bind`
// Windows: auto-assigned COM<n> after OS pairing
// macOS: not supported — no classic Bluetooth SPP in modern macOS
const printer = await discovery.openPrinter({ path: '/dev/rfcomm0' });

// Optional baud rate — default 9600 (ignored by RFCOMM)
const printer = await discovery.openPrinter({ path: 'COM3', baudRate: 115200 });
```

---

## Media

`MEDIA` keys are the numeric firmware IDs the printer reports in its
32-byte status response:

```ts
import { MEDIA, type BrotherQLMedia } from '@thermal-label/brother-ql-core';

MEDIA[259]; // 62mm continuous (DK-22205) — DEFAULT_MEDIA for previews
MEDIA[251]; // 62mm continuous two-colour (DK-22251)
MEDIA[274]; // 62×29mm die-cut (DK-11209)
// ...
```

On any QL series printer, `getStatus()` populates `detectedMedia`
from the roll in the printer. Subsequent `print()` calls can omit
`media` and the adapter reuses the detection automatically.
`print()` throws `MediaNotSpecifiedError` when neither an explicit
media nor a status-detected media is available.

---

## Printing

### Single-colour (most media)

```ts
await printer.print(image, MEDIA[259]);
```

### Two-colour (DK-22251)

Same call — the driver notices `media.palette !== undefined` and
runs `renderMultiPlaneImage()` from `@mbtech-nl/bitmap` on the RGBA
image with `MEDIA[251].palette` (black + red) to separate the two
planes before encoding. Each source pixel is classified to its
nearest palette entry (or to the implicit white background) by RGB
distance, so every dot lands in at most one plane.

```ts
await printer.print(image, MEDIA[251]);
```

Need a different colour threshold? Pre-split and pass separate
planes via the lower-level `encodeJob` in core.

---

## Status

```ts
const status = await printer.getStatus();

status.ready; // printer idle and error-free
status.mediaLoaded; // roll detected
status.detectedMedia; // BrotherQLMedia — always populated when media is loaded
status.errors; // PrinterError[] — structured codes + messages
status.editorLiteMode; // (driver extension) true when QL-820NWB is in Editor Lite
status.rawBytes; // 32-byte raw response for diagnostics
```

Error codes:

| Code           | Meaning                                    |
| -------------- | ------------------------------------------ |
| `no_media`     | No roll installed                          |
| `cover_open`   | Cover is open                              |
| `cutter_jam`   | Cutter jammed                              |
| `media_end`    | End of roll                                |
| `wrong_media`  | Loaded media doesn't match specified media |
| `not_ready`    | Printer busy / pause                       |
| `system_error` | Internal error (see raw message)           |

---

## Multi-printer setups

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

for (const { serialNumber } of await discovery.listPrinters()) {
  if (!serialNumber) continue;
  const p = await discovery.openPrinter({ serialNumber });
  try {
    await p.print(image, MEDIA[259]);
  } finally {
    await p.close();
  }
}
```

---

## API summary

| Export                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `discovery`            | `PrinterDiscovery` singleton                   |
| `BrotherQLDiscovery`   | Class form, for a second instance              |
| `BrotherQLPrinter`     | Adapter class                                  |
| `BrotherQLOpenOptions` | `OpenOptions` + `path` / `baudRate` for serial |
