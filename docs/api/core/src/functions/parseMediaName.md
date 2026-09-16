[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / parseMediaName

# Function: parseMediaName()

> **parseMediaName**(`name`): \{ `heightMm?`: `number`; `widthMm`: `number`; \} \| `undefined`

Parse the metric half of a Brother `prtInputMediaName`.
`"29mm x 90mm / …"` → 29×90 die-cut, `"62mm / …"` → 62 continuous.
The `Dia` form is the reference's naming for round labels and is
unverified on the wire. Anything else → `undefined`.

## Parameters

### name

`string`

## Returns

\{ `heightMm?`: `number`; `widthMm`: `number`; \} \| `undefined`
