# PT Raster Protocol

This page documents the raster print protocol of Brother's PC-connectable
**PT-P / PT-E** P-touch lineup (`engine.protocol === 'pt-raster'`). The
overall command set is the same family as [QL raster](./ql) — same status
request, same `G` raster opcode, same PackBits compression — with a small
set of constants and one rule that differ. Read the QL page first if you
haven't; this page focuses on the deltas.

::: warning Scope
"PT" here means the PC-connectable PT-P / PT-E lineup that Brother
publishes the *Raster Command Reference* PDFs for. The handheld P-touch
line (PT-D210, PT-H110, PT-1010, etc.) uses a different ESC/P-style
command set and is **not** covered by this driver.
:::

::: tip Related pages
- [QL raster protocol](./ql) — the canonical raster reference.
- [Protocol overview](./) — index of all protocols implemented here.
- [Core](../core) — the TypeScript API.
:::

## Models and engines

Six PC-connectable models, in two head-pin families:

| Model      | USB PID | Head dots | Native DPI | High-res DPI | Two-colour |
| ---------- | ------- | --------- | ---------- | ------------ | ---------- |
| PT-E550W   | `0x2060` | 128 | 180 | 360 | — |
| PT-P750W   | `0x2062` | 128 | 180 | 360 | — |
| PT-P900    | `0x2083` | 560 | 360 | 720 | — |
| PT-P900W   | `0x2085` | 560 | 360 | 720 | — |
| PT-P950NW  | `0x2086` | 560 | 360 | 720 | — |
| PT-P910BT  | `0x20C7` | 560 | 360 | 720 | — |

PIDs sourced from
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch/blob/main/src/ptouch/printers.py),
which transcribes Brother's official *Raster Command Reference* PDFs
(`cv_pte550wp750wp710bt_eng_raster_102.pdf` for the 128-pin family,
`cv_ptp900_eng_raster_102.pdf` for the 560-pin family). PT-P750W has a
mass-storage sibling PID `0x2065` (PLite mode); the other five models'
mass-storage siblings are not in any public source.

The 128-pin and 560-pin heads use **different per-tape pin layouts** for
the same TZe / HSe width — the registry stores both via
`media.geometry.{narrow, wide}` and the encoder picks the right one from
`engine.headDots`.

## USB topology

Same shape as QL: composite device with a Printer-class interface
(`bInterfaceClass 0x07`), bulk OUT for print data, bulk IN for status
responses. Claim the printer interface directly via `libusb` or WebUSB.
Brother VID is `0x04F9`. Unlike QL there is no `editorLite` mode (the
PT-P750W's `0x2065` PLite is a USB-mode mode-switch quirk handled at
discovery time, not a printer-side feature).

## Status

Identical to QL. Send `1B 69 53` (`ESC i S`) to the OUT endpoint; the
printer replies with 32 bytes on the IN endpoint. Bytes 0–3 are fixed
(`0x80 0x20 'B' '0'`), byte 4 is the model identifier, bytes 10/11 carry
media width and type, byte 18 is `0x00` for a normal reply or `0x02` for
an error. See [QL § Status communication](./ql#status-communication) for
the full byte table — the layout is the same.

## Print job structure

Same outer shape as QL — preamble (raster mode → invalidate → init), then
per page: status request → print info → various mode → cut each →
expanded mode → margin → raster rows → print command. The deltas:

### Invalidate length — always 200 bytes

QL bumps the invalidate to 400 bytes for two-colour engines. PT has no
two-colour models, so the encoder keeps it at 200 unconditionally.

### Feed margin — 14 dots (vs QL's 35)

Sourced from the Python `brother_label` project (`devices.py:122`). Set
in the per-page `1B 69 64 [n1] [n2]` margin command. In high-res mode
the margin is **doubled** to 28 dots.

### Expanded mode bit 6 — high resolution

QL uses `ESC i K` bit 4 (`0x10`) to enable high-res printing (300 × 600
DPI on the feed axis). PT uses **bit 6** (`0x40`) instead. The bit is
gated by `BrotherQLPrintOptions.highRes`; the encoder requires the
engine to declare `capabilities.highResDpi` (one of `360` or `720`).

### High-res raster line duplication

In high-res mode each raster line **must be sent twice**:

```
emitRasterLine(line);
if (highRes) emitRasterLine(line);
```

Sourced from
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch). QL's high-res
mode does not duplicate lines — this is a PT-specific quirk. The feed
margin is also doubled in high-res mode (see above).

### Raster rows

Same opcode (`G`, `0x67`), same per-row `len` byte, same PackBits
encoding when compression is enabled. The byte count per row is
`engine.headDots / 8` — `16` bytes for the 128-pin family, `70` for the
560-pin family. The raster row must cover the full head width; content
is placed at `geometry.leftMarginPins` bit offset, with unused dots
zeroed.

PT does **not** use the two-colour `0x77` row opcode — there are no
two-colour PT models today. All PT raster rows use the `0x67` single-plane
opcode.

### Print command

Identical to QL: `0x0C` between pages, `0x1A` at end of job. Always end
the last page with `0x1A`.

## Cutter quirks

### PT-E550W requires compression for autocut

The PT-E550W silently fails to cut when compression is disabled — its
firmware ties the cutter trigger to the end-of-compressed-page marker.
Documented in
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch) as:

> Note: E550W requires compression ON for cutting to work.

The encoder enforces this with a per-name guard:

```ts
if (deviceName === 'PT-E550W' && autoCut && !compress) {
  throw new Error(
    'PT-E550W requires compression to be enabled when autocut is on',
  );
}
```

This is implemented as a per-device-name guard rather than a registry
capability because no other PT model shares the constraint (the P900
family explicitly defaults compression *off*).

## Tape system

PT prints on **TZe** (laminated tape, 3.5–36 mm) and, on most P900-series
models and the PT-E550W, **HSe** heat-shrink tubing in 2:1 and 3:1 ratios.
PT-P910BT does **not** support HSe — TZe only.

Per-model tape support and pin geometry per width are documented in
[Hardware](../hardware). The lookup helper resolves a `(widthMm, engine)`
to the right registry row, picking `geometry.narrow` for 128-pin heads
and `geometry.wide` for 560-pin heads.

## TCP and Bluetooth

Brother spec sheets advertise raw 9100 TCP on PT-P750W, PT-P900W,
PT-P950NW, and PT-E550W. The protocol is identical to USB.

PT-P910BT uses Bluetooth as its primary transport. Today this driver
declares `bluetooth-spp` (classic Bluetooth Serial Port Profile) for it
— the same shape as QL-820NWBc. If hardware verification turns up BLE
GATT instead, the transport key changes (and the missing Node BLE
adapter would need to be supplied).

## WebUSB

Identical wire format to USB; the browser package opens the
Printer-class interface, `transferOut` for the encoded job, `transferIn`
for the 32-byte status reply. WebUSB requires HTTPS or `localhost` and
is supported in Chrome 89+ and Edge 89+. Firefox and Safari do not
implement WebUSB.

## References

- [`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch) — active
  LGPL-2.1 driver; primary reference for PIDs, tape pin
  configurations, and cutter quirks.
- [`hannesweisbach/ptouch-print`](https://github.com/hannesweisbach/ptouch-print)
  — older C driver; secondary cross-reference, especially for the
  PT-P750W PLite-vs-printer PID disagreement.
- *Brother Raster Command Reference Manual* —
  `cv_pte550wp750wp710bt_eng_raster_102.pdf` (128-pin family, §2.3
  "Print Area" on p. 20) and `cv_ptp900_eng_raster_102.pdf` (560-pin
  family, §2.3.5 on pp. 23–24). Vendor documents; cited inline, not
  redistributed.
- Implementation in this driver:
  - `packages/core/src/protocol.ts` — encoder
    (`PT_PROTOCOL_CONFIG` and the shared `encodeRasterJob`).
  - `packages/core/src/devices.generated.ts` — PT model registry
    (head sizes, capabilities, mass-storage PIDs).
