[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLMedia

# Interface: BrotherQLMedia

Brother QL media descriptor.

Extends `MediaDescriptor` with the dots-based geometry the raster
encoder needs. The base `palette` field flips the driver into
multi-plane mode — only DK-22251 declares one in the registry.

## Extends

- [`MediaDescriptor`](MediaDescriptor.md)

## Properties

### category?

> `optional` **category?**: `"continuous"` \| `"die-cut"` \| `"address"` \| `"shipping"` \| `"file-folder"` \| `"multi-purpose"` \| `"name-badge"` \| `"barcode"` \| `"price-tag"` \| `"cartridge"` \| `"tape"`

Coarse category for grouping in docs and UI. Driver-extensible;
common values listed for cross-driver consistency.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`category`](MediaDescriptor.md#category)

***

### cornerRadiusMm?

> `optional` **cornerRadiusMm?**: `number`

Corner radius (mm) of die-cut labels with rounded corners.

Only meaningful for die-cut media. Undefined or `0` = sharp
corners. For round labels, set this to `widthMm / 2` so the
rounded rectangle degenerates to a circle.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`cornerRadiusMm`](MediaDescriptor.md#cornerradiusmm)

***

### defaultOrientation?

> `optional` **defaultOrientation?**: `"horizontal"` \| `"vertical"`

Hint for how the user is expected to author content for this media.
Drives the auto-rotate decision in `print()`:

- `'horizontal'` — long axis horizontal when reading (landscape).
  Driver rotates 90° in the family-specific direction when input
  matches landscape dimensions. Examples: 89×28 mm address labels,
  12 mm narrow tape with a name on it.
- `'vertical'` — long axis vertical when reading (portrait).
  Driver passes through.
- `undefined` — driver passes through. Recommended for continuous
  wide tape (62 mm) where users may go either way.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`defaultOrientation`](MediaDescriptor.md#defaultorientation)

***

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

### heightMm?

> `optional` **heightMm?**: `number`

Physical height/length in mm.

- Undefined = continuous (variable length; printer cuts to content).
- A number = fixed length (die-cut labels, tape segments).

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`heightMm`](MediaDescriptor.md#heightmm)

***

### id

> **id**: `number`

Unique identifier within the driver family.

#### Overrides

[`MediaDescriptor`](MediaDescriptor.md).[`id`](MediaDescriptor.md#id)

***

### leftMarginPins?

> `optional` **leftMarginPins?**: `number`

***

### name

> **name**: `string`

Human-readable name, e.g. `"62mm continuous"` or `"DK-22251"`.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`name`](MediaDescriptor.md#name)

***

### palette?

> `optional` **palette?**: readonly [`PaletteEntry`](PaletteEntry.md)[]

Inks this media supports, beyond the implicit white substrate.

- Undefined = single-colour black-on-white. Driver renders via
  `renderImage` (luminance threshold + optional dither).
- Defined = multi-plane media. Driver renders via
  `renderMultiPlaneImage` with this palette.

For DK-22251 (the only multi-ink media we ship today):
`[{ name: 'black', rgb: [0, 0, 0] }, { name: 'red', rgb: [255, 0, 0] }]`

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`palette`](MediaDescriptor.md#palette)

***

### printableDots?

> `optional` **printableDots?**: `number`

DK-only flat geometry. PT-* entries populate `geometry` instead.

***

### printMargins?

> `optional` **printMargins?**: `object`

Insets (mm) inside the media bounds where the printer may clip a
design (paper-feed tolerance, head edges, die-cut slack).

Informational — for label designers and previews. Drivers do not
enforce these; protocol-level margins (head pin offsets, head-dot
fitting) are handled separately by family-specific fields.

When present, all four edges are required (pass `0` where there is
no margin). Omit the whole field when the entire media area is
safe to design within.

#### bottomMm

> `readonly` **bottomMm**: `number`

#### leftMm

> `readonly` **leftMm**: `number`

#### rightMm

> `readonly` **rightMm**: `number`

#### topMm

> `readonly` **topMm**: `number`

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`printMargins`](MediaDescriptor.md#printmargins)

***

### rightMarginPins?

> `optional` **rightMarginPins?**: `number`

***

### skus?

> `optional` **skus?**: readonly `string`[]

Vendor SKUs for this media — e.g. Dymo `'30321'` / `'S0722400'`,
Brother `'DK-22251'`. Mixed formats allowed; the registry does no
validation. Used by docs (per-device "supported media" table) and
by UI consumers that let users search by SKU.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`skus`](MediaDescriptor.md#skus)

***

### tapeSystem

> **tapeSystem**: [`TapeSystem`](../type-aliases/TapeSystem.md)

Tape system this entry belongs to. Drives lookup gating in
`findMediaByDimensions(width, height, engine)` so QL engines never
resolve TZe / HSe entries and vice versa.

***

### targetModels?

> `optional` **targetModels?**: readonly `string`[]

Devices this media is compatible with. Driver-defined string set;
matched against `PrintEngine.mediaCompatibility`. Examples:
`['standard']` (paper roll fits 672-dot heads),
`['4xl', '5xl']` (wide-head only), `['duo']` (D1 cartridges).
Omit = fits every device in the family.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`targetModels`](MediaDescriptor.md#targetmodels)

***

### type

> **type**: [`MediaType`](../type-aliases/MediaType.md)

Media type classification — driver-specific string values.

Common values: `'continuous'`, `'die-cut'`, `'tape'`.
Drivers may define additional values as needed.

#### Overrides

[`MediaDescriptor`](MediaDescriptor.md).[`type`](MediaDescriptor.md#type)

***

### widthMm

> **widthMm**: `number`

Physical width in mm.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`widthMm`](MediaDescriptor.md#widthmm)
