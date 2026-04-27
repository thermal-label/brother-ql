[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PreviewPlane

# Interface: PreviewPlane

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/preview.d.ts:31

A single colour plane in a preview.

Single-colour drivers return exactly one plane. Two-colour drivers
return one plane per colour the printer physically produces.

## Properties

### bitmap

> **bitmap**: [`LabelBitmap`](LabelBitmap.md)

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/preview.d.ts:35

The 1bpp bitmap for this plane.

---

### displayColor

> **displayColor**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/preview.d.ts:44

CSS colour to display this plane in the preview UI, e.g.
`'#000000'` for black or `'#ff0000'` for red.

The consuming app renders each plane in its own colour and
composites them — it does not need to know how the driver split
the colours.

---

### name

> **name**: `string`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/preview.d.ts:33

Plane name, e.g. `'black'` or `'red'`.
