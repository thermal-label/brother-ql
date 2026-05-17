[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / getUsbIds

# Function: getUsbIds()

> **getUsbIds**(`device`): \{ `pid`: `number`; `vid`: `number`; \} \| `undefined`

Numeric VID/PID extracted from a device's USB transport.

Returns `undefined` when the device has no USB transport. Hex
strings on the registry (`'0x04f9'`) are parsed at this boundary so
runtime callers stay numeric.

## Parameters

### device

[`DeviceEntry`](/contracts/api/interfaces/DeviceEntry)

## Returns

\{ `pid`: `number`; `vid`: `number`; \} \| `undefined`
