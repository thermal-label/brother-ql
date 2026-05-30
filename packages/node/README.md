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

## Supported hardware

<!-- HARDWARE_TABLE:START -->

**24 devices** — 2 verified · 0 partial · 16 expected · 0 unsupported · 6 unverified

| Model                                                                        | Key          | USB PID | Transports       | Status        |
| ---------------------------------------------------------------------------- | ------------ | ------- | ---------------- | ------------- |
| [PT-E550W](https://thermal-label.github.io/hardware/brother-ql/pt-e550w)     | `PT_E550W`   | 0x2060  | USB, TCP         | ⏳ unverified |
| [PT-P750W](https://thermal-label.github.io/hardware/brother-ql/pt-p750w)     | `PT_P750W`   | 0x2062  | USB, TCP         | ⏳ unverified |
| [PT-P900](https://thermal-label.github.io/hardware/brother-ql/pt-p900)       | `PT_P900`    | 0x2083  | USB              | ⏳ unverified |
| [PT-P900W](https://thermal-label.github.io/hardware/brother-ql/pt-p900w)     | `PT_P900W`   | 0x2085  | USB, TCP         | ⏳ unverified |
| [PT-P910BT](https://thermal-label.github.io/hardware/brother-ql/pt-p910bt)   | `PT_P910BT`  | 0x20c7  | USB, BT SPP      | ⏳ unverified |
| [PT-P950NW](https://thermal-label.github.io/hardware/brother-ql/pt-p950nw)   | `PT_P950NW`  | 0x2086  | USB, TCP         | ⏳ unverified |
| [QL-500](https://thermal-label.github.io/hardware/brother-ql/ql-500)         | `QL_500`     | 0x2013  | USB              | 🔄 expected   |
| [QL-550](https://thermal-label.github.io/hardware/brother-ql/ql-550)         | `QL_550`     | 0x2016  | USB              | 🔄 expected   |
| [QL-560](https://thermal-label.github.io/hardware/brother-ql/ql-560)         | `QL_560`     | 0x2018  | USB              | 🔄 expected   |
| [QL-570](https://thermal-label.github.io/hardware/brother-ql/ql-570)         | `QL_570`     | 0x2019  | USB              | 🔄 expected   |
| [QL-580N](https://thermal-label.github.io/hardware/brother-ql/ql-580n)       | `QL_580N`    | 0x201b  | USB, TCP         | 🔄 expected   |
| [QL-600](https://thermal-label.github.io/hardware/brother-ql/ql-600)         | `QL_600`     | 0x2100  | USB              | 🔄 expected   |
| [QL-650TD](https://thermal-label.github.io/hardware/brother-ql/ql-650td)     | `QL_650TD`   | 0x201c  | USB              | 🔄 expected   |
| [QL-700](https://thermal-label.github.io/hardware/brother-ql/ql-700)         | `QL_700`     | 0x2042  | USB              | ✅ verified   |
| [QL-710W](https://thermal-label.github.io/hardware/brother-ql/ql-710w)       | `QL_710W`    | 0x2044  | USB, TCP         | 🔄 expected   |
| [QL-720NW](https://thermal-label.github.io/hardware/brother-ql/ql-720nw)     | `QL_720NW`   | 0x2045  | USB, TCP         | 🔄 expected   |
| [QL-800](https://thermal-label.github.io/hardware/brother-ql/ql-800)         | `QL_800`     | 0x209b  | USB              | 🔄 expected   |
| [QL-810W](https://thermal-label.github.io/hardware/brother-ql/ql-810w)       | `QL_810W`    | 0x209c  | USB, TCP         | 🔄 expected   |
| [QL-820NWBc](https://thermal-label.github.io/hardware/brother-ql/ql-820nwbc) | `QL_820NWBc` | 0x209d  | USB, TCP, BT SPP | ✅ verified   |
| [QL-1050](https://thermal-label.github.io/hardware/brother-ql/ql-1050)       | `QL_1050`    | 0x2027  | USB              | 🔄 expected   |
| [QL-1060N](https://thermal-label.github.io/hardware/brother-ql/ql-1060n)     | `QL_1060N`   | 0x2028  | USB, TCP         | 🔄 expected   |
| [QL-1100](https://thermal-label.github.io/hardware/brother-ql/ql-1100)       | `QL_1100`    | 0x20a7  | USB              | 🔄 expected   |
| [QL-1110NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1110nwb) | `QL_1110NWB` | 0x20a8  | USB, TCP         | 🔄 expected   |
| [QL-1115NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1115nwb) | `QL_1115NWB` | 0x20ab  | USB, TCP         | 🔄 expected   |

Click any model to open its detail page on the docs site, where engines, supported media, and verification reports live. The same data backs the [interactive cross-driver table](https://thermal-label.github.io/hardware/).

<!-- HARDWARE_TABLE:END -->

## License

MIT © Mannes Brak
