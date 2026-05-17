[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrinterStatus

# Interface: PrinterStatus

Runtime status of a printer.

Returned by `PrinterAdapter.getStatus()` and used to drive media
auto-detection in subsequent `print()` / `createPreview()` calls.

## Properties

### battery?

> `optional` **battery?**: `BatteryStatus`

Battery state, when the device has a battery and reports it.

Undefined for AC/USB-powered devices (LabelWriter, brother-ql,
LabelManager) — only battery-bearing drivers that expose battery
telemetry, such as the niimbot-class portable printers, populate
it. See BatteryStatus.

***

### details?

> `optional` **details?**: readonly `StatusDetail`[]

Driver-formatted diagnostic rows decoded from the protocol status.

Optional and additive — drivers that decode nothing beyond
`ready` / `mediaLoaded` / `errors` leave it undefined. Each row is
a pre-formatted `{label, value}` pair the consumer renders
verbatim; the driver owns all formatting (see StatusDetail).

***

### detectedMedia?

> `optional` **detectedMedia?**: [`MediaDescriptor`](MediaDescriptor.md)

Detected media descriptor, if the printer supports detection.

Undefined if the printer cannot detect media (e.g. LabelWriter 450,
LabelManager) or no status has been queried yet.

When present, this is what `PrinterAdapter.print()` and
`PrinterAdapter.createPreview()` use as the default when no explicit
media is provided.

***

### errors

> **errors**: [`PrinterError`](PrinterError.md)[]

Structured error list. Empty array = no errors.

Use `PrinterError.code` for programmatic branching and
`PrinterError.message` for display.

***

### mediaLoaded

> **mediaLoaded**: `boolean`

Media is loaded (only meaningful if the printer supports detection).

***

### rawBytes

> **rawBytes**: `Uint8Array`

Raw status bytes from the printer.

Exposed for diagnostics and debugging — higher-level fields on this
interface should be preferred for normal use.

***

### ready

> **ready**: `boolean`

Printer is ready to accept a print job.
