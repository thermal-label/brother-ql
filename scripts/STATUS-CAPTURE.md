# Status byte capture — raw dump database

Goal: collect a raw 32-byte status response for every known roll so we can reverse-engineer which bytes encode tape color, type, and size — enabling full auto-detection in `detectMedia()`.

## How to capture a roll

> **Before running:** stop the daemons that claim the USB interface:
> ```bash
> sudo systemctl stop ipp-usb && sudo rmmod usblp
> ```
> After you're done with all captures, restart them:
> ```bash
> sudo systemctl start ipp-usb
> ```

Run the capture script with the DK product code as the label:

```bash
node scripts/dump-status.mjs DK-22205
```

Swap roll, run again:

```bash
node scripts/dump-status.mjs DK-11201
```

The script sends the standard raster-mode preamble, issues a status request (`1B 69 53`), and reads the 32-byte response. It also tries the undocumented "additional media information" command (`1B 69 55 77 01`) but this firmware (QL-820NWBc) does not respond to it.

## Byte map

| Byte | Field              | Notes                                        |
|-----:|--------------------|----------------------------------------------|
|    0 | Print head mark    | Always `0x80` — use to validate response     |
|    1 | Size               | Always `0x20` (32)                           |
|  2–7 | Fixed / model      | Bytes 3–4 encode model; byte 6 = country     |
|    8 | Error info 1       | Bit flags — see protocol.md                  |
|    9 | Error info 2       | Bit flags — see protocol.md                  |
|   10 | **Media width mm** | e.g. `0x3E` = 62 mm                          |
|   11 | **Media type**     | `0x0A` continuous · `0x0B` die-cut           |
|   14 | **byte14**         | Unknown — changes between roll types         |
|   15 | Mode               | Unknown                                      |
|   17 | **Media length mm**| `0x00` for continuous · actual mm for die-cut|
|   18 | Status type        | `0x00` = reply · `0x02` = error              |
|   19 | Phase type         |                                              |
| 20–21| Phase number       | Big-endian                                   |
|   25 | **byte25**         | Unknown — bit 7 may be two-color flag        |

> **Note:** our `parseStatus` currently reads status type from byte **14** (wrong) and ignores byte **17** (media length). Both need to be fixed.

## Captured rolls

### DK-22251 — 62mm continuous two-color (black + red on white)
Captured: 2026-04-23 · Printer: QL-820NWBc (PID `0x209d`)

```
[00] 0x80  [01] 0x20  [02] 0x42  [03] 0x34  [04] 0x41
[05] 0x30  [06] 0x04  [07] 0x00
[08] 0x00  [09] 0x00                          ← no errors
[10] 0x3E  ← 62 mm
[11] 0x0A  ← continuous
[12] 0x00  [13] 0x00
[14] 0x23  ← ??
[15] 0x00  [16] 0x00
[17] 0x00  ← length 0 (continuous)
[18] 0x00  [19] 0x00  [20] 0x00  [21] 0x00  [22] 0x00
[23] 0x00  [24] 0x00
[25] 0x81  ← bit 7 set — two-color candidate?
[26–31] 0x00
```

### DK-11201 — 29×90mm die-cut (black on white)
Captured: 2026-04-23 · Printer: QL-820NWBc (PID `0x209d`)

```
[00] 0x80  [01] 0x20  [02] 0x42  [03] 0x34  [04] 0x41
[05] 0x30  [06] 0x04  [07] 0x00
[08] 0x00  [09] 0x00                          ← no errors
[10] 0x1D  ← 29 mm
[11] 0x0B  ← die-cut
[12] 0x00  [13] 0x00
[14] 0x01  ← ??
[15] 0x00  [16] 0x00
[17] 0x5A  ← length 90 mm
[18] 0x00  [19] 0x00  [20] 0x00  [21] 0x00  [22] 0x00
[23] 0x00  [24] 0x00
[25] 0x01  ← bit 7 clear — single-color
[26–31] 0x00
```

### DK-22205 — 62mm continuous (black on white)
Captured: 2026-05-01 · Printer: QL-820NWBc (PID `0x209d`)

Disambiguating capture: same width and media type as DK-22251, differing only
in color capability. Byte 25 bit 7 clear here (vs set on DK-22251) confirms
bit 7 is the two-color flag, not a co-varying width/type artefact.

```
[00] 0x80  [01] 0x20  [02] 0x42  [03] 0x34  [04] 0x41
[05] 0x30  [06] 0x04  [07] 0x00
[08] 0x00  [09] 0x00                          ← no errors
[10] 0x3E  ← 62 mm
[11] 0x0A  ← continuous
[12] 0x00  [13] 0x00
[14] 0x15  ← ??
[15] 0x00  [16] 0x00
[17] 0x00  ← length 0 (continuous)
[18] 0x00  [19] 0x00  [20] 0x00  [21] 0x00  [22] 0x00
[23] 0x00  [24] 0x00
[25] 0x01  ← bit 7 clear — single-color
[26–31] 0x00
```

### DK-22214 — 12mm continuous (black on white)
Captured: 2026-05-01 · Printer: QL-820NWBc (PID `0x209d`)

Bonus capture — extends the byte-14 sample set.

```
[00] 0x80  [01] 0x20  [02] 0x42  [03] 0x34  [04] 0x41
[05] 0x30  [06] 0x04  [07] 0x00
[08] 0x00  [09] 0x00                          ← no errors
[10] 0x0C  ← 12 mm
[11] 0x0A  ← continuous
[12] 0x00  [13] 0x00
[14] 0x1A  ← ??
[15] 0x00  [16] 0x00
[17] 0x00  ← length 0 (continuous)
[18] 0x00  [19] 0x00  [20] 0x00  [21] 0x00  [22] 0x00
[23] 0x00  [24] 0x00
[25] 0x01  ← bit 7 clear — single-color
[26–31] 0x00
```

## Diff — what changed across captures

| Byte | DK-22251           | DK-22205           | DK-22214           | DK-11201           | Conclusion                          |
|-----:|:------------------:|:------------------:|:------------------:|:------------------:|-------------------------------------|
|   10 | `0x3E` (62)        | `0x3E` (62)        | `0x0C` (12)        | `0x1D` (29)        | Media width mm — confirmed          |
|   11 | `0x0A`             | `0x0A`             | `0x0A`             | `0x0B`             | Continuous vs die-cut — confirmed   |
|   14 | `0x23` (35)        | `0x15` (21)        | `0x1A` (26)        | `0x01` (1)         | Per-SKU code — meaning unknown      |
|   17 | `0x00` (0)         | `0x00` (0)         | `0x00` (0)         | `0x5A` (90)        | Media length mm — confirmed         |
|   25 | `0x81` (10000001)  | `0x01` (00000001)  | `0x01` (00000001)  | `0x01` (00000001)  | **Bit 7 = two-color flag — confirmed** |

Bit 7 of byte 25 splits cleanly: set on the only two-color roll, clear on
three single-color rolls spanning two widths and both media types. Bit 0
is set in all four captures (some always-on bit, ignore).

## What we still need

The byte-25 two-color hypothesis is confirmed; no more captures are
required for the bicolor-detection fix. Captures below remain
nice-to-have for filling in byte-14 (per-SKU code, currently
unexplained) and byte-17 cross-checks:

| Roll       | Why useful                                                         |
|------------|--------------------------------------------------------------------|
| DK-22210   | 29mm continuous — another byte [14] data point                     |
| DK-11202   | 62×100mm die-cut — confirms byte [17] for a longer die-cut         |
| DK-11204   | 17×54mm die-cut — smallest die-cut, confirms byte [17] = 54        |

## Known issues in parseStatus (to fix)

1. **Status type is at byte [18], not byte [14]** — our code reads `bytes[14]` as status type but that byte is unknown/media-type-specific. Real status type is at `bytes[18]`.
2. **Byte [17] (media length) is not parsed** — needed for die-cut auto-detection.
3. ~~**Byte [25] may encode two-color**~~ — confirmed (bit 7) by DK-22205 capture on 2026-05-01; fix tracked in `plans/backlog/fix-bicolor-detection.md`.
