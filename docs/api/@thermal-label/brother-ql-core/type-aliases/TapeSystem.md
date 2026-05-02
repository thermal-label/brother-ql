[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / TapeSystem

# Type Alias: TapeSystem

> **TapeSystem** = `"dk"` \| `"tze"` \| `"hse-2to1"` \| `"hse-3to1"`

Tape-system discriminator on `BrotherQLMedia`. DK is the QL series'
paper-label system; TZe is the laminated-tape system used by the
PT-P / PT-E line; HSe 2:1 and HSe 3:1 are heat-shrink tubing systems
supported by most P900-series and PT-E550W. Lookup paths gate on
this so a QL printer never resolves a TZe entry, and vice versa.
