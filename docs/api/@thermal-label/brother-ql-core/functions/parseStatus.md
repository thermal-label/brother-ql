[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / parseStatus

# Function: parseStatus()

> **parseStatus**(`bytes`, `engine?`): [`PrinterStatus`](../interfaces/PrinterStatus.md)

Parse a Brother QL 32-byte status response.

Fields:
  byte 8  — error info 1 (bit mask, see ERROR_INFO_1)
  byte 9  — error info 2 (bit mask, see ERROR_INFO_2)
  byte 10 — media width (mm)
  byte 11 — media type (0x0A continuous, 0x0B die-cut)
  byte 17 — media length (mm), 0 for continuous
  byte 18 — status type (0x02 = error response)
  byte 19 — phase type (0x00 receiving, 0x01 printing)
  byte 22 — notification (0x03 cooling started, 0x04 cooling finished)
  byte 25 — bit 7 set when the loaded roll is two-color (DK-22251);
            clear on single-color rolls. See scripts/STATUS-CAPTURE.md.

`detectedMedia` is resolved against the media registry via
`findMediaByDimensions`.

`details` carries the contracts-standard `StatusDetail[]` diagnostic
rows the harness renders verbatim: the print phase (always present)
and the head-cooling notification (only when the printer reports
one).

## Parameters

### bytes

`Uint8Array`

### engine?

`Pick`\<[`PrintEngine`](../interfaces/PrintEngine.md), `"headDots"` \| `"mediaCompatibility"`\>

## Returns

[`PrinterStatus`](../interfaces/PrinterStatus.md)
