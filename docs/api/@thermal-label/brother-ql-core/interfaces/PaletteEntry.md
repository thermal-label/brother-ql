[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PaletteEntry

# Interface: PaletteEntry

One ink/foil colour the printer can place on the substrate.

`name` is used as the key in `renderMultiPlaneImage`'s result object and
must be unique within the palette. The literal `'white'` is reserved for
the implicit substrate background and rejected by validation.

## Properties

### name

> `readonly` **name**: `string`

***

### rgb

> `readonly` **rgb**: readonly \[`number`, `number`, `number`\]

RGB tuple in 0..255.
