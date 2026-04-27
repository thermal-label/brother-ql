[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / BrotherQLDiscovery

# Class: BrotherQLDiscovery

Defined in: [packages/node/src/discovery.ts:87](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/node/src/discovery.ts#L87)

`PrinterDiscovery` implementation for Brother QL printers.

`listPrinters()` enumerates USB and skips printers in Editor Lite
mass-storage mode (a warning is logged — the user has to switch
them out of Editor Lite manually). Network printers open via
`openPrinter({ host, port })`; there is no mDNS implementation so
`listPrinters()` never surfaces them.

## Implements

- `PrinterDiscovery`

## Constructors

### Constructor

> **new BrotherQLDiscovery**(): `BrotherQLDiscovery`

#### Returns

`BrotherQLDiscovery`

## Properties

### family

> `readonly` **family**: `"brother-ql"` = `'brother-ql'`

Defined in: [packages/node/src/discovery.ts:88](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/node/src/discovery.ts#L88)

Driver family identifier — matches `DeviceDescriptor.family`.

#### Implementation of

`PrinterDiscovery.family`

## Methods

### listPrinters()

> **listPrinters**(): `Promise`\<`DiscoveredPrinter`[]\>

Defined in: [packages/node/src/discovery.ts:90](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/node/src/discovery.ts#L90)

List connected printers on this driver's supported transports.

#### Returns

`Promise`\<`DiscoveredPrinter`[]\>

#### Implementation of

`PrinterDiscovery.listPrinters`

***

### openPrinter()

> **openPrinter**(`options?`): `Promise`\<[`BrotherQLPrinter`](BrotherQLPrinter.md)\>

Defined in: [packages/node/src/discovery.ts:100](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/node/src/discovery.ts#L100)

Open a printer matching the given options.

If no options are provided, opens the first available printer.

#### Parameters

##### options?

[`BrotherQLOpenOptions`](../interfaces/BrotherQLOpenOptions.md) = `{}`

#### Returns

`Promise`\<[`BrotherQLPrinter`](BrotherQLPrinter.md)\>

#### Implementation of

`PrinterDiscovery.openPrinter`
