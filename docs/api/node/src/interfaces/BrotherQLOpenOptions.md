[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [node/src](../README.md) / BrotherQLOpenOptions

# Interface: BrotherQLOpenOptions

Driver-specific `openPrinter` options.

Serial (RFCOMM over OS-paired Bluetooth on the QL-820NWB, or any
USB-to-serial adapter) uses the contract's `serialPath` / `baudRate`;
the pre-0.6.2 `path` spelling is still accepted for one release.
Serial and TCP both need a registry key when the printer cannot be
identified: see `BrotherQLDiscovery.openPrinter`.

## Extends

- [`OpenOptions`](/contracts/api/interfaces/OpenOptions)

## Properties

### ~~path?~~

> `optional` **path?**: `string`

#### Deprecated

Use `serialPath`. Removed in the next minor.
