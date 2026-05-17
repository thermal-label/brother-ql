[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / encodeJobForEngine

# Function: encodeJobForEngine()

> **encodeJobForEngine**(`pages`, `options`, `engine`, `deviceName?`): `Uint8Array`

Encode a job for a specific engine. Dispatches on `engine.protocol`:
`'ql-raster'` picks the QL config, `'pt-raster'` picks the PT config
and threads `engine.headDots` through to head-family geometry
resolution for TZe / HSe media.

`deviceName` is optional; when supplied, it enables the per-name
cutter-compression guard for PT-E550W (§7.2 / §12.12).

## Parameters

### pages

[`PageData`](../interfaces/PageData.md)[]

### options

[`JobOptions`](../interfaces/JobOptions.md)

### engine

[`EncoderEngine`](../type-aliases/EncoderEngine.md)

### deviceName?

`string`

## Returns

`Uint8Array`
