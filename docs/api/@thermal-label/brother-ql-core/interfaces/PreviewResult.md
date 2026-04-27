[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PreviewResult

# Interface: PreviewResult

Result of `PrinterAdapter.createPreview()`.

Contains one `PreviewPlane` per colour the printer would produce,
along with the media that was used (detected, overridden, or defaulted)
and an `assumed` flag indicating whether the preview is based on a
guess.

## Properties

### assumed

> **assumed**: `boolean`

True if the media was assumed/defaulted because detection wasn't
available and no override was provided.

The consuming app MUST communicate this to the user, e.g.:
"Preview may differ from print — select media or connect printer
for accurate result."

***

### media

> **media**: [`MediaDescriptor`](MediaDescriptor.md)

The media used for this preview (detected, overridden, or defaulted).

***

### planes

> **planes**: [`PreviewPlane`](PreviewPlane.md)[]

One entry per colour plane the printer would produce.
