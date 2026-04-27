[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / fromUSBDevice

# Function: fromUSBDevice()

> **fromUSBDevice**(`usbDevice`): `Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

Defined in: [printer.ts:160](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/web/src/printer.ts#L160)

Wrap an already-selected `USBDevice`.

## Parameters

### usbDevice

`USBDevice`

## Returns

`Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

## Throws

when the VID/PID is not in the Brother QL registry.
