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

### forcedTrailingFeedMm?

> `optional` **forcedTrailingFeedMm?**: `number`

Post-print tape advance the printer (or this driver's encoder)
forces after the printed bitmap, in mm.

Distinct from `printableArea`:
  - `printableArea` describes where the head can't reach during
    the print;
  - `forcedTrailingFeedMm` describes tape eaten *after* the print
    so content clears the cutter / tear bar.

Populated where the suite has a known fixed post-print feed
(cat-printer's `DEFAULT_FEED_LINES`, labelmanager's encoder-side
trailing pad, LabelManager PnP's firmware-enforced advance).
Absent / `0` when the trailing feed is variable (e.g. labelwriter
`ESC E` advances to the next tear bar — distance depends on the
label gap-sensor position) or when the suite has no measurement.

Use `getForcedTrailingFeedMm(engine)` from
`@thermal-label/contracts` to resolve with the zero default.

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

### printableArea?

> `optional` **printableArea?**: `PrintableArea`

Chassis-physical dead zones around the printable rectangle (mm).

Insets the head physically cannot reach — head-to-cutter offsets,
head-vs-tape-width geometry, sensor-window keep-outs. Encoders
use this to crop / shift the bitmap so authored content lands
where the user expects.

Distinct from `MediaDescriptor.printMargins` (per-media
design-tool inset), from `forcedTrailingFeedMm` (post-print tape
advance), and from any wire-protocol "feed margin" command the
firmware enacts on its own (e.g. Brother QL/PT `ESC i d`).

Absent means "not measured" rather than "measured to zero". Use
`getPrintableArea(engine, media?)` from
`@thermal-label/contracts` to resolve a fully-populated value
with the standard zero defaults and per-roll media-tag override
applied.

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
