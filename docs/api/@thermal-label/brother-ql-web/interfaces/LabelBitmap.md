[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / LabelBitmap

# Interface: LabelBitmap

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@0.1.0/node\_modules/@mbtech-nl/bitmap/dist/types.d.ts:10

A 1-bit-per-pixel bitmap. Row-major, MSB-first within each byte.

Memory layout:
  Row y, pixel x -> byte index: y * bytesPerRow + Math.floor(x / 8)
                 -> bit index:  7 - (x % 8)   (MSB = leftmost pixel)

A set bit (1) = black dot. A clear bit (0) = white dot.

## Properties

### data

> `readonly` **data**: `Uint8Array`

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@0.1.0/node\_modules/@mbtech-nl/bitmap/dist/types.d.ts:13

***

### heightPx

> `readonly` **heightPx**: `number`

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@0.1.0/node\_modules/@mbtech-nl/bitmap/dist/types.d.ts:12

***

### widthPx

> `readonly` **widthPx**: `number`

Defined in: node\_modules/.pnpm/@mbtech-nl+bitmap@0.1.0/node\_modules/@mbtech-nl/bitmap/dist/types.d.ts:11
