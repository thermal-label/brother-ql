[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / requestPrinter

# ~~Function: requestPrinter()~~

> **requestPrinter**(`options?`): `Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

Show the browser's USB picker and wrap the selected device.

Requires a user gesture. Opens the device and claims interface 0 via
`WebUsbTransport.fromDevice()`.

Single-instance entry point — preserved for back-compat with existing
consumers (CLIs, ad-hoc scripts). For the symmetric driver-web shape
(1-key map keyed by engine role) call `requestPrinters()` instead;
the harness shell uses that path.

## Parameters

### options?

[`RequestOptions`](../interfaces/RequestOptions.md) = `{}`

## Returns

`Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

## Deprecated

Use `requestPrinters({ transport: 'usb' })` from
  `./request-printers.ts`. Removed once consumers migrate (plan 11).
