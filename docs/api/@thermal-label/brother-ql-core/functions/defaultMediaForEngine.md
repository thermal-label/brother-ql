[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / defaultMediaForEngine

# Function: defaultMediaForEngine()

> **defaultMediaForEngine**(`engine`): [`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)

Pick a default media entry for an engine. Used by `createPreview()`
when neither user-supplied media nor a detected roll is available.

## Parameters

### engine

`Pick`\<[`PrintEngine`](../interfaces/PrintEngine.md), `"protocol"`\>

## Returns

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)
