[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / BrotherEngineCapabilities

# Interface: BrotherEngineCapabilities

Brother-specific engine capabilities.

Extends the contracts-defined `PrintEngineCapabilities` (which
carries the multi-vendor named flags `autocut` and `mediaDetection`)
with the driver-side `twoColor` flag — Brother-only today, so it
lands here via the contracts open index signature. Promote to a
named contracts key when a second vendor implements the same
capability with compatible semantics.

## Extends

- [`PrintEngineCapabilities`](/contracts/api/interfaces/PrintEngineCapabilities)

## Indexable

> \[`k`: `string`\]: `unknown`

Driver-specific capability keys land here. Examples today:
`twoColor` (Brother-only, two-colour ribbon path) and
`genuineMediaRequired` (Dymo-only). Promote to a named key when
a second active driver implements with compatible semantics.

## Properties

### highResDpi?

> `optional` **highResDpi?**: `360` \| `720`

Doubled-density mode along the feed axis (`ESC i K` bit 6).
`360` on PT-E550W / PT-P750W (native 180); `720` on the PT-P900
family (native 360). Undefined on QL and PT models that don't
support high-res. The encoder branches on this when
`BrotherQLPrintOptions.highRes` is set.

***

### twoColor?

> `optional` **twoColor?**: `boolean`

Two-colour ribbon path — black + red plane raster encoding.
