[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / fromUSBDeviceAll

# ~~Function: fromUSBDeviceAll()~~

> **fromUSBDeviceAll**(`usbDevice`): `Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>

Wrap an already-selected `USBDevice` and return a 1-key adapter map
keyed by the device's `engines[0].role`. Public surface for
`requestPrinters()`; exported so harnesses that already hold a
`USBDevice` (e.g. picked-up via `navigator.usb.getDevices()` on a
returning visit) can skip the picker.

Brother QL is single-engine and single-interface (IF 0).

## Parameters

### usbDevice

`USBDevice`

## Returns

`Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>

## Deprecated

Use `requestPrinters({ transport: 'usb' })` from
  `./request-printers.ts`. Removed once consumers migrate (plan 11).
