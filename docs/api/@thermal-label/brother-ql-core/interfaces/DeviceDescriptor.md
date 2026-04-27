[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DeviceDescriptor

# Interface: DeviceDescriptor

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:49

Static description of a supported printer model.

Each driver's device registry extends this with family-specific fields
(head geometry, cutter support, compression, etc.). Structural typing
means any superset is accepted wherever `DeviceDescriptor` is expected.

## Extended by

- [`BrotherQLDevice`](BrotherQLDevice.md)

## Properties

### bluetooth?

> `optional` **bluetooth?**: `BluetoothConfig`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:71

BLE connection parameters. Present only when `transports` includes
`'web-bluetooth'`.

---

### family

> **family**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:64

Driver family this device belongs to, e.g. `'brother-ql'`.

---

### name

> **name**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:51

Human-readable model name, e.g. `"Brother QL-820NWB"`.

---

### pid?

> `optional` **pid?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:62

USB Product ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers.

---

### transports

> **transports**: [`TransportType`](../type-aliases/TransportType.md)[]

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:66

Supported transport types for this device.

---

### vid?

> `optional` **vid?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:57

USB Vendor ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers (e.g. a LabelWriter 550 Turbo
accessed purely over Ethernet).
