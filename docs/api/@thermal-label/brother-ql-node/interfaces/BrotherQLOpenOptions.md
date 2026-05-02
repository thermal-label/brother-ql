[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / BrotherQLOpenOptions

# Interface: BrotherQLOpenOptions

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

Baud rate override; defaults to 9600.

#### Overrides

`OpenOptions.baudRate`

***

### deviceKey?

> `optional` **deviceKey?**: `string`

Registry key of the device descriptor to use. Required by drivers
when the transport carries no model signal (serial / RFCOMM); ignored
when the transport enumerates (USB / TCP / mDNS).

Each driver matches the key against its own registry — pass
`'LW_330'` to the labelwriter driver, `'QL_820NWB'` to the Brother
driver, etc. Unknown keys behave like any other "no match" —
`openPrinter` throws.

#### Inherited from

`OpenOptions.deviceKey`

***

### host?

> `optional` **host?**: `string`

TCP host (IP or hostname).

#### Inherited from

`OpenOptions.host`

***

### path?

> `optional` **path?**: `string`

Serial device path — e.g. `/dev/rfcomm0` (Linux) or `COM3`
(Windows) after pairing the printer via the OS Bluetooth
settings. Mutually exclusive with `host` and the USB fields.

***

### pid?

> `optional` **pid?**: `number`

Match by USB Product ID.

#### Inherited from

`OpenOptions.pid`

***

### port?

> `optional` **port?**: `number`

TCP port. Default 9100.

#### Inherited from

`OpenOptions.port`

***

### serialNumber?

> `optional` **serialNumber?**: `string`

Match by USB / mDNS serial number.

#### Inherited from

`OpenOptions.serialNumber`

***

### serialPath?

> `optional` **serialPath?**: `string`

Serial port path. Examples: `/dev/rfcomm0` (Linux, Bluetooth SPP),
`/dev/ttyUSB0` (Linux, USB-serial adapter), `COM3` (Windows).

#### Inherited from

`OpenOptions.serialPath`

***

### vid?

> `optional` **vid?**: `number`

Match by USB Vendor ID.

#### Inherited from

`OpenOptions.vid`
