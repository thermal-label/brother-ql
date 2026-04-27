[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DeviceDescriptor

# Interface: DeviceDescriptor

Static description of a supported printer model.

Each driver's device registry extends this with family-specific fields
(head geometry, cutter support, compression, etc.). Structural typing
means any superset is accepted wherever `DeviceDescriptor` is expected.

## Extended by

- [`BrotherQLDevice`](BrotherQLDevice.md)

## Properties

### bluetooth?

> `optional` **bluetooth?**: `BluetoothConfig`

BLE connection parameters. Present only when `transports` includes
`'web-bluetooth'`.

***

### family

> **family**: `string`

Driver family this device belongs to, e.g. `'brother-ql'`.

***

### name

> **name**: `string`

Human-readable model name, e.g. `"Brother QL-820NWB"`.

***

### pid?

> `optional` **pid?**: `number`

USB Product ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers.

***

### transports

> **transports**: [`TransportType`](../type-aliases/TransportType.md)[]

Supported transport types for this device.

***

### vid?

> `optional` **vid?**: `number`

USB Vendor ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers (e.g. a LabelWriter 550 Turbo
accessed purely over Ethernet).
