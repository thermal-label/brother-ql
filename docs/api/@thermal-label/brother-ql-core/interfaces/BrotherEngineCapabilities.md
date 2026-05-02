[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherEngineCapabilities

# Interface: BrotherEngineCapabilities

Brother-specific engine capabilities.

Extends the contracts-defined `PrintEngineCapabilities` (which
carries the multi-vendor named flags `autocut` and `mediaDetection`)
with the driver-side `twoColor` flag — Brother-only today, so it
lands here via the contracts open index signature. Promote to a
named contracts key when a second vendor implements the same
capability with compatible semantics.

## Extends

- [`PrintEngineCapabilities`](PrintEngineCapabilities.md)

## Indexable

> \[`k`: `string`\]: `unknown`

Driver-specific capability keys land here. Examples today:
`twoColor` (Brother-only, two-colour ribbon path) and
`genuineMediaRequired` (Dymo-only). Promote to a named key when
a second active driver implements with compatible semantics.

## Properties

### autocut?

> `optional` **autocut?**: `boolean`

Auto-cutter on this engine's paper path.

#### Inherited from

[`PrintEngineCapabilities`](PrintEngineCapabilities.md).[`autocut`](PrintEngineCapabilities.md#autocut)

***

### highResDpi?

> `optional` **highResDpi?**: `720` \| `360`

Doubled-density mode along the feed axis (`ESC i K` bit 6).
`360` on PT-E550W / PT-P750W (native 180); `720` on the PT-P900
family (native 360). Undefined on QL and PT models that don't
support high-res. The encoder branches on this when
`BrotherQLPrintOptions.highRes` is set.

***

### mediaDetection?

> `optional` **mediaDetection?**: `boolean`

Whether this engine reports loaded media via `getStatus()`.

What apps do on mismatch is an app-level decision; the contracts
library does not block prints. See `hardwareQuirks` on entries
where the printer's mismatch behaviour is non-obvious (Brother
QL hard-rejects, Dymo 5xx silently misprints).

#### Inherited from

[`PrintEngineCapabilities`](PrintEngineCapabilities.md).[`mediaDetection`](PrintEngineCapabilities.md#mediadetection)

***

### twoColor?

> `optional` **twoColor?**: `boolean`

Two-colour ribbon path — black + red plane raster encoding.
