[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / TapeGeometry

# Interface: TapeGeometry

Per-head-family geometry on `BrotherQLMedia`.

Brother's PT-P / PT-E line ships two head families with different
per-tape pin layouts. The same TZe id maps to different
`printableDots` / `leftMarginPins` / `rightMarginPins` values on a
128-pin head (PT-E550W, PT-P750W) versus a 560-pin head (PT-P900,
P900W, P950NW, P910BT). DK media leaves these unset and resolves via
the flat fields on `BrotherQLMedia` directly.

## Properties

### leftMarginPins

> **leftMarginPins**: `number`

***

### printableDots

> **printableDots**: `number`

***

### rightMarginPins

> **rightMarginPins**: `number`
