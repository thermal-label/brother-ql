[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / findMediaByDimensions

# Function: findMediaByDimensions()

> **findMediaByDimensions**(`widthMm`, `heightMm`, `twoColorMode?`): [`BrotherQLMedia`](../interfaces/BrotherQLMedia.md) \| `undefined`

Defined in: [packages/core/src/media.ts:312](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/media.ts#L312)

Match status-response dimensions to a media registry entry.

## Parameters

### widthMm

`number`

media width in mm (status byte 10)

### heightMm

`number`

media length in mm (status byte 17) — 0 = continuous

### twoColorMode?

`boolean` = `false`

true when the status response indicates the
printer is configured for two-colour media. When
both DK-22205 (259) and DK-22251 (251) match the
dimensions, the flag picks the right one.

## Returns

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md) \| `undefined`
