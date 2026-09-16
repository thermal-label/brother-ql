[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / PrinterMibStatus

# Interface: PrinterMibStatus

Values read from the standard Printer-MIB / Host-Resources-MIB
(RFC 3805 / RFC 2790) of a network print server. Port 9100 carries
no status, so this is the only status source on TCP; see plan 17.

## Properties

### dimUnit?

> `optional` **dimUnit?**: `number`

prtInputDimUnit: 3 = ten-thousandths of an inch, 4 = micrometres.

***

### errorState

> **errorState**: `Uint8Array`

hrPrinterDetectedErrorState: 0–2 octets, bit 0 = MSB of octet 0.

***

### feedDir?

> `optional` **feedDir?**: `number`

prtInputMediaDimFeedDir (length) / XFeedDir (width) in `dimUnit`; negative = unknown.

***

### mediaName

> **mediaName**: `string`

prtInputMediaName, e.g. `29mm x 90mm / 1.1" x 3.5"` or `62mm / 2.4"`.

***

### printerStatus

> **printerStatus**: `number`

hrPrinterStatus: 1 other, 2 unknown, 3 idle, 4 printing, 5 warmup.

***

### xFeedDir?

> `optional` **xFeedDir?**: `number`
