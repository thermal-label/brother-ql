[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrintOptions

# Interface: PrintOptions

Options for a single `PrinterAdapter.print()` call.

Drivers may extend this with family-specific fields; structural typing
accepts any superset wherever `PrintOptions` is consumed.

## Extended by

- [`BrotherQLPrintOptions`](BrotherQLPrintOptions.md)

## Properties

### copies?

> `optional` **copies?**: `number`

Number of copies to print. Default 1.

***

### density?

> `optional` **density?**: `string`

Driver-specific density setting.

Common values: `'light'`, `'normal'`, `'dark'`. Some drivers support
additional values such as `'medium'` or `'high'`. Drivers throw
`UnsupportedOperationError` for unrecognised values.

`'normal'` is universally supported across all drivers.

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
