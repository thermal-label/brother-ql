[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [web/src](../README.md) / WebBrotherQLPrinter

# Class: WebBrotherQLPrinter

WebUSB `PrinterAdapter` for Brother QL printers.

Mirrors the node driver's behaviour — `renderMultiPlaneImage()` runs
internally when the resolved media carries a `palette`, and
`pickRotation` auto-rotates landscape input on media tagged
`defaultOrientation: 'horizontal'`.

## Implements

- [`PrinterAdapter`](/contracts/api/interfaces/PrinterAdapter)

## Constructors

### Constructor

> **new WebBrotherQLPrinter**(`device`, `transport`): `WebBrotherQLPrinter`

#### Parameters

##### device

[`DeviceEntry`](/contracts/api/interfaces/DeviceEntry)

##### transport

[`Transport`](/contracts/api/interfaces/Transport)

#### Returns

`WebBrotherQLPrinter`

## Properties

### device

> `readonly` **device**: [`DeviceEntry`](/contracts/api/interfaces/DeviceEntry)

The device entry for the connected printer.

Useful for logging, diagnostics, and displaying VID/PID. Undefined
if the connection was established without device matching (e.g. a
raw TCP connection to a known IP).

#### Implementation of

`PrinterAdapter.device`

***

### family

> `readonly` **family**: `"brother-ql"`

Driver family identifier, e.g. `'brother-ql'` or `'labelwriter'`.

#### Implementation of

`PrinterAdapter.family`

## Accessors

### connected

#### Get Signature

> **get** **connected**(): `boolean`

Whether the printer is currently connected.

##### Returns

`boolean`

#### Implementation of

`PrinterAdapter.connected`

***

### model

#### Get Signature

> **get** **model**(): `string`

Human-readable model name from the driver's device registry.

##### Returns

`string`

#### Implementation of

`PrinterAdapter.model`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Close the connection. Always call in `finally` blocks.

#### Returns

`Promise`\<`void`\>

#### Implementation of

`PrinterAdapter.close`

***

### createPreview()

> **createPreview**(`image`, `options?`): `Promise`\<[`PreviewResult`](/contracts/api/interfaces/PreviewResult)\>

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

[`RawImageData`](/contracts/api/interfaces/RawImageData)

— full RGBA, typically from `designer.render()`.

##### options?

[`PreviewOptions`](/contracts/api/interfaces/PreviewOptions)

— optional media override. If media is omitted, uses
  detected media from the last `getStatus()`. If no status is
  available, the driver defaults to single-colour at the printer's
  native head width and sets `PreviewResult.assumed = true`.

#### Returns

`Promise`\<[`PreviewResult`](/contracts/api/interfaces/PreviewResult)\>

#### Implementation of

`PrinterAdapter.createPreview`

***

### getStatus()

> **getStatus**(): `Promise`\<[`PrinterStatus`](/contracts/api/interfaces/PrinterStatus)\>

Send ESC iS and resolve with the next status frame the printer
emits. The read loop is the sole reader of the bulk-IN pipe —
`getStatus()` subscribes transiently, writes the request, and the
subscription receives the response (alongside any spontaneous
frames; see `onStatus()`).

The QL preamble (200×0x00 invalidate + `ESC @` initialize) is
sent only when the parser hasn't been confirmed clean — first
call of the session, or after a previous timeout. Steady-state
polls send bare `ESC iS`. Bench observation: a freshly-opened QL
doesn't reply to bare `ESC iS` until the invalidate flushes any
stale parser state from a prior session.

#### Returns

`Promise`\<[`PrinterStatus`](/contracts/api/interfaces/PrinterStatus)\>

#### Implementation of

`PrinterAdapter.getStatus`

***

### onStatus()

> **onStatus**(`cb`): () => `void`

Subscribe to status updates. A polling shim built on
`pollingOnStatus` from contracts — it calls `getStatus()` on first
subscribe and then every `DEFAULT_POLLING_INTERVAL_MS`, matching the
labelwriter and labelmanager web drivers (plan 11 §`onStatus`
parity).

An earlier revision skipped polling and relied solely on the
printer's unsolicited frames. That was a workaround for the Chromium
WebUSB sub-packet stall — `getStatus()`'s `read()` would hang, so
polling looked unreliable and was dropped. `WebUsbTransport.read()`
now rounds reads up to the endpoint packet size, so `getStatus()` is
dependable and polling is restored.

#### Parameters

##### cb

(`status`) => `void`

#### Returns

() => `void`

#### Implementation of

`PrinterAdapter.onStatus`

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

[`RawImageData`](/contracts/api/interfaces/RawImageData)

— full RGBA, typically from `designer.render()`.

##### media?

[`MediaDescriptor`](/contracts/api/interfaces/MediaDescriptor)

— which media to print on. Determines dimensions,
  margins, and colour mode. If omitted, uses detected media from
  the last `getStatus()`.

##### options?

`BrotherQLPrintOptions`

— per-call options (copies, density, etc.).

#### Returns

`Promise`\<`void`\>

#### Throws

MediaNotSpecifiedError if no media is known.

#### Implementation of

`PrinterAdapter.print`
