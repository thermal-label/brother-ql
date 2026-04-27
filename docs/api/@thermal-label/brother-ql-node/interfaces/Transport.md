[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / Transport

# Interface: Transport

Defined in: packages/node/src/transport.ts:4

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/node/src/transport.ts:7

#### Returns

`Promise`\<`void`\>

***

### read()

> **read**(`byteCount`): `Promise`\<`Uint8Array`\>

Defined in: packages/node/src/transport.ts:6

#### Parameters

##### byteCount

`number`

#### Returns

`Promise`\<`Uint8Array`\>

***

### write()

> **write**(`data`): `Promise`\<`void`\>

Defined in: packages/node/src/transport.ts:5

#### Parameters

##### data

`Uint8Array`

#### Returns

`Promise`\<`void`\>
