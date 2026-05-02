[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / EncoderEngine

# Type Alias: EncoderEngine

> **EncoderEngine** = `Pick`\<[`PrintEngine`](../interfaces/PrintEngine.md), `"protocol"` \| `"headDots"`\> & `object`

Engine shape consumed by the encoder — narrow `Pick` so unit tests can synthesise minimal stubs.

## Type Declaration

### capabilities?

> `optional` **capabilities?**: [`BrotherEngineCapabilities`](../interfaces/BrotherEngineCapabilities.md)
