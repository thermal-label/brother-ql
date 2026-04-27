[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / TcpTransport

# Class: TcpTransport

Defined in: packages/node/src/transport.ts:60

## Implements

- [`Transport`](../interfaces/Transport.md)

## Constructors

### Constructor

> **new TcpTransport**(`socket`): `TcpTransport`

Defined in: packages/node/src/transport.ts:66

#### Parameters

##### socket

`Socket`

#### Returns

`TcpTransport`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/node/src/transport.ts:127

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Transport`](../interfaces/Transport.md).[`close`](../interfaces/Transport.md#close)

***

### read()

> **read**(`byteCount`): `Promise`\<`Uint8Array`\>

Defined in: packages/node/src/transport.ts:112

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

Defined in: packages/node/src/transport.ts:103

#### Parameters

##### data

`Uint8Array`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Transport`](../interfaces/Transport.md).[`write`](../interfaces/Transport.md#write)

***

### connect()

> `static` **connect**(`host`, `port?`): `Promise`\<`TcpTransport`\>

Defined in: packages/node/src/transport.ts:74

#### Parameters

##### host

`string`

##### port?

`number` = `9100`

#### Returns

`Promise`\<`TcpTransport`\>
