[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [node/src](../README.md) / BrotherQLOpenOptions

# Interface: BrotherQLOpenOptions

Driver-specific `openPrinter` options.

Extends the contracts `OpenOptions` with `path` / `baudRate` for
serial (RFCOMM over OS-paired Bluetooth on the QL-820NWB, or any
USB-to-serial adapter). Baud rate is forwarded to the OS driver;
RFCOMM ignores it, but `serialport` requires a value.

## Extends

- [`OpenOptions`](/contracts/api/interfaces/OpenOptions)

## Properties

### baudRate?

> `optional` **baudRate?**: `number`

Baud rate override; defaults to 9600.

#### Overrides

`OpenOptions.baudRate`

***

### path?

> `optional` **path?**: `string`

Serial device path — e.g. `/dev/rfcomm0` (Linux) or `COM3`
(Windows) after pairing the printer via the OS Bluetooth
settings. Mutually exclusive with `host` and the USB fields.
