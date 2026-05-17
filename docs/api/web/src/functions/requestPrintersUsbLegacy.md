[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [web/src](../README.md) / requestPrintersUsbLegacy

# ~~Function: requestPrintersUsbLegacy()~~

> **requestPrintersUsbLegacy**(`options?`): `Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>

Show the browser's USB picker and return one `PrinterAdapter` per
drivable engine on the selected device, keyed by engine role.

Brother QL devices are always single-engine — this returns a 1-key
record keyed by the device's `engines[0].role` (typically `'primary'`).

## Parameters

### options?

[`RequestOptions`](../interfaces/RequestOptions.md) = `{}`

## Returns

`Promise`\<`Record`\<`string`, [`WebBrotherQLPrinter`](../classes/WebBrotherQLPrinter.md)\>\>

## Deprecated

Use the generic `requestPrinters({ transport: 'usb' })`
  from `./request-printers.ts` — the legacy USB-only name is preserved
  as `requestPrintersUsbLegacy` for back-compat. Removed once
  consumers migrate (plan 11).
