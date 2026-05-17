[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / PrinterAdapterMap

# Type Alias: PrinterAdapterMap

> **PrinterAdapterMap** = `Readonly`\<`Record`\<`string`, [`PrinterAdapter`](../../brother-ql-core/interfaces/PrinterAdapter.md)\>\>

Map from engine role → PrinterAdapter for a connected device.

Single-engine drivers populate a 1-key record keyed by the engine's
`role` (typically `'primary'`). Multi-engine drivers (LW Duo:
`label` + `tape`) populate one entry per drivable engine. Returned
by each driver-web's `requestPrinters()` factory; the harness shell
reads `printers[selectedRole]` to drive the active section.
