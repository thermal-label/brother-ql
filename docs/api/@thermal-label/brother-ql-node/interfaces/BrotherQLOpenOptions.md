[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / BrotherQLOpenOptions

# Interface: BrotherQLOpenOptions

Defined in: [packages/node/src/discovery.ts:16](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/discovery.ts#L16)

Driver-specific `openPrinter` options.

Extends the contracts `OpenOptions` with `path` / `baudRate` for
serial (RFCOMM over OS-paired Bluetooth on the QL-820NWB, or any
USB-to-serial adapter). Baud rate is forwarded to the OS driver;
RFCOMM ignores it, but `serialport` requires a value.

## Extends

- `OpenOptions`

## Properties

### baudRate?

> `optional` **baudRate?**: `number`

Defined in: [packages/node/src/discovery.ts:24](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/discovery.ts#L24)

Baud rate override; defaults to 9600.

#### Overrides

`OpenOptions.baudRate`

---

### host?

> `optional` **host?**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:38

TCP host (IP or hostname).

#### Inherited from

`OpenOptions.host`

---

### path?

> `optional` **path?**: `string`

Defined in: [packages/node/src/discovery.ts:22](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/node/src/discovery.ts#L22)

Serial device path — e.g. `/dev/rfcomm0` (Linux) or `COM3`
(Windows) after pairing the printer via the OS Bluetooth
settings. Mutually exclusive with `host` and the USB fields.

---

### pid?

> `optional` **pid?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:34

Match by USB Product ID.

#### Inherited from

`OpenOptions.pid`

---

### port?

> `optional` **port?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:40

TCP port. Default 9100.

#### Inherited from

`OpenOptions.port`

---

### serialNumber?

> `optional` **serialNumber?**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:36

Match by USB / mDNS serial number.

#### Inherited from

`OpenOptions.serialNumber`

---

### serialPath?

> `optional` **serialPath?**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:45

Serial port path. Examples: `/dev/rfcomm0` (Linux, Bluetooth SPP),
`/dev/ttyUSB0` (Linux, USB-serial adapter), `COM3` (Windows).

#### Inherited from

`OpenOptions.serialPath`

---

### vid?

> `optional` **vid?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/discovery.d.ts:32

Match by USB Vendor ID.

#### Inherited from

`OpenOptions.vid`
