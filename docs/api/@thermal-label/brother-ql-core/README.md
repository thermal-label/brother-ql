[**Documentation**](../../README.md)

***

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

- Node.js `>=20.9.0` (Node 24 LTS recommended)
- Runs in browser and Node.js — no Node.js built-ins used

## License

MIT © Mannes Brak

## Classes

- [MediaNotSpecifiedError](classes/MediaNotSpecifiedError.md)
- [UnsupportedOperationError](classes/UnsupportedOperationError.md)

## Interfaces

- [BrotherEngineCapabilities](interfaces/BrotherEngineCapabilities.md)
- [BrotherQLMedia](interfaces/BrotherQLMedia.md)
- [BrotherQLPrintOptions](interfaces/BrotherQLPrintOptions.md)
- [BrotherQLStatus](interfaces/BrotherQLStatus.md)
- [DeviceEntry](interfaces/DeviceEntry.md)
- [DeviceRegistry](interfaces/DeviceRegistry.md)
- [DeviceTransports](interfaces/DeviceTransports.md)
- [JobOptions](interfaces/JobOptions.md)
- [LabelBitmap](interfaces/LabelBitmap.md)
- [MediaDescriptor](interfaces/MediaDescriptor.md)
- [PageData](interfaces/PageData.md)
- [PageOptions](interfaces/PageOptions.md)
- [PaletteEntry](interfaces/PaletteEntry.md)
- [PreviewOptions](interfaces/PreviewOptions.md)
- [PreviewPlane](interfaces/PreviewPlane.md)
- [PreviewResult](interfaces/PreviewResult.md)
- [PrintEngine](interfaces/PrintEngine.md)
- [PrintEngineCapabilities](interfaces/PrintEngineCapabilities.md)
- [PrinterAdapter](interfaces/PrinterAdapter.md)
- [PrinterError](interfaces/PrinterError.md)
- [PrinterStatus](interfaces/PrinterStatus.md)
- [PrintOptions](interfaces/PrintOptions.md)
- [RasterProtocolConfig](interfaces/RasterProtocolConfig.md)
- [RawImageData](interfaces/RawImageData.md)
- [TapeGeometry](interfaces/TapeGeometry.md)
- [Transport](interfaces/Transport.md)
- [UsbTransport](interfaces/UsbTransport.md)

## Type Aliases

- [BrotherQLDevice](type-aliases/BrotherQLDevice.md)
- [ColorMode](type-aliases/ColorMode.md)
- [EncoderEngine](type-aliases/EncoderEngine.md)
- [HeadWidth](type-aliases/HeadWidth.md)
- [MediaType](type-aliases/MediaType.md)
- [RotateDirection](type-aliases/RotateDirection.md)
- [TapeSystem](type-aliases/TapeSystem.md)
- [TransportType](type-aliases/TransportType.md)

## Variables

- [DEFAULT\_MEDIA](variables/DEFAULT_MEDIA.md)
- [DEFAULT\_PT\_MEDIA](variables/DEFAULT_PT_MEDIA.md)
- [DEVICE\_REGISTRY](variables/DEVICE_REGISTRY.md)
- [DEVICES](variables/DEVICES.md)
- [MEDIA](variables/MEDIA.md)
- [PT\_PROTOCOL\_CONFIG](variables/PT_PROTOCOL_CONFIG.md)
- [QL\_PROTOCOL\_CONFIG](variables/QL_PROTOCOL_CONFIG.md)
- [ROTATE\_DIRECTION](variables/ROTATE_DIRECTION.md)
- [STATUS\_REQUEST](variables/STATUS_REQUEST.md)

## Functions

- [createPreviewOffline](functions/createPreviewOffline.md)
- [defaultMediaForEngine](functions/defaultMediaForEngine.md)
- [encodeJob](functions/encodeJob.md)
- [encodeJobForEngine](functions/encodeJobForEngine.md)
- [findDevice](functions/findDevice.md)
- [findMedia](functions/findMedia.md)
- [findMediaByDimensions](functions/findMediaByDimensions.md)
- [findMediaByWidth](functions/findMediaByWidth.md)
- [flipHorizontal](functions/flipHorizontal.md)
- [getUsbIds](functions/getUsbIds.md)
- [isMassStorageMode](functions/isMassStorageMode.md)
- [parseStatus](functions/parseStatus.md)
- [pickRotation](functions/pickRotation.md)
- [renderImage](functions/renderImage.md)
- [renderMultiPlaneImage](functions/renderMultiPlaneImage.md)
- [renderText](functions/renderText.md)
- [resolveTapeGeometry](functions/resolveTapeGeometry.md)
- [rotateBitmap](functions/rotateBitmap.md)
