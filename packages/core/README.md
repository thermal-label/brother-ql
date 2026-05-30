# @thermal-label/brother-ql-core

Protocol encoder, device registry, and media registry for Brother
**QL** label printers (DK paper labels) and **PT-P / PT-E** label
printers (TZe laminated tape + HSe heat-shrink). Both families share
the raster command set — the encoder branches on `engine.protocol`
(`ql-raster` vs `pt-raster`).

Consumers rarely import this package directly. Use one of the
runtime packages instead:

- [`@thermal-label/brother-ql-node`](https://www.npmjs.com/package/@thermal-label/brother-ql-node)
  — Node.js (USB + TCP).
- [`@thermal-label/brother-ql-web`](https://www.npmjs.com/package/@thermal-label/brother-ql-web)
  — browser (WebUSB).

## Install

```bash
pnpm add @thermal-label/brother-ql-core
```

## Quick start

```ts
import { encodeJob, findDevice, findMedia, renderText } from '@thermal-label/brother-ql-core';

const device = findDevice(0x04f9, 0x209d);
if (!device) throw new Error('Unknown Brother device');

const media = findMedia('dk-22205')!;
const bitmap = renderText('Hello QL', { mediaWidth: media.printableWidthDots });
const bytes = encodeJob([{ bitmap }], { engine: device.engines[0], media });
```

`bytes` is a contiguous `Uint8Array` the transport ships unchanged.

## What's inside

- `encodeJob(pages, options)` — encode a complete print job to a byte stream.
- `parseStatus(bytes)` + `STATUS_REQUEST` — status decoder + request frame.
- `DEVICES` / `findDevice` / `getUsbIds` / `isMassStorageMode`.
- `MEDIA` / `findMedia` — DK label + TZe / HSe tape registry.
- Bitmap renderers re-exported from `@mbtech-nl/bitmap`.

## Requirements

- Node.js `>=20.9.0` (Node 24 LTS recommended).
- Runs in browser and Node.js — no Node.js built-ins.

## Documentation

<https://thermal-label.github.io/brother-ql/core>

## License

MIT

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
