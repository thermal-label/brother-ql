[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / requestPrinter

# Function: requestPrinter()

> **requestPrinter**(`options?`): `Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

Show the browser's USB picker and wrap the selected device.

Requires a user gesture. Opens the device and claims interface 0 via
`WebUsbTransport.fromDevice()`.

## Parameters

### options?

[`RequestOptions`](../interfaces/RequestOptions.md) = `{}`

## Returns

`Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>
