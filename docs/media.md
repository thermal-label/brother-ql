# Brother QL — Spool Switch (CAS) Pin Map

> Source: QL-1060N Service Manual (pages II-15 / II-16), cross-referenced with
> QL-800 and QL-series Raster Command References, and confirmed via hardware
> probing on a QL-800 with DK-22251.

## DK code naming convention

- **DK-1xxxx** — Die-cut labels
- **DK-2xxxx** — Continuous tape
- **DK-4xxxx** — Removable adhesive continuous tape
- **DK-Nxxxx** — Non-adhesive tape

The last three digits of the DK code appear on the physical roll as the "roll marking"
(e.g., DK-22**251** → "251"). This does **not** correspond to the media ID used in the
raster protocol.

## Complete switch table

Bits column is `[SW5][SW4][SW3][SW2][SW1][SW0]` — the binary value equals the SW number.

| SW  | Media ID | Pins                            | Media type                    | Size             | DK code      | Material          | Notes                                                      | Bits     |
| --- | -------- | ------------------------------- | ----------------------------- | ---------------- | ------------ | ----------------- | ---------------------------------------------------------- | -------- |
| 0   | —        | ![](/brother-ql/pins/sw-00.svg) | No media                      | —                | —            | —                 |                                                            | `000000` |
| 1   | 271      | ![](/brother-ql/pins/sw-01.svg) | Standard Address Label        | 29×90mm          | DK-11201     | Paper, die-cut    |                                                            | `000001` |
| 2   | 272      | ![](/brother-ql/pins/sw-02.svg) | Large Address Label           | 38×90mm          | DK-11208     | Paper, die-cut    |                                                            | `000010` |
| 3   | 274      | ![](/brother-ql/pins/sw-03.svg) | Small Address Label           | 62×29mm          | DK-11209     | Paper, die-cut    |                                                            | `000011` |
| 4   | 275      | ![](/brother-ql/pins/sw-04.svg) | Shipping Label                | 62×100mm         | DK-11202     | Paper, die-cut    |                                                            | `000100` |
| 5   | 269      | ![](/brother-ql/pins/sw-05.svg) | Multi Purpose Label           | 17×54mm          | DK-11204     | Paper, die-cut    |                                                            | `000101` |
| 6   | 270      | ![](/brother-ql/pins/sw-06.svg) | File Folder Label             | 17×87mm          | DK-11203     | Paper, die-cut    |                                                            | `000110` |
| 7   | 273      | ![](/brother-ql/pins/sw-07.svg) | CD/DVD Label                  | 58mm Ø           | DK-11207     | Paper, die-cut    | Round, masked center                                       | `000111` |
| 8   | —        | ![](/brother-ql/pins/sw-08.svg) | Reserved                      | —                | —            | —                 |                                                            | `001000` |
| 9   | —        | ![](/brother-ql/pins/sw-09.svg) | Reserved                      | —                | —            | —                 |                                                            | `001001` |
| 10  | —        | ![](/brother-ql/pins/sw-10.svg) | Reserved                      | —                | —            | —                 |                                                            | `001010` |
| 11  | —        | ![](/brother-ql/pins/sw-11.svg) | Reserved                      | —                | —            | —                 |                                                            | `001011` |
| 12  | 370      | ![](/brother-ql/pins/sw-12.svg) | Square Paper Label            | 23×23mm          | DK-11221     | Paper, die-cut    |                                                            | `001100` |
| 13  | —        | ![](/brother-ql/pins/sw-13.svg) | Reserved                      | —                | —            | —                 |                                                            | `001101` |
| 14  | —        | ![](/brother-ql/pins/sw-14.svg) | Not to be used                | —                | —            | —                 |                                                            | `001110` |
| 15  | —        | ![](/brother-ql/pins/sw-15.svg) | Not to be used                | —                | —            | —                 |                                                            | `001111` |
| 16  | —        | ![](/brother-ql/pins/sw-16.svg) | Not to be used                | —                | —            | —                 |                                                            | `010000` |
| 17  | 362      | ![](/brother-ql/pins/sw-17.svg) | Round Paper Label 12mm        | 12mm Ø           | DK-11219     | Paper, die-cut    |                                                            | `010001` |
| 18  | 363      | ![](/brother-ql/pins/sw-18.svg) | Round Paper Label 24mm        | 24mm Ø           | DK-11218     | Paper, die-cut    |                                                            | `010010` |
| 19  | —        | ![](/brother-ql/pins/sw-19.svg) | Not to be used                | —                | —            | —                 |                                                            | `010011` |
| 20  | 258      | ![](/brother-ql/pins/sw-20.svg) | White Paper Tape 29mm         | 29mm continuous  | DK-22210     | Paper, continuous |                                                            | `010100` |
| 21  | 259      | ![](/brother-ql/pins/sw-21.svg) | White Paper Tape 62mm         | 62mm continuous  | DK-22205     | Paper, continuous | Also: DK-44205 (removable), DK-44605 (removable yellow)    | `010101` |
| 22  | —        | ![](/brother-ql/pins/sw-22.svg) | White Film Tape 29mm          | 29mm continuous  | DK-22211     | Film, continuous  |                                                            | `010110` |
| 23  | —        | ![](/brother-ql/pins/sw-23.svg) | White Film Tape 62mm          | 62mm continuous  | DK-22212     | Film, continuous  |                                                            | `010111` |
| 24  | —        | ![](/brother-ql/pins/sw-24.svg) | Yellow Film Tape 62mm         | 62mm continuous  | DK-22606     | Film, continuous  |                                                            | `011000` |
| 25  | —        | ![](/brother-ql/pins/sw-25.svg) | Clear Film Tape 62mm          | 62mm continuous  | DK-22113     | Film, continuous  |                                                            | `011001` |
| 26  | 257      | ![](/brother-ql/pins/sw-26.svg) | White Paper Tape 12mm         | 12mm continuous  | DK-22214     | Paper, continuous |                                                            | `011010` |
| 27  | 262      | ![](/brother-ql/pins/sw-27.svg) | White Paper Tape 50mm         | 50mm continuous  | DK-22223     | Paper, continuous |                                                            | `011011` |
| 28  | **251**  | ![](/brother-ql/pins/sw-28.svg) | **Two-color Paper Tape 62mm** | 62mm continuous  | **DK-22251** | Paper, continuous | **Black+red. QL-800 series only. Confirmed via hardware.** | `011100` |
| 29  | —        | ![](/brother-ql/pins/sw-29.svg) | Not to be used                | —                | —            | —                 |                                                            | `011101` |
| 30  | —        | ![](/brother-ql/pins/sw-30.svg) | Not to be used                | —                | —            | —                 |                                                            | `011110` |
| 31  | —        | ![](/brother-ql/pins/sw-31.svg) | Reserved                      | —                | —            | —                 |                                                            | `011111` |
| 32  | —        | ![](/brother-ql/pins/sw-32.svg) | Not to be used                | —                | —            | —                 |                                                            | `100000` |
| 33  | —        | ![](/brother-ql/pins/sw-33.svg) | Not to be used                | —                | —            | —                 |                                                            | `100001` |
| 34  | —        | ![](/brother-ql/pins/sw-34.svg) | Not to be used                | —                | —            | —                 |                                                            | `100010` |
| 35  | —        | ![](/brother-ql/pins/sw-35.svg) | Not to be used                | —                | —            | —                 |                                                            | `100011` |
| 36  | —        | ![](/brother-ql/pins/sw-36.svg) | Not to be used                | —                | —            | —                 |                                                            | `100100` |
| 37  | —        | ![](/brother-ql/pins/sw-37.svg) | Not to be used                | —                | —            | —                 |                                                            | `100101` |
| 38  | —        | ![](/brother-ql/pins/sw-38.svg) | Not to be used                | —                | —            | —                 |                                                            | `100110` |
| 39  | —        | ![](/brother-ql/pins/sw-39.svg) | Not to be used                | —                | —            | —                 |                                                            | `100111` |
| 40  | —        | ![](/brother-ql/pins/sw-40.svg) | Not to be used                | —                | —            | —                 |                                                            | `101000` |
| 41  | —        | ![](/brother-ql/pins/sw-41.svg) | Not to be used                | —                | —            | —                 |                                                            | `101001` |
| 42  | —        | ![](/brother-ql/pins/sw-42.svg) | Not to be used                | —                | —            | —                 |                                                            | `101010` |
| 43  | —        | ![](/brother-ql/pins/sw-43.svg) | Not to be used                | —                | —            | —                 |                                                            | `101011` |
| 44  | —        | ![](/brother-ql/pins/sw-44.svg) | Not to be used                | —                | —            | —                 |                                                            | `101100` |
| 45  | 365      | ![](/brother-ql/pins/sw-45.svg) | White Paper Label 102×51mm    | 102×51mm         | DK-11240     | Paper, die-cut    | QL-1050/1060N only                                         | `101101` |
| 46  | 366      | ![](/brother-ql/pins/sw-46.svg) | White Paper Label 102×152mm   | 102×152mm        | DK-11241     | Paper, die-cut    | QL-1050/1060N only                                         | `101110` |
| 47  | —        | ![](/brother-ql/pins/sw-47.svg) | Not to be used                | —                | —            | —                 |                                                            | `101111` |
| 48  | —        | ![](/brother-ql/pins/sw-48.svg) | Not to be used                | —                | —            | —                 |                                                            | `110000` |
| 49  | —        | ![](/brother-ql/pins/sw-49.svg) | Reserved                      | —                | —            | —                 |                                                            | `110001` |
| 50  | —        | ![](/brother-ql/pins/sw-50.svg) | Not to be used                | —                | —            | —                 |                                                            | `110010` |
| 51  | —        | ![](/brother-ql/pins/sw-51.svg) | Not to be used                | —                | —            | —                 |                                                            | `110011` |
| 52  | —        | ![](/brother-ql/pins/sw-52.svg) | Not to be used                | —                | —            | —                 |                                                            | `110100` |
| 53  | —        | ![](/brother-ql/pins/sw-53.svg) | Not to be used                | —                | —            | —                 |                                                            | `110101` |
| 54  | —        | ![](/brother-ql/pins/sw-54.svg) | Not to be used                | —                | —            | —                 |                                                            | `110110` |
| 55  | —        | ![](/brother-ql/pins/sw-55.svg) | Not to be used                | —                | —            | —                 |                                                            | `110111` |
| 56  | —        | ![](/brother-ql/pins/sw-56.svg) | Not to be used                | —                | —            | —                 |                                                            | `111000` |
| 57  | 260      | ![](/brother-ql/pins/sw-57.svg) | White Paper Tape 102mm        | 102mm continuous | DK-22243     | Paper, continuous | QL-1050/1060N only                                         | `111001` |
| 58  | —        | ![](/brother-ql/pins/sw-58.svg) | Not to be used                | —                | —            | —                 |                                                            | `111010` |
| 59  | —        | ![](/brother-ql/pins/sw-59.svg) | Not to be used                | —                | —            | —                 |                                                            | `111011` |
| 60  | —        | ![](/brother-ql/pins/sw-60.svg) | Not to be used                | —                | —            | —                 |                                                            | `111100` |
| 61  | —        | ![](/brother-ql/pins/sw-61.svg) | Not to be used                | —                | —            | —                 |                                                            | `111101` |
| 62  | —        | ![](/brother-ql/pins/sw-62.svg) | Not to be used                | —                | —            | —                 |                                                            | `111110` |
| 63  | —        | ![](/brother-ql/pins/sw-63.svg) | Reserved                      | —                | —            | —                 |                                                            | `111111` |

## Physical pin layout (top view, pins in device)

![Pin layout](/brother-ql/pins/pin-layout.svg)

```
④  ③
    ②
    ①
    ⓪
    ⑤
```

- Pins 3, 2, 1, 0, 5 form a vertical column.
- Pin 4 is offset to the left, level with pin 3.
- **0 = no projection** (switch not pressed) — **1 = projection present** (switch pressed).
- SW number = binary value of `[SW5][SW4][SW3][SW2][SW1][SW0]`.

## 3D printable spools for testing

These spools can be used with third-party label rolls or to probe unknown pin
combinations by covering all holes and selectively punching them out:

- [Brother Label DK printer spool](https://www.printables.com/model/119228-brother-label-dk-printer-spool) by Marko — basic reusable spool, tape over holes and punch out as needed
- [Universal Brother label DK Spool](https://www.printables.com/model/915161-universal-brother-label-dk-spool) by Mind2MatterPrinting — universal design with swappable identifier plates and magnet-attached sides, supports all roll widths

## Rolls not yet mapped to a switch code

These rolls appear in Brother's QL-820NWB consumables list or QL-800 command reference
but are not in the original QL-1060N switch table. Their pin codes need hardware probing.

| DK code   | Size            | Media ID | Material            | Notes          |
| --------- | --------------- | -------- | ------------------- | -------------- |
| DK-22225  | 38mm continuous | 264      | Paper, continuous   |                |
| DK-N55224 | 54mm continuous | 261      | Paper, non-adhesive |                |
| DK-11234  | 60×86mm         | 383      | Paper, die-cut      | QL-800 era     |
| DK-11247  | 103×164mm       | —        | Paper, die-cut      | QL-1100 series |

## Rolls sharing the same pin code

SW 21 (`101010`) maps to **multiple** 62mm continuous paper variants:

- DK-22205 — White Paper Tape 62mm (standard permanent adhesive)
- DK-44205 — Removable White Paper Tape 62mm
- DK-44605 — Removable Yellow Paper Tape 62mm

The printer cannot distinguish between these by spool pins alone.

## Status response — undocumented bytes

The QL-800 command reference documents bytes 14 and 24–31 as "Reserved" with fixed
values. Empirical testing shows they **vary per roll**:

| Roll loaded      | Byte [14] | Byte [25] | Notes                     |
| ---------------- | --------- | --------- | ------------------------- |
| DK-22251 (SW 28) | 0x23      | 0x81      | 62mm two-color continuous |
| DK-11201 (SW 1)  | 0x01      | 0x01      | 29×90mm die-cut           |

**Hypothesis:** Byte [25] bit 7 (`0x80`) is the two-color media flag.
Byte [14] may encode the CAS switch pattern or a derivative.

Further status dumps across roll types are needed to confirm.

## QL-800 series status response — known deviations from documentation

| Byte | Offset | Documented value         | Actual behavior                               |
| ---- | ------ | ------------------------ | --------------------------------------------- |
| 12   | 11     | Media type: 4Ah/4Bh      | Correct (changed from 0Ah/0Bh on older QLs)   |
| 15   | 14     | "Fixed at 3Fh"           | **Varies per roll** — likely CAS-derived      |
| 18   | 17     | Media length (mm)        | Correct — 0x00 for continuous, mm for die-cut |
| 25   | 24     | "Fixed at 00h" (8 bytes) | **Varies** — bit 7 of byte [25] = two-color?  |

## PT-P / PT-E — TZe laminated tape

Laminated tape cartridges for the PC-connectable PT-P / PT-E series.
The same id maps to different print-area pin counts on the 128-pin and
560-pin head families — the registry stores both under
`media.geometry.narrow` / `media.geometry.wide`. Pin configurations
sourced from Brother's *Raster Command Reference* PDFs via
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch). Status:
🔲 Untested.

### 128-pin head (PT-E550W, PT-P750W)

| ID  | Width  | Left pins | Print pins | Right pins |
| --- | ------ | --------- | ---------- | ---------- |
| 401 | 3.5 mm | 52        | 24         | 52         |
| 402 | 6 mm   | 48        | 32         | 48         |
| 403 | 9 mm   | 39        | 50         | 39         |
| 404 | 12 mm  | 29        | 70         | 29         |
| 405 | 18 mm  | 8         | 112        | 8          |
| 406 | 24 mm  | 0         | 128        | 0          |

### 560-pin head (PT-P900, P900W, P950NW, P910BT)

| ID  | Width  | Left pins | Print pins | Right pins |
| --- | ------ | --------- | ---------- | ---------- |
| 401 | 3.5 mm | 248       | 48         | 264        |
| 402 | 6 mm   | 240       | 64         | 256        |
| 403 | 9 mm   | 219       | 106        | 235        |
| 404 | 12 mm  | 197       | 150        | 213        |
| 405 | 18 mm  | 155       | 234        | 171        |
| 406 | 24 mm  | 112       | 320        | 128        |
| 407 | 36 mm  | 45        | 454        | 61         |

The 36 mm width (id 407) is exclusive to the 560-pin family.

TZ-legacy cartridges share TZe geometry per width — the entry name
includes "TZe / TZ" so search hits work for either term. TZeFA
(flexible-ID) is the same width-by-width; no separate id allocation.

## PT-P / PT-E — HSe heat-shrink tubing

Heat-shrink tubes for cable wraps. Both 2:1 and 3:1 ratios. The
128-pin pin configurations carry an inherited "shifted -2 pins (up)
based on testing" correction from `nbuchwitz/ptouch`; the 560-pin
configurations carry "shifted +17 pins down based on Brother software
analysis". These corrections are inherited as-shipped — phase-4
hardware verification should confirm.

PT-P910BT does **not** support HSe; only PT-E550W, PT-P750W, and the
PT-P900 family print HSe tubes.

### 128-pin head — HSe 2:1

| ID  | Width   | Left | Print | Right |
| --- | ------- | ---- | ----- | ----- |
| 421 | 5.8 mm  | 52   | 28    | 48    |
| 422 | 8.8 mm  | 42   | 48    | 38    |
| 423 | 11.7 mm | 33   | 66    | 29    |
| 424 | 17.7 mm | 13   | 106   | 9     |
| 425 | 23.6 mm | 0    | 128   | 0     |

### 128-pin head — HSe 3:1

| ID  | Width   | Left | Print | Right |
| --- | ------- | ---- | ----- | ----- |
| 441 | 5.2 mm  | 56   | 20    | 52    |
| 442 | 9.0 mm  | 44   | 44    | 40    |
| 443 | 11.2 mm | 41   | 50    | 37    |
| 444 | 21.0 mm | 6    | 120   | 2     |

### 560-pin head — HSe 2:1

| ID  | Width   | Left | Print | Right |
| --- | ------- | ---- | ----- | ----- |
| 421 | 5.8 mm  | 261  | 56    | 243   |
| 422 | 8.8 mm  | 241  | 96    | 223   |
| 423 | 11.7 mm | 223  | 132   | 205   |
| 424 | 17.7 mm | 183  | 212   | 165   |
| 425 | 23.6 mm | 161  | 256   | 143   |

### 560-pin head — HSe 3:1

| ID  | Width   | Left | Print | Right |
| --- | ------- | ---- | ----- | ----- |
| 441 | 5.2 mm  | 269  | 40    | 251   |
| 442 | 9.0 mm  | 245  | 88    | 227   |
| 443 | 11.2 mm | 239  | 100   | 221   |
| 444 | 21.0 mm | 169  | 240   | 151   |
| 445 | 31.0 mm | 109  | 360   | 91    |

The 31.0 mm width (id 445) is exclusive to the 560-pin family.

## Per-model media support matrix

| Model       | TZe widths                               | HSe 2:1                | HSe 3:1                       |
| ----------- | ---------------------------------------- | ---------------------- | ----------------------------- |
| PT-E550W    | 3.5 / 6 / 9 / 12 / 18 / 24 mm            | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 mm |
| PT-P750W    | 3.5 / 6 / 9 / 12 / 18 / 24 mm            | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 mm |
| PT-P900     | 3.5 / 6 / 9 / 12 / 18 / 24 / **36 mm**   | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / **31.0 mm** |
| PT-P900W    | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm       | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / 31.0 mm |
| PT-P950NW   | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm       | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / 31.0 mm |
| PT-P910BT   | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm       | **— (not supported)**  | **— (not supported)**         |
