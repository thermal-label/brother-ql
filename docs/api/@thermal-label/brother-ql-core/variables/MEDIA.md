[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / MEDIA

# Variable: MEDIA

> `const` **MEDIA**: `Record`\<`number`, [`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)\>

Defined in: [packages/core/src/media.ts:25](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/media.ts#L25)

Registry of supported Brother QL consumables.

Entries are keyed by the firmware media id — the same number the
printer reports in the 32-byte status response. `heightMm` is omitted
for continuous media (variable length) and set for die-cut labels
(fixed length).

`palette` is set on multi-ink media (DK-22251, today's only entry) —
the driver routes those through `renderMultiPlaneImage` and emits the
second plane in the raster job. Single-ink rolls leave it undefined
and route through `renderImage` (dithered single-plane).

Rectangular die-cut entries declare `defaultOrientation: 'horizontal'`
so landscape input auto-rotates to read along the tape feed direction.
Continuous wide tape leaves the hint undefined — users may go either
way.

`cornerRadiusMm` is informational; previews use it to render the
actual paper outline. Round die-cut labels set the radius to
`widthMm / 2` so the rounded rectangle degenerates to a circle.
