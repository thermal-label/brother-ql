[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / MediaDescriptor

# Interface: MediaDescriptor

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:54

Base media descriptor.

Each driver extends this with family-specific fields (print area dots,
margins, head geometry, etc.). Structural typing means any superset
passes cleanly to `PrinterAdapter` methods.

## Examples

```ts
// Brother QL continuous tape (single-colour)
const m: MediaDescriptor = {
  id: 259,
  name: '62mm continuous',
  widthMm: 62,
  type: 'continuous',
};
```

```ts
// Brother QL two-colour tape (DK-22251)
const m: MediaDescriptor = {
  id: 251,
  name: 'DK-22251 62mm',
  widthMm: 62,
  type: 'continuous',
  palette: [
    { name: 'black', rgb: [0, 0, 0] },
    { name: 'red', rgb: [255, 0, 0] },
  ],
};
```

```ts
// Die-cut address label (auto-rotates landscape input)
const m: MediaDescriptor = {
  id: 274,
  name: '62×29mm',
  widthMm: 62,
  heightMm: 29,
  type: 'die-cut',
  defaultOrientation: 'horizontal',
  cornerRadiusMm: 3,
};
```

```ts
// Round die-cut label
const m: MediaDescriptor = {
  id: 363,
  name: '24mm Ø',
  widthMm: 24,
  heightMm: 24,
  type: 'die-cut',
  cornerRadiusMm: 12, // widthMm / 2
};
```

## Extended by

- [`BrotherQLMedia`](BrotherQLMedia.md)

## Properties

### cornerRadiusMm?

> `optional` **cornerRadiusMm?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:126

Corner radius (mm) of die-cut labels with rounded corners.

Only meaningful for die-cut media. Undefined or `0` = sharp
corners. For round labels, set this to `widthMm / 2` so the
rounded rectangle degenerates to a circle.

---

### defaultOrientation?

> `optional` **defaultOrientation?**: `"horizontal"` \| `"vertical"`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:100

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

---

### heightMm?

> `optional` **heightMm?**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:67

Physical height/length in mm.

- Undefined = continuous (variable length; printer cuts to content).
- A number = fixed length (die-cut labels, tape segments).

---

### id

> **id**: `string` \| `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:56

Unique identifier within the driver family.

---

### name

> **name**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:58

Human-readable name, e.g. `"62mm continuous"` or `"DK-22251"`.

---

### palette?

> `optional` **palette?**: readonly [`PaletteEntry`](PaletteEntry.md)[]

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:86

Inks this media supports, beyond the implicit white substrate.

- Undefined = single-colour black-on-white. Driver renders via
  `renderImage` (luminance threshold + optional dither).
- Defined = multi-plane media. Driver renders via
  `renderMultiPlaneImage` with this palette.

For DK-22251 (the only multi-ink media we ship today):
`[{ name: 'black', rgb: [0, 0, 0] }, { name: 'red', rgb: [255, 0, 0] }]`

---

### printMargins?

> `optional` **printMargins?**: `object`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:113

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

---

### type

> **type**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:74

Media type classification — driver-specific string values.

Common values: `'continuous'`, `'die-cut'`, `'tape'`.
Drivers may define additional values as needed.

---

### widthMm

> **widthMm**: `number`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/media.d.ts:60

Physical width in mm.
