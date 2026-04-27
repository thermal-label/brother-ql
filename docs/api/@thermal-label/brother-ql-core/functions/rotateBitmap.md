[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / rotateBitmap

# Function: rotateBitmap()

> **rotateBitmap**(`bitmap`, `degrees`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Rotate a bitmap clockwise by 90, 180, or 270 degrees.

For 90 and 270 the output dimensions are swapped (`widthPx` and `heightPx`
exchange). For 180 the dimensions are unchanged.

## Parameters

### bitmap

[`LabelBitmap`](../interfaces/LabelBitmap.md)

Source bitmap.

### degrees

`90` \| `180` \| `270`

Rotation amount; `90`, `180`, or `270`.

## Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)

A new bitmap; the input is not mutated.

## Example

```ts
const portrait = rotateBitmap(landscape, 90);
```
