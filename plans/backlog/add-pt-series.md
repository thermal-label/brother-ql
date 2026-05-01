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
export type Dpi = 300 | 360;

export interface BrotherDevice extends DeviceDescriptor {
  family: 'brother';
  vid: number;
  pid: number;
  /** Which Brother model line this belongs to. Drives form-factor and
   *  catalogue selection in the encoder + media lookup. */
  line: BrotherLine;
  headPins: HeadPins;
  bytesPerRow: number;
  /** Print head density. QL family is 300; PT-P900/P950 are 360. */
  dpi: Dpi;
  twoColor: boolean;
  network: NetworkSupport;
  autocut: boolean;
  compression: boolean;
  editorLite: boolean;
  /** `ESC i a` (mode setting) supported. PT models accept it; some
   *  legacy QLs (QL-500/550/560/570/700) reject it. Defaults true. */
  modeSetting: boolean;
  /** `ESC i K` (expanded mode) supported. Used to enable two-colour
   *  + cut-at-end. PT-E550W lacks it. Defaults true. */
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
`dpi: 300`, `modeSetting: true`, `expandedMode: true`,
`invalidateBytes: 200` (QL-800 series → `400`). Backfill the existing
device registry in the same PR.

`BrotherMedia` gains a `tapeSystem` discriminator:

```ts
export type TapeSystem = 'dk' | 'tze';

export interface BrotherMedia extends MediaDescriptor {
  id: number;
  type: 'continuous' | 'die-cut';
  tapeSystem: TapeSystem;
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
  dieCutMaskedAreaDots?: number;
}
```

`tapeSystem` lets `findMediaByDimensions(widthMm, heightMm, line)` skip
TZe entries when the user is on a QL and DK entries when on a PT — two
catalogues sharing a numeric id space without ambiguity.

---

## 5. Device additions

| Model     | Printer-mode PID    | PLite/mass-storage PID | DPI | Head pins | Bytes/row | Two-colour | Network   | Line   |
| --------- | ------------------- | ---------------------- | --- | --------- | --------- | ---------- | --------- | ------ |
| PT-P750W  | `0x2062` ✅         | `0x2065` ✅            | 180 | 128       | 16        | ❌         | Wi-Fi     | `pt-p` |
| PT-E550W  | `0x2060` ⚠️ (~70%)  | unknown                | 180 | 128       | 16        | ❌         | Wi-Fi     | `pt-e` |
| PT-P900W  | **unknown** ❓       | unknown                | 360 | 560       | 70        | ❌         | Wi-Fi     | `pt-p` |
| PT-P950NW | **unknown** ❓       | unknown                | 360 | 560       | 70        | ❌         | Wi-Fi+LAN | `pt-p` |

### 5.1 PID confidence and sources

- **PT-P750W — HIGH confidence.** Source: `hannesweisbach/ptouch-print/src/libptouch.c` (active C source, in production use):
  ```
  {0x04f9, 0x2062, "PT-P750W",            128, 180, FLAG_RASTER_PACKBITS|FLAG_P700_INIT},
  {0x04f9, 0x2065, "PT-P750W (PLite Mode)",128, 180, FLAG_PLITE},
  ```
  Note that `0x2062` is the printer-class mode the driver must talk to. **Most public USB databases (the-sz, linux-usb.org/usb.ids) list only `0x2065` under the name "PT-P750W"** — that's the PLite (Editor Lite mass-storage) mode the printer ships in by default. Anyone copying from those databases will end up with the wrong PID and silent print failures. This is exactly the same situation as the existing QL-700 / QL-1100 Editor Lite mass-storage PIDs already handled in `devices.ts` via `massStoragePid`. Document prominently.

- **PT-E550W — MEDIUM confidence (~70%).** Source: the-sz.com USB ID database lists `0x2060 — PT-E550W P-touch Label Printer`, corroborated by linux-usb.org `usb.ids`. No active driver source code I could find references it directly, but the PID slots cleanly between `0x205f` (PT-E500), `0x205e` (PT-H500), and `0x2061` (PT-P700), which is the kind of sequential numbering Brother uses within a release wave. Treat as plausible-but-unverified until lsusb confirms on real hardware. The "PLite Mode" sibling PID, if one exists, is also unknown.

- **PT-P900W — LOW confidence (<50%, mark UNSURE).** No source I checked lists this model's PID. Specifically:
  - `hannesweisbach/ptouch-print/src/libptouch.c` — does not cover PT-P900W.
  - `philpem/printer-driver-ptouch` — does not list a PID.
  - `fuzeman/brother-label` and its upstream `pklaus/brother_ql` — register `Model('PT-P900W', (57, 28346), number_bytes_per_row=70)` for encoding purposes only; their USB layer is vendor-only (`usb.core.find(idVendor=0x04f9)`) with no PID-to-model table. This isn't an oversight — it's how that architecture works; the user types `usb://0x04f9:0xXXXX/...` themselves on the CLI. Reliable for encoding fields, not a PID source.
  - the-sz.com, linux-usb.org/usb.ids, devicehunt, openprinting.org — listings stop at PT-D600 (`0x2074`); higher-PID PT models are not in these databases.
  - One earlier search-result summary suggested `0x2085`, but direct lookup against the-sz.com (`?v=0x04F9&p=0x2085`) did not corroborate it. Treating that value as **discarded** — do not bake it in.

  **Phase 3 cannot start for PT-P900W until lsusb captures it on real hardware.**

- **PT-P950NW — LOW confidence (<50%, mark UNSURE).** Identical situation to PT-P900W across all sources. Likely sequential to PT-P900W's PID once that's known (the two are sibling SKUs with the same firmware, differing only in network capability).

### 5.2 What to do with the unknown PIDs

Until captured on hardware, leave the PT-P900W and PT-P950NW entries
**out** of `devices.ts`. Do not commit placeholder `0x0000` PIDs —
they'll silently match nothing in `findDevice()` and lull a future
maintainer into thinking the model is supported.

Add the two models to a new file `packages/core/src/devices-unverified.ts`
as a documentation-only export:

```ts
export const UNVERIFIED_DEVICES = [
  { name: 'PT-P900W',  vid: 0x04f9, pid: null, line: 'pt-p', dpi: 360, ... },
  { name: 'PT-P950NW', vid: 0x04f9, pid: null, line: 'pt-p', dpi: 360, ... },
];
```

so the verification CTA on the docs site can still mention them as
"contributors needed" without the runtime treating them as known.

`bytesPerRow` values come from the brother-label Python project
(`brother_label/devices.py:165-170`). DPI values: PT-P750W 180 dpi
confirmed via `libptouch.c` source. PT-E550W 180 dpi from
brother-label Python; PT-P900/P950 360 dpi is from Brother's own
specsheets but I have not seen it in driver source code — verify on
hardware in phase 1.

### 5.1 Bluetooth on PT models

The PT-P900W has a "Wi-Fi" suffix; the PT-P950NW and PT-E550W also
list Bluetooth in some variants. Per the existing brother-ql
convention (`packages/core/src/types.ts` doc-comment: classic Bluetooth
SPP via `'serial'` / `'web-serial'`), treat any PT model with
Bluetooth the same way: `transports: [..., 'serial', 'web-serial']`,
no GATT. Verify per-model during phase 1; if any PT model uses BLE
GATT instead of classic SPP, that's a §11 concern (we'd need
`web-bluetooth` + the still-missing node BLE class, see the niimbot
plan).

---

## 6. Media catalogue — TZe tapes

PT-P / PT-E exclusively uses TZe (and TZ-legacy) laminated tape
cartridges. All continuous; no die-cut. Width range is **narrower**
than DK (3.5–36 mm vs DK's 12–62 mm) but the print-area-dots geometry
is similar enough that the existing `MediaDescriptor` shape covers it
without changes.

Initial entries from `brother_label/devices.py:120-135` (verify
against Brother's tape spec PDFs during implementation):

| Width  | Print area dots | Left pins | Right pins | Suggested id |
| ------ | --------------- | --------- | ---------- | ------------ |
| 3.5 mm | 24              | 52        | 52         | 401          |
| 6 mm   | 32 / 42         | 48        | 48         | 402          |
| 9 mm   | 50 / 64         | 39        | 39         | 403          |
| 12 mm  | 70 / 84 / 150*  | 29        | 29         | 404          |
| 18 mm  | 112 / 128       | 8         | 8          | 405          |
| 24 mm  | 128 / 170       | 0         | 0          | 406          |
| 36 mm  | 454             | 61        | 61         | 407          |

`*` Two values where the Python project lists different geometries
for PT-P750W (16-byte head) vs PT-P900W (70-byte head) for the same
physical tape width. The print-area-dots field needs to be
**resolved at lookup time** based on `device.headPins`, not stored
once on the media entry. Two options:

1. **Store both** — add a sibling `printAreaDotsByHeadPins?: Record<HeadPins, number>` field; `printAreaDots` becomes a fallback.
2. **Split into two registry entries** — `tze-12-128pin` and `tze-12-560pin`, looked up via `(widthMm, line)` rather than width alone.

Recommend option 1: keeps the registry one-row-per-physical-tape and
matches how the Python project models it. Document the override
behaviour in `BrotherMedia`'s doc-comment.

Suggested id range: **400–499 for TZe**, leaving the existing 200–300
range intact for DK. Don't reuse DK ids for TZe — even if the
firmware never reports them in conflict, the registry is a public API
surface.

`DEFAULT_MEDIA` for the PT path: 12 mm TZe (most common starter
tape). Keep the QL default unchanged.

`findMediaByDimensions` needs a `line` (or `tapeSystem`) parameter so
QL lookups don't return TZe entries and vice versa. Update callers in
`status.ts` (`detectedMedia` resolution) and `preview.ts`.

---

## 7. Encoder changes

The `protocol.ts` encoder is already feature-flag-driven. Three
deltas, all small.

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
Brother's PT raster manual during phase 1.

### 7.4 What does *not* change

Status request, status response parsing, raster line opcode (`G`),
PackBits compression, init/reset, two-colour plane encoding —
identical between QL and PT-P. Same code path.

---

## 8. Status response

PT-P900W's 32-byte response is byte-for-byte the same shape as QL.
Bytes 0-3 are fixed (`0x80 0x20 'B' '0'`); byte 4 is the model
identifier (PT-P900W: `0x69` per Brother's manual). The existing
`parseStatus()` already keys off byte 10/11 for media dimensions and
ignores the model byte; no change needed there.

What **does** change: `findMediaByDimensions` is called inside
`parseStatus()` to populate `detectedMedia`. It now needs the
`line`/`tapeSystem` argument from §6 so a PT printer reporting
"12 mm" resolves to the TZe entry, not the DK entry. Thread `device`
through to `parseStatus(device, bytes)` — already the calling
convention in labelwriter, copy that shape.

PT models do **not** have Editor Lite. Set `editorLite: false` in
their device entries; `BrotherStatus.editorLiteMode` stays in the
shape but is always `false` for PT, mirroring how legacy QLs already
treat it.

---

## 9. Tests

### 9.1 Unit

- `devices.test.ts` — every PT entry resolves by `(vid, pid)`; every
  device's `line`/`bytesPerRow`/`headPins` is internally consistent
  (e.g. `bytesPerRow * 8 === headPins`).
- `media.test.ts` — TZe entries don't collide with DK entries;
  `findMediaByDimensions(width, height, 'ql')` never returns a TZe;
  vice versa.
- `protocol.test.ts` — golden byte sequences for "print one 12 mm TZe
  label on a PT-P750W" and "print one 24 mm TZe on a PT-P900W". The
  goldens come from running the brother-label Python project against
  the same input and snapshotting its output, not from re-deriving
  from the manual. (The Python project is the closest thing to a
  reference implementation that exists.)
- `status.test.ts` — synthetic 32-byte responses for each PT model
  resolve `detectedMedia` to the right TZe entry.
- `encoder.test.ts` — invalidate length matches `device.invalidateBytes`;
  `ESC i a` / `ESC i K` are present iff the flags are set.

### 9.2 Integration

Gated behind `BROTHER_INTEGRATION=1`. Print a known small label;
read status; verify cut. Add one fixture per PT model to the existing
verification CTA on `docs/hardware.md`. PT contributors are
genuinely useful — these models are common in maker / shop-label
contexts.

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
  `feedMarginDots` table.
- `docs/media.md` (new — mirroring the labelwriter `expand-media-registry`
  plan) — one table per tape system. DK section first (existing
  content), TZe section appended. Generated from `media.ts` by a
  `scripts/build-media-doc.mjs` so the doc and code can't drift.
- `docs/verification-checklist.md` — add a per-line section: PT
  models need explicit tape-width capture in the report, since the
  TZe registry is being built largely from the Python project's
  values rather than first-party Brother docs.
- `HARDWARE.md` — top-level table updated; PT-specific section
  underneath the QL one (parallel to the QL-wide section that already
  exists).
- `DECISIONS.md` — new entries:
  - `D9 — Combined Brother driver` (record the QL-vs-PT decision and
    the labelmanager-analogy rebuttal here so it can't be re-asked).
  - `D10 — Package rename brother-ql → brother`.
  - `D11 — TZe id range 400–499; lookup gated by `tapeSystem`.`

---

## 11. Phasing

1. **Schema + rename, no PT yet** (1-2 days). Rename packages, types,
   `family` field, repo. Add `line` / `dpi` / `modeSetting` /
   `expandedMode` / `invalidateBytes` to `BrotherDevice`; backfill
   defaults for every existing QL entry. Add `tapeSystem` to
   `BrotherMedia`; default existing entries to `'dk'`. All unit tests
   pass; behaviour unchanged for QL users. Ship as `0.4.0`.
2. **TZe catalogue** (1 day). Port the brother-label Python tape list
   into `media.ts` with id range 400–499. Tests for non-collision
   with DK and for `(width, line)` lookup correctness.
3. **One PT model end-to-end** (2-3 days). Pick PT-P750W (smallest,
   most common). Add device entry, capture USB PID via `lsusb`, run
   integration test on real hardware. Validate goldens against
   brother-label Python output. Confirms the encoder gates work
   correctly.
4. **Remaining PT models** (1 day). PT-P900W, PT-P950NW, PT-E550W.
   Each is a device-entry addition + golden test once phase 3
   established the pattern. PT-E550W needs `expandedMode: false`
   verified.
5. **Docs + media.md generation** (1 day). New page, sidebar entry,
   verification-checklist updates.
6. **Release** as `0.4.1` after phase 4 lands. No PT model marked
   `🟢 Verified` until a contributor (or maintainer) has run the
   integration test.

Total: ~1 week with at least one PT-P / PT-E on hand. Without
hardware, phases 3-4 stall; the schema and catalogue work in
phases 1-2 still ships independently.

---

## 12. Concerns and conflicts

### 12.1 USB PIDs are partially captured *(no longer a blocker for PT-P750W; still blocking PT-P900W / P950NW)*

Updated after research pass. State of play (full sources in §5.1):

- **PT-P750W:** `0x2062` (printer mode) + `0x2065` (PLite mass-storage) — HIGH confidence from active driver source code.
- **PT-E550W:** `0x2060` — MEDIUM confidence (~70%) from USB ID databases, no driver-source corroboration.
- **PT-P900W / PT-P950NW:** unknown — LOW confidence (<50%). Mark as unverified per §5.2; phase 3 cannot start for these two until lsusb output is captured.

Phase 3 can begin with PT-P750W as the lead model; the other three
catch up as PIDs become available.

### 12.1a Public USB databases are misleading for PT-P750W *(foot-gun)*

The-sz and linux-usb.org/usb.ids both list `0x2065` under the name
"PT-P750W". That's the **PLite (Editor Lite mass-storage) mode PID**,
not the printer-class PID. The actual printer PID is `0x2062`. A
contributor copying from those databases will silently get a
non-functional driver because `0x2065` doesn't accept raster
commands at all.

Mitigation: cite `libptouch.c` as the source-of-truth in the
`devices.ts` doc-comment for PT-P750W's entry, and put both PIDs in
the entry — `pid: 0x2062, massStoragePid: 0x2065` — so the
existing `MASS_STORAGE_PIDS` discovery filter in `devices.ts:3`
already handles the case correctly. Same pattern as QL-700 / QL-1100.

### 12.2 PT-P900W is 360 dpi, not 300 *(image-pipeline impact)*

Every other Brother device in the registry is 300 dpi. The
preview/render pipeline currently assumes 300 dpi for px↔mm
conversion — verify by grepping `300` and `11.81` (300/25.4) in
`packages/core/src/`. Likely a couple of hardcoded constants need to
become `device.dpi`-driven. Small but real, and easy to miss.
PT-P750W and PT-E550W are 180 dpi — also non-300 — same concern.

### 12.3 brother-label Python is the reference for encoding, not USB IDs

For protocol details where Brother's manual is silent or ambiguous
(invalidate-byte count for specific QL-PT combinations, exact margin
values for narrow TZe tape, expanded-mode behaviour on PT-E550W),
the Python project is our source of truth. It's a community fork of a
fork; bugs there will propagate here. Mitigation: cite specific
Python source lines in our code comments where we adopt a
non-manual-derived value, so a future maintainer can re-evaluate.

**Important caveat on what brother-label can and cannot tell us:**
brother-label and its upstream `pklaus/brother_ql` use vendor-only
USB enumeration (`usb.core.find(idVendor=0x04f9)`) and require the
end user to specify the printer at runtime via
`usb://0x04f9:0xXXXX/serial`. Their `Model('PT-P900W', ...)` /
`BrotherDevicePT('PT-P900W', ...)` entries carry **encoding** fields
(head pin count, bytes-per-row, length range) but **no USB PID**.
Useful for encoding parameters; useless for PID lookup. A future
maintainer should not waste a research pass re-checking — the
information genuinely isn't in those repos by design.

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

### 12.10 We are the second downstream of the Python project

`brother-label` is itself a fork of `python-brother-ql`. There may be
PT-relevant bugs that have been fixed in one fork but not the other.
Worth a one-pass diff between the two repos before locking the TZe
catalogue values, just to make sure we're picking up the latest
corrections. Recorded as a phase-2 task.

### 12.11 Pre-existing PID discrepancy in QL-820NWB / QL-1100 entries *(unrelated, but found during this research)*

While researching PT PIDs, the existing `packages/core/src/devices.ts`
shows:

```
QL_820NWB:  pid: 0x20a7
QL_820NWBc: pid: 0x209d
```

But Linux usb-ids.gowdy.us (and the-sz, and `usb.ids` distributed
with usbutils) lists:

```
0x209d — QL-820NWB Label Printer
0x20a7 — QL-1100 Label Printer
0x20a8 — QL-1110NWB Label Printer
0x20a9 — QL-1100 Label Printer (mass storage)
0x20aa — QL-1110NWB Label Printer (mass storage)
0x20ab — QL-1115NWB Label Printer
0x20ac — QL-1115NWB Label Printer (mass storage)
```

This contradicts the current `devices.ts` mapping and the QL-1100
family entries (which appear to be one PID off — `QL_1100` is at
`0x20a8` but usb-ids says that's `QL-1110NWB`). One of three
explanations:

1. The Linux database is stale or wrong for these models.
2. The `devices.ts` entries were captured from a different revision
   of usb-ids and the public database has since been updated.
3. The current `devices.ts` is wrong and a real QL-820NWB owner
   would discover this when `findDevice()` returns nothing.

Out of scope for this PT plan, but worth filing as its own
verification issue. The maintainer's QL-820NWB (the one printer the
repo claims is `✅ Verified`) would resolve this in 30 seconds with
`lsusb`. **Recommend doing this *before* the rename PR**, since the
rename touches every device entry and is a natural moment to also
correct PIDs.

---

## 13. Open questions

- **Should `BrotherLine` also include `'pt-handheld'` as a
  reserved-but-unused value, to make the future driver split more
  graceful?** Argued no — adding a value the encoder rejects on every
  branch is dead code. If the handheld driver ever ships, it'll be a
  separate package and a separate `family` value entirely.
- **Do PT-P models support TCP printing on port 9100 like QL?** Some
  do (PT-P900W lists "Network printing"), some are USB-only. Verify
  per-model during phase 1 and set `transports` accordingly.
- **Can the `lsusb` output for PT models be sourced from a community
  member without a hardware purchase?** Worth asking on the issue
  tracker before phase 3 — every hour of contributor PID-capture
  saves an order on the maintainer's desk.
