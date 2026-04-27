[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLMedia

# Interface: BrotherQLMedia

Defined in: [packages/core/src/types.ts:49](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L49)

Brother QL media descriptor.

Extends `MediaDescriptor` with the dots-based geometry the raster
encoder needs. The base `palette` field flips the driver into
multi-plane mode — only DK-22251 declares one in the registry.

## Extends

- [`MediaDescriptor`](MediaDescriptor.md)

## Properties

### cornerRadiusMm?

> `optional` **cornerRadiusMm?**: `number`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:126

Corner radius (mm) of die-cut labels with rounded corners.

Only meaningful for die-cut media. Undefined or `0` = sharp
corners. For round labels, set this to `widthMm / 2` so the
rounded rectangle degenerates to a circle.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`cornerRadiusMm`](MediaDescriptor.md#cornerradiusmm)

***

### defaultOrientation?

> `optional` **defaultOrientation?**: `"horizontal"` \| `"vertical"`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:100

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

Defined in: [packages/core/src/types.ts:56](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L56)

Die-cut masked area in dots (registration windows).

***

### heightMm?

> `optional` **heightMm?**: `number`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:67

Physical height/length in mm.

- Undefined = continuous (variable length; printer cuts to content).
- A number = fixed length (die-cut labels, tape segments).

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`heightMm`](MediaDescriptor.md#heightmm)

***

### id

> **id**: `number`

Defined in: [packages/core/src/types.ts:50](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L50)

Unique identifier within the driver family.

#### Overrides

[`MediaDescriptor`](MediaDescriptor.md).[`id`](MediaDescriptor.md#id)

***

### leftMarginPins

> **leftMarginPins**: `number`

Defined in: [packages/core/src/types.ts:53](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L53)

***

### name

> **name**: `string`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:58

Human-readable name, e.g. `"62mm continuous"` or `"DK-22251"`.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`name`](MediaDescriptor.md#name)

***

### palette?

> `optional` **palette?**: readonly [`PaletteEntry`](PaletteEntry.md)[]

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:86

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

### printAreaDots

> **printAreaDots**: `number`

Defined in: [packages/core/src/types.ts:52](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L52)

***

### printMargins?

> `optional` **printMargins?**: `object`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:113

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

### rightMarginPins

> **rightMarginPins**: `number`

Defined in: [packages/core/src/types.ts:54](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L54)

***

### type

> **type**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [packages/core/src/types.ts:51](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/types.ts#L51)

Media type classification — driver-specific string values.

Common values: `'continuous'`, `'die-cut'`, `'tape'`.
Drivers may define additional values as needed.

#### Overrides

[`MediaDescriptor`](MediaDescriptor.md).[`type`](MediaDescriptor.md#type)

***

### widthMm

> **widthMm**: `number`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/media.d.ts:60

Physical width in mm.

#### Inherited from

[`MediaDescriptor`](MediaDescriptor.md).[`widthMm`](MediaDescriptor.md#widthmm)
