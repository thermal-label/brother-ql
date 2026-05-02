[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / UsbTransport

# Interface: UsbTransport

USB transport parameters.

VID/PID stored as hex strings (e.g. `'0x0922'`) matching what every
datasheet, lsusb output, and forum post uses. Consumers that need
numbers parseInt at the boundary.

## Properties

### pid

> **pid**: `string`

Hex string, e.g. `'0x0020'`.

***

### vid

> **vid**: `string`

Hex string, e.g. `'0x0922'`.
