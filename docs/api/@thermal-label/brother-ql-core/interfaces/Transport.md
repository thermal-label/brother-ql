[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / Transport

# Interface: Transport

A bidirectional byte channel to a printer.

Implemented by `@thermal-label/transport` for each transport type
(USB, TCP, WebUSB, Web Bluetooth). Drivers program against this
interface and never touch platform APIs directly.

## Properties

### connected

> `readonly` **connected**: `boolean`

Whether the transport is currently connected.

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Close the connection.

Always safe to call multiple times. Always `await` the result.

#### Returns

`Promise`\<`void`\>

***

### read()

> **read**(`length`, `timeout?`): `Promise`\<`Uint8Array`\>

Read bytes from the printer.

Buffers until `length` bytes are available or the timeout fires.

BLE implementations: there is no "read N bytes" primitive in BLE.
Implementations must buffer incoming GATT notifications internally
and satisfy `read()` calls from that buffer. Document this in your
transport class — every BLE implementation must handle buffering
consistently so drivers get the same pull-based API on every
transport.

#### Parameters

##### length

`number`

##### timeout?

`number`

#### Returns

`Promise`\<`Uint8Array`\>

#### Throws

TransportTimeoutError on timeout.

#### Throws

TransportClosedError if the transport is closed mid-read.

***

### write()

> **write**(`data`): `Promise`\<`void`\>

Send bytes to the printer.

#### Parameters

##### data

`Uint8Array`

#### Returns

`Promise`\<`void`\>
