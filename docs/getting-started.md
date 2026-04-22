# Getting Started

## Node.js

Install the Node.js package:

```bash
pnpm add @thermal-label/brother-ql-node
```

Print your first label:

```ts
import { openPrinter, findMedia } from '@thermal-label/brother-ql-node';

const media = findMedia(259)!; // 62mm continuous tape
const printer = await openPrinter();
await printer.printText('Hello QL!', media);
await printer.close();
```

Optional: install `@napi-rs/canvas` for PNG/JPEG image printing:

```bash
pnpm add @napi-rs/canvas
```

## CLI

Install globally:

```bash
npm install -g @thermal-label/brother-ql-cli
```

Print a label:

```bash
brother-ql list
brother-ql print text "Hello" --media 259
```

## Browser (WebUSB)

Install the web package:

```bash
pnpm add @thermal-label/brother-ql-web
```

Print from a button click:

```ts
import { requestPrinter, findMedia } from '@thermal-label/brother-ql-web';

const media = findMedia(259)!;
const printer = await requestPrinter();
await printer.printText('Hello WebUSB', media);
```

## Something not working?

::: warning Not printing on the first try?
That's normal. udev rules, ipp-usb conflicts, Editor Lite mode, and the DK-22251 media ID catch most people.

**→ [See the troubleshooting guide](troubleshooting.md)** — problems are grouped by platform with step-by-step fixes.
:::

---

## Looking for a Python alternative?

[brother_ql](https://github.com/pklaus/brother_ql) is a mature open-source Python tool for the same Brother QL printer family. If your stack is Python-based, it may be a better fit.
