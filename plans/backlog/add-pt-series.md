# Add Brother PT-P / PT-E series support

> Extend this driver to cover Brother's PC-connectable P-touch line —
> **PT-P750W, PT-P900W, PT-P950NW, PT-E550W** — alongside the QL
> series it already supports. Background research shows these models
> use the **same raster command family** as Brother QL, with
> per-device variation that maps cleanly onto the feature-flag pattern
> already in `BrotherQLDevice`.
>
> This plan also covers the package rename from `brother-ql` →
> `brother` so the scope reflects reality. Both parts ship in one
> release because there is no good reason to do them separately.
>
> **Scope clarification (read first):** "Brother PT" in this plan
> means the PC-connectable PT-P / PT-E lineup — the one Brother
> publishes the *Raster Command Reference Manual* for. It does **not**
> mean the consumer handheld P-touch line (PT-D210, PT-H110, PT-1010,
> PT-2730, etc.) — those use a different command set (Brother's
> ESC/P‑style "P-touch Tape Editor" protocol) and would belong in a
> separate driver if ever covered, more analogous to how
> `labelmanager` is split off from `labelwriter`.

---

## 1. Goals

- Add the four PT-P / PT-E PC-connectable models to the device
  registry, each printing successfully via USB and (where supported)
  TCP.
- Reuse the existing `protocol.ts` raster encoder; gate divergent
  behaviour with new device-level feature flags.
- Add Brother TZe tape catalogue to the media registry alongside the
  existing DK-tape entries, with a clean separation so the two
  catalogues don't cross-contaminate.
- Rename the npm packages from `@thermal-label/brother-ql-*` to
  `@thermal-label/brother-*` and the repo from `brother-ql` to
  `brother`.
- Honest hardware-status surface: PT models start as `🔲 Expected`
  pending verification, same as the unverified QL models.

---

## 2. Why combine, not split

This question came up explicitly. Recording the answer here so future
maintainers don't re-litigate it.

- **Same protocol family.** Both QL and PT-P / PT-E use Brother's
  documented "raster command set." Status request (`ESC i S`) returns
  the same fixed 32-byte response — byte 0 = `0x80`, byte 1 = `0x20`,
  byte 2 = `'B'`, byte 3 = series, byte 4 = model. Same `ESC i a`
  (mode), `ESC i z` (info), `ESC i K` (expanded mode), `G` raster
  line, TIFF/PackBits compression.
- **Same vendor, same VID** (`0x04F9`).
- **The reference Python project (`fuzeman/brother-label`) ships them
  together.** One `BrotherDevice` base class with `BrotherDeviceQL`
  and `BrotherDevicePT` subclasses, one shared `BrotherLabelRaster`
  encoder. Per-device variation is feature flags
  (`compression`, `mode_setting`, `expanded_mode`, `cutting`,
  `two_color`, `num_invalidate_bytes`, `number_bytes_per_row`).
- **The variation is exactly what this driver already handles.**
  `BrotherQLDevice` already discriminates on `twoColor`,
  `compression`, `editorLite`, `bytesPerRow`. Adding PT support is a
  matter of two more flags and four more device entries — not a new
  encoder.
- **The labelmanager/labelwriter split is the wrong analogy.** Those
  are split because Dymo's tape command set and ESC/raster are
  different protocol families with no shared opcodes. QL and PT-P
  share ~95% of their opcodes; splitting would duplicate `protocol.ts`,
  `pack-bits.ts`, `status.ts`, the framer, the transport plumbing,
  and the docs site for no architectural payoff.

---

## 3. Package rename

Rename `@thermal-label/brother-ql-{core,node,web}` →
`@thermal-label/brother-{core,node,web}`. Repo follows.

- We're at 0.x — semver makes no promises and the deprecation cost is
  one paragraph in the npm README.
- `npm deprecate @thermal-label/brother-ql-core "Renamed to @thermal-label/brother-core; install that instead."` for each of the three packages, pointing to the new name.
- README and `docs/index.md` get a one-paragraph "previously known as
  brother-ql" pointer with install-rename instructions.
- `BrotherQLDevice` / `BrotherQLMedia` / `BrotherQLStatus` /
  `BrotherQLPrintOptions` / `BrotherQLPrinter` rename to
  `BrotherDevice` / `BrotherMedia` / `BrotherStatus` /
  `BrotherPrintOptions` / `BrotherPrinter`. `family: 'brother-ql'`
  becomes `family: 'brother'`. CLI driver-detection convention follows.
- Single release: `0.3.x` (last brother-ql) → `0.4.0` (first brother).
  No transitional dual-publish; the deprecate notice is the migration
  path.

---

## 4. Schema additions

Two new feature flags on `BrotherDevice`, plus a model-line
discriminator. All other existing fields stay.

```ts
// packages/core/src/types.ts

export type BrotherLine = 'ql' | 'ql-wide' | 'pt-p' | 'pt-e';
export type HeadPins = 128 | 560 | 720 | 1296;
export type Dpi = 180 | 300 | 360;
export type HighResDpi = 360 | 720;

export interface BrotherDevice extends DeviceDescriptor {
  family: 'brother';
  vid: number;
  pid: number;
  /** Which Brother model line this belongs to. Drives form-factor and
   *  catalogue selection in the encoder + media lookup. */
  line: BrotherLine;
  headPins: HeadPins;
  bytesPerRow: number;
  /** Print head density along the head axis (horizontal). QL family
   *  is 300; PT 128-pin family is 180; PT 560-pin family is 360. */
  dpi: Dpi;
  /** Optional high-resolution mode along the feed axis (vertical).
   *  When the user opts in via `BrotherPrintOptions.highRes`, the
   *  encoder sets ESC i K bit 6, duplicates each raster line, and
   *  doubles the feed margins. PT models support 2× their `dpi`
   *  here; QL models don't expose this and leave it unset. */
  highResDpi?: HighResDpi;
  twoColor: boolean;
  network: NetworkSupport;
  autocut: boolean;
  compression: boolean;
  editorLite: boolean;
  /** `ESC i a` (mode setting) supported. PT models accept it; some
   *  legacy QLs (QL-500/550/560/570/700) reject it. Defaults true. */
  modeSetting: boolean;
  /** `ESC i K` (expanded mode) supported. Used to enable two-colour
   *  + cut-at-end + high-res. Defaults true. */
  expandedMode: boolean;
  /** Number of `0x00` bytes to send for the invalidate prefix. 200
   *  for most models; 400 for QL-800 series (two-colour pre-amble). */
  invalidateBytes: number;
  /** Alternate PID seen when the printer is in Editor Lite
   *  mass-storage mode. */
  massStoragePid?: number;
}
```

**Default values** for existing QL entries: `line: 'ql' | 'ql-wide'`,
`dpi: 300`, `highResDpi: undefined`, `modeSetting: true`,
`expandedMode: true`, `invalidateBytes: 200` (QL-800 series → `400`).
Backfill the existing device registry in the same PR.

`BrotherMedia` gains a `tapeSystem` discriminator and the
head-family-keyed geometry shape from §6.2:

```ts
export type TapeSystem = 'dk' | 'tze' | 'hse-2to1' | 'hse-3to1';

export interface TapeGeometry {
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
}

export interface BrotherMedia extends MediaDescriptor {
  id: number;
  type: 'continuous' | 'die-cut';
  tapeSystem: TapeSystem;
  /** Per-head-family pin geometry. `narrow` = 128-pin (PT-E550W,
   *  PT-P750W); `wide` = 560-pin (PT-P900 series). DK entries set
   *  only `narrow` since QL is single-family from a head-pin
   *  perspective. */
  geometry: { narrow?: TapeGeometry; wide?: TapeGeometry };
  /** Mask applied to the printable area on die-cut DK labels. Not
   *  meaningful for continuous media. */
  dieCutMaskedAreaDots?: number;
}
```

`tapeSystem` lets `findMediaByDimensions(widthMm, heightMm, device)`
skip TZe / HSe entries when the user is on a QL and DK entries when
on a PT — catalogues sharing a numeric id space without ambiguity.
Resolution against `device.headPins` selects the right
`narrow`/`wide` geometry per §6.2.

---

## 5. Device additions

| Model      | Printer-mode PID | PLite/mass-storage PID | DPI       | Head pins | Bytes/row | Two-colour | Network    | Line   |
| ---------- | ---------------- | ---------------------- | --------- | --------- | --------- | ---------- | ---------- | ------ |
| PT-E550W   | `0x2060` ✅      | unknown                | 180 / 360 | 128       | 16        | ❌         | Wi-Fi      | `pt-e` |
| PT-P750W   | `0x2062` ✅      | `0x2065` ✅            | 180 / 360 | 128       | 16        | ❌         | Wi-Fi      | `pt-p` |
| PT-P900    | `0x2083` ✅      | unknown                | 360 / 720 | 560       | 70        | ❌         | USB-only   | `pt-p` |
| PT-P900W   | `0x2085` ✅      | unknown                | 360 / 720 | 560       | 70        | ❌         | Wi-Fi      | `pt-p` |
| PT-P950NW  | `0x2086` ✅      | unknown                | 360 / 720 | 560       | 70        | ❌         | Wi-Fi+LAN  | `pt-p` |
| PT-P910BT  | `0x20C7` ✅      | unknown                | 360 / 720 | 560       | 70        | ❌         | Bluetooth  | `pt-p` |

DPI column reads as `native / high-res` — see §7.5 for high-res mode handling.
| PT-E550W  | `0x2060` ⚠️ (~70%)  | unknown                | 180 | 128       | 16        | ❌         | Wi-Fi     | `pt-e` |
| PT-P900W  | **unknown** ❓       | unknown                | 360 | 560       | 70        | ❌         | Wi-Fi     | `pt-p` |
| PT-P950NW | **unknown** ❓       | unknown                | 360 | 560       | 70        | ❌         | Wi-Fi+LAN | `pt-p` |

### 5.1 PID confidence and sources

All PIDs above are **HIGH confidence** as of 2026-05-01, sourced from
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch/blob/main/src/ptouch/printers.py)
(active 2024–2026 LGPL-2.1 driver that cites Brother's official
*Raster Command Reference* PDFs by filename:
`cv_pte550wp750wp710bt_eng_raster_102.pdf` for the 128-pin family,
`cv_ptp900_eng_raster_102.pdf` for the 560-pin family). Confirmed via
the user's own reading of that source.

This supersedes the previous research pass which had marked PT-P900W
and PT-P950NW as LOW confidence and PT-E550W as MEDIUM. Updated
state:

- **PT-E550W — `0x2060`.** Was MEDIUM in the prior plan revision (no
  driver source corroboration). nbuchwitz/ptouch provides the
  corroboration plus full TZe and HSe pin configs from the Brother
  spec PDF (page 20, "2.3 Print Area").
- **PT-P750W — `0x2062` printer / `0x2065` PLite.** Two driver
  sources, one disagreement — see §5.1a.
- **PT-P900 — `0x2083`.** USB-only (no wireless). New addition to
  the plan; was not in the prior revision's device list.
- **PT-P900W — `0x2085`.** The prior revision listed this value as
  "discarded" because no USB-ID web database corroborated it.
  nbuchwitz/ptouch confirms it directly in source code, which is
  stronger evidence than absence-from-web-databases.
- **PT-P950NW — `0x2086`.** Sequential to PT-P900W as the prior
  revision predicted.
- **PT-P910BT — `0x20C7`.** Bluetooth variant of the P900 family.
  New addition to the plan. PT-P910BT does **not** support HSe
  heat-shrink tubes — only TZe laminated tape. See §6.1.

For all six models, `bytesPerRow * 8 === headPins` — internal
consistency check that `devices.test.ts` should enforce.

### 5.1a Source disagreement on PT-P750W *(foot-gun, keep both PIDs)*

Two driver projects give different answers for which PID is the
printer-class endpoint on PT-P750W:

- **`hannesweisbach/ptouch-print/src/libptouch.c`** says `0x2062` is
  the raster-printer PID and `0x2065` is the PLite mass-storage PID:
  ```
  {0x04f9, 0x2062, "PT-P750W",             128, 180, FLAG_RASTER_PACKBITS|FLAG_P700_INIT},
  {0x04f9, 0x2065, "PT-P750W (PLite Mode)",128, 180, FLAG_PLITE},
  ```
- **`nbuchwitz/ptouch/src/ptouch/printers.py`** defines
  `PTP750W.USB_PRODUCT_ID = 0x2065` as the *printer-class* PID
  (subclass of `LabelPrinter`, used to actually print).

Possible explanations: (1) firmware update made `0x2065` accept
raster in addition to mass-storage, (2) nbuchwitz transcribed from
public USB-ID databases that list only `0x2065` under the model name
"PT-P750W" (which is the PLite mass-storage PID per libptouch.c) and
mislabeled it as the printer PID, (3) PT-P750W enumerates
differently depending on whether the unit was last switched out of
Editor Lite mode. We do not have hardware to adjudicate.

**Resolution:** treat libptouch.c as authoritative for now —
`pid: 0x2062, massStoragePid: 0x2065` — and let the existing
`MASS_STORAGE_PIDS` discovery filter handle the dual-PID case (same
pattern as QL-700 / QL-1100). If a PT-P750W contributor reports that
`findDevice()` doesn't match their unit, that's the signal to flip
the assignment.

Cite both sources in `devices.ts` doc-comment for the PT-P750W entry
so the next maintainer doesn't have to re-derive the disagreement.

**Most public USB databases (the-sz, linux-usb.org/usb.ids) list
only `0x2065` under the name "PT-P750W"** — per libptouch.c that's
the PLite (Editor Lite mass-storage) mode the printer ships in by
default. Anyone copying from those databases without checking driver
source code may end up with what libptouch.c says is the wrong PID.
Document prominently.

### 5.2 PIDs we still don't have

The PLite/mass-storage sibling PIDs for PT-E550W, PT-P900, PT-P900W,
PT-P950NW, and PT-P910BT are not in any source we checked. Brother
historically pairs each printer PID with a mass-storage sibling
(QL-700/QL-1100, PT-P700 `0x2061`/`0x2064`, PT-P750W
`0x2062`/`0x2065`) so they probably exist, but we cannot enumerate
them without `lsusb` from a unit that's been switched into
Editor-Lite/mass-storage mode.

Treatment: leave `massStoragePid` undefined for those five entries.
The `MASS_STORAGE_PIDS` discovery filter in `devices.ts` will be
incomplete for those models — meaning if a user has one of them
plugged in and stuck in mass-storage mode, the filter won't
recognise it and they'll see no helpful error. Document this
limitation in `docs/troubleshooting.md`. Phase 3/4 verification
step: capture the mass-storage PID of any PT model on hand and
backfill.

### 5.3 Bluetooth on PT models

The PT-P910BT advertises Bluetooth as its primary transport; the
PT-P950NW and PT-E550W also list Bluetooth in some marketing
materials. Per the existing brother-ql convention
(`packages/core/src/types.ts` doc-comment: classic Bluetooth SPP via
`'serial'` / `'web-serial'`), treat any PT model with Bluetooth the
same way: `transports: [..., 'serial', 'web-serial']`, no GATT.

PT-P910BT is the highest-priority verification — if it uses BLE GATT
instead of classic SPP, that's a §11/§12 concern (we'd need
`web-bluetooth` + the still-missing node BLE class — see the niimbot
plan).

---

## 6. Media catalogue — TZe and HSe tapes

PT-P / PT-E uses **TZe** laminated tape cartridges (the mainline
P-touch tape system) and, on most P900-series models and the
PT-E550W, also **HSe** heat-shrink tubing in 2:1 and 3:1 ratios. All
continuous; no die-cut. Width range is narrower than DK (3.5–36 mm
TZe vs DK's 12–62 mm) but the print-area-dots geometry slots into
the existing `MediaDescriptor` shape with the `tapeSystem`
discriminator from §4.

### 6.1 Per-model media support matrix

| Model      | TZe tapes               | HSe 2:1 tubes           | HSe 3:1 tubes |
| ---------- | ----------------------- | ----------------------- | ------------- |
| PT-E550W   | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 mm |
| PT-P750W   | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 mm |
| PT-P900    | 3.5 / 6 / 9 / 12 / 18 / 24 / **36 mm** | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / **31.0 mm** |
| PT-P900W   | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / 31.0 mm |
| PT-P950NW  | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm | 5.2 / 9.0 / 11.2 / 21.0 / 31.0 mm |
| PT-P910BT  | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | **— (not supported)** | **— (not supported)** |

Notes from `nbuchwitz/ptouch/src/ptouch/printers.py`:
- 36 mm TZe is exclusive to the 560-pin (P900) family.
- 31.0 mm HSe 3:1 is exclusive to the 560-pin family (the 128-pin
  family lacks the head width to print it cleanly).
- PT-P910BT explicitly drops HSe support — its `PIN_CONFIGS` only
  contains the 7 TZe widths.

### 6.2 TZe pin configurations

Two head-pin families with different per-tape pin layouts. Source:
official Brother *Raster Command Reference* PDFs
(`cv_pte550wp750wp710bt_eng_raster_102.pdf` page 20 §2.3 for 128-pin;
`cv_ptp900_eng_raster_102.pdf` pages 23–24 §2.3.5 for 560-pin), via
`nbuchwitz/ptouch/src/ptouch/printers.py`.

**128-pin family (PT-E550W, PT-P750W):**

| Width  | Left pins | Print pins | Right pins | Suggested id |
| ------ | --------- | ---------- | ---------- | ------------ |
| 3.5 mm | 52        | 24         | 52         | 401          |
| 6 mm   | 48        | 32         | 48         | 402          |
| 9 mm   | 39        | 50         | 39         | 403          |
| 12 mm  | 29        | 70         | 29         | 404          |
| 18 mm  | 8         | 112        | 8          | 405          |
| 24 mm  | 0         | 128        | 0          | 406          |

(Sums to 128 pins for every width — internal-consistency invariant.)

**560-pin family (PT-P900, PT-P900W, PT-P950NW, PT-P910BT):**

| Width  | Left pins | Print pins | Right pins | Suggested id |
| ------ | --------- | ---------- | ---------- | ------------ |
| 3.5 mm | 248       | 48         | 264        | 401          |
| 6 mm   | 240       | 64         | 256        | 402          |
| 9 mm   | 219       | 106        | 235        | 403          |
| 12 mm  | 197       | 150        | 213        | 404          |
| 18 mm  | 155       | 234        | 171        | 405          |
| 24 mm  | 112       | 320        | 128        | 406          |
| 36 mm  | 45        | 454        | 61         | 407          |

(Sums to 560 pins for every width.) The asymmetric left/right pin
counts are deliberate — Brother's 560-pin head is offset from the
tape-feed centerline.

The **same TZe id** (e.g. `404` for 12 mm) maps to different
print-pin counts across families, so `printAreaDots` /
`leftMarginPins` / `rightMarginPins` cannot be stored as flat
scalars on the registry entry. Two options (unchanged from prior
revision):

1. **Store-by-headPins** — add `printAreaDotsByHeadPins?: Record<HeadPins, number>`
   plus parallel `leftMarginPinsByHeadPins` / `rightMarginPinsByHeadPins`,
   resolved at lookup time from `device.headPins`. Keeps one row
   per physical tape SKU.
2. **Split entries** — `tze-12-128pin` (id 404) vs `tze-12-560pin`
   (id 444), looked up via `(widthMm, line)`.

**Recommend option 1**, but generalize the field name beyond
`...ByHeadPins`: the actual discriminator is the device's head
geometry, and HSe rows below show that head-pin-count alone isn't
enough (HSe support is also gated). Use a small helper:

```ts
function resolveTapeGeometry(media: BrotherMedia, device: BrotherDevice): TapeGeometry {
  const family = device.headPins === 128 ? 'narrow' : 'wide';
  return media.geometry[family]
    ?? throw new Error(`${media.name} not supported on ${device.name}`);
}
```

…with `BrotherMedia.geometry: Record<'narrow' | 'wide', TapeGeometry | undefined>`
where `undefined` = "this tape doesn't fit this head family." That
naturally encodes the "36 mm TZe / 31 mm HSe are 560-pin only" rule
without a separate support matrix.

### 6.3 HSe heat-shrink tube pin configurations

HSe tubes use distinct pin layouts (the tube is rolled flat, so the
printable diameter differs from the nominal tube width). Same source
as §6.2.

**128-pin family — HSe 2:1:**

| Width   | Left | Print | Right | Suggested id |
| ------- | ---- | ----- | ----- | ------------ |
| 5.8 mm  | 52   | 28    | 48    | 421          |
| 8.8 mm  | 42   | 48    | 38    | 422          |
| 11.7 mm | 33   | 66    | 29    | 423          |
| 17.7 mm | 13   | 106   | 9     | 424          |
| 23.6 mm | 0    | 128   | 0     | 425          |

**128-pin family — HSe 3:1:**

| Width   | Left | Print | Right | Suggested id |
| ------- | ---- | ----- | ----- | ------------ |
| 5.2 mm  | 56   | 20    | 52    | 441          |
| 9.0 mm  | 44   | 44    | 40    | 442          |
| 11.2 mm | 41   | 50    | 37    | 443          |
| 21.0 mm | 6    | 120   | 2     | 444          |

(Note `nbuchwitz/ptouch` flags the 128-pin HSe configs as "shifted
−2 pins (up) based on testing" — i.e. the spec PDF values were off
by 2 in real-world prints. Inherit this correction; cite it in our
own code-comment.)

**560-pin family — HSe 2:1:**

| Width   | Left | Print | Right | Suggested id |
| ------- | ---- | ----- | ----- | ------------ |
| 5.8 mm  | 261  | 56    | 243   | 421          |
| 8.8 mm  | 241  | 96    | 223   | 422          |
| 11.7 mm | 223  | 132   | 205   | 423          |
| 17.7 mm | 183  | 212   | 165   | 424          |
| 23.6 mm | 161  | 256   | 143   | 425          |

(Note: also flagged by `nbuchwitz/ptouch` as "shifted +17 pins down
based on Brother software analysis". Same caveat — inherit and
cite.)

**560-pin family — HSe 3:1:**

| Width   | Left | Print | Right | Suggested id |
| ------- | ---- | ----- | ----- | ------------ |
| 5.2 mm  | 269  | 40    | 251   | 441          |
| 9.0 mm  | 245  | 88    | 227   | 442          |
| 11.2 mm | 239  | 100   | 221   | 443          |
| 21.0 mm | 169  | 240   | 151   | 444          |
| 31.0 mm | 109  | 360   | 91    | 445          |

### 6.4 Id range allocation

Reserve **400–499** for the PT tape catalogue, leaving the existing
200–300 range intact for DK:

- 400–419 — TZe laminated tape (7 widths, room to grow).
- 420–439 — HSe 2:1 heat-shrink (5 widths today).
- 440–459 — HSe 3:1 heat-shrink (5 widths today).
- 460–499 — reserved for future media types (TZeFA flexible-ID,
  paper-on-paper labels, fluorescent, etc.).

Don't reuse DK ids for TZe — even if the firmware never reports them
in conflict, the registry is a public API surface.

### 6.5 Lookup, defaults, and tape-system gating

`DEFAULT_MEDIA` selection now needs a `line`/`tapeSystem` argument:

- `line: 'ql' | 'ql-wide'` → existing DK default unchanged.
- `line: 'pt-p' | 'pt-e'` → 12 mm TZe (`id: 404`, most common
  starter tape).

`findMediaByDimensions(widthMm, heightMm, device)` needs the device
(or at minimum `tapeSystem` + `headPins`) so:
- QL lookups never return TZe / HSe entries.
- PT lookups never return DK entries.
- 36 mm TZe / 31 mm HSe-3:1 don't appear for 128-pin printers.

Update callers in `status.ts` (`detectedMedia` resolution) and
`preview.ts`.

### 6.6 What about the TZ-legacy and TZeFA series?

**Out of scope for this plan.** TZ-legacy (the original P-touch tape
system, predating TZe) is functionally a subset of TZe — same pin
geometry, different cartridge molding. Registering them separately
would just duplicate the TZe rows. Add an alias-list to `name`
(e.g. `"TZe / TZ"` for the 12 mm entry) so the search hit works for
either term, but don't allocate separate ids.

TZeFA (flexible-ID tape, mainly for cable wraps) has the same
geometry as TZe of the same width — no schema impact, just additional
SKU naming. Defer to a follow-up.

---

## 7. Encoder changes

The `protocol.ts` encoder is already feature-flag-driven. Five
deltas — three small (carried over from the prior revision), two
medium (added after the nbuchwitz/ptouch research pass).

### 7.1 Invalidate length

The `invalidateBytes` field replaces the hardcoded `200` (or `400`
two-colour conditional). One line in `buildJobHeader()` — read from
`device.invalidateBytes` instead.

### 7.2 Mode-setting / expanded-mode gating

Existing encoder unconditionally emits `ESC i a` and `ESC i K`. Wrap
each in `if (device.modeSetting)` and `if (device.expandedMode)`.
This also benefits the legacy QLs (QL-500/550/560/570/700) which
currently get sent commands they reject — likely a latent bug today
that nobody has hit because those models aren't in the verified set.

### 7.3 Form-factor

QL has `'continuous' | 'die-cut'`; PT is continuous-only. The encoder
already paths on `media.type` — no change needed. But the **margin
calculation** for tape feed differs slightly: brother-label has a
distinct `FormFactor.PTOUCH_ENDLESS` with different feed margins
(`feed_margin=14` for PT vs `35` for QL). Encode this as a per-`line`
`feedMarginDots` constant in `protocol.ts`:

```ts
const FEED_MARGIN_DOTS: Record<BrotherLine, number> = {
  'ql':       35,
  'ql-wide':  35,
  'pt-p':     14,
  'pt-e':     14,
};
```

Cited from `brother_label/devices.py:48` (`feed_margin=35`) vs
`brother_label/devices.py:122` (`feed_margin=14`). Verify against
Brother's PT raster manual during phase 3.

### 7.4 PT-E550W cutter requires compression

`nbuchwitz/ptouch/src/ptouch/printers.py:PTE550W` documents:

> Note: E550W requires compression ON for cutting to work.

Set `DEFAULT_USE_COMPRESSION = True` for PT-E550W; equivalently in
our schema, treat `compression: true` as load-bearing for the cutter
on this model and refuse to disable it when `autocut: true` is also
requested. Most cleanly enforced as a per-device validation in
`buildJob()` rather than a runtime conditional in `protocol.ts`:

```ts
if (device.name === 'PT-E550W' && options.autocut && !device.compression) {
  throw new Error('PT-E550W requires compression for autocut to work');
}
```

This is a model-specific gotcha (other PT models don't share it per
the nbuchwitz source — `PTP900Series.DEFAULT_USE_COMPRESSION = False`),
so model-specific validation beats a generic feature flag.

### 7.5 High-resolution mode (180×360 / 360×720)

Both PT families support a high-resolution print mode that **doubles
the vertical resolution** (along the tape-feed axis) without changing
the horizontal head-pin count:

- **128-pin family (PT-E550W, PT-P750W):** `180×180` native, `180×360`
  high-res. Enabled via `ESC i K` bit 6.
- **560-pin family (PT-P900 series):** `360×360` native, `360×720`
  high-res. Same `ESC i K` bit 6.

In high-res mode, **each raster line is sent twice** and feed margins
are doubled. From `nbuchwitz/ptouch`:

> High resolution mode (180x360 dpi) is supported via ESC i K bit 6.
> In high-res mode, each raster line must be sent twice and margin doubled.

Schema additions needed beyond what §4 specified:

```ts
export interface BrotherDevice extends DeviceDescriptor {
  // ...existing fields from §4...
  /** Print head density along the head axis (horizontal). */
  dpi: 180 | 300 | 360;
  /** Optional doubled-density mode along the feed axis (vertical).
   *  When set, encoder enables ESC i K bit 6, sends each raster line
   *  twice, and doubles feed margins. */
  highResDpi?: 360 | 720;
}

export interface BrotherPrintOptions {
  // ...existing fields...
  /** Opt into high-res mode for this job. Requires
   *  `device.highResDpi` to be set; throws otherwise. */
  highRes?: boolean;
}
```

Encoder delta in `protocol.ts`:

```ts
if (options.highRes) {
  assert(device.highResDpi, `${device.name} does not support high-res mode`);
  modeFlags |= 0x40; // ESC i K bit 6
  feedMarginDots *= 2;
}
// ...later, in raster emit loop:
emitRasterLine(line);
if (options.highRes) emitRasterLine(line); // duplicate for high-res
```

Image-pipeline implications: the `preview` renderer at `device.dpi`
is fine for non-high-res. For high-res the preview should render at
`device.dpi × 2` along the feed axis to match what the printer will
emit. Likely one constant change per call site — fold into the
§12.2 dpi audit.

### 7.6 What does *not* change

Status request, status response parsing, raster line opcode (`G`),
PackBits compression, init/reset, two-colour plane encoding —
identical between QL and PT-P. Same code path.

---

## 8. Status response

The PT 32-byte status response is byte-for-byte the same shape as
QL. Bytes 0-3 are fixed (`0x80 0x20 'B' '0'`); byte 4 is the model
identifier (PT-P900W: `0x69` per Brother's manual). Per-model
identifier bytes for the other five PT models are not in the sources
we checked — capture during phase 4/6 hardware verification. The
existing `parseStatus()` keys off byte 10/11 for media dimensions
and ignores the model byte, so this gap doesn't block any code path.

What **does** change: `findMediaByDimensions` is called inside
`parseStatus()` to populate `detectedMedia`. It now needs the
`device` argument from §6.5 so a PT printer reporting "12 mm"
resolves to the TZe entry (with the right `narrow`/`wide` geometry),
not the DK entry. Thread `device` through to `parseStatus(device, bytes)`
— already the calling convention in labelwriter, copy that shape.

PT models do **not** have Editor Lite as a printer-side feature
(unlike PT-P750W's mass-storage *mode*, which is a separate mechanism
handled via `massStoragePid`). Set `editorLite: false` in all PT
device entries; `BrotherStatus.editorLiteMode` stays in the shape
but is always `false` for PT, mirroring how legacy QLs already treat
it.

Per-tape-system gotcha: when a PT-E550W or PT-P750W reports a 12 mm
TZe tape and the user has opted into high-res mode, `detectedMedia`
should still resolve to the same registry entry — but the *effective
print area in dots* is unchanged (high-res only doubles the feed
axis, not the head axis). No special handling in `parseStatus`; the
high-res handling lives in §7.5's encoder path.

---

## 9. Tests

### 9.1 Unit

- `devices.test.ts` — every PT entry resolves by `(vid, pid)`; every
  device's `line`/`bytesPerRow`/`headPins` is internally consistent
  (`bytesPerRow * 8 === headPins`); every PT entry has a `dpi`
  matching the §5 table (180 for 128-pin, 360 for 560-pin); every PT
  entry's `highResDpi` is exactly `2 × dpi` if set; PT-P910BT has
  `compression: false` matching nbuchwitz's `DEFAULT_USE_COMPRESSION = False`,
  PT-E550W has `compression: true`.
- `media.test.ts`:
  - TZe / HSe entries don't collide with DK entries on `id`.
  - `findMediaByDimensions(width, height, qlDevice)` never returns
    a TZe / HSe entry; vice versa.
  - 36 mm TZe and 31 mm HSe-3:1 are unreachable from any 128-pin
    device.
  - PT-P910BT lookups never return any HSe entry.
  - Pin-sum invariants per §6.2 (128-pin TZe rows sum to 128;
    560-pin TZe rows sum to 560).
- `protocol.test.ts` — golden byte sequences:
  - "Print one 12 mm TZe on PT-E550W" (128-pin)
  - "Print one 12 mm TZe on PT-P750W" (128-pin, with cutter)
  - "Print one 24 mm TZe on PT-P900W" (560-pin)
  - "Print one 36 mm TZe on PT-P950NW" (560-pin, exclusive width)
  - "Print one 11.7 mm HSe 2:1 on PT-P900" (HSe path)
  - "Print one 12 mm TZe on PT-P750W in high-res mode"
    (verifies §7.5 — duplicated raster lines, `ESC i K` bit 6 set,
    doubled feed margin)
  - Goldens come from running the brother-label Python project
    against the same input and snapshotting its output. brother-label
    doesn't model high-res mode natively, so the high-res golden is
    derived: take the brother-label native-mode bytes, manually
    duplicate raster lines per §7.5, set bit 6 in the `ESC i K`
    payload, double the feed-margin field. Document this derivation
    in the test fixture.
- `status.test.ts` — synthetic 32-byte responses for each PT model
  resolve `detectedMedia` to the right TZe / HSe entry given the
  device. PT-P900-series 12 mm reports must resolve to the 560-pin
  geometry, not 128-pin.
- `encoder.test.ts`:
  - Invalidate length matches `device.invalidateBytes`.
  - `ESC i a` / `ESC i K` are present iff the corresponding flag is
    set.
  - `BrotherPrintOptions.highRes: true` on a device without
    `highResDpi` throws at job-build time.
  - PT-E550W `autocut: true` with compression disabled throws
    (per §7.4 / §12.12).

### 9.2 Integration

Gated behind `BROTHER_INTEGRATION=1`. Print a known small label;
read status; verify cut. Add one fixture per PT model to the
verification CTA on `docs/hardware.md`. PT contributors are
genuinely useful — these models are common in maker / shop-label
contexts. High-res mode should be exercised on at least one model
per family during phase 4/5; HSe should be exercised on at least one
560-pin model during phase 4/6.

---

## 10. Documentation

- `README.md` — rename mentions throughout; add a "previously known as
  brother-ql" paragraph under the install snippet.
- `docs/index.md` — expand the supported-devices summary to include
  PT-P / PT-E.
- `docs/hardware.md` — split the device table by line (QL, QL-wide,
  PT-P, PT-E). Each section gets the same `🟢/🔲` status column.
- `docs/core.md` — note that `ESC i a` / `ESC i K` are gated by device
  flags; document the `invalidateBytes` divergence; note the
  `feedMarginDots` table; add a high-res-mode subsection covering
  `BrotherPrintOptions.highRes` and the `device.highResDpi` requirement.
- `docs/media.md` (new — mirroring the labelwriter `expand-media-registry`
  plan) — one table per tape system: DK (existing content), TZe,
  HSe 2:1, HSe 3:1. Generated from `media.ts` by a
  `scripts/build-media-doc.mjs` so the doc and code can't drift.
  Per-model support matrix from §6.1 included so users can tell
  which tapes work with which printer.
- `docs/troubleshooting.md` — section on the missing
  `massStoragePid` for most PT models (§5.2); section on PT-E550W
  cutter requiring compression (§7.4 / §12.12).
- `docs/verification-checklist.md` — add a per-line section: PT
  models need explicit tape-width capture in the report (registry
  built from nbuchwitz/ptouch's transcription of Brother's spec
  PDFs, with two known "shifted N pins" corrections from
  testing — see §12.10), and high-res mode should be exercised
  on at least one model per family.
- `HARDWARE.md` — top-level table updated; PT-P and PT-E sections
  underneath the QL ones; one-paragraph "unsupported models"
  section calling out the handheld P-touch line (§12.7).
- `DECISIONS.md` — new entries:
  - `D9 — Combined Brother driver` (record the QL-vs-PT decision and
    the labelmanager-analogy rebuttal here so it can't be re-asked).
  - `D10 — Package rename brother-ql → brother`.
  - `D11 — TZe/HSe id ranges 400–499; lookup gated by `tapeSystem` and `device.headPins`.`
  - `D12 — nbuchwitz/ptouch is the source-of-truth for PT PIDs and
    pin configs; libptouch.c kept as secondary source; brother-label
    Python kept only as a golden-byte-stream generator.`
  - `D13 — PT-P750W stores both `pid: 0x2062` (libptouch.c, primary)
    and `massStoragePid: 0x2065` (corroborated by both libptouch.c
    and nbuchwitz, but the two disagree on which mode it is); flip
    if a contributor reports otherwise.`
  - `D14 — HSe heat-shrink tubes ship in 0.4.x rather than deferred,
    since the catalogue work is the same and HSe is the differentiator
    for the P900-series buyer.`
  - `D15 — Linux usb-ids is the source-of-truth for QL PIDs; the
    pre-existing QL-820NWB / QL-1100 / QL-1110NWB / QL-1115NWB
    entries were misaligned and have been corrected (2026-05-01).
    The misnamed `QL_820NWB` entry was dropped — PID `0x20a7` is
    actually QL-1100; the 820-series is covered by `QL_820NWBc` at
    `0x209d` since the two marketing names share that PID.`

---

## 11. Phasing

1. **Schema + rename, no PT yet** (1-2 days). Rename packages, types,
   `family` field, repo. Add `line` / `dpi` / `highResDpi` /
   `modeSetting` / `expandedMode` / `invalidateBytes` to
   `BrotherDevice`; backfill defaults for every existing QL entry.
   Add `tapeSystem` and the `geometry: { narrow?, wide? }` shape to
   `BrotherMedia`; default existing entries to `tapeSystem: 'dk'`
   with all geometry under `narrow` (QL is single-family). All unit
   tests pass; behaviour unchanged for QL users. Ship as `0.4.0`.

   **Sub-step 1a:** §12.2 dpi audit — grep `300` and `11.81` in
   `packages/core/src/`, route through `device.dpi`. Lands in the
   same PR so the rename and the dpi-genericisation move together.

   **Sub-step 1b:** ~~§12.11 QL-820NWB / QL-1100 PID verification.~~
   **Done as a pre-flight on 2026-05-01.** `devices.ts` PIDs
   for QL-820NWB / QL-1100 / QL-1110NWB / QL-1115NWB and the
   `MASS_STORAGE_PIDS` set were aligned to the Linux usb-ids database;
   the wrong `QL_820NWB` entry (PID `0x20a7` actually belongs to
   QL-1100) was dropped, leaving `QL_820NWBc` (PID `0x209d`) as the
   single 820-series entry covering both marketing names. Tests and
   docs updated. The rename PR can proceed without re-touching these
   entries.

2. **TZe catalogue + HSe catalogue** (1-2 days). Port the
   nbuchwitz/ptouch tape configs into `media.ts` with id ranges
   400–407 (TZe), 421–425 (HSe 2:1), 441–445 (HSe 3:1). Both
   `narrow` and `wide` geometries per row where the tape is
   supported; `undefined` where not (e.g. 36 mm TZe has no `narrow`
   entry). Tests for: non-collision with DK, `(width, device)`
   lookup correctness, and "36 mm TZe is unreachable from a 128-pin
   device" / "31 mm HSe-3:1 is unreachable from a 128-pin device" /
   "PT-P910BT lookups never return HSe."

3. **All six PT device entries land** (1 day). Add PT-E550W,
   PT-P750W, PT-P900, PT-P900W, PT-P950NW, PT-P910BT to
   `devices.ts` with HIGH-confidence PIDs from §5.1. Per-device
   doc-comments cite nbuchwitz/ptouch source paths and the Brother
   spec PDFs. Golden-byte tests for each model using
   brother-label Python output as the reference. All entries marked
   `🔲 Expected` in `docs/hardware.md` — none `🟢 Verified` yet.
   Ship as `0.4.1`.

4. **First hardware verification** (2-3 days, gated on hardware
   availability). Pick the smallest available PT (likely PT-P750W
   or PT-E550W). Run the integration test, validate the encoder
   gates work, capture mass-storage PID if reachable, verify the
   `feedMarginDots` value against actual print output. Verify
   PT-E550W's "compression-required-for-cutter" gotcha if E550W is
   the test unit. Promote that one model to `🟢 Verified`.

5. **High-res mode** (1 day). Land §7.5 encoder support and
   `BrotherPrintOptions.highRes`. Tests: golden bytes show duplicated
   raster lines and `ESC i K` bit 6 set. Defer hardware verification
   to whoever has a PT model — non-blocking for the 0.4.x release
   train.

6. **Remaining PT models** (rolling, contributor-driven). Each
   addition is just an integration-test pass that promotes one
   `🔲 Expected` row to `🟢 Verified` plus a fixture in
   `docs/verification-checklist.md`. PT-P910BT verification
   includes the §5.3 Bluetooth-transport check (classic SPP vs BLE
   GATT).

7. **Docs + media.md generation** (1 day, can run parallel to phases
   3-5). New page, sidebar entry, verification-checklist updates,
   `DECISIONS.md` entries D9–D11.

Total: ~1 week of plan-driven work (phases 1–3, 5, 7) ships the
schema + catalogue + all six device entries + high-res encoder.
Hardware verification (phases 4, 6) runs on its own clock as units
become available. Schema/catalogue/device-entry work in phases 1–3
ships independently of any hardware access — meaningful difference
from the prior plan revision, which had phases 3-4 fully blocked on
unknown PIDs.

---

## 12. Concerns and conflicts

### 12.1 USB PIDs *(largely resolved as of 2026-05-01)*

Updated after the nbuchwitz/ptouch research pass. All six PT models
in §5 now have HIGH-confidence printer-mode PIDs from active driver
source code that cites Brother's official spec PDFs:

- **PT-E550W:** `0x2060`
- **PT-P750W:** `0x2062` printer / `0x2065` PLite (see §5.1a for
  the libptouch.c vs nbuchwitz disagreement and resolution)
- **PT-P900:** `0x2083` (USB-only, new model in this revision)
- **PT-P900W:** `0x2085`
- **PT-P950NW:** `0x2086`
- **PT-P910BT:** `0x20C7` (Bluetooth, new model in this revision)

Outstanding gap: PLite/mass-storage sibling PIDs for everything
except PT-P750W remain unknown (§5.2). Treatment is to leave
`massStoragePid` undefined and document the limitation rather than
guess.

Phase 3 (all device entries land) is now unblocked for all six
models. Hardware verification (phase 4 onward) still depends on
contributor access.

### 12.1a Source disagreement on PT-P750W *(foot-gun, see §5.1a)*

libptouch.c says `0x2062` is the printer PID; nbuchwitz says
`0x2065` is. We treat libptouch.c as authoritative and store both
(`pid: 0x2062, massStoragePid: 0x2065`) so the existing
`MASS_STORAGE_PIDS` discovery filter handles the dual-PID case. If
a PT-P750W contributor finds the assignment wrong, we flip it.
Full reasoning in §5.1a.

### 12.1b Public USB databases are misleading for PT-P750W *(separate foot-gun)*

The-sz and linux-usb.org/usb.ids both list `0x2065` under the name
"PT-P750W" — per libptouch.c, that's the PLite mass-storage mode.
A contributor copying from those databases without checking driver
source code may end up with what libptouch.c says is the wrong PID.
Mitigation: §5.1a cites both source-of-truth driver projects in
`devices.ts` doc-comment.

### 12.2 PT-P models span 180–720 dpi *(image-pipeline impact)*

Every existing Brother device in the registry is 300 dpi. The
preview/render pipeline likely assumes 300 dpi for px↔mm
conversion — verify by grepping `300` and `11.81` (300/25.4) in
`packages/core/src/`. The new dpi values to support:

- 180 dpi — PT-E550W, PT-P750W (native)
- 360 dpi — PT-P900 series (native), or PT-E550W/P750W (high-res)
- 720 dpi — PT-P900 series (high-res)

A couple of hardcoded constants will need to become
`device.dpi`-driven. The high-res case is more involved: along the
*feed* axis the effective dpi is `device.highResDpi` when the user
opts in, while the head axis stays at `device.dpi`. The preview
renderer needs both axes.

Sub-step of phase 1 per §11. Small but real, and easy to miss.

### 12.3 nbuchwitz/ptouch is now the reference; brother-label demoted

Pre-research, `brother-label` was the closest thing we had to a
reference. After the research pass, **`nbuchwitz/ptouch` is the
better reference**: it's actively maintained (2024–2026, LGPL-2.1),
cites Brother's spec PDFs by filename, and includes per-model
PIDs and full pin configurations. brother-label remains useful for
golden-byte-stream generation (it's the closest thing to a known-good
serializer we can run locally without hardware), but for PID and
pin-config decisions, nbuchwitz wins.

Mitigation: cite specific source paths from nbuchwitz in our code
comments (filename + class name, e.g.
`nbuchwitz/ptouch/src/ptouch/printers.py:PTE550W`) and the original
Brother PDF filename it transcribed from, so future maintainers can
re-evaluate against either source.

**Important caveat on what brother-label can and cannot tell us:**
brother-label and its upstream `pklaus/brother_ql` use vendor-only
USB enumeration (`usb.core.find(idVendor=0x04f9)`) and require the
end user to specify the printer at runtime via
`usb://0x04f9:0xXXXX/serial`. Their `Model('PT-P900W', ...)` entries
carry **encoding** fields (head pin count, bytes-per-row, length
range) but **no USB PID** — useless for PID lookup, by design.
A future maintainer should not waste a research pass re-checking
this — go to nbuchwitz/ptouch instead.

### 12.4 Migration noise for existing brother-ql users

This is real but small. We're at 0.x; the user base is the maintainer
+ a handful of early adopters. The deprecation path:

```
npm deprecate @thermal-label/brother-ql-core "Renamed to @thermal-label/brother-core"
npm deprecate @thermal-label/brother-ql-node "Renamed to @thermal-label/brother-node"
npm deprecate @thermal-label/brother-ql-web  "Renamed to @thermal-label/brother-web"
```

…plus one paragraph at the top of each old-package README. Anyone
following npm deprecation prompts will land on the right place. Do
**not** ship a transitional dual-publish — that doubles the release
maintenance burden and splits issue triage.

### 12.5 Coordination with the cross-driver MediaDescriptor refactor

`plans/implemented/media-descriptor-refactor.md` already changed the
shape of `MediaDescriptor` across drivers in `contracts@0.2.0`. This
plan slots cleanly onto that — the new `tapeSystem` field is a
driver-specific extension, not a contracts change. Verify by reading
the refactor plan's "non-goals" section; if it claims to forbid
driver-side `MediaDescriptor` extensions, this plan needs a different
approach (likely: encode tapeSystem in the id range alone, using
400–499 ⇒ TZe by convention with no explicit field).

### 12.6 Coordination with labelwriter `expand-media-registry`

That plan adds `skus?: readonly string[]` to `LabelWriterMedia`. The
Brother equivalent here would be the existing `name` field already
storing things like `"DK-22251"` — Brother's tape SKUs are baked
into the human-readable name. We do **not** need a parallel `skus`
field, and we should not promote `skus` to `MediaDescriptor`. Keep
the per-driver shapes asymmetric where the underlying conventions
differ.

### 12.7 Handheld P-touch (PT-D, PT-H, PT-1xxx, PT-2xxx) is *not* in scope

Worth restating from §0. The handheld line uses a different command
set (closer to Dymo's tape-printer protocol than to Brother's raster
protocol). If a contributor opens a "support PT-D210" issue, redirect
to a future `brother-handheld` driver — same vendor, different
protocol family, doesn't belong here. Add a one-paragraph
"unsupported models" section to `HARDWARE.md` so the question gets
answered before the issue gets filed.

### 12.8 Two-colour on PT *(double-check)*

The Python project marks no PT model as two-colour, and Brother's
manuals don't list any two-colour PT-P / PT-E. But if a PT model is
ever released with red+black, the existing two-colour code path
should Just Work — the encoder already gates on `device.twoColor`
and the multi-plane render path is already in place. Leave as-is;
flag if discovered.

### 12.9 `feedMarginDots` is unverified for PT

`feed_margin=14` comes from the Python project, not from Brother's
raster manual. It governs how much blank tape gets fed before/after
the print area — a wrong value would cause label misalignment, not
a print failure. Phase 3 verification step: print a label, measure
the leading and trailing margin; if they don't match the Python
output, adjust the constant.

### 12.10 We are downstream of multiple Python/C projects

Source-of-truth lineage:

- **nbuchwitz/ptouch** (Python, 2024–2026, primary reference for
  PIDs and pin configs) — itself transcribed from Brother's official
  spec PDFs, with two flagged corrections ("shifted −2 pins (up)
  based on testing" for 128-pin HSe, "shifted +17 pins down based
  on Brother software analysis" for 560-pin HSe). Inherit those
  corrections; cite the rationale in our own code-comments so the
  next maintainer doesn't "fix" them back to the spec PDF values.
- **hannesweisbach/ptouch-print** (C, libptouch.c) — disagrees
  with nbuchwitz on PT-P750W's printer PID. See §5.1a.
- **brother-label / pklaus/brother_ql** (Python) — useful for
  golden-byte stream generation, *not* for PIDs.

Worth a one-pass diff between nbuchwitz and the older Python
projects before locking the TZe catalogue values. Recorded as a
phase-2 task.

### 12.11 Pre-existing PID discrepancy in QL-820NWB / QL-1100 entries — **resolved 2026-05-01**

The previous `packages/core/src/devices.ts` shipped with PIDs that
contradicted the Linux usb-ids database:

```
Old devices.ts          Linux usb-ids
─────────────────       ──────────────────────
QL_820NWB:  0x20a7  →   0x20a7 = QL-1100
QL_1100:    0x20a8  →   0x20a8 = QL-1110NWB
QL_1110NWB: 0x20a9  →   0x20a9 = QL-1100 (mass storage)
QL_1115NWB: 0x20ac  →   0x20ab = QL-1115NWB; 0x20ac = its mass storage
massStoragePids: {0x20aa, 0x20ab}  →  {0x20a9, 0x20aa, 0x20ac}
```

The maintainer's actual hardware (QL-820NWBc, PID `0x209d`,
captured into auto-memory `hardware.md`) **agreed with the Linux DB**,
which strongly suggests the rest of the table was also wrong rather
than the DB.

**Resolution:** aligned `devices.ts` to the Linux DB. The wrong
`QL_820NWB` entry was dropped — its PID `0x20a7` is QL-1100, and
the 820-series is covered by the existing `QL_820NWBc` entry at
`0x209d` (the QL-820NWB and QL-820NWBc share a PID; the `c` is a
regional variant). Tests and docs updated; all 88 core tests, 31 node
tests, 16 web tests pass. Recorded as decision D15 (pending in
`DECISIONS.md`).

This isn't strictly a PT-series concern, but the rename PR was
going to touch every device entry, so it was the natural moment to
correct PIDs. Done as pre-flight; the rename can now proceed
without re-litigating these values.

### 12.12 PT-E550W cutter requires compression *(model-specific gotcha)*

Per §7.4 / `nbuchwitz/ptouch:PTE550W`: the PT-E550W will not cut if
compression is disabled. This is undocumented in Brother's manual
and was discovered through testing. Mitigation: model-specific
validation in `buildJob()` that throws when `autocut: true && compression: false`
on PT-E550W. Verify on hardware in phase 4 if E550W is the test unit.

If we discover other model-specific gotchas during hardware
verification, the same per-model validation pattern scales — better
than a generic feature flag for one model.

### 12.13 HSe heat-shrink tubes — scope decision

We're including HSe in the initial 0.4.x release rather than
deferring. Reasoning:

- **Pin configs are already in the source we're porting from** —
  excluding them would mean writing extra code to ignore them, not
  saving any work.
- **HSe is the differentiator for the maker / industrial market** —
  every PT-P900-series user we know of bought it specifically for
  HSe, since cheaper PT-D models cover the TZe-only use cases.
- **The schema impact is the same as TZe** — `tapeSystem: 'hse-2to1' | 'hse-3to1'`
  vs `'tze'`, no new fields, no new code paths in the encoder.

The "shifted N pins" corrections from nbuchwitz are real risk —
they suggest the pin-config values aren't fully trustworthy. Phase 4
hardware verification should print HSe samples and measure to
confirm. If the corrections are wrong for our use case, we update
the catalogue.

### 12.14 High-res mode opt-in surface

§7.5 adds a `highRes?: boolean` to `BrotherPrintOptions`. Two
considerations for the API surface:

- **Discoverability:** users won't know high-res exists unless docs
  surface it. `docs/printing.md` should have a "high-resolution mode"
  subsection per device line, with the dpi-doubling clearly stated.
- **Failure mode:** opting in on a device without `highResDpi` set
  (any QL) should throw at job-build time with a clear message,
  not silently fall back to native dpi. Test for this in
  `encoder.test.ts`.

---

## 13. Open questions

- **Should `BrotherLine` also include `'pt-handheld'` as a
  reserved-but-unused value, to make the future driver split more
  graceful?** Argued no — adding a value the encoder rejects on every
  branch is dead code. If the handheld driver ever ships, it'll be a
  separate package and a separate `family` value entirely.
- **Do PT-P models support TCP printing on port 9100 like QL?**
  PT-P900W and PT-P950NW advertise wired/Wi-Fi network printing on
  spec sheets; PT-P900 is USB-only; PT-P910BT is Bluetooth-only;
  PT-E550W and PT-P750W are Wi-Fi but Brother's marketing emphasizes
  iPrint&Label app integration over raw 9100. Set `transports`
  per-model from spec sheets in phase 3, refine in phase 4 hardware
  verification. Mark unverified entries in `docs/hardware.md`.
- **Does PT-P910BT use classic Bluetooth SPP or BLE GATT?** Plan
  defaults to classic SPP (`'serial'` / `'web-serial'`) per §5.3.
  If GATT, that's a major scope expansion blocked on the niimbot
  plan's BLE work.
- **Can the `lsusb` output for the missing mass-storage PIDs be
  sourced from a community member without a hardware purchase?**
  Worth asking on the issue tracker — every hour of contributor
  PID-capture is one fewer device on the maintainer's desk. Phase 6
  is the natural collection point.
- **Should `BrotherMedia.geometry` use `'narrow' | 'wide'` keys or
  numeric `headPins` keys?** §6.2's helper uses `'narrow' | 'wide'`
  for readability and to leave room for a future `'extra-wide'` if
  Brother ships a >560-pin PT model. Numeric keys would be more
  type-safe (the union of literal `HeadPins` values). Decide during
  phase 1; the choice is reversible and trivial.
- **High-res mode default?** Currently `highRes` is opt-in via
  `BrotherPrintOptions`. Alternative: per-device default
  (e.g. PT-P900 defaults to high-res because that's what Brother's
  own software does). Probably keep opt-in for predictability and
  let docs surface the option clearly. Revisit if hardware testing
  shows native-res prints look bad enough to warrant defaulting on.
