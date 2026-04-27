[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / renderImage

# Function: renderImage()

> **renderImage**(`image`, `options?`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node\_modules/@mbtech-nl/bitmap/dist/image.d.ts:40

Convert RGBA pixel data to a packed 1bpp bitmap.

Inside `renderImage` the pipeline runs in this fixed order; each step is
optional:

```
rgba → luminance(weights) → autoLevels → gamma → threshold | dither → rotate
```

For multi-colour printers (Brother QL-800 with red+black tape, two-colour
DYMO/Zebra), see [renderMultiPlaneImage](renderMultiPlaneImage.md) instead.

## Parameters

### image

[`RawImageData`](../interfaces/RawImageData.md)

RGBA pixel data; compatible with browser `ImageData`.

### options?

`ImageRenderOptions`

See ImageRenderOptions.

## Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)

A 1bpp `LabelBitmap` whose dimensions match the input (or are
  swapped when `rotate` is 90 or 270).

## Throws

If image dimensions are zero or `data.length` does
  not match `width * height * 4`. Also if `gamma` is non-finite or
  non-positive, or if a custom `luminanceWeights` tuple has invalid values.

## Examples

```ts
const bmp = renderImage(rgba, { threshold: 128 });
```

```ts
const bmp = renderImage(rgba, { dither: 'atkinson', rotate: 90 });
```

```ts
const bmp = renderImage(rgba, { autoLevels: true, dither: 'floyd-steinberg' });
```
