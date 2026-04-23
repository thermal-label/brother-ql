# Brother QL — Spool Switch (CAS) Pin Map

> Source: QL-1060N Service Manual (pages II-15 / II-16), cross-referenced with
> QL-800 and QL-series Raster Command References, and confirmed via hardware
> probing on a QL-800 with DK-22251.

## Physical pin layout (spool foot, bottom view)

![Pin layout](/pins/pin-layout.svg)

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

## Complete switch table

| SW | Pins | SW0 | SW1 | SW2 | SW3 | SW4 | SW5 | Media type | Size | DK code | Media ID | Material | Notes |
|----|------|-----|-----|-----|-----|-----|-----|------------|------|---------|----------|----------|-------|
| 0  | ![](/pins/sw-00.svg) | 0 | 0 | 0 | 0 | 0 | 0 | No media (not loaded) | — | — | — | — | |
| 1  | ![](/pins/sw-01.svg) | 1 | 0 | 0 | 0 | 0 | 0 | Standard Address Label | 29×90mm | DK-11201 | 271 | Paper, die-cut | |
| 2  | ![](/pins/sw-02.svg) | 0 | 1 | 0 | 0 | 0 | 0 | Large Address Label | 38×90mm | DK-11208 | 272 | Paper, die-cut | |
| 3  | ![](/pins/sw-03.svg) | 1 | 1 | 0 | 0 | 0 | 0 | Small Address Label | 62×29mm | DK-11209 | 274 | Paper, die-cut | |
| 4  | ![](/pins/sw-04.svg) | 0 | 0 | 1 | 0 | 0 | 0 | Shipping Label | 62×100mm | DK-11202 | 275 | Paper, die-cut | |
| 5  | ![](/pins/sw-05.svg) | 1 | 0 | 1 | 0 | 0 | 0 | Multi Purpose Label | 17×54mm | DK-11204 | 269 | Paper, die-cut | |
| 6  | ![](/pins/sw-06.svg) | 0 | 1 | 1 | 0 | 0 | 0 | File Folder Label | 17×87mm | DK-11203 | 270 | Paper, die-cut | |
| 7  | ![](/pins/sw-07.svg) | 1 | 1 | 1 | 0 | 0 | 0 | CD/DVD Label | 58mm Ø | DK-11207 | 273 | Paper, die-cut | Round, masked center |
| 8  | ![](/pins/sw-08.svg) | 0 | 0 | 0 | 1 | 0 | 0 | Reserved | — | — | — | — | |
| 9  | ![](/pins/sw-09.svg) | 1 | 0 | 0 | 1 | 0 | 0 | Reserved | — | — | — | — | |
| 10 | ![](/pins/sw-10.svg) | 0 | 1 | 0 | 1 | 0 | 0 | Reserved | — | — | — | — | |
| 11 | ![](/pins/sw-11.svg) | 1 | 1 | 0 | 1 | 0 | 0 | Reserved | — | — | — | — | |
| 12 | ![](/pins/sw-12.svg) | 0 | 0 | 1 | 1 | 0 | 0 | Square Paper Label | 23×23mm | DK-11221 | 370 | Paper, die-cut | |
| 13 | ![](/pins/sw-13.svg) | 1 | 0 | 1 | 1 | 0 | 0 | Reserved | — | — | — | — | |
| 14 | ![](/pins/sw-14.svg) | 0 | 1 | 1 | 1 | 0 | 0 | Not to be used | — | — | — | — | |
| 15 | ![](/pins/sw-15.svg) | 1 | 1 | 1 | 1 | 0 | 0 | Not to be used | — | — | — | — | |
| 16 | ![](/pins/sw-16.svg) | 0 | 0 | 0 | 0 | 1 | 0 | Not to be used | — | — | — | — | |
| 17 | ![](/pins/sw-17.svg) | 1 | 0 | 0 | 0 | 1 | 0 | Round Paper Label 12mm | 12mm Ø | DK-11219 | 362 | Paper, die-cut | |
| 18 | ![](/pins/sw-18.svg) | 0 | 1 | 0 | 0 | 1 | 0 | Round Paper Label 24mm | 24mm Ø | DK-11218 | 363 | Paper, die-cut | |
| 19 | ![](/pins/sw-19.svg) | 1 | 1 | 0 | 0 | 1 | 0 | Not to be used | — | — | — | — | |
| 20 | ![](/pins/sw-20.svg) | 0 | 0 | 1 | 0 | 1 | 0 | White Paper Tape 29mm | 29mm continuous | DK-22210 | 258 | Paper, continuous | |
| 21 | ![](/pins/sw-21.svg) | 1 | 0 | 1 | 0 | 1 | 0 | White Paper Tape 62mm | 62mm continuous | DK-22205 | 259 | Paper, continuous | Also: DK-44205 (removable), DK-44605 (removable yellow) |
| 22 | ![](/pins/sw-22.svg) | 0 | 1 | 1 | 0 | 1 | 0 | White Film Tape 29mm | 29mm continuous | DK-22211 | — | Film, continuous | |
| 23 | ![](/pins/sw-23.svg) | 1 | 1 | 1 | 0 | 1 | 0 | White Film Tape 62mm | 62mm continuous | DK-22212 | — | Film, continuous | |
| 24 | ![](/pins/sw-24.svg) | 0 | 0 | 0 | 1 | 1 | 0 | Yellow Film Tape 62mm | 62mm continuous | DK-22606 | — | Film, continuous | |
| 25 | ![](/pins/sw-25.svg) | 1 | 0 | 0 | 1 | 1 | 0 | Clear Film Tape 62mm | 62mm continuous | DK-22113 | — | Film, continuous | |
| 26 | ![](/pins/sw-26.svg) | 0 | 1 | 0 | 1 | 1 | 0 | White Paper Tape 12mm | 12mm continuous | DK-22214 | 257 | Paper, continuous | |
| 27 | ![](/pins/sw-27.svg) | 1 | 1 | 0 | 1 | 1 | 0 | White Paper Tape 50mm | 50mm continuous | DK-22223 | 262 | Paper, continuous | |
| 28 | ![](/pins/sw-28.svg) | 0 | 0 | 1 | 1 | 1 | 0 | **Two-color Paper Tape 62mm** | 62mm continuous | **DK-22251** | **251** | Paper, continuous | **Black+red. QL-800 series only. Confirmed via hardware.** |
| 29 | ![](/pins/sw-29.svg) | 1 | 0 | 1 | 1 | 1 | 0 | Not to be used | — | — | — | — | |
| 30 | ![](/pins/sw-30.svg) | 0 | 1 | 1 | 1 | 1 | 0 | Not to be used | — | — | — | — | |
| 31 | ![](/pins/sw-31.svg) | 1 | 1 | 1 | 1 | 1 | 0 | Reserved | — | — | — | — | |
| 32 | ![](/pins/sw-32.svg) | 0 | 0 | 0 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 33 | ![](/pins/sw-33.svg) | 1 | 0 | 0 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 34 | ![](/pins/sw-34.svg) | 0 | 1 | 0 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 35 | ![](/pins/sw-35.svg) | 1 | 1 | 0 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 36 | ![](/pins/sw-36.svg) | 0 | 0 | 1 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 37 | ![](/pins/sw-37.svg) | 1 | 0 | 1 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 38 | ![](/pins/sw-38.svg) | 0 | 1 | 1 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 39 | ![](/pins/sw-39.svg) | 1 | 1 | 1 | 0 | 0 | 1 | Not to be used | — | — | — | — | |
| 40 | ![](/pins/sw-40.svg) | 0 | 0 | 0 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 41 | ![](/pins/sw-41.svg) | 1 | 0 | 0 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 42 | ![](/pins/sw-42.svg) | 0 | 1 | 0 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 43 | ![](/pins/sw-43.svg) | 1 | 1 | 0 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 44 | ![](/pins/sw-44.svg) | 0 | 0 | 1 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 45 | ![](/pins/sw-45.svg) | 1 | 0 | 1 | 1 | 0 | 1 | White Paper Label 102×51mm | 102×51mm | DK-11240 | 365 | Paper, die-cut | QL-1050/1060N only |
| 46 | ![](/pins/sw-46.svg) | 0 | 1 | 1 | 1 | 0 | 1 | White Paper Label 102×152mm | 102×152mm | DK-11241 | 366 | Paper, die-cut | QL-1050/1060N only |
| 47 | ![](/pins/sw-47.svg) | 1 | 1 | 1 | 1 | 0 | 1 | Not to be used | — | — | — | — | |
| 48 | ![](/pins/sw-48.svg) | 0 | 0 | 0 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 49 | ![](/pins/sw-49.svg) | 1 | 0 | 0 | 0 | 1 | 1 | Reserved | — | — | — | — | |
| 50 | ![](/pins/sw-50.svg) | 0 | 1 | 0 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 51 | ![](/pins/sw-51.svg) | 1 | 1 | 0 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 52 | ![](/pins/sw-52.svg) | 0 | 0 | 1 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 53 | ![](/pins/sw-53.svg) | 1 | 0 | 1 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 54 | ![](/pins/sw-54.svg) | 0 | 1 | 1 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 55 | ![](/pins/sw-55.svg) | 1 | 1 | 1 | 0 | 1 | 1 | Not to be used | — | — | — | — | |
| 56 | ![](/pins/sw-56.svg) | 0 | 0 | 0 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 57 | ![](/pins/sw-57.svg) | 1 | 0 | 0 | 1 | 1 | 1 | White Paper Tape 102mm | 102mm continuous | DK-22243 | 260 | Paper, continuous | QL-1050/1060N only |
| 58 | ![](/pins/sw-58.svg) | 0 | 1 | 0 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 59 | ![](/pins/sw-59.svg) | 1 | 1 | 0 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 60 | ![](/pins/sw-60.svg) | 0 | 0 | 1 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 61 | ![](/pins/sw-61.svg) | 1 | 0 | 1 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 62 | ![](/pins/sw-62.svg) | 0 | 1 | 1 | 1 | 1 | 1 | Not to be used | — | — | — | — | |
| 63 | ![](/pins/sw-63.svg) | 1 | 1 | 1 | 1 | 1 | 1 | Reserved | — | — | — | — | |

## 3D printable spools for testing

These spools can be used with third-party label rolls or to probe unknown pin
combinations by covering all holes and selectively punching them out:

- [Brother Label DK printer spool](https://www.printables.com/model/119228-brother-label-dk-printer-spool) by Marko — basic reusable spool, tape over holes and punch out as needed
- [Universal Brother label DK Spool](https://www.printables.com/model/915161-universal-brother-label-dk-spool) by Mind2MatterPrinting — universal design with swappable identifier plates and magnet-attached sides, supports all roll widths

## Rolls not yet mapped to a switch code

These rolls appear in Brother's QL-820NWB consumables list or QL-800 command reference
but are not in the original QL-1060N switch table. Their pin codes need hardware probing.

| DK code | Size | Media ID | Material | Notes |
|---------|------|----------|----------|-------|
| DK-22225 | 38mm continuous | 264 | Paper, continuous | |
| DK-N55224 | 54mm continuous | 261 | Paper, non-adhesive | |
| DK-11234 | 60×86mm | 383 | Paper, die-cut | QL-800 era |
| DK-11247 | 103×164mm | — | Paper, die-cut | QL-1100 series |

## Rolls sharing the same pin code

SW 21 (`101010`) maps to **multiple** 62mm continuous paper variants:
- DK-22205 — White Paper Tape 62mm (standard permanent adhesive)
- DK-44205 — Removable White Paper Tape 62mm
- DK-44605 — Removable Yellow Paper Tape 62mm

The printer cannot distinguish between these by spool pins alone.

## Status response — undocumented bytes

The QL-800 command reference documents bytes 14 and 24–31 as "Reserved" with fixed
values. Empirical testing shows they **vary per roll**:

| Roll loaded | Byte [14] | Byte [25] | Notes |
|-------------|-----------|-----------|-------|
| DK-22251 (SW 28) | 0x23 | 0x81 | 62mm two-color continuous |
| DK-11201 (SW 1) | 0x01 | 0x01 | 29×90mm die-cut |

**Hypothesis:** Byte [25] bit 7 (`0x80`) is the two-color media flag.
Byte [14] may encode the CAS switch pattern or a derivative.

Further status dumps across roll types are needed to confirm.

## QL-800 series status response — known deviations from documentation

| Byte | Offset | Documented value | Actual behavior |
|------|--------|------------------|-----------------|
| 12 | 11 | Media type: 4Ah/4Bh | Correct (changed from 0Ah/0Bh on older QLs) |
| 15 | 14 | "Fixed at 3Fh" | **Varies per roll** — likely CAS-derived |
| 18 | 17 | Media length (mm) | Correct — 0x00 for continuous, mm for die-cut |
| 25 | 24 | "Fixed at 00h" (8 bytes) | **Varies** — bit 7 of byte [25] = two-color? |

## DK code naming convention

- **DK-1xxxx** — Die-cut labels
- **DK-2xxxx** — Continuous tape
- **DK-4xxxx** — Removable adhesive continuous tape
- **DK-Nxxxx** — Non-adhesive tape

The last three digits of the DK code appear on the physical roll as the "roll marking"
(e.g., DK-22**251** → "251"). This does **not** correspond to the media ID used in the
raster protocol.