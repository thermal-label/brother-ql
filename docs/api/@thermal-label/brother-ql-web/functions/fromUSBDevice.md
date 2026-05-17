[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / fromUSBDevice

# ~~Function: fromUSBDevice()~~

> **fromUSBDevice**(`usbDevice`): `Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

Wrap an already-selected `USBDevice`.

## Parameters

### usbDevice

`USBDevice`

## Returns

`Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

## Throws

when the VID/PID is not in the Brother QL registry.

## Deprecated

Use `requestPrinters({ transport: 'usb' })` from
  `./request-printers.ts`. Removed once consumers migrate (plan 11).
