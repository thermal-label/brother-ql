[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / renderText

# Function: renderText()

> **renderText**(`text`, `options?`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node\_modules/@mbtech-nl/bitmap/dist/font/render.d.ts:21

Render an ASCII string into a packed 1bpp bitmap using the bundled font.

Each character is rasterised left-to-right with `letterSpacing` pixels of
gap between glyphs. Code points outside `0x20..0x7F` are replaced with
a space (`0x20`).

## Parameters

### text

`string`

String to render. Must be non-empty.

### options?

`TextRenderOptions`

Font, scale factors, letter spacing, and invert flag.
  See TextRenderOptions.

## Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)

A 1bpp `LabelBitmap` sized to fit the rendered text.

## Throws

If `text` is empty, or if `scaleX`/`scaleY` is not a
  positive integer, or if `letterSpacing` is not a non-negative integer.

## Example

```ts
const banner = renderText('HELLO', { scaleX: 2, scaleY: 2 });
```
