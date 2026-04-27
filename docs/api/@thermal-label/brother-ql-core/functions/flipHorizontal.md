[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / flipHorizontal

# Function: flipHorizontal()

> **flipHorizontal**(`bitmap`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

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
