[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / getUsbIds

# Function: getUsbIds()

> **getUsbIds**(`device`): \{ `pid`: `number`; `vid`: `number`; \} \| `undefined`

Numeric VID/PID extracted from a device's USB transport.

Returns `undefined` when the device has no USB transport. Hex
strings on the registry (`'0x04f9'`) are parsed at this boundary so
runtime callers stay numeric.

## Parameters

### device

[`DeviceEntry`](../interfaces/DeviceEntry.md)

## Returns

\{ `pid`: `number`; `vid`: `number`; \} \| `undefined`
