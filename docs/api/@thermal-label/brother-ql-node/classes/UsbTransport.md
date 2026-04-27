[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / UsbTransport

# Class: UsbTransport

Defined in: packages/node/src/transport.ts:10

## Implements

- [`Transport`](../interfaces/Transport.md)

## Constructors

### Constructor

> **new UsbTransport**(`device`): `UsbTransport`

Defined in: packages/node/src/transport.ts:16

#### Parameters

##### device

`Device`

#### Returns

`UsbTransport`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/node/src/transport.ts:54

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Transport`](../interfaces/Transport.md).[`close`](../interfaces/Transport.md#close)

***

### read()

> **read**(`byteCount`): `Promise`\<`Uint8Array`\>

Defined in: packages/node/src/transport.ts:49

#### Parameters

##### byteCount

`number`

#### Returns

`Promise`\<`Uint8Array`\>

#### Implementation of

[`Transport`](../interfaces/Transport.md).[`read`](../interfaces/Transport.md#read)

***

### write()

> **write**(`data`): `Promise`\<`void`\>

Defined in: packages/node/src/transport.ts:45

#### Parameters

##### data

`Uint8Array`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Transport`](../interfaces/Transport.md).[`write`](../interfaces/Transport.md#write)

***

### open()

> `static` **open**(`vid`, `pid`): `Promise`\<`UsbTransport`\>

Defined in: packages/node/src/transport.ts:37

#### Parameters

##### vid

`number`

##### pid

`number`

#### Returns

`Promise`\<`UsbTransport`\>
