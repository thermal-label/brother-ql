[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / BrotherQLMedia

# Interface: BrotherQLMedia

Brother QL media descriptor.

Extends `MediaDescriptor` with the dots-based geometry the raster
encoder needs. The base `palette` field flips the driver into
multi-plane mode — only DK-22251 declares one in the registry.

## Extends

- [`MediaDescriptor`](/contracts/api/interfaces/MediaDescriptor)

## Properties

### dieCutMaskedAreaDots?

> `optional` **dieCutMaskedAreaDots?**: `number`

Die-cut masked area in dots (registration windows).

***

### geometry?

> `optional` **geometry?**: `object`

Per-head-family geometry. `narrow` = 128-pin head (PT-E550W,
PT-P750W); `wide` = 560-pin head (PT-P900 family). DK entries
leave both unset and use the flat fields below; TZe / HSe entries
leave the flat fields undefined and populate `narrow` and/or
`wide` per the *Raster Command Reference* PDFs. `undefined` on a
head family means "this tape doesn't fit this head" (e.g. 36 mm
TZe and 31 mm HSe-3:1 have no `narrow` entry).

#### narrow?

> `optional` **narrow?**: [`TapeGeometry`](TapeGeometry.md)

#### wide?

> `optional` **wide?**: [`TapeGeometry`](TapeGeometry.md)

***

### id

> **id**: `number`

Unique identifier within the driver family.

#### Overrides

`MediaDescriptor.id`

***

### leftMarginPins?

> `optional` **leftMarginPins?**: `number`

***

### printableDots?

> `optional` **printableDots?**: `number`

DK-only flat geometry. PT-* entries populate `geometry` instead.

***

### rightMarginPins?

> `optional` **rightMarginPins?**: `number`

***

### tapeSystem

> **tapeSystem**: [`TapeSystem`](../type-aliases/TapeSystem.md)

Tape system this entry belongs to. Drives lookup gating in
`findMediaByDimensions(width, height, engine)` so QL engines never
resolve TZe / HSe entries and vice versa.

***

### type

> **type**: [`MediaType`](../type-aliases/MediaType.md)

Media type classification — driver-specific string values.

Common values: `'continuous'`, `'die-cut'`, `'tape'`.
Drivers may define additional values as needed.

#### Overrides

`MediaDescriptor.type`
