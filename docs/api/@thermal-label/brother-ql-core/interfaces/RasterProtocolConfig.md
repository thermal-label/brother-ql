[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / RasterProtocolConfig

# Interface: RasterProtocolConfig

Per-protocol wire-format constants.

QL and PT raster differ in three numeric constants and one rule —
everything else (status request, raster opcode, PackBits, two-colour
plane encoding) is shared and lives in `encodeRasterJob`. Per the
plan §4.2 / §7, these are protocol-internal and do not leak onto
the device registry.

- `feedMarginDots` — leading/trailing blank tape (`ESC i d`). QL = 35,
  PT = 14. Per `brother_label/devices.py` and Brother's PT raster
  manual; verify against print output during phase 4.
- `invalidateBytes` — leading invalidate sequence. QL is 200 by
  default but the encoder bumps it to 400 when the engine carries
  `capabilities.twoColor`. PT is always 200 (no two-colour PT model
  exists today).
- `highResFlagBit` — bit set in `ESC i K` flags when `highRes`
  is requested. QL uses bit 4 (0x10) for 300x600; PT uses bit 6
  (0x40) for 180x360 / 360x720 (per nbuchwitz/ptouch).
- `duplicateRasterLines` — when `highRes` is on, PT requires each
  raster line to be sent twice. QL's high-res mode does not.

## Properties

### duplicateRasterLines

> **duplicateRasterLines**: `boolean`

***

### feedMarginDots

> **feedMarginDots**: `number`

***

### highResFlagBit

> **highResFlagBit**: `number`

***

### invalidateBytes

> **invalidateBytes**: `number`
