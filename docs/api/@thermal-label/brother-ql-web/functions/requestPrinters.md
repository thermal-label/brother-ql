[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / requestPrinters

# Function: requestPrinters()

> **requestPrinters**(`options?`): `Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>

Show the browser's USB picker and return one `PrinterAdapter` per
drivable engine on the selected device, keyed by engine role.

Brother QL devices are always single-engine — this returns a 1-key
record keyed by the device's `engines[0].role` (typically `'primary'`).
Mirrors the labelwriter driver's `requestPrinters()` factory so harness
adapters can stay symmetric across driver families.

## Parameters

### options?

[`RequestOptions`](../interfaces/RequestOptions.md) = `{}`

## Returns

`Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>
