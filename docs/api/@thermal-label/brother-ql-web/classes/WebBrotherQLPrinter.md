[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / WebBrotherQLPrinter

# Class: WebBrotherQLPrinter

Defined in: packages/web/src/printer.ts:26

## Constructors

### Constructor

> **new WebBrotherQLPrinter**(`device`, `descriptor`): `WebBrotherQLPrinter`

Defined in: packages/web/src/printer.ts:30

#### Parameters

##### device

`USBDevice`

##### descriptor

[`DeviceDescriptor`](../interfaces/DeviceDescriptor.md)

#### Returns

`WebBrotherQLPrinter`

## Properties

### descriptor

> `readonly` **descriptor**: [`DeviceDescriptor`](../interfaces/DeviceDescriptor.md)

Defined in: packages/web/src/printer.ts:28

***

### device

> `readonly` **device**: `USBDevice`

Defined in: packages/web/src/printer.ts:27

## Methods

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:129

#### Returns

`Promise`\<`void`\>

***

### getStatus()

> **getStatus**(): `Promise`\<[`PrinterStatus`](../interfaces/PrinterStatus.md)\>

Defined in: packages/web/src/printer.ts:39

#### Returns

`Promise`\<[`PrinterStatus`](../interfaces/PrinterStatus.md)\>

***

### isConnected()

> **isConnected**(): `boolean`

Defined in: packages/web/src/printer.ts:35

#### Returns

`boolean`

***

### print()

> **print**(`pages`, `options?`): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:46

#### Parameters

##### pages

[`PageData`](../interfaces/PageData.md)[]

##### options?

[`JobOptions`](../interfaces/JobOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printImage()

> **printImage**(`imageData`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:67

#### Parameters

##### imageData

`ImageData`

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`ImagePrintOptions`](../interfaces/ImagePrintOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printImageURL()

> **printImageURL**(`url`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:89

#### Parameters

##### url

`string`

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`ImagePrintOptions`](../interfaces/ImagePrintOptions.md)

#### Returns

`Promise`\<`void`\>

***

### printText()

> **printText**(`text`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:51

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

> **printTwoColor**(`blackImageData`, `redImageData`, `media`, `options?`): `Promise`\<`void`\>

Defined in: packages/web/src/printer.ts:101

#### Parameters

##### blackImageData

`ImageData`

##### redImageData

`ImageData`

##### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

##### options?

[`PageOptions`](../interfaces/PageOptions.md)

#### Returns

`Promise`\<`void`\>
