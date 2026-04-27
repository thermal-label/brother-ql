**Documentation**

***

[![CI](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml/badge.svg)](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/thermal-label/brother-ql/branch/main/graph/badge.svg)](https://codecov.io/gh/thermal-label/brother-ql)
[![npm core](https://img.shields.io/npm/v/@thermal-label/brother-ql-core)](https://npmjs.com/package/@thermal-label/brother-ql-core)
[![npm node](https://img.shields.io/npm/v/@thermal-label/brother-ql-node)](https://npmjs.com/package/@thermal-label/brother-ql-node)
[![npm web](https://img.shields.io/npm/v/@thermal-label/brother-ql-web)](https://npmjs.com/package/@thermal-label/brother-ql-web)
[![npm cli](https://img.shields.io/npm/v/@thermal-label/brother-ql-cli)](https://npmjs.com/package/@thermal-label/brother-ql-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# brother-ql

TypeScript-first Brother QL label printer driver suite for Node.js, browser WebUSB, and CLI workflows.

- Project website: https://thermal-label.github.io/brother-ql/
- Repository: https://github.com/thermal-label/brother-ql
- Issues: https://github.com/thermal-label/brother-ql/issues

## Install

Install only what you need:

```bash
pnpm add @thermal-label/brother-ql-node
```

For browser-only usage:

```bash
pnpm add @thermal-label/brother-ql-web
```

For CLI usage:

```bash
npm install -g @thermal-label/brother-ql-cli
```

## Quick Start

### Node.js

```ts
import { openPrinter, MEDIA } from '@thermal-label/brother-ql-node';

const printer = await openPrinter();
await printer.printText('Hello QL', MEDIA[259]);
await printer.close();
```

### Browser (WebUSB)

```ts
import { requestPrinter, MEDIA } from '@thermal-label/brother-ql-web';

const printer = await requestPrinter();
await printer.printText('Hello WebUSB', MEDIA[259]);
```

### CLI

```bash
brother-ql list
brother-ql print text "Hello" --media 259
```

## Packages

- `@thermal-label/brother-ql-core`: protocol encoding, device registry, media registry. Runs in browser and Node.js.
- `@thermal-label/brother-ql-node`: Node.js USB (libusb) and TCP transport with full printer API.
- `@thermal-label/brother-ql-web`: browser WebUSB transport and printer API.
- `@thermal-label/brother-ql-cli`: command-line tool (`brother-ql`) for listing, printing, and status.

## Supported Devices

Verified and expected models are listed on the project website:
https://thermal-label.github.io/brother-ql/hardware

## Platform Notes

- Node packages require Node.js `>=24`.
- Browser package requires WebUSB-compatible browsers (Chrome/Edge) and secure contexts (`https://` or `localhost`).
- Linux users typically need a `udev` rule for raw USB access without `sudo`.

## License

MIT
