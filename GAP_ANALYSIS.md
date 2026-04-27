# Gap Analysis vs `ThomasPoinsot/brother_ql-webusb`

Date: 2026-04-26
Reference repo: <https://github.com/ThomasPoinsot/brother_ql-webusb>
Compared revision: `master` HEAD (commits up to mid-2025).

This document captures gaps and opportunities identified when reading the
reference WebUSB driver against this monorepo. It is organised into:

1. Bugs to fix (anything broken today)
2. Hardware coverage (PT-series, label catalogue)
3. Documentation drift between [docs/media.md](docs/media.md) and the
   `MEDIA` registry in [packages/core/src/media.ts](packages/core/src/media.ts)
4. Status-response under-utilisation
5. Image-pipeline upgrades that belong in `@mbtech-nl/bitmap`

Architecture comparison (transports, adapters, two-colour split, structured
errors, mass-storage detection) lives in conversation history — those are
strengths of this repo, not gaps.

---

## 1. Bugs

### 1.1 PackBits compression is wired up but not implemented

`PageOptions.compress` flows through to
[buildCompression(true)](packages/core/src/protocol.ts#L76) which emits
`M 02` to switch the printer into TIFF/PackBits mode, but the per-row encoder
[buildRasterRow](packages/core/src/protocol.ts#L83-L99) and the encode loop
[encodeJob:195-207](packages/core/src/protocol.ts#L195-L207) push raw row
bytes regardless. Result: any caller passing `{ compress: true }` produces a
stream the printer will mis-interpret.

Two viable fixes, in order of preference:

- **Implement PackBits.** It is ~40 lines (see Thomas's
  [packbits.ts](https://github.com/ThomasPoinsot/brother_ql-webusb/blob/master/src/brother-lib/packbits.ts)).
  Place it in `@mbtech-nl/bitmap` (it is generically useful for thermal
  printer rasters) and import it from `protocol.ts`. `buildRasterRow` then
  takes the already-encoded bytes; the `len` byte already carries the
  compressed length so the wire format stays right.
- **Drop the option.** Remove `PageOptions.compress`, the
  `buildCompression()` helper, and the related branch. Justified if we never
  intend to optimise wire bandwidth — for USB it makes no measurable
  difference; for `tcp` and `web-serial` it could.

Recommendation: implement, because we need it for QL-820NWB Bluetooth-SPP
where every byte saved cuts seconds off a multi-page job.

### 1.2 Hard-coded 200-byte invalidate

[buildInvalidate](packages/core/src/protocol.ts#L4-L6) returns a fixed
`Uint8Array(200)`. We previously saw 400-byte buffers in the
QL-800/810/820 path; that was changed to 200 during a debugging session and
left at 200 because the actual fix was elsewhere. Keep at 200 — Brother's
own raster reference and Python `brother_ql` both use 200, and the unit
tests/hardware run on DK-22251 confirm it works. **No action needed.**
This entry exists so future readers don't try to "restore" the 400.

---

## 2. Hardware coverage

### 2.1 PT-series — feasibility

The PT family (PT-P700, PT-E550W, PT-P750W, PT-P900W, PT-P950NW) shares the
ESC/i framing but diverges at three points:

| Concern              | QL behaviour                | PT behaviour                                                     |
| -------------------- | --------------------------- | ---------------------------------------------------------------- |
| Raster row opcode    | `0x67 00 LEN …` / `0x77 …`  | `0x47 LEN_LO LEN_HI …` (different opcode + 2-byte length)        |
| Print-info media-byte | `0x0a` / `0x0b`             | `0x00` (PTOUCH_ENDLESS form factor)                              |
| Expanded-mode flags  | `cut_at_end`/`dpi_600`/`2c` | `half_cut`/`no_chain_printing`/`dpi_600` (different bit layout)  |
| Head pin counts      | 720 or 1296                 | 128 (PT-P700/E550W = 16 bytes/row), 560 (PT-P900W = 70 bytes)    |
| Tape geometry        | Continuous + die-cut        | "PTOUCH endless" — fixed pin-window with offset-r per tape width |

This is not a small graft. It is a *second protocol family* sharing 70%
of the encoder. Two ways forward:

- **Branch in [protocol.ts](packages/core/src/protocol.ts).** Add a
  `family: 'ql' | 'pt'` flag (already on `BrotherQLDevice` as `family:
  'brother-ql'`) and switch on it inside the existing builders. Cheap;
  the encoder gets messier.
- **Split into a `brother-pt-core` sibling package.** Cleaner long-term,
  shares `transport`, `contracts`, and `@mbtech-nl/bitmap`. ~1 day to
  scaffold, ~1 day to port the device + label registries, ~1–2 days for
  the encoder and tests.

Recommendation: defer until somebody actually has PT hardware to validate
on. The protocol delta is large enough that a "blind" port from Thomas's
`raster.ts` is risky — we'd be shipping untested code. File this as a
follow-up issue with a bounty-style "needs PT hardware to verify" tag.

### 2.2 QL device-registry deltas

Reference adds these QL/QL-derived devices we do not have:

- nothing critical we are missing — every QL device in Thomas's
  `models.ts` that has a current customer is in
  [packages/core/src/devices.ts](packages/core/src/devices.ts).

Reference is **missing** entries we have, which we should keep:

- `QL-820NWBc` (`pid: 0x209d`) — the silent revision used as our primary
  test target.
- `QL-820NWB` (`pid: 0x20a7`) — Thomas codes only the `c` revision.
- Mass-storage PIDs (`0x20aa`, `0x20ab`) and the `editorLite` flag.

No device-registry action required.

### 2.3 Label catalogue deltas

Reference's [labels.ts](https://github.com/ThomasPoinsot/brother_ql-webusb/blob/master/src/brother-lib/labels.ts)
has 34 entries; ours has 17. Missing entries that map to a real DK code
or 3rd-party tape:

| Identifier | Form factor   | Notes                                              |
| ---------- | ------------- | -------------------------------------------------- |
| `12+17`    | endless       | DK-22214 12mm tape printed with extended margin    |
| `18`       | endless       | TZ-equivalent narrow tape — PT-only, see §2.1      |
| `60×86`    | die-cut       | DK-11234, QL-800 era — **media id 383** per docs   |
| `103`      | endless       | QL-1100-series only, 104mm raw                     |
| `103×164`  | die-cut       | DK-11247 — listed in docs as "not yet mapped"      |
| `pt12/18/24/36` | ptouch_endless | PT-only, see §2.1                              |

Add `60×86` (DK-11234, id 383) and `103×164` (DK-11247) now — both
are documented and only need geometry numbers from the QL-1060N service
manual already cited in [docs/media.md](docs/media.md). The rest can wait
until PT-series lands.

---

## 3. Documentation vs implementation drift

[docs/media.md](docs/media.md) is the more recent and more researched
source. Reconcile [packages/core/src/media.ts](packages/core/src/media.ts)
to it. Concrete corrections needed:

| Media id | media.ts says            | docs/media.md says                       | Action                                        |
| -------- | ------------------------ | ---------------------------------------- | --------------------------------------------- |
| 262      | `50mm continuous (DK-22246)` | DK-22**223** White Paper Tape 50mm   | Fix DK code in `name`                         |
| 272      | `38×90mm die-cut (DK-11218)` | DK-11**208** Large Address Label     | Fix DK code in `name`                         |
| 362      | `12mm Ø die-cut` (no DK)     | DK-11**219** Round Paper Label 12mm  | Add DK code to `name`                         |
| 363      | `24mm Ø die-cut (DK-11221)`  | DK-11**218** Round Paper Label 24mm  | Fix DK code in `name`                         |
| 370      | `23×23mm die-cut` (no DK)    | DK-11**221** Square Paper Label      | Add DK code to `name`                         |
| 367      | `39×48mm die-cut (DK-11219)` | not in service-manual switch table   | Verify against hardware; rename if wrong      |
| —        | not present                  | id **383** DK-11234 60×86mm          | Add registry entry                            |

The `name` field is human-facing only — none of these typos affect
detection (which is purely geometric in
[findMediaByDimensions](packages/core/src/media.ts#L293)). They will,
however, surface in error messages and previews, so worth fixing as a
single batch.

### 3.1 Continuous-film rolls without firmware IDs

`docs/media.md` lists DK-22211, DK-22212, DK-22606, DK-22113 — film
variants of existing paper rolls with no entry in the QL-1060N switch
table and therefore no firmware media id. They cannot be auto-detected and
are only useful as manual `MediaDescriptor` overrides. Decision needed:

- **Add as alias entries** to the registry under synthetic ids (e.g.
  `2211`) so callers can pass them by name. Fragile: any future Brother
  registry collision breaks us.
- **Document them in [docs/media.md](docs/media.md) only** and require
  callers to construct `BrotherQLMedia` literals when using film rolls.
  Recommended — matches the "registry mirrors firmware" invariant.

---

## 4. Status response — bytes we don't read

[parseStatus](packages/core/src/status.ts#L49-L83) extracts bytes 8, 9,
10, 11, 17, 18. [docs/media.md §"Status response — undocumented bytes"](docs/media.md)
identifies two more that carry useful signal on the QL-800 series:

- **Byte [25] bit 7 (`0x80`)** — hypothesised two-colour flag.
  Confirmed pattern: DK-22251 reports `0x81`, DK-11201 reports `0x01`.
  If verified across more rolls, we can stop guessing two-colour mode
  from `findMediaByDimensions(... twoColorMode)` and read it directly.
  Action: take more status dumps (at least one single-colour 62mm tape
  loaded into a QL-800 series printer) and confirm.
- **Byte [14]** — varies per roll, hypothesised CAS-derived value.
  Documented as "fixed at 3Fh" but observed `0x23` (DK-22251) and
  `0x01` (DK-11201). May encode the SW pin pattern from
  `docs/media.md`'s switch table directly. Worth dumping across more
  rolls and decoding — would unlock automatic film-roll detection
  (§3.1) without changing the registry shape.
- **Media-type byte [11] on QL-800 series** — docs note the 800-series
  reports `0x4A/0x4B` instead of `0x0A/0x0B`. We currently only check
  `mediaTypeByte !== 0` so detection still works, but bit 6 (`0x40`)
  may itself be the two-colour flag. Cross-check with byte [25] bit 7
  during the same dump session.

This is hardware-probing work, not coding work. Outcome: a memory entry
in [memory/status-capture.md](../../home/mannes/.claude/projects/-home-mannes-thermal-label-brother-ql/memory/status-capture.md)
and, if confirmed, a one-line change to `parseStatus` to set
`twoColorMode` from byte [25] before calling `findMediaByDimensions`.

---

## 5. Image pipeline — upgrades for `@mbtech-nl/bitmap`

The reference's [conversion.ts](https://github.com/ThomasPoinsot/brother_ql-webusb/blob/master/src/brother-lib/conversion.ts)
exposes a richer image-prep pipeline than `@mbtech-nl/bitmap` currently
offers. Because the bitmap package is shared across multiple printer
drivers (Brother QL, LabelManager, future PT), every improvement here
benefits all of them.

Current bitmap API (`@mbtech-nl/bitmap` 1.x):

- `renderImage(rgba, { threshold, dither: bool, invert, rotate })`
- `floydSteinberg(luminance, w, h, invert)`
- `rotateBitmap`, `flipHorizontal/Vertical`, `invertBitmap`,
  `scaleBitmap`, `cropBitmap`, `stackBitmaps`, `padBitmap`
- Built-in 8×8 font + `renderText/measureText`

Gaps vs Thomas's pipeline:

### 5.1 Additional dithering kernels

`floydSteinberg` is the only error-diffusion implementation. Add:

- **Stucki** (12-tap, 1/42 divisor) — heavier ramp, better for line art.
- **Atkinson** (6-tap, 1/8 divisor) — Mac-style, less smearing on photos.
- **Jarvis-Judice-Ninke** (12-tap, 1/48 divisor) — middle ground.

Public API: extend `ImageRenderOptions.dither` from `boolean` to
`'none' | 'floyd-steinberg' | 'stucki' | 'atkinson' | 'jarvis'`.
Backwards-compatible if `true` continues to mean Floyd-Steinberg.

### 5.2 CLAHE (Contrast Limited Adaptive Histogram Equalization)

Thomas's [conversion.ts:279-344](https://github.com/ThomasPoinsot/brother_ql-webusb/blob/master/src/brother-lib/conversion.ts#L279-L344)
implements CLAHE in ~70 lines of vanilla TS. Vital for printing
photographs and screenshots — flat midtones become readable. Public API:

```ts
applyCLAHE(luminance: Float32Array, w: number, h: number, opts?: {
  clipLimit?: number;   // default 6
  tilesX?: number;      // default 6
  tilesY?: number;      // default 6
  alpha?: number;       // 0..1 blend with original; default 1
}): Float32Array
```

Pipeline order matters: rotate → grayscale → resize → CLAHE → remap →
gamma → threshold/dither. Document this in the bitmap README so all
driver authors run the steps in the same order.

### 5.3 Tone-mapping primitives

Thomas exposes three orthogonal knobs callers want often:

- **Dynamic remap**: `min_visible..max_visible → 0..255` linear mapping.
- **Gamma correction**: `pow(L/255, gamma) * 255`.
- **Per-channel luminance weights**: he hard-codes ITU-R BT.601
  (`0.299/0.587/0.114`); we currently use whatever
  [rgbaToLuminance](https://www.npmjs.com/package/@mbtech-nl/bitmap)
  uses internally — verify and either match or expose the weights.

Add as standalone exports (`remapTone`, `applyGamma`) so callers can
compose them; keep `renderImage()` simple.

### 5.4 Auto-rotate based on aspect-fit

Thomas's `convertImage` auto-rotates 90° when an endless-tape image is
landscape. This belongs in the driver, not the bitmap library — the
bitmap package doesn't know about tape geometry. **No bitmap change
needed**, but worth surfacing as a `WebBrotherQLPrinter.print()` option
named `rotate: 'auto' | 0 | 90 | 180 | 270`.

### 5.5 PackBits encoder (cross-cutting)

See §1.1 — the right home for PackBits is `@mbtech-nl/bitmap`'s
`encode.ts`, alongside `getRow`, `bytesPerRow`, etc. Signature:

```ts
export function packBits(data: Uint8Array): Uint8Array
```

Brother QL, future PT-series, Dymo LabelWriter, and any other thermal
driver that uses TIFF-style row compression all benefit. ~40 lines, pure
function, trivial to test.

### 5.6 Two-colour split as a primitive

**Done.** As of `@mbtech-nl/bitmap@1.2.0`, `renderMultiPlaneImage` is
the canonical multi-plane splitter — palette-based, with per-plane
threshold/dither/gamma overrides and an optional CIELAB classifier.
This package consumes it directly via the `BROTHER_QL_TWO_COLOR_PALETTE`
constant; the old `splitTwoColor`/`isRedish` heuristic has been removed.
Other two-colour thermal drivers (some Zebra, Sato CT4-LX with red
ribbon) can adopt the same primitive with a different palette.

---

## Suggested execution order

1. **Reconcile media-name DK codes** (§3) — pure rename, no behaviour
   change, can ship today.
2. **Add `60×86` (id 383) and `103×164` to the registry** (§2.3, §3) —
   small, mechanical.
3. **Implement PackBits in `@mbtech-nl/bitmap`** and wire through
   `encodeJob` (§1.1, §5.5) — fixes the broken `compress: true` path.
4. **Add Stucki/Atkinson dither and CLAHE to `@mbtech-nl/bitmap`**
   (§5.1, §5.2) — visible quality bump, cross-driver.
5. **Hardware probe**: status bytes [14] and [25] across at least four
   roll types on a QL-820NWB (§4) — unlocks reliable two-colour
   detection.
6. **PT-series scaffold** (§2.1) — only when there is hardware to
   validate against; otherwise risk shipping blind.
