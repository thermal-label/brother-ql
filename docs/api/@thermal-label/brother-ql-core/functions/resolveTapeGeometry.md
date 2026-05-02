[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / resolveTapeGeometry

# Function: resolveTapeGeometry()

> **resolveTapeGeometry**(`media`, `engine`): [`TapeGeometry`](../interfaces/TapeGeometry.md)

Resolve per-head-family geometry for a media entry against the
engine that's about to print it.

DK entries fall back to the flat `printAreaDots` / `leftMarginPins` /
`rightMarginPins` fields on the entry — the same values every QL
code path read before the head-family split landed. TZe and HSe
entries dispatch on `engine.headDots`: 128 picks `geometry.narrow`,
anything else picks `geometry.wide`. Throws when the requested head
family has no entry (e.g. 36 mm TZe on a 128-dot head, or any HSe
on PT-P910BT — those engines simply shouldn't reach this call site
because `findMediaByDimensions` gates them upstream).

## Parameters

### media

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)

### engine

`Pick`\<[`PrintEngine`](../interfaces/PrintEngine.md), `"headDots"`\>

## Returns

[`TapeGeometry`](../interfaces/TapeGeometry.md)
