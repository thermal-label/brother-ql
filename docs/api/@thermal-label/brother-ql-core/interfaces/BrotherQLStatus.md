[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLStatus

# Interface: BrotherQLStatus

Defined in: [packages/core/src/types.ts:64](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L64)

Brother QL status — contracts `PrinterStatus` plus the
`editorLiteMode` flag (pre-paired QL-820NWB silently drops raster
jobs when in Editor Lite mode; callers need to know).

## Extends

- [`PrinterStatus`](PrinterStatus.md)

## Properties

### detectedMedia?

> `optional` **detectedMedia?**: [`MediaDescriptor`](MediaDescriptor.md)

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:59

Detected media descriptor, if the printer supports detection.

Undefined if the printer cannot detect media (e.g. LabelWriter 450,
LabelManager) or no status has been queried yet.

When present, this is what `PrinterAdapter.print()` and
`PrinterAdapter.createPreview()` use as the default when no explicit
media is provided.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`detectedMedia`](PrinterStatus.md#detectedmedia)

---

### editorLiteMode

> **editorLiteMode**: `boolean`

Defined in: [packages/core/src/types.ts:65](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L65)

---

### errors

> **errors**: [`PrinterError`](PrinterError.md)[]

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:66

Structured error list. Empty array = no errors.

Use `PrinterError.code` for programmatic branching and
`PrinterError.message` for display.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`errors`](PrinterStatus.md#errors)

---

### mediaLoaded

> **mediaLoaded**: `boolean`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:48

Media is loaded (only meaningful if the printer supports detection).

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`mediaLoaded`](PrinterStatus.md#medialoaded)

---

### rawBytes

> **rawBytes**: `Uint8Array`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:73

Raw status bytes from the printer.

Exposed for diagnostics and debugging — higher-level fields on this
interface should be preferred for normal use.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`rawBytes`](PrinterStatus.md#rawbytes)

---

### ready

> **ready**: `boolean`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:46

Printer is ready to accept a print job.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`ready`](PrinterStatus.md#ready)
