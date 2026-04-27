[**Documentation**](../../README.md)

---

[Documentation](../../packages.md) / @thermal-label/brother-ql-core

# @thermal-label/brother-ql-core

Protocol encoding, device registry, and media registry for Brother QL label printers.

> Consumers rarely import this package directly — use `@thermal-label/brother-ql-node` (Node.js) or `@thermal-label/brother-ql-web` (browser) instead. This package is for porting or advanced use cases.

## Key Exports

- `encodeJob(pages, options?)` — encode a complete print job to a `Uint8Array` byte stream
- `DEVICES` — registry of all supported Brother QL devices
- `MEDIA` — registry of all supported label media
- `findDevice(vid, pid)` — look up a device descriptor by USB VID+PID
- `findMedia(id)` — look up a media descriptor by ID
- `renderText`, `renderImage` — re-exported from `@mbtech-nl/bitmap`

## Requirements

- Node.js `>=24.0.0`
- Runs in browser and Node.js — no Node.js built-ins used

## License

MIT © Mannes Brak

## Classes

- [MediaNotSpecifiedError](classes/MediaNotSpecifiedError.md)
- [UnsupportedOperationError](classes/UnsupportedOperationError.md)

## Interfaces

- [BrotherQLDevice](interfaces/BrotherQLDevice.md)
- [BrotherQLMedia](interfaces/BrotherQLMedia.md)
- [BrotherQLPrintOptions](interfaces/BrotherQLPrintOptions.md)
- [BrotherQLStatus](interfaces/BrotherQLStatus.md)
- [DeviceDescriptor](interfaces/DeviceDescriptor.md)
- [JobOptions](interfaces/JobOptions.md)
- [LabelBitmap](interfaces/LabelBitmap.md)
- [MediaDescriptor](interfaces/MediaDescriptor.md)
- [PageData](interfaces/PageData.md)
- [PageOptions](interfaces/PageOptions.md)
- [PaletteEntry](interfaces/PaletteEntry.md)
- [PreviewOptions](interfaces/PreviewOptions.md)
- [PreviewPlane](interfaces/PreviewPlane.md)
- [PreviewResult](interfaces/PreviewResult.md)
- [PrinterAdapter](interfaces/PrinterAdapter.md)
- [PrinterError](interfaces/PrinterError.md)
- [PrinterStatus](interfaces/PrinterStatus.md)
- [PrintOptions](interfaces/PrintOptions.md)
- [RawImageData](interfaces/RawImageData.md)
- [Transport](interfaces/Transport.md)

## Type Aliases

- [ColorMode](type-aliases/ColorMode.md)
- [HeadWidth](type-aliases/HeadWidth.md)
- [MediaType](type-aliases/MediaType.md)
- [NetworkSupport](type-aliases/NetworkSupport.md)
- [RotateDirection](type-aliases/RotateDirection.md)
- [TransportType](type-aliases/TransportType.md)

## Variables

- [DEFAULT_MEDIA](variables/DEFAULT_MEDIA.md)
- [DEVICES](variables/DEVICES.md)
- [MEDIA](variables/MEDIA.md)
- [ROTATE_DIRECTION](variables/ROTATE_DIRECTION.md)
- [STATUS_REQUEST](variables/STATUS_REQUEST.md)

## Functions

- [createPreviewOffline](functions/createPreviewOffline.md)
- [encodeJob](functions/encodeJob.md)
- [findDevice](functions/findDevice.md)
- [findMedia](functions/findMedia.md)
- [findMediaByDimensions](functions/findMediaByDimensions.md)
- [findMediaByWidth](functions/findMediaByWidth.md)
- [flipHorizontal](functions/flipHorizontal.md)
- [isMassStorageMode](functions/isMassStorageMode.md)
- [parseStatus](functions/parseStatus.md)
- [pickRotation](functions/pickRotation.md)
- [renderImage](functions/renderImage.md)
- [renderMultiPlaneImage](functions/renderMultiPlaneImage.md)
- [renderText](functions/renderText.md)
- [rotateBitmap](functions/rotateBitmap.md)
