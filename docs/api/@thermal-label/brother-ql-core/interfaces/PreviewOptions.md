[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PreviewOptions

# Interface: PreviewOptions

Options for `PrinterAdapter.createPreview()`.

Only `media?` is part of the contract — rendering knobs like threshold
and dithering are driver-specific concerns that belong on the driver's
own options, not on this cross-family interface.

## Properties

### media?

> `optional` **media?**: [`MediaDescriptor`](MediaDescriptor.md)

Override detected media. Use when:

- the printer can't detect media (e.g. LabelWriter 450, LabelManager);
- designing offline for a specific media type;
- testing with a specific media configuration.

If omitted, the driver uses detected media from the last
`getStatus()`. If no status is available and no override is
provided, the driver falls back to single-colour at its native head
width and sets `PreviewResult.assumed = true`.
