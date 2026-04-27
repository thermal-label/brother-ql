[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrinterStatus

# Interface: PrinterStatus

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:44

Runtime status of a printer.

Returned by `PrinterAdapter.getStatus()` and used to drive media
auto-detection in subsequent `print()` / `createPreview()` calls.

## Extended by

- [`BrotherQLStatus`](BrotherQLStatus.md)

## Properties

### detectedMedia?

> `optional` **detectedMedia?**: [`MediaDescriptor`](MediaDescriptor.md)

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:59

Detected media descriptor, if the printer supports detection.

Undefined if the printer cannot detect media (e.g. LabelWriter 450,
LabelManager) or no status has been queried yet.

When present, this is what `PrinterAdapter.print()` and
`PrinterAdapter.createPreview()` use as the default when no explicit
media is provided.

***

### errors

> **errors**: [`PrinterError`](PrinterError.md)[]

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:66

Structured error list. Empty array = no errors.

Use `PrinterError.code` for programmatic branching and
`PrinterError.message` for display.

***

### mediaLoaded

> **mediaLoaded**: `boolean`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:48

Media is loaded (only meaningful if the printer supports detection).

***

### rawBytes

> **rawBytes**: `Uint8Array`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:73

Raw status bytes from the printer.

Exposed for diagnostics and debugging — higher-level fields on this
interface should be preferred for normal use.

***

### ready

> **ready**: `boolean`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:46

Printer is ready to accept a print job.
