[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLPrintOptions

# Interface: BrotherQLPrintOptions

Per-call print options for `BrotherQLPrinter.print()`.

Extends the cross-driver `PrintOptions` with QL-specific knobs. The
`rotate` override picks the rotation angle passed to
`renderImage` / `renderMultiPlaneImage` — `'auto'` (the default)
defers to the media's `defaultOrientation` heuristic.

## Extends

- [`PrintOptions`](PrintOptions.md)

## Properties

### copies?

> `optional` **copies?**: `number`

Number of copies to print. Default 1.

#### Inherited from

[`PrintOptions`](PrintOptions.md).[`copies`](PrintOptions.md#copies)

***

### density?

> `optional` **density?**: `string`

Driver-specific density setting.

Common values: `'light'`, `'normal'`, `'dark'`. Some drivers support
additional values such as `'medium'` or `'high'`. Drivers throw
`UnsupportedOperationError` for unrecognised values.

`'normal'` is universally supported across all drivers.

#### Inherited from

[`PrintOptions`](PrintOptions.md).[`density`](PrintOptions.md#density)

***

### rotate?

> `optional` **rotate?**: `0` \| `"auto"` \| `90` \| `180` \| `270`
