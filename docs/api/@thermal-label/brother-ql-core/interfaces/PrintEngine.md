[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrintEngine

# Interface: PrintEngine

A print engine — one printhead with one protocol.

Most devices have a single engine. The LabelWriter Duo has two
(label + tape) with different protocols and different USB
interfaces. The Twin Turbo also has two (left + right) sharing one
transport with in-band protocol-level addressing.

## Properties

### bind?

> `optional` **bind?**: `EngineBind`

Per-engine routing hints. Omit on single-engine devices.
See `EngineBind` for transport-layer vs protocol-layer routing.

***

### capabilities?

> `optional` **capabilities?**: [`PrintEngineCapabilities`](PrintEngineCapabilities.md)

Engine-level capability flags. See `PrintEngineCapabilities`.

***

### dpi

> **dpi**: `number`

***

### headDots

> **headDots**: `number`

Native dot count across the head.

***

### mediaCompatibility?

> `optional` **mediaCompatibility?**: readonly `string`[]

Filter for which entries from the driver's media registry this
engine accepts. Resolved against `MediaDescriptor.targetModels`.
Driver-defined string set; `undefined` = engine accepts every
media in the driver's registry.

***

### protocol

> **protocol**: `string`

Driver-family-specific wire-protocol tag.

***

### role

> **role**: `string`

Semantic role identifier — used as the lookup key on the runtime
adapter (`printer.engines[role]`). For single-engine devices:
`'primary'`. For composite devices: descriptive (`'label'`,
`'tape'`, `'left'`, `'right'`).
