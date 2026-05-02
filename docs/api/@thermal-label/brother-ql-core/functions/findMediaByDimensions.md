[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / findMediaByDimensions

# Function: findMediaByDimensions()

> **findMediaByDimensions**(`widthMm`, `heightMm`, `twoColorMode?`, `engine?`): [`BrotherQLMedia`](../interfaces/BrotherQLMedia.md) \| `undefined`

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

### engine?

`Pick`\<[`PrintEngine`](../interfaces/PrintEngine.md), `"headDots"` \| `"mediaCompatibility"`\>

optional engine descriptor used to gate the
                    lookup by tape-system and head-family. When
                    omitted, the search is restricted to DK media —
                    legacy QL behaviour. PT-* callers pass the
                    primary engine so the search returns TZe / HSe
                    entries with the right `narrow` / `wide`
                    geometry, and so a 128-dot head never resolves
                    a 36 mm TZe / 31 mm HSe-3:1 width and
                    PT-P910BT (TZe-only) never resolves an HSe
                    entry.

## Returns

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md) \| `undefined`
