[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLStatus

# Type Alias: BrotherQLStatus

> **BrotherQLStatus** = [`PrinterStatus`](../interfaces/PrinterStatus.md)

Brother QL status — the plain contract `PrinterStatus`. Brother QL
adds no structural extension: driver-specific diagnostic facts (print
phase, head cooling) ride in the contract-standard `details[]` rows.
