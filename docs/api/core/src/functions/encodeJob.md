[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / encodeJob

# Function: encodeJob()

> **encodeJob**(`pages`, `options?`): `Uint8Array`

Encode a QL job. Public legacy entry point — DK media only, no
engine awareness, two-colour invalidate-byte boost not applied.
Use `encodeJobForEngine` for PT or for QL with two-colour invalidate
derivation from `engine.capabilities.twoColor`.

## Parameters

### pages

[`PageData`](../interfaces/PageData.md)[]

### options?

[`JobOptions`](../interfaces/JobOptions.md) = `{}`

## Returns

`Uint8Array`
