[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLDevice

# Interface: BrotherQLDevice

Brother QL device descriptor.

Extends the contracts base with QL-specific fields: head geometry,
protocol feature flags, and the optional mass-storage PID for Editor
Lite mode.

**Bluetooth on the QL-820NWB / 820NWBc**: not exposed over GATT.
Classic Bluetooth (SPP) is paired at the OS level; the kernel/driver
exposes an RFCOMM serial port, reachable via the `'serial'` transport
in Node.js and the `'web-serial'` transport in Chrome/Edge. macOS has
dropped classic Bluetooth SPP — no serial route there.

## Extends

- [`DeviceDescriptor`](DeviceDescriptor.md)

## Properties

### autocut

> **autocut**: `boolean`

***

### bluetooth?

> `optional` **bluetooth?**: `BluetoothConfig`

BLE connection parameters. Present only when `transports` includes
`'web-bluetooth'`.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`bluetooth`](DeviceDescriptor.md#bluetooth)

***

### bytesPerRow

> **bytesPerRow**: `number`

***

### compression

> **compression**: `boolean`

***

### editorLite

> **editorLite**: `boolean`

***

### family

> **family**: `"brother-ql"`

Driver family this device belongs to, e.g. `'brother-ql'`.

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`family`](DeviceDescriptor.md#family)

***

### headPins

> **headPins**: [`HeadWidth`](../type-aliases/HeadWidth.md)

***

### massStoragePid?

> `optional` **massStoragePid?**: `number`

Alternate PID seen when the printer is in Editor Lite mass-storage mode.

***

### name

> **name**: `string`

Human-readable model name, e.g. `"Brother QL-820NWB"`.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`name`](DeviceDescriptor.md#name)

***

### network

> **network**: [`NetworkSupport`](../type-aliases/NetworkSupport.md)

***

### pid

> **pid**: `number`

USB Product ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers.

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`pid`](DeviceDescriptor.md#pid)

***

### transports

> **transports**: [`TransportType`](../type-aliases/TransportType.md)[]

Supported transport types for this device.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`transports`](DeviceDescriptor.md#transports)

***

### twoColor

> **twoColor**: `boolean`

***

### vid

> **vid**: `number`

USB Vendor ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers (e.g. a LabelWriter 550 Turbo
accessed purely over Ethernet).

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`vid`](DeviceDescriptor.md#vid)
