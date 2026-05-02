[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrintEngineCapabilities

# Interface: PrintEngineCapabilities

Engine-level capability flags.

Mirrors `DeviceEntry.capabilities` but for properties of the
printhead / sensor / cutter on this specific engine. Open shape —
drivers extend with family-specific keys via the index signature
without touching the contracts package.

**Promotion rule:** a capability earns a named key here iff (a) it
is implemented by ≥2 active drivers AND (b) at least one registry
consumer (picker, rasterizer, docs badge, runtime UX) actually
branches on it. Today: `mediaDetection` and `autocut`.
Single-vendor (e.g. `twoColor`, `genuineMediaRequired`) lands on
the index signature until a second vendor adopts.

## Extended by

- [`BrotherEngineCapabilities`](BrotherEngineCapabilities.md)

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

***

### mediaDetection?

> `optional` **mediaDetection?**: `boolean`

Whether this engine reports loaded media via `getStatus()`.

What apps do on mismatch is an app-level decision; the contracts
library does not block prints. See `hardwareQuirks` on entries
where the printer's mismatch behaviour is non-obvious (Brother
QL hard-rejects, Dymo 5xx silently misprints).
