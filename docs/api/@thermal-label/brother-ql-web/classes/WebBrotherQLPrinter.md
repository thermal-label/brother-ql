[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / WebBrotherQLPrinter

# Class: WebBrotherQLPrinter

WebUSB `PrinterAdapter` for Brother QL printers.

Mirrors the node driver's behaviour — `renderMultiPlaneImage()` runs
internally when the resolved media carries a `palette`, and
`pickRotation` auto-rotates landscape input on media tagged
`defaultOrientation: 'horizontal'`.

## Implements

- [`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md)

## Constructors

### Constructor

> **new WebBrotherQLPrinter**(`device`, `transport`): `WebBrotherQLPrinter`

#### Parameters

##### device

[`DeviceEntry`](../../brother-ql-core/interfaces/DeviceEntry.md)

##### transport

[`Transport`](../../brother-ql-core/interfaces/Transport.md)

#### Returns

`WebBrotherQLPrinter`

## Properties

### device

> `readonly` **device**: [`DeviceEntry`](../../brother-ql-core/interfaces/DeviceEntry.md)

The device entry for the connected printer.

Useful for logging, diagnostics, and displaying VID/PID. Undefined
if the connection was established without device matching (e.g. a
raw TCP connection to a known IP).

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`device`](../../brother-ql-core/interfaces/PrinterAdapter.md#device)

***

### family

> `readonly` **family**: `"brother-ql"`

Driver family identifier, e.g. `'brother-ql'` or `'labelwriter'`.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`family`](../../brother-ql-core/interfaces/PrinterAdapter.md#family)

## Accessors

### connected

#### Get Signature

> **get** **connected**(): `boolean`

Whether the printer is currently connected.

##### Returns

`boolean`

Whether the printer is currently connected.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`connected`](../../brother-ql-core/interfaces/PrinterAdapter.md#connected)

***

### model

#### Get Signature

> **get** **model**(): `string`

Human-readable model name from the driver's device registry.

##### Returns

`string`

Human-readable model name from the driver's device registry.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`model`](../../brother-ql-core/interfaces/PrinterAdapter.md#model)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Close the connection. Always call in `finally` blocks.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`close`](../../brother-ql-core/interfaces/PrinterAdapter.md#close)

***

### createPreview()

> **createPreview**(`image`, `options?`): `Promise`\<[`PreviewResult`](../../brother-ql-core/interfaces/PreviewResult.md)\>

Generate a preview showing how this printer would reproduce the
design on the given media. Returns separated 1bpp planes with
display colours.

The driver uses its own colour-splitting logic (the same code that
`print()` uses internally) to produce the planes. The consuming app
renders whatever planes come back without needing to know the
splitting rules.

For offline preview without a live connection, use the static
`createPreviewOffline()` function exported from the driver's
`*-core` package instead.

#### Parameters

##### image

[`RawImageData`](../../brother-ql-core/interfaces/RawImageData.md)

— full RGBA, typically from `designer.render()`.

##### options?

[`PreviewOptions`](../../brother-ql-core/interfaces/PreviewOptions.md)

— optional media override. If media is omitted, uses
  detected media from the last `getStatus()`. If no status is
  available, the driver defaults to single-colour at the printer's
  native head width and sets `PreviewResult.assumed = true`.

#### Returns

`Promise`\<[`PreviewResult`](../../brother-ql-core/interfaces/PreviewResult.md)\>

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`createPreview`](../../brother-ql-core/interfaces/PrinterAdapter.md#createpreview)

***

### getStatus()

> **getStatus**(): `Promise`\<[`BrotherQLStatus`](../../brother-ql-core/interfaces/BrotherQLStatus.md)\>

Query printer status including detected media.

#### Returns

`Promise`\<[`BrotherQLStatus`](../../brother-ql-core/interfaces/BrotherQLStatus.md)\>

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`getStatus`](../../brother-ql-core/interfaces/PrinterAdapter.md#getstatus)

***

### print()

> **print**(`image`, `media?`, `options?`): `Promise`\<`void`\>

Print from a full-colour RGBA image.

The driver converts to its native format internally:

- Single-colour media (`media.palette` undefined) — threshold/dither
  RGBA to a single 1bpp plane via `renderImage`.
- Multi-ink media (`media.palette` defined) — split into planes via
  `renderMultiPlaneImage` using that palette.

**Orientation:** drivers compute the rotation via `pickRotation`
(see `./orientation.ts`) — the input image is treated as the
intended visual; the driver auto-rotates landscape input on media
tagged `defaultOrientation: 'horizontal'`.

**Multi-ink splitting:** the palette on the media descriptor names
every ink the driver should classify pixels into; the contracts
package does not pick "red" or "black" — those facts live with the
media entry.

**Batch printing:** call `print()` once per label. The driver
handles job framing internally (e.g. Brother QL page-break commands
between sequential `print()` calls within the same session).

#### Parameters

##### image

[`RawImageData`](../../brother-ql-core/interfaces/RawImageData.md)

— full RGBA, typically from `designer.render()`.

##### media?

[`MediaDescriptor`](../../brother-ql-core/interfaces/MediaDescriptor.md)

— which media to print on. Determines dimensions,
  margins, and colour mode. If omitted, uses detected media from
  the last `getStatus()`.

##### options?

[`BrotherQLPrintOptions`](../../brother-ql-core/interfaces/BrotherQLPrintOptions.md)

— per-call options (copies, density, etc.).

#### Returns

`Promise`\<`void`\>

#### Throws

MediaNotSpecifiedError if no media is known.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`print`](../../brother-ql-core/interfaces/PrinterAdapter.md#print)
