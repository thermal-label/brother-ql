[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [node/src](../README.md) / BrotherQLDiscovery

# Class: BrotherQLDiscovery

`PrinterDiscovery` implementation for Brother QL printers.

`listPrinters()` is the USB enumeration plus one SNMP broadcast on the
local subnets. Network printers open by `host`: the model comes from
SNMP (`hrDeviceDescr`) because port 9100 carries no model or status
signal, and `deviceKey` overrides that. A printer in Editor Lite
(mass-storage) mode exposes a PID outside the registry, so it is
simply absent from the USB list.

## Implements

- [`PrinterDiscovery`](/contracts/api/interfaces/PrinterDiscovery)

## Constructors

### Constructor

> **new BrotherQLDiscovery**(`options?`): `BrotherQLDiscovery`

#### Parameters

##### options?

[`BrotherQLDiscoveryOptions`](../interfaces/BrotherQLDiscoveryOptions.md) = `{}`

#### Returns

`BrotherQLDiscovery`

## Properties

### family

> `readonly` **family**: `"brother-ql"` = `'brother-ql'`

Driver family identifier — matches `DeviceEntry.family`.

#### Implementation of

`PrinterDiscovery.family`

## Methods

### listMedia()

> **listMedia**(): readonly [`MediaDescriptor`](/contracts/api/interfaces/MediaDescriptor)[]

The driver's media registry, for callers that must let a user pick
media by id or name instead of relying on `getStatus().detectedMedia`
(a CLI `--media` flag; network printers whose media cannot be
detected). Optional: drivers without a media catalog omit it, and
callers report `driver <family> does not expose a media catalog`.
(Code span on purpose: typedoc emits the text raw and VitePress
reads a bare `<family>` as an unclosed element.)

#### Returns

readonly [`MediaDescriptor`](/contracts/api/interfaces/MediaDescriptor)[]

#### Implementation of

`PrinterDiscovery.listMedia`

***

### listPrinters()

> **listPrinters**(): `Promise`\<[`DiscoveredPrinter`](/contracts/api/interfaces/DiscoveredPrinter)[]\>

List connected printers on this driver's supported transports.

#### Returns

`Promise`\<[`DiscoveredPrinter`](/contracts/api/interfaces/DiscoveredPrinter)[]\>

#### Implementation of

`PrinterDiscovery.listPrinters`

***

### openPrinter()

> **openPrinter**(`options?`): `Promise`\<[`BrotherQLPrinter`](BrotherQLPrinter.md)\>

Open a printer matching the given options.

If no options are provided, opens the first available printer.

#### Parameters

##### options?

[`BrotherQLOpenOptions`](../interfaces/BrotherQLOpenOptions.md) = `{}`

#### Returns

`Promise`\<[`BrotherQLPrinter`](BrotherQLPrinter.md)\>

#### Implementation of

`PrinterDiscovery.openPrinter`
