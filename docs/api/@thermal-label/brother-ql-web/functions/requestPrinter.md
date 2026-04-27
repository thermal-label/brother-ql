[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / requestPrinter

# Function: requestPrinter()

> **requestPrinter**(`options?`): `Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>

Defined in: [printer.ts:149](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/web/src/printer.ts#L149)

Show the browser's USB picker and wrap the selected device.

Requires a user gesture. Opens the device and claims interface 0 via
`WebUsbTransport.fromDevice()`.

## Parameters

### options?

[`RequestOptions`](../interfaces/RequestOptions.md) = `{}`

## Returns

`Promise`\<[`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>
