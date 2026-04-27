[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / flipHorizontal

# Function: flipHorizontal()

> **flipHorizontal**(`bitmap`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node\_modules/@mbtech-nl/bitmap/dist/transform.d.ts:42

Mirror a bitmap left-to-right.

## Parameters

### bitmap

[`LabelBitmap`](../interfaces/LabelBitmap.md)

## Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)

A new bitmap with each row's pixels reversed.

## Example

```ts
const mirrored = flipHorizontal(bitmap);
```
