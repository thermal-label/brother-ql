[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / BrotherQLPrintOptions

# Interface: BrotherQLPrintOptions

Per-call print options for `BrotherQLPrinter.print()`.

Extends the cross-driver `PrintOptions` with QL-specific knobs. The
`rotate` override picks the rotation angle passed to
`renderImage` / `renderMultiPlaneImage` — `'auto'` (the default)
defers to the media's `defaultOrientation` heuristic.

## Extends

- [`PrintOptions`](/contracts/api/interfaces/PrintOptions)

## Properties

### highRes?

> `optional` **highRes?**: `boolean`

Opt into high-resolution mode (doubles dpi along the feed axis).
Requires the engine's `capabilities.highResDpi` to be set; throws
at job-build time otherwise. PT-* only — QL ignores the option.

***

### rotate?

> `optional` **rotate?**: `0` \| `180` \| `90` \| `270` \| `"auto"`
