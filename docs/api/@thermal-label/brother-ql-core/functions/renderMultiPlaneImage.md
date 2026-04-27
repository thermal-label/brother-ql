[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / renderMultiPlaneImage

# Function: renderMultiPlaneImage()

> **renderMultiPlaneImage**(`image`, `options`): `Record`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node\_modules/@mbtech-nl/bitmap/dist/multiplane.d.ts:44

Convert RGBA pixel data into one 1bpp `LabelBitmap` per palette entry.

Targets thermal printers that can place more than one ink/foil colour
per label — Brother QL-800 with DK-22251 red/black tape, two-colour
DYMO/Zebra models, etc.

**Mutual exclusivity is guaranteed:** at every pixel position at most one
plane has its bit set, because most multi-colour thermal heads cannot fire
two colours on the same dot. This is a construction property, not a
post-hoc cleanup — pixels are classified to one plane (or to the implicit
white substrate background), and per-plane error-diffusion dither is
masked so error never leaks into pixels classified to another plane.

Each pixel is classified to its closest palette colour by Euclidean
distance in RGB (`colorSpace: 'rgb'`, default) or CIELAB ΔE76
(`colorSpace: 'lab'`). Pixels closer to white than to any palette entry
land on the implicit background and produce no ink.

## Parameters

### image

[`RawImageData`](../interfaces/RawImageData.md)

RGBA pixel data; compatible with browser `ImageData`.

### options

`MultiPlaneRenderOptions`

See MultiPlaneRenderOptions.

## Returns

`Record`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>

A record keyed by palette entry name; each value is the 1bpp
  plane for that ink colour. Dimensions match the input (or are swapped
  when `rotate` is 90 or 270).

## Throws

On empty palette, > 254 entries, duplicate plane
  names or `rgb` tuples, name `'white'`, `rgb` outside `[0, 255]` or
  non-integer, `rgb` exactly `[255, 255, 255]`, zero-dimension image,
  or `data.length` mismatch.

## Example

```ts
const { black, red } = renderMultiPlaneImage(image, {
  palette: [
    { name: 'black', rgb: [0, 0, 0] },
    { name: 'red', rgb: [204, 0, 0] },
  ],
  defaults: { dither: 'floyd-steinberg' },
  planes: { red: { gamma: 1.15 } },
  rotate: 90,
});
```
