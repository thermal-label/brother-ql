# @thermal-label/brother-ql

> TypeScript-first Brother QL label printer driver — Node USB/TCP and browser WebUSB.

[![CI](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml/badge.svg)](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/thermal-label/brother-ql/branch/main/graph/badge.svg)](https://codecov.io/gh/thermal-label/brother-ql)
[![npm core](https://img.shields.io/npm/v/@thermal-label/brother-ql-core.svg?label=core)](https://npmjs.com/package/@thermal-label/brother-ql-core)
[![npm node](https://img.shields.io/npm/v/@thermal-label/brother-ql-node.svg?label=node)](https://npmjs.com/package/@thermal-label/brother-ql-node)
[![npm web](https://img.shields.io/npm/v/@thermal-label/brother-ql-web.svg?label=web)](https://npmjs.com/package/@thermal-label/brother-ql-web)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

```bash
pnpm add @thermal-label/brother-ql-node    # Node USB/TCP
pnpm add @thermal-label/brother-ql-web     # Browser WebUSB
```

For ad-hoc printing from the terminal, install
[`thermal-label-cli`](https://www.npmjs.com/package/thermal-label-cli) — it
auto-detects every installed driver, no per-driver CLI needed.

## Quick example (Node, USB)

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

const printer = await discovery.openPrinter();
try {
  // `image` is RawImageData — { width, height, data } where data is
  // an RGBA Uint8Array. Any pipeline that produces RGBA works.
  await printer.print(image, MEDIA[259]); // 62mm continuous
} finally {
  await printer.close();
}
```

## Quick example (Browser, WebUSB)

```ts
import { requestPrinter } from '@thermal-label/brother-ql-web';
import { MEDIA } from '@thermal-label/brother-ql-core';

const printer = await requestPrinter(); // call from a user gesture
try {
  await printer.print(image, MEDIA[259]);
} finally {
  await printer.close();
}
```

## Supported hardware

<!-- HARDWARE_TABLE:START -->
**24 devices** — 3 verified · 0 partial · 15 expected · 0 unsupported · 6 unverified

| Model | Key | USB PID | Transports | Status |
| --- | --- | --- | --- | --- |
| [PT-E550W](https://thermal-label.github.io/hardware/brother-ql/pt-e550w) | `PT_E550W` | 0x2060 | USB, TCP | ⏳ unverified |
| [PT-P750W](https://thermal-label.github.io/hardware/brother-ql/pt-p750w) | `PT_P750W` | 0x2062 | USB, TCP | ⏳ unverified |
| [PT-P900](https://thermal-label.github.io/hardware/brother-ql/pt-p900) | `PT_P900` | 0x2083 | USB | ⏳ unverified |
| [PT-P900W](https://thermal-label.github.io/hardware/brother-ql/pt-p900w) | `PT_P900W` | 0x2085 | USB, TCP | ⏳ unverified |
| [PT-P910BT](https://thermal-label.github.io/hardware/brother-ql/pt-p910bt) | `PT_P910BT` | 0x20c7 | USB, BT SPP | ⏳ unverified |
| [PT-P950NW](https://thermal-label.github.io/hardware/brother-ql/pt-p950nw) | `PT_P950NW` | 0x2086 | USB, TCP | ⏳ unverified |
| [QL-500](https://thermal-label.github.io/hardware/brother-ql/ql-500) | `QL_500` | 0x2013 | USB | 🔄 expected |
| [QL-550](https://thermal-label.github.io/hardware/brother-ql/ql-550) | `QL_550` | 0x2016 | USB | 🔄 expected |
| [QL-560](https://thermal-label.github.io/hardware/brother-ql/ql-560) | `QL_560` | 0x2018 | USB | 🔄 expected |
| [QL-570](https://thermal-label.github.io/hardware/brother-ql/ql-570) | `QL_570` | 0x2019 | USB | 🔄 expected |
| [QL-580N](https://thermal-label.github.io/hardware/brother-ql/ql-580n) | `QL_580N` | 0x201b | USB, TCP | 🔄 expected |
| [QL-600](https://thermal-label.github.io/hardware/brother-ql/ql-600) | `QL_600` | 0x2100 | USB | 🔄 expected |
| [QL-650TD](https://thermal-label.github.io/hardware/brother-ql/ql-650td) | `QL_650TD` | 0x201c | USB | 🔄 expected |
| [QL-700](https://thermal-label.github.io/hardware/brother-ql/ql-700) | `QL_700` | 0x2042 | USB | ✅ verified |
| [QL-710W](https://thermal-label.github.io/hardware/brother-ql/ql-710w) | `QL_710W` | 0x2044 | USB, TCP | 🔄 expected |
| [QL-720NW](https://thermal-label.github.io/hardware/brother-ql/ql-720nw) | `QL_720NW` | 0x2045 | USB, TCP | 🔄 expected |
| [QL-800](https://thermal-label.github.io/hardware/brother-ql/ql-800) | `QL_800` | 0x209b | USB | ✅ verified |
| [QL-810W](https://thermal-label.github.io/hardware/brother-ql/ql-810w) | `QL_810W` | 0x209c | USB, TCP | 🔄 expected |
| [QL-820NWBc](https://thermal-label.github.io/hardware/brother-ql/ql-820nwbc) | `QL_820NWBc` | 0x209d | USB, TCP, BT SPP | ✅ verified |
| [QL-1050](https://thermal-label.github.io/hardware/brother-ql/ql-1050) | `QL_1050` | 0x2027 | USB | 🔄 expected |
| [QL-1060N](https://thermal-label.github.io/hardware/brother-ql/ql-1060n) | `QL_1060N` | 0x2028 | USB, TCP | 🔄 expected |
| [QL-1100](https://thermal-label.github.io/hardware/brother-ql/ql-1100) | `QL_1100` | 0x20a7 | USB | 🔄 expected |
| [QL-1110NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1110nwb) | `QL_1110NWB` | 0x20a8 | USB, TCP | 🔄 expected |
| [QL-1115NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1115nwb) | `QL_1115NWB` | 0x20ab | USB, TCP | 🔄 expected |

Click any model to open its detail page on the docs site, where engines, supported media, and verification reports live. The same data backs the [interactive cross-driver table](https://thermal-label.github.io/hardware/).
<!-- HARDWARE_TABLE:END -->

## Documentation

Full docs at **<https://thermal-label.github.io/brother-ql/>**.

- [Getting started](https://thermal-label.github.io/brother-ql/getting-started)
- [Hardware list](https://thermal-label.github.io/brother-ql/hardware)
- [Media + DK roll reference](https://thermal-label.github.io/brother-ql/media)
- [Protocol reference](https://thermal-label.github.io/brother-ql/protocol/) — [QL raster](https://thermal-label.github.io/brother-ql/protocol/ql) · [PT raster](https://thermal-label.github.io/brother-ql/protocol/pt)
- [Troubleshooting](https://thermal-label.github.io/brother-ql/troubleshooting)
- [API reference](https://thermal-label.github.io/brother-ql/api/)
- [Live demo](https://thermal-label.github.io/demo/brother-ql)

## Packages

| Package | Role |
|---|---|
| `@thermal-label/brother-ql-core` | Protocol encoding, device + media registries. Browser + Node. |
| `@thermal-label/brother-ql-node` | Node USB (libusb) and TCP (port 9100) transport. |
| `@thermal-label/brother-ql-web` | Browser WebUSB transport. |

The per-driver `*-cli` package was retired — use the unified
[`thermal-label-cli`](https://www.npmjs.com/package/thermal-label-cli) instead.

## Compatibility

| | |
|---|---|
| Node | ≥ 20.9 (Node 24 LTS recommended) |
| Browsers | Chrome / Edge 89+ (WebUSB), secure context (`https://` or `localhost`) |
| Linux | typically needs a `udev` rule for `04F9:*` to access without `sudo` |
| Peers | `@thermal-label/contracts`, `@thermal-label/transport`, `@mbtech-nl/bitmap` |
| License | MIT |

Not affiliated with Brother. Trademarks belong to their owners.

## Contributing

See [`CONTRIBUTING/`](https://github.com/thermal-label/.github/tree/main/CONTRIBUTING)
on the org `.github` repo — code of conduct, security policy, "adding a
driver" guide, release process.
