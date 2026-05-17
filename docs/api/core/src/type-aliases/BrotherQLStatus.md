[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / BrotherQLStatus

# Type Alias: BrotherQLStatus

> **BrotherQLStatus** = [`PrinterStatus`](/contracts/api/interfaces/PrinterStatus)

Brother QL status — the plain contract `PrinterStatus`. Brother QL
adds no structural extension: driver-specific diagnostic facts (print
phase, head cooling) ride in the contract-standard `details[]` rows.
