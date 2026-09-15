[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / statusFromPrinterMib

# Function: statusFromPrinterMib()

> **statusFromPrinterMib**(`input`, `engine?`): [`PrinterStatus`](/contracts/api/interfaces/PrinterStatus)

Map Printer-MIB values onto the driver's status. `ready` requires
an idle or printing state and no error bits. Two-colour rolls are
invisible on every network surface (DK-22251 reads as 62 mm
continuous), so the single-colour sibling is resolved and a `warn`
row says so.

## Parameters

### input

[`PrinterMibStatus`](../interfaces/PrinterMibStatus.md)

### engine?

`Pick`\<[`PrintEngine`](/contracts/api/interfaces/PrintEngine), `"headDots"` \| `"mediaCompatibility"`\>

## Returns

[`PrinterStatus`](/contracts/api/interfaces/PrinterStatus)
