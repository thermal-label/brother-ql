[**Documentation**](../../README.md)

***

[Documentation](../../packages.md) / @thermal-label/brother-ql-web

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

## License

MIT © Mannes Brak

## Classes

- [WebBrotherQLPrinter](classes/WebBrotherQLPrinter.md)

## Interfaces

- [RequestOptions](interfaces/RequestOptions.md)

## Variables

- [DEFAULT\_FILTERS](variables/DEFAULT_FILTERS.md)

## Functions

- [fromUSBDevice](functions/fromUSBDevice.md)
- [fromUSBDeviceAll](functions/fromUSBDeviceAll.md)
- [requestPrinter](functions/requestPrinter.md)
- [requestPrinters](functions/requestPrinters.md)
