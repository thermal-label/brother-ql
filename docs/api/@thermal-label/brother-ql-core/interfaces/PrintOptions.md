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
