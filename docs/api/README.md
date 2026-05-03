**Documentation**

***

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
