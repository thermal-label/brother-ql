[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PaletteEntry

# Interface: PaletteEntry

Defined in: node_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node_modules/@mbtech-nl/bitmap/dist/types.d.ts:91

One ink/foil colour the printer can place on the substrate.

`name` is used as the key in `renderMultiPlaneImage`'s result object and
must be unique within the palette. The literal `'white'` is reserved for
the implicit substrate background and rejected by validation.

## Properties

### name

> `readonly` **name**: `string`

Defined in: node_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node_modules/@mbtech-nl/bitmap/dist/types.d.ts:92

---

### rgb

> `readonly` **rgb**: readonly \[`number`, `number`, `number`\]

Defined in: node_modules/.pnpm/@mbtech-nl+bitmap@1.2.1/node_modules/@mbtech-nl/bitmap/dist/types.d.ts:94

RGB tuple in 0..255.
