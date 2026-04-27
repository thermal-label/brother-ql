[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-node](../README.md) / BrotherQLPrinter

# Class: BrotherQLPrinter

Defined in: packages/node/src/printer.ts:26

## Constructors

### Constructor

> **new BrotherQLPrinter**(`transport`, `device`, `transportType`): `BrotherQLPrinter`

Defined in: packages/node/src/printer.ts:31

#### Parameters

##### transport

[`Transport`](../interfaces/Transport.md)

##### device

[`DeviceDescriptor`](../interfaces/DeviceDescriptor.md)

##### transportType

`"usb"` \| `"tcp"`

#### Returns

`BrotherQLPrinter`

## Properties

### device

> `readonly` **device**: [`DeviceDescriptor`](../interfaces/DeviceDescriptor.md)

Defined in: packages/node/src/printer.ts:27

***

### transport

> `readonly` **transport**: `"usb"` \| `"tcp"`

Defined in: packages/node/src/printer.ts:28

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/node/src/printer.ts:119

#### Returns

`Promise`\<`void`\>

***

### getStatus()

> **getStatus**(): `Promise`\<[`PrinterStatus`](../interfaces/PrinterStatus.md)\>

Defined in: packages/node/src/printer.ts:37

#### Returns

`Promise`\<[`PrinterStatus`](../interfaces/PrinterStatus.md)\>

***

### print()

> **print**(`pages`, `options?`): `Promise`\<`void`\>

Defined in: packages/node/src/printer.ts:43

#### Parameters

##### pages

[`PageData`](../interfaces/PageData.md)[]

##### options?

[`JobOptions`](../interfaces/JobOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printImage()

> **printImage**(`image`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/node/src/printer.ts:69

#### Parameters

##### image

`string` \| `Buffer`

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`ImagePrintOptions`](../interfaces/ImagePrintOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printText()

> **printText**(`text`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/node/src/printer.ts:48

#### Parameters

##### text

`string`

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`TextPrintOptions`](../interfaces/TextPrintOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printTwoColor()

> **printTwoColor**(`black`, `red`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/node/src/printer.ts:98

#### Parameters

##### black

[`LabelBitmap`](../interfaces/LabelBitmap.md)

##### red

[`LabelBitmap`](../interfaces/LabelBitmap.md)

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`PageOptions`](../interfaces/PageOptions.md)

#### Returns

`Promise`\<`void`\>
