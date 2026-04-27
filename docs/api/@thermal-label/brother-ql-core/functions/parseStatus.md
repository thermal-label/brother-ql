[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / parseStatus

# Function: parseStatus()

> **parseStatus**(`bytes`): [`BrotherQLStatus`](../interfaces/BrotherQLStatus.md)

Defined in: [packages/core/src/status.ts:48](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/status.ts#L48)

Parse a Brother QL 32-byte status response.

Fields:
  byte 8  — error info 1 (bit mask, see ERROR_INFO_1)
  byte 9  — error info 2 (bit mask, see ERROR_INFO_2)
  byte 10 — media width (mm)
  byte 11 — media type (0x0A continuous, 0x0B die-cut)
  byte 17 — media length (mm), 0 for continuous
  byte 18 — status type (0x02 = error response)

`detectedMedia` is resolved against the media registry via
`findMediaByDimensions`. `editorLiteMode` is a driver-specific
extension on `BrotherQLStatus` — the status-type byte doesn't
actually report it, but keeping the field here means callers can
set it from other signals (e.g. mass-storage PID detected during
discovery) without changing the return type.

## Parameters

### bytes

`Uint8Array`

## Returns

[`BrotherQLStatus`](../interfaces/BrotherQLStatus.md)
