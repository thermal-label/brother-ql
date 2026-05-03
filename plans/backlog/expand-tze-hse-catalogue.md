# Expand TZe / HSe catalogue with per-SKU colour rows

> Fan the 17 width-only TZe + HSe rows out into per-SKU colour rows so
> the registry reflects what users actually buy. Today the docs site
> renders coloured swatches for every cassette in the LabelManager and
> LabelWriter Duo tables (✅ verified, ⏳ untested, 🟦/🟧/🟥 family
> markers, plus printed-sticker chips matching each cassette's actual
> colour) — but Brother PT-P / PT-E pages stay monochrome because no
> Brother row carries `text` / `background` colour metadata.
>
> This plan extends the registry, not the protocol. The encoder reads
> per-width `geometry` already; per-SKU rows share that geometry
> verbatim. So no `protocol.ts` changes, no wire-format work — just
> data entry, an ID-scheme decision, and one new lookup helper.

Date: 2026-05-03
Status: backlog — landing this is mostly grunt data work; do it once
the broader 0.4.x train settles.

---

## 1. Why this matters

The docs site recently added `MEDIA_COLOR_HEX` + `.media-swatch`
rendering: any media row with `text` + `background` populated shows up
in device-page tables as a printed-sticker chip in the cassette's
real colour. The "Supported media" column on **DYMO LabelManager PnP**
now reads as a stack of 21 coloured stripes — 12mm Black on White,
12mm Black on Red, 12mm White on Blue, … — and a visitor scanning for
"the yellow one" finds it without reading.

On Brother **PT-P900W** / **PT-E550W** etc. the same column is plain
text because `MEDIA[*].background` is undefined for every TZe and HSe
row in this registry. That's the gap to close.

**Comparison — colour-coverage by registry today:**

| Registry              | Total media rows | Rows with `text`+`background` |
| --------------------- | ---------------: | ----------------------------: |
| `@thermal-label/labelmanager-core` | 21 | 21 (100 %) |
| `@thermal-label/labelwriter-core`  | 47 | 23 (49 %, all Duo tape) |
| `@thermal-label/brother-ql-core`   | 39 |  0 (0 %) |

LabelManager already fully covers the D1 colour palette. LabelWriter
covers Duo cartridges (Brother-OEM-equivalent). Brother-QL is the
laggard.

---

## 2. Current registry state

`packages/core/data/media.json5` — 39 entries:

| `tapeSystem` | Count | ID range | Shape today                           |
| ------------ | ----: | -------- | ------------------------------------- |
| `dk`         | 22    | 200-class IDs (mirroring DK SKU digits — `id: 251` ↔ DK-22251) | per-SKU already |
| `tze`        | 7     | 401–407  | **width-only** — one row per 3.5/6/9/12/18/24/36 mm |
| `hse-2to1`   | 5     | 421–425  | **width-only** — one row per 5.8/8.8/11.7/17.7/23.6 mm |
| `hse-3to1`   | 5     | 441–445  | **width-only** — one row per 5.2/9.0/11.2/21.0/31.0 mm |

The TZe / HSe rows carry per-head-family `geometry`
(`{ narrow: {…}, wide: {…} }`) per
[`add-pt-series.md` §6.2 / §6.3](../implemented/add-pt-series.md). That
geometry is purely a function of width × head family — it does **not**
vary by colour, material, or SKU — so per-SKU rows can share the same
`geometry` object verbatim.

**Worked example — what one TZe row looks like today:**

```json5
{
  id: 404,
  tapeSystem: 'tze',
  name: '12mm TZe / TZ laminated tape',
  type: 'continuous',
  widthMm: 12,
  targetModels: ['tze'],
  category: 'tape',
  geometry: {
    narrow: { printAreaDots: 70,  leftMarginPins: 29,  rightMarginPins: 29  },
    wide:   { printAreaDots: 150, leftMarginPins: 197, rightMarginPins: 213 },
  },
}
```

No `text`, no `background`, no `material`, no `skus`.

---

## 3. Target schema

Mirror the LabelManager shape so the docs-site swatch renderer Just
Works on the new rows. `text` and `background` use the same colour
vocabulary already standardised across LM and LW Duo
(`black | white | blue | red | green | orange | yellow | clear`):

```json5
{
  id: 'tze-231',                              // string — see §4 for the rationale
  tapeSystem: 'tze',
  name: '12mm Black on White (TZe-231)',
  type: 'continuous',
  widthMm: 12,
  targetModels: ['tze'],
  category: 'tape',
  material: 'standard',                       // or 'flexible' | 'strong-adhesive' | …
  text: 'black',
  background: 'white',
  skus: ['TZe-231', 'TZe231'],                // both spellings; Brother is inconsistent
  geometry: {                                 // shared with every other 12mm TZe row
    narrow: { printAreaDots: 70,  leftMarginPins: 29,  rightMarginPins: 29  },
    wide:   { printAreaDots: 150, leftMarginPins: 197, rightMarginPins: 213 },
  },
}
```

**New / changed fields:**
- `material` — `standard`, `flexible` (TZe-FX*), `strong-adhesive`
  (TZe-S*), `extra-strength` (TZe-S/SE), `security` (TZe-SE*),
  `fabric` (TZe-FA*), `paper` (TZe-N*), `fluorescent` (TZe-C5xx),
  `non-laminated` (TZe-M*). Mirrors the LabelManager `material`
  enum where it overlaps; new values are PT-specific.
- `text`, `background` — same enum as LM / LW Duo.
- `skus` — array of vendor part numbers (TZe / HSe SKUs, plus any
  alternate spellings). Already present on LM / LW Duo rows.

**Geometry-sharing rule.** Every row with the same `(widthMm,
tapeSystem)` shares the **same `geometry` object literal**. Lift it
into a top-level `const TZE_GEOMETRY_BY_WIDTH` in the json5
front-matter (json5 supports comments + trailing commas + unquoted
keys but not variables — so this is a JS-side post-processing step
in `compile-data.mjs`, or just a copy-paste discipline checked by a
test).

I recommend the **post-processing** route: keep the source rows
authoring-friendly (write `geometryWidth: 12` and let
`compile-data.mjs` look up the geometry) so adding a new TZe colour
is a 6-line entry, not a 14-line entry. See §7.2.

---

## 4. ID convention — string or numeric?

Today brother-ql uses **numeric** IDs because DK SKUs (DK-22251,
DK-22214) embed naturally as `251`, `257`. TZe SKUs collide:
**`TZe-231` would want ID `231`** but that range belongs to DK. The
existing TZe rows side-step this by allocating 401–407 — invented
numbers, not Brother SKUs.

LabelManager and LabelWriter both use **string** IDs
(`'d1-standard-bw-6'`, `'address-standard'`). They scale better:
adding a new SKU is a new string, no central ID-allocation table
needed.

### Option A — string IDs everywhere (recommended)

Migrate the registry to string IDs. Concrete shape:

| Tape system | New ID format               | Examples                              |
| ----------- | --------------------------- | ------------------------------------- |
| DK          | `'dk-<sku>'`                | `'dk-22251'`, `'dk-22214'`            |
| TZe         | `'tze-<sku>'`               | `'tze-231'`, `'tze-fx231'`            |
| HSe 2:1     | `'hse-2to1-<sku>'`          | `'hse-2to1-211'`, …                   |
| HSe 3:1     | `'hse-3to1-<sku>'`          | `'hse-3to1-211'`, …                   |

The "width-only" placeholder rows (`'tze-12mm-generic'` etc.) stay as
fall-backs for `findMediaByWidth(12, engine)` when the caller hasn't
nailed down a specific SKU.

**Migration cost:**
- `BrotherQLMedia.id` type change: `number` → `string`.
- `MEDIA_BY_ID` keying: still works (string → entry).
- Public-API impact: `findMedia(id)` accepts a string instead of a
  number. Any caller passing a number-literal breaks. Grep across
  this repo + the cli + downstream burnmark integration:
  - `packages/core/src/__tests__/*.ts` — update fixtures.
  - `packages/cli/src/*.ts` — quick sweep.
  - `packages/web/src/__tests__/livedemo-fixture.ts` — same.
  - **External consumers**: anyone holding a numeric DK ID needs to
    migrate. A `0.5.0` major bump signals that.
- `data/devices/*.json5` doesn't reference media IDs (engines key on
  `mediaCompatibility: ['dk' | 'tze' | …]`, not specific media),
  so the device files are unaffected.

### Option B — keep numeric, allocate higher ranges

| Tape system | Range            | Capacity |
| ----------- | ---------------- | -------: |
| DK          | 200–399 (current) | ~200    |
| TZe std     | 1000–1999         | 1000    |
| TZe FX/S/SE etc. | 2000–2999    | 1000    |
| HSe         | 3000–3999         | 1000    |

Cheap, no migration, but the IDs become arbitrary and non-grep-able.
LM / LW already moved to strings; staying numeric increases
divergence.

### Recommendation

Go with **Option A**. Bundle the migration into a `0.5.0` release
that's already pencilled in for the rename-to-brother work
(`plans/backlog/rename-to-brother.md`). Two breaking changes in one
major bump is friendlier than two majors.

If the rename is delayed: ship Option A as `0.4.x → 0.5.0` standalone
— the colour-row payoff is worth the bump on its own.

---

## 5. Brother SKU naming, decoded

Knowing the pattern lets the rows be checked against the SKU
mechanically rather than transcribed one-by-one off the box.

### TZe standard laminated tape

Format: **`TZe-<colour-combo><width-digit>`**

**Width digit (last digit of the SKU):**

| Digit | Width | Notes |
| ----: | ----- | ----- |
| 1     | 6 mm  | |
| 2     | 9 mm  | |
| 3     | 12 mm | most common |
| 4     | 18 mm | |
| 5     | 24 mm | |
| 6     | 36 mm | 560-pin family only |

(There is no width digit for 3.5 mm in standard TZe — Brother sells
3.5 mm only as `TZe-101` Black on Clear.)

**Colour-combo prefix (first digits):**

| Prefix | Background | Text   | Example |
| -----: | ---------- | ------ | ------- |
|     1  | clear      | black  | TZe-131 = 12mm Black on Clear |
|     2  | white      | black  | TZe-231 = 12mm Black on White (the canonical default) |
|     3  | white      | blue   | TZe-233 |
|     4  | red        | black  | TZe-431 |
|     5  | red        | white  | TZe-435 |
|     6  | yellow     | black  | TZe-631 |
|     7  | green      | black  | TZe-731 |
|     8  | gold       | black  | TZe-831 (out of palette today — see §6) |
|     9  | silver     | black  | TZe-931 (out of palette today — see §6) |
|    13  | clear      | white  | TZe-135 = 24mm White on Clear |
|    33  | white      | red    | TZe-435 |
|    34  | blue       | white  | TZe-535 |
|    35  | green      | white  | TZe-735 |
|   ...  | ...        | ...    | full table in §6.1 |

(The pattern isn't perfectly regular for every prefix — Brother has
made exceptions. Treat the table above as the **reading guide**, but
verify each SKU against Brother's own catalogue when entering rows.)

### TZe special materials — prefix codes

- `TZe-FX*` — flexible (cable-wrap)
- `TZe-S*` / `TZe-SE*` — strong adhesive (textured surfaces)
- `TZe-FA*` — fabric iron-on
- `TZe-N*` — non-laminated (paper-feel)
- `TZe-M*` — matte non-laminated
- `TZe-C5*` — fluorescent (high-vis colours)

`material` field maps each prefix to one of the enum values from §3.

### HSe heat-shrink

Format: **`HSe-<diameter-code><width-digit>`**, where the diameter
code distinguishes 2:1 vs 3:1 ratio.

- `HSe-211` = 5.8 mm Black on White, 2:1 ratio
- `HSe-221` = 8.8 mm Black on White, 2:1 ratio
- `HSe-231` = 11.7 mm Black on White, 2:1 ratio
- `HSe-241` = 17.7 mm Black on White, 2:1 ratio
- `HSe-251` = 23.6 mm Black on White, 2:1 ratio

(Brother only sells HSe in **black on white**. No colour variants
exist — every HSe row will have `text: 'black'`, `background: 'white'`.
This makes HSe a one-row-per-width fan-out, not the multi-colour
explosion TZe brings.)

---

## 6. Phasing

Each phase is independently shippable. Phase 1 hits the visual
payoff; later phases fan out to long-tail SKUs without blocking.

### Phase 1 — TZe standard, 12 mm × 9 colours (~1 sitting)

The most common width on the most common cassette format. Rows:

| SKU       | Background | Text   |
| --------- | ---------- | ------ |
| TZe-231   | white      | black  | (default for `findMediaByWidth(12, ptEngine)`)
| TZe-131   | clear      | black  |
| TZe-431   | red        | black  |
| TZe-435   | red        | white  |
| TZe-535   | blue       | white  |
| TZe-631   | yellow     | black  |
| TZe-731   | green      | black  |
| TZe-334   | white      | red    |
| TZe-335   | white      | blue   |

Plus the existing width-only `tze-12mm-generic` stays as a fall-back.

**Acceptance:** PT-P900W / PT-E550W device pages render a 9-row
swatch column at 12 mm. Each row's chip colour matches the SKU.

### Phase 2 — TZe standard, all widths × all colours (~3-4 sittings)

Fan Phase 1's 9 rows out across the other 6 widths (3.5, 6, 9, 18,
24, 36 mm). Some colour × width combinations don't exist as SKUs
(Brother prunes the catalogue at the edges) — verify each before
adding. Rough estimate: **60–70 rows total** for standard TZe.

### Phase 3 — TZe special materials (~2 sittings)

- `TZe-FX*` flexible (8 SKUs across widths × 2 colours)
- `TZe-S*` strong-adhesive (12 SKUs)
- `TZe-N*` non-laminated paper-feel (8 SKUs)
- `TZe-M*` matte (6 SKUs)
- `TZe-FA*` fabric iron-on (3 SKUs)
- `TZe-C5*` fluorescent (4 SKUs)

Each row carries the same `geometry` (geometry is per-width-per-head,
material doesn't change it) and the right `material` value.
**~40 rows.**

### Phase 4 — HSe heat-shrink (~1 sitting)

5 widths × 1 colour (Black on White) for HSe-2:1, plus 5 widths × 1
colour for HSe-3:1. **10 rows.** Only the SKU table changes — the
geometry is already in the registry.

### Phase 5 — orange / gold / silver / TZe-S35K matte black / TZe-MQ* designer / etc. (~1 sitting)

The long tail. Brother also ships fluorescent orange, pearl, glow-in-
the-dark, decorative-pattern, and seasonal SKUs. Cover what
nbuchwitz/ptouch lists; defer the deepest decorative tail.

Also: extend the `MEDIA_COLOR_HEX` palette in
`thermal-label.github.io/scripts/build-hardware-page.mjs` with `gold`
(#c9a96e), `silver` (#c0c0c0), `pink` (#e89bb6) so the new rows
render. Today's palette is `black | white | blue | red | green |
orange | yellow | clear` — anything outside that falls back to the
plain (un-styled) name on the docs site.

### Phase 6 — DK migration to string IDs (~half a sitting)

Bundle into the same `0.5.0` release as Phase 1: rename DK numeric
IDs to `'dk-<sku>'` strings. Pure migration, zero wire-format change.

**Total scope: ~120 rows** to land the mainstream TZe + HSe + the
existing DK rows on string IDs.

---

## 7. Implementation notes

### 7.1 Authoring — `data/media.json5`

Keep the source file authoring-friendly. Authoring shape:

```json5
{
  id: 'tze-231',
  tapeSystem: 'tze',
  widthMm: 12,
  material: 'standard',
  text: 'black',
  background: 'white',
  skus: ['TZe-231'],
}
```

7 fields per row. No name, no geometry, no targetModels in the source
— the build script fills them in (§7.2).

### 7.2 `compile-data.mjs` post-processing

Extend the existing `scripts/compile-data.mjs` to:

1. **Inject geometry** from a single per-`(tapeSystem, widthMm)`
   table — TZe / HSe geometries are width-keyed and colour-invariant,
   so the source rows omit them and the script merges in the right
   `geometry` object. Same idea for `targetModels`, `category`,
   `type`.
2. **Generate `name`** as `"<width>mm <Text> on <Background> (<sku>)"`
   when colour is present, falling back to the existing "12mm TZe /
   TZ laminated tape" form for the generic-width rows.
3. **Validate** that every TZe / HSe row's `geometry` exists in the
   width table; fail the build with a clear message otherwise.

This keeps the data file from bloating from 17 lines per TZe row to
~120 rows × 14 lines = noisy.

### 7.3 New lookup helper

Add `findMediaBySku(sku: string): BrotherQLMedia | undefined`. It
scans every row's `skus` array (case-insensitive, also tolerates the
"TZe231" spelling without the dash). Useful for callers who type a
specific cassette into the CLI:

```bash
thermal-label print --media TZe-431 hello.txt
```

`findMediaByWidth(widthMm, engine)` keeps its current "default to a
canonical row per width" semantics — for TZe it returns the
**Black-on-White** row (TZe-`X`31 family) when one exists,
falling back to the width-generic row otherwise.

### 7.4 Default-media selection

`DEFAULT_MEDIA` for PT engines today is `id: 404` (12 mm TZe generic).
Switch to `'tze-231'` (12 mm Black on White, the canonical default).
For QL engines, default stays at the existing DK 89×28 mm address.

### 7.5 Tests

- **Schema:** every TZe / HSe row has both `text` and `background`
  populated, except the explicit width-generic fall-back rows.
- **Geometry-sharing:** every row with `(widthMm, tapeSystem)` =
  `(12, 'tze')` references the **same** `geometry` object literal
  after compile (via deep-equal).
- **Lookup:** `findMediaBySku('TZe-231')` and `findMediaBySku('TZe231')`
  both resolve to the same row.
- **Default:** `DEFAULT_MEDIA` for `pt-raster` is the 12 mm
  Black-on-White entry.
- **Encoder parity:** any 12 mm TZe row produces byte-identical
  encoder output for the same bitmap (since geometry is shared).

### 7.6 Doc updates

- `docs/media.md` (new — was queued in `add-pt-series.md` Phase 7) —
  generate per-tape-system tables with the SKU column, swatch column,
  material column. Re-uses `MEDIA_COLOR_HEX` from the docs-site
  rendering pipeline.
- Per-device "Supported media" tables on the docs site light up
  automatically — no docs-site code change beyond §5 Phase 5 palette
  extension.

---

## 8. Sources

Primary references (cite per-row in the json5 comments):

- Brother official catalogue —
  [labels.brother.com/tape-cartridges](https://labels.brother.com/)
  family pages list every active SKU per tape type.
- [`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch) — already
  the source-of-truth for PT pin geometry per
  [`add-pt-series.md` §6.2](../implemented/add-pt-series.md). Also
  ships a SKU list in `printers.py` / `tapes.py`.
- [`labelle-org/labelle`](https://github.com/labelle-org/labelle) —
  Python LabelManager driver. Cross-reference for the `text` /
  `background` colour vocabulary (the labelmanager registry's
  vocabulary was lifted from here).

---

## 9. Out of scope

- **DK rolls:** the DK catalogue is already per-SKU; no fan-out
  needed. The Phase 6 migration is purely the string-ID shape change.
- **Tape length variants** (8 m vs 5 m TZe): same SKU prefix,
  differs only in box quantity. Brother encodes this on the box, not
  in the cassette. Skip — `length` isn't a registry concept here.
- **Print-density variants:** density is a runtime option
  (`PrintOptions.density`), not a media attribute.
- **Decorative / patterned tapes** (TZe-MQ* with stripes, hearts,
  stars): cataloguing them needs a `pattern` field that no other
  driver carries. Defer until Brother ships >5 active SKUs.
- **Encoder changes:** none. The wire format is colour-agnostic;
  every TZe row of a given width produces the same byte stream for
  the same bitmap.
- **Two-colour TZe** (Brother doesn't ship any today; PT cassettes
  are single-ribbon).

---

## 10. Open questions

1. **Should `material: 'flexible' | 'strong-adhesive' | …` move into
   the `category` field instead?** Today `category` is `'tape'` for
   all TZe rows. We could split into `category: 'tape-flexible'`,
   `category: 'tape-strong-adhesive'` etc., aligning with how DK
   distinguishes `'address'` / `'shipping'` / `'multi-purpose'`. The
   docs-site media tables already render `category`, so this would
   surface material in the table naturally. Recommend: yes, fold
   `material` into `category` and keep `material` as an internal
   discriminator only if encoder behaviour ever needs to vary. For
   now `material` adds nothing the encoder reads.

2. **Gold / silver / pink colour palette for `MEDIA_COLOR_HEX`.**
   Need source-of-truth hex values that read well on screen — Brother
   doesn't publish CMYK / RGB equivalents. Pick perceptual matches
   from the cassette photography on labels.brother.com:
   - `gold` ≈ `#c9a96e`
   - `silver` ≈ `#c0c0c0`
   - `pink` ≈ `#e89bb6`
   Refine after a hardware-side comparison.

3. **What about TZe-AF* fluorescent and TZe-S*K matte-black-on-X
   variants?** Both are active SKUs but the colour combinations don't
   fit the existing `text` / `background` enum cleanly (matte black
   ≠ regular black for visual purposes; fluorescent yellow ≠ regular
   yellow). Either extend the enum (`black-matte`, `yellow-fluo`) or
   accept a slight colour mismatch on the swatch. Recommend:
   accept the mismatch — the SKU label in the row name carries the
   precise variant, and the swatch only needs to be in the right
   ballpark.

4. **Should the docs site's media-table sort order group by
   colour?** Today it follows the registry order. With 60+ TZe rows
   per device page, grouping by background colour (all whites, then
   all clears, then all colours) might read better than width-first.
   Punt to a docs-site issue once the data is in.

---

## 11. Acceptance criteria

- [ ] `BrotherQLMedia.id` is `string` (post-migration).
- [ ] At least the Phase 1 nine SKUs render in the Brother PT device
      "Supported media" tables on the docs site, with swatch chips
      matching cassette colours.
- [ ] `findMediaBySku('TZe-231')` returns the canonical 12 mm
      Black-on-White row.
- [ ] Every TZe / HSe row with the same `(widthMm, tapeSystem)`
      references the same `geometry` object after compile-data.
- [ ] No encoder change: golden byte-stream tests for QL and PT
      remain unchanged (the encoder path doesn't read `text` or
      `background`).
- [ ] `DEFAULT_MEDIA` for `pt-raster` engines is the 12 mm
      Black-on-White entry.
- [ ] `docs/media.md` (in this repo) lists every TZe / HSe SKU with
      a swatch column, mirroring the docs-site rendering pipeline.
- [ ] Docs-site `MEDIA_COLOR_HEX` palette extended with `gold`,
      `silver`, `pink` (Phase 5).
