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

### engine?

> `optional` **engine?**: `string`

Engine to route to on multi-engine devices. Role name from
`printer.engines` (e.g. `'left'`, `'right'`, `'label'`, `'tape'`)
or `'auto'` to defer to firmware (where the protocol supports it).

Default behaviour:
- Single-engine device — ignored.
- Multi-engine, protocol supports auto — defaults to `'auto'`.
- Multi-engine, protocol does not (e.g. LabelWriter Duo) —
  required; the driver throws `EngineRequiredError` when omitted.

`'auto'` is a routing mode the protocol module interprets — the
registry does not store it. Whether a protocol supports auto is
implicit in whether its implementation exposes an auto-address
sentinel.

#### Inherited from

[`PrintOptions`](PrintOptions.md).[`engine`](PrintOptions.md#engine)

***

### highRes?

> `optional` **highRes?**: `boolean`

Opt into high-resolution mode (doubles dpi along the feed axis).
Requires the engine's `capabilities.highResDpi` to be set; throws
at job-build time otherwise. PT-* only — QL ignores the option.

***

### rotate?

> `optional` **rotate?**: `0` \| `180` \| `"auto"` \| `90` \| `270`
