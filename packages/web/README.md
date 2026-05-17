# @thermal-label/brother-ql-web

WebUSB browser driver for Brother QL label printers.

## Browser Support

| Browser       | Support |
| ------------- | ------- |
| Chrome / Edge | ✅      |
| Firefox       | ❌      |
| Safari        | ❌      |

Requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`https://` or `localhost`).

## Install

```bash
pnpm add @thermal-label/brother-ql-web
```

## Quick Start

```ts
import { requestPrinter, findMedia } from '@thermal-label/brother-ql-web';

const media = findMedia(259)!; // 62mm continuous
const printer = await requestPrinter();
await printer.printText('Hello WebUSB', media);
```

## Two-Color Printing

Requires a QL-800, QL-810W, or QL-820NWB with DK-22251 labels.

```ts
const blackCanvas = document.getElementById('black-layer') as HTMLCanvasElement;
const redCanvas = document.getElementById('red-layer') as HTMLCanvasElement;
const blackCtx = blackCanvas.getContext('2d')!;
const redCtx = redCanvas.getContext('2d')!;

await printer.printTwoColor(
  blackCtx.getImageData(0, 0, blackCanvas.width, blackCanvas.height),
  redCtx.getImageData(0, 0, redCanvas.width, redCanvas.height),
  media,
);
```

## API

### `requestPrinter(options?)`

Opens the browser's USB device picker filtered to all known Brother QL PIDs.
Returns a `WebBrotherQLPrinter`.

### `fromUSBDevice(device)`

Wraps an already-obtained `USBDevice`. The caller is responsible for opening and claiming the interface.

### `WebBrotherQLPrinter`

| Method                                       | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| `print(pages, options?)`                     | Send a pre-encoded job                   |
| `printText(text, media, options?)`           | Render and print a text label            |
| `printImage(imageData, media, options?)`     | Print from `ImageData`                   |
| `printImageURL(url, media, options?)`        | Fetch URL and print                      |
| `printTwoColor(black, red, media, options?)` | Two-color label (QL-800 series)          |
| `getStatus()`                                | Query printer status                     |
| `isConnected()`                              | Returns `true` if the USB device is open |
| `disconnect()`                               | Release interface and close device       |

## Requirements

- Chromium-based browser (Chrome 61+, Edge 79+)
- Secure context (`https://` or `localhost`)
- User gesture required to call `requestPrinter()`

## Supported hardware

<!-- HARDWARE_TABLE:START -->

**24 devices** — 1 verified · 0 partial · 17 expected · 0 unsupported · 6 unverified

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
| [QL-700](https://thermal-label.github.io/hardware/brother-ql/ql-700)         | `QL_700`     | 0x2042  | USB              | 🔄 expected   |
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
