[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [web/src](../README.md) / fromUSBDevice

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
