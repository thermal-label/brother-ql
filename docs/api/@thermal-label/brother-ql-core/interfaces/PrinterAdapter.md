[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrinterAdapter

# Interface: PrinterAdapter

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:14

High-level printer interface implemented by each driver family.

Consumers (CLIs, label-maker apps, ad-hoc scripts) program against
`PrinterAdapter` and don't need to know which driver is behind it.
Driver-specific features are available by extending this interface
in each `*-node` / `*-web` package.

## Properties

### connected

> `readonly` **connected**: `boolean`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:20

Whether the printer is currently connected.

***

### device?

> `readonly` `optional` **device?**: [`DeviceDescriptor`](DeviceDescriptor.md)

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:28

The device descriptor for the connected printer.

Useful for logging, diagnostics, and displaying VID/PID. Undefined
if the connection was established without device matching (e.g. a
raw TCP connection to a known IP).

***

### family

> `readonly` **family**: `string`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:16

Driver family identifier, e.g. `'brother-ql'` or `'labelwriter'`.

***

### model

> `readonly` **model**: `string`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:18

Human-readable model name from the driver's device registry.

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:85

Close the connection. Always call in `finally` blocks.

#### Returns

`Promise`\<`void`\>

***

### createPreview()

> **createPreview**(`image`, `options?`): `Promise`\<[`PreviewResult`](PreviewResult.md)\>

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:81

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

[`RawImageData`](RawImageData.md)

— full RGBA, typically from `designer.render()`.

##### options?

[`PreviewOptions`](PreviewOptions.md)

— optional media override. If media is omitted, uses
  detected media from the last `getStatus()`. If no status is
  available, the driver defaults to single-colour at the printer's
  native head width and sets `PreviewResult.assumed = true`.

#### Returns

`Promise`\<[`PreviewResult`](PreviewResult.md)\>

***

### getStatus()

> **getStatus**(): `Promise`\<[`PrinterStatus`](PrinterStatus.md)\>

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:83

Query printer status including detected media.

#### Returns

`Promise`\<[`PrinterStatus`](PrinterStatus.md)\>

***

### print()

> **print**(`image`, `media?`, `options?`): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/adapter.d.ts:60

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

[`RawImageData`](RawImageData.md)

— full RGBA, typically from `designer.render()`.

##### media?

[`MediaDescriptor`](MediaDescriptor.md)

— which media to print on. Determines dimensions,
  margins, and colour mode. If omitted, uses detected media from
  the last `getStatus()`.

##### options?

[`PrintOptions`](PrintOptions.md)

— per-call options (copies, density, etc.).

#### Returns

`Promise`\<`void`\>

#### Throws

MediaNotSpecifiedError if no media is known.
