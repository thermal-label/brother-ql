[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / BrotherQLPrinter

# Class: BrotherQLPrinter

Defined in: [packages/node/src/printer.ts:64](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L64)

Node.js driver for Brother QL label printers.

Implements `PrinterAdapter`. Callers get a printer instance from
`discovery.openPrinter()` (USB or TCP) and interact solely through
the adapter surface: `print(rgba, media?, options?)`, `createPreview`,
`getStatus`, `close`.

Multi-ink media (DK-22251) is handled transparently — when the
resolved media carries a `palette`, the driver runs the bitmap
library's `renderMultiPlaneImage()` internally before encoding.

Orientation is auto-decided via `pickRotation`: landscape input on
media tagged `defaultOrientation: 'horizontal'` rotates 90° CW so
the visual reads along the tape feed direction. Override per-call
with `options.rotate`.

## Implements

- [`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md)

## Constructors

### Constructor

> **new BrotherQLPrinter**(`device`, `transport`, `transportType`): `BrotherQLPrinter`

Defined in: [packages/node/src/printer.ts:72](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L72)

#### Parameters

##### device

[`BrotherQLDevice`](../../brother-ql-core/interfaces/BrotherQLDevice.md)

##### transport

[`Transport`](../../brother-ql-core/interfaces/Transport.md)

##### transportType

[`TransportType`](../../brother-ql-core/type-aliases/TransportType.md)

#### Returns

`BrotherQLPrinter`

## Properties

### device

> `readonly` **device**: [`BrotherQLDevice`](../../brother-ql-core/interfaces/BrotherQLDevice.md)

Defined in: [packages/node/src/printer.ts:66](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L66)

The device descriptor for the connected printer.

Useful for logging, diagnostics, and displaying VID/PID. Undefined
if the connection was established without device matching (e.g. a
raw TCP connection to a known IP).

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`device`](../../brother-ql-core/interfaces/PrinterAdapter.md#device)

---

### family

> `readonly` **family**: `"brother-ql"`

Defined in: [packages/node/src/printer.ts:65](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L65)

Driver family identifier, e.g. `'brother-ql'` or `'labelwriter'`.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`family`](../../brother-ql-core/interfaces/PrinterAdapter.md#family)

---

### transportType

> `readonly` **transportType**: [`TransportType`](../../brother-ql-core/type-aliases/TransportType.md)

Defined in: [packages/node/src/printer.ts:67](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L67)

## Accessors

### connected

#### Get Signature

> **get** **connected**(): `boolean`

Defined in: [packages/node/src/printer.ts:82](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L82)

Whether the printer is currently connected.

##### Returns

`boolean`

Whether the printer is currently connected.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`connected`](../../brother-ql-core/interfaces/PrinterAdapter.md#connected)

---

### model

#### Get Signature

> **get** **model**(): `string`

Defined in: [packages/node/src/printer.ts:78](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L78)

Human-readable model name from the driver's device registry.

##### Returns

`string`

Human-readable model name from the driver's device registry.

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`model`](../../brother-ql-core/interfaces/PrinterAdapter.md#model)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [packages/node/src/printer.ts:164](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L164)

Close the connection. Always call in `finally` blocks.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`close`](../../brother-ql-core/interfaces/PrinterAdapter.md#close)

---

### createPreview()

> **createPreview**(`image`, `options?`): `Promise`\<[`PreviewResult`](../../brother-ql-core/interfaces/PreviewResult.md)\>

Defined in: [packages/node/src/printer.ts:132](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L132)

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

---

### getStatus()

> **getStatus**(): `Promise`\<[`BrotherQLStatus`](../../brother-ql-core/interfaces/BrotherQLStatus.md)\>

Defined in: [packages/node/src/printer.ts:150](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L150)

Poll the status endpoint until 32 bytes are available.

The USB `transferAsync()` call resolves immediately with 0 bytes if
the printer hasn't queued a response yet, so retry with a short
delay up to `STATUS_POLL_ATTEMPTS` times.

#### Returns

`Promise`\<[`BrotherQLStatus`](../../brother-ql-core/interfaces/BrotherQLStatus.md)\>

#### Implementation of

[`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md).[`getStatus`](../../brother-ql-core/interfaces/PrinterAdapter.md#getstatus)

---

### print()

> **print**(`image`, `media?`, `options?`): `Promise`\<`void`\>

Defined in: [packages/node/src/printer.ts:86](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/printer.ts#L86)

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
