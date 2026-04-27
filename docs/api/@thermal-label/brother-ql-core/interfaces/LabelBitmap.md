[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / LabelBitmap

# Interface: LabelBitmap

A 1-bit-per-pixel bitmap. Row-major, MSB-first within each byte.

Memory layout:
  Row y, pixel x -> byte index: y * bytesPerRow + Math.floor(x / 8)
                 -> bit index:  7 - (x % 8)   (MSB = leftmost pixel)

A set bit (1) = black dot. A clear bit (0) = white dot.

## Properties

### data

> `readonly` **data**: `Uint8Array`

***

### heightPx

> `readonly` **heightPx**: `number`

***

### widthPx

> `readonly` **widthPx**: `number`
