[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLDevice

# Interface: BrotherQLDevice

Defined in: [packages/core/src/types.ts:27](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L27)

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

Defined in: [packages/core/src/types.ts:35](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L35)

---

### bluetooth?

> `optional` **bluetooth?**: `BluetoothConfig`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:71

BLE connection parameters. Present only when `transports` includes
`'web-bluetooth'`.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`bluetooth`](DeviceDescriptor.md#bluetooth)

---

### bytesPerRow

> **bytesPerRow**: `number`

Defined in: [packages/core/src/types.ts:32](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L32)

---

### compression

> **compression**: `boolean`

Defined in: [packages/core/src/types.ts:36](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L36)

---

### editorLite

> **editorLite**: `boolean`

Defined in: [packages/core/src/types.ts:37](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L37)

---

### family

> **family**: `"brother-ql"`

Defined in: [packages/core/src/types.ts:28](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L28)

Driver family this device belongs to, e.g. `'brother-ql'`.

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`family`](DeviceDescriptor.md#family)

---

### headPins

> **headPins**: [`HeadWidth`](../type-aliases/HeadWidth.md)

Defined in: [packages/core/src/types.ts:31](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L31)

---

### massStoragePid?

> `optional` **massStoragePid?**: `number`

Defined in: [packages/core/src/types.ts:39](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L39)

Alternate PID seen when the printer is in Editor Lite mass-storage mode.

---

### name

> **name**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:51

Human-readable model name, e.g. `"Brother QL-820NWB"`.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`name`](DeviceDescriptor.md#name)

---

### network

> **network**: [`NetworkSupport`](../type-aliases/NetworkSupport.md)

Defined in: [packages/core/src/types.ts:34](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L34)

---

### pid

> **pid**: `number`

Defined in: [packages/core/src/types.ts:30](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L30)

USB Product ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers.

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`pid`](DeviceDescriptor.md#pid)

---

### transports

> **transports**: [`TransportType`](../type-aliases/TransportType.md)[]

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/device.d.ts:66

Supported transport types for this device.

#### Inherited from

[`DeviceDescriptor`](DeviceDescriptor.md).[`transports`](DeviceDescriptor.md#transports)

---

### twoColor

> **twoColor**: `boolean`

Defined in: [packages/core/src/types.ts:33](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L33)

---

### vid

> **vid**: `number`

Defined in: [packages/core/src/types.ts:29](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/types.ts#L29)

USB Vendor ID. Required when `transports` includes `'usb'` or `'webusb'`.
Undefined for network-only printers (e.g. a LabelWriter 550 Turbo
accessed purely over Ethernet).

#### Overrides

[`DeviceDescriptor`](DeviceDescriptor.md).[`vid`](DeviceDescriptor.md#vid)
