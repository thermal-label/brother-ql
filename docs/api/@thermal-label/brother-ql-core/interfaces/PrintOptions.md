[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrintOptions

# Interface: PrintOptions

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:8

Options for a single `PrinterAdapter.print()` call.

Drivers may extend this with family-specific fields; structural typing
accepts any superset wherever `PrintOptions` is consumed.

## Extended by

- [`BrotherQLPrintOptions`](BrotherQLPrintOptions.md)

## Properties

### copies?

> `optional` **copies?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:10

Number of copies to print. Default 1.

---

### density?

> `optional` **density?**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/status.d.ts:20

Driver-specific density setting.

Common values: `'light'`, `'normal'`, `'dark'`. Some drivers support
additional values such as `'medium'` or `'high'`. Drivers throw
`UnsupportedOperationError` for unrecognised values.

`'normal'` is universally supported across all drivers.
