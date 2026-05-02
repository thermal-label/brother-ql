[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLStatus

# Interface: BrotherQLStatus

Brother QL status — contracts `PrinterStatus` plus the
`editorLiteMode` flag (pre-paired QL-820NWB silently drops raster
jobs when in Editor Lite mode; callers need to know).

## Extends

- [`PrinterStatus`](PrinterStatus.md)

## Properties

### detectedMedia?

> `optional` **detectedMedia?**: [`MediaDescriptor`](MediaDescriptor.md)

Detected media descriptor, if the printer supports detection.

Undefined if the printer cannot detect media (e.g. LabelWriter 450,
LabelManager) or no status has been queried yet.

When present, this is what `PrinterAdapter.print()` and
`PrinterAdapter.createPreview()` use as the default when no explicit
media is provided.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`detectedMedia`](PrinterStatus.md#detectedmedia)

***

### editorLiteMode

> **editorLiteMode**: `boolean`

***

### errors

> **errors**: [`PrinterError`](PrinterError.md)[]

Structured error list. Empty array = no errors.

Use `PrinterError.code` for programmatic branching and
`PrinterError.message` for display.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`errors`](PrinterStatus.md#errors)

***

### mediaLoaded

> **mediaLoaded**: `boolean`

Media is loaded (only meaningful if the printer supports detection).

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`mediaLoaded`](PrinterStatus.md#medialoaded)

***

### rawBytes

> **rawBytes**: `Uint8Array`

Raw status bytes from the printer.

Exposed for diagnostics and debugging — higher-level fields on this
interface should be preferred for normal use.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`rawBytes`](PrinterStatus.md#rawbytes)

***

### ready

> **ready**: `boolean`

Printer is ready to accept a print job.

#### Inherited from

[`PrinterStatus`](PrinterStatus.md).[`ready`](PrinterStatus.md#ready)

***

### twoColorRoll?

> `optional` **twoColorRoll?**: `boolean`

True when the loaded roll reports two-color capability via byte 25
bit 7 of the status response. Undefined when no media is loaded.
