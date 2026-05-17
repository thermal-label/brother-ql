[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [node/src](../README.md) / BrotherQLDiscovery

# Class: BrotherQLDiscovery

`PrinterDiscovery` implementation for Brother QL printers.

`listPrinters()` enumerates USB and skips printers in Editor Lite
mass-storage mode (a warning is logged — the user has to switch
them out of Editor Lite manually). Network printers open via
`openPrinter({ host, port })`; there is no mDNS implementation so
`listPrinters()` never surfaces them.

## Implements

- [`PrinterDiscovery`](/contracts/api/interfaces/PrinterDiscovery)

## Constructors

### Constructor

> **new BrotherQLDiscovery**(): `BrotherQLDiscovery`

#### Returns

`BrotherQLDiscovery`

## Properties

### family

> `readonly` **family**: `"brother-ql"` = `'brother-ql'`

Driver family identifier — matches `DeviceEntry.family`.

#### Implementation of

`PrinterDiscovery.family`

## Methods

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
