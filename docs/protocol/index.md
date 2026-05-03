# Wire Protocols

This driver implements two closely related Brother raster protocols. The
device's `engine.protocol` field selects which one applies.

## [`ql-raster`](./ql) — Brother QL family

The DK-tape QL series (QL-500 through QL-1115NWB), including the
two-colour QL-800 / QL-810W / QL-820NWB models. 720-pin and 1296-pin
heads, DK continuous and die-cut media. See
[QL raster protocol](./ql) for the full reference.

## [`pt-raster`](./pt) — Brother PT-P / PT-E family

The PC-connectable P-touch lineup (PT-E550W, PT-P750W, PT-P900,
PT-P900W, PT-P950NW, PT-P910BT). 128-pin or 560-pin heads, TZe
laminated tape and HSe heat-shrink tubing. Same outer command shape as
QL, with a smaller feed margin, a different high-resolution flag bit,
and per-line raster duplication in high-res mode. See
[PT raster protocol](./pt) for the deltas.

## Shared building blocks

Both protocols use:

- The same status request (`1B 69 53` / `ESC i S`) and 32-byte response
  layout.
- The same `0x67` single-plane raster row opcode and (for two-colour
  QL only) `0x77` dual-plane opcode.
- The same TIFF/PackBits compression scheme.
- The same end-of-job rule: `0x0C` between pages, `0x1A` after the last.

The encoder lives in `packages/core/src/protocol.ts`. Per-protocol
constants (`feedMarginDots`, `invalidateBytes`, `highResFlagBit`,
`duplicateRasterLines`) live in `QL_PROTOCOL_CONFIG` and
`PT_PROTOCOL_CONFIG` at the top of that file.
