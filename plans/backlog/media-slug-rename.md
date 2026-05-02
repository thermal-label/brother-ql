# brother-ql — Media slug rename

> Re-key `data/media.json5` from numeric firmware ids (`id: 259`)
> to human-readable slugs (`id: 'dk-62mm'`), demote the firmware
> byte to a dedicated `firmwareId: number` field, and split
> `findMedia` into a slug lookup and a firmware-byte lookup.
>
> Decoupled from `wide-tier-media-compatibility.md`: that plan
> adds three fields to every row, this plan changes the primary
> key. Two sweeping data edits in one PR would be hard to
> review and bisect.

---

## 1. Why this is its own plan

The wide-tier plan is "data + two new fields + two tests" with a
single-axis review surface (does the gate hold). This plan
changes the primary key on every media row and every consumer
that looks media up — ~15 call sites in src + tests touch
`MEDIA[259]`, `MEDIA[404]`, `MEDIA[407]`, `MEDIA[445]`,
`MEDIA[251]`. The review question is "did every reference get
updated correctly," which is a different shape of risk and
deserves its own revert button.

Either plan can land first. They are orthogonal: wide-tier is
about `targetModels` / `mediaCompatibility`, slug-rename is
about `id` / `firmwareId`. Recommend wide-tier first because
it's smaller; slug-rename rebases trivially over it.

---

## 2. What's particular about brother-ql media ids

The numeric `id` field is **load-bearing at the wire layer**:

- DK rolls: 251, 257-262, 264 — Brother spec
- DK die-cut / round: 269-275, 362-374
- TZe: 401-419 (one id per width)
- HSe-2to1: 421-439 (one id per width)
- HSe-3to1: 441-459 (one id per width)

These come straight from Brother's Raster Command Reference and
are reported by the printer in its 32-byte status response (byte
11). `parseStatus()` reads the byte; `findMediaByDimensions`
resolves a registry entry from it. **The numbers can't go
away** — they have to ride somewhere on each row. The rename
moves them from the primary-key slot to a dedicated field.

There's also a granularity mismatch worth naming:

- **DK firmware ids are SKU-level.** Id 251 is DK-22251
  specifically (62mm two-colour); id 259 is DK-22205 (62mm
  single-colour). One id ↔ one Brother SKU.
- **TZe / HSe firmware ids are width-level.** Id 404 covers
  every TZe-XXX 12mm cassette (TZe-231 white-on-clear, TZe-241
  white-on-red, …). One id ↔ many SKUs.

The slug captures the firmware-id-level resolution, not the
SKU-level resolution. Slug-level uniqueness matches the
registry's row granularity; SKU-level multiplicity for TZe/HSe
stays unrepresented (and the wide-tier plan's `skus` array
stays undefined on those rows for the same reason).

---

## 3. The shape change

```diff
 {
-  id: 259,
+  id: 'dk-62mm',
+  firmwareId: 259,
   tapeSystem: 'dk',
-  name: '62mm continuous (DK-22205)',
+  name: '62mm continuous',
   type: 'continuous',
   widthMm: 62,
   ...
 }
```

`MediaDescriptor.id` in contracts is already typed
`string | number`, so the slug fits without a contracts schema
change (see §8 for optional follow-ups). `firmwareId` lives on
`BrotherQLMedia`, not `MediaDescriptor` — brother is the only
family today where the wire reports a media-id byte.

Type changes in `src/types.ts`:

```diff
 export interface BrotherQLMedia extends MediaDescriptor {
+  id: string;        // narrow from MediaDescriptor's string | number
+  firmwareId: number;
   tapeSystem: TapeSystem;
   ...
 }
-export const MEDIA: Record<number, BrotherQLMedia>
+export const MEDIA: Record<string, BrotherQLMedia>
```

`Record<number, ...>` → `Record<string, ...>` propagates through
every consumer that does `MEDIA[<n>]`. TS catches all of them.

---

## 4. Slug naming convention

| Family | Pattern | Examples |
| --- | --- | --- |
| DK continuous | `dk-<width>mm[-<variant>]` | `dk-12mm`, `dk-29mm`, `dk-38mm`, `dk-50mm`, `dk-54mm`, `dk-62mm`, `dk-62mm-red` (two-colour), `dk-102mm` |
| DK die-cut rect | `dk-<w>x<h>` | `dk-17x54`, `dk-17x87`, `dk-23x23`, `dk-29x90`, `dk-38x90`, `dk-39x48`, `dk-52x29`, `dk-62x29`, `dk-62x100`, `dk-102x51`, `dk-102x152` |
| DK die-cut round | `dk-<w>mm-round` | `dk-12mm-round`, `dk-24mm-round`, `dk-58mm-round` |
| TZe | `tze-<width>mm` | `tze-3.5mm`, `tze-6mm`, `tze-9mm`, `tze-12mm`, `tze-18mm`, `tze-24mm`, `tze-36mm` |
| HSe 2:1 | `hse-2to1-<width>mm` | `hse-2to1-5.8mm`, `hse-2to1-8.8mm`, `hse-2to1-11.7mm`, `hse-2to1-17.7mm`, `hse-2to1-23.6mm` |
| HSe 3:1 | `hse-3to1-<width>mm` | `hse-3to1-5.2mm`, `hse-3to1-9mm`, `hse-3to1-11.2mm`, `hse-3to1-21mm`, `hse-3to1-31mm` |

Conventions:

- **Substrate prefix on every slug.** Disambiguates `12mm` between
  DK continuous and TZe, future-proofs cross-driver browsing
  (LW `'standard-89x28'` vs brother `'dk-62x29'` never collide).
- **Width-only for tape, dimensions for die-cut.** Continuous
  rolls are identified by width; die-cut by both axes (height
  is informative, not just feed direction).
- **Variant suffixes only when needed.** `-red` for the
  two-colour DK row (the only DK at the same width as a
  single-colour entry). No `-bw` suffix on the default — single
  colour is the unmarked default.
- **Lowercase, hyphen-separated.** Matches the existing LW and LM
  slug style (`'address-standard'`, `'d1-standard-bw-6'`).
- **Decimal points preserved literally.** `tze-3.5mm`,
  `hse-2to1-11.7mm`. Dot is fine in object-key strings; no JS
  escaping needed.

The full slug → firmware-id mapping is the data file edit
itself; it doesn't need to live in this plan as a separate
table.

### 4.1 SKU extraction

Most DK names embed the Brother SKU in parens:
`'62mm continuous (DK-22205)'`. The wide-tier plan's `skus`
field captures it; this plan's `name` field strips the paren
suffix because the SKU is now first-class data:

```diff
- name: '62mm continuous (DK-22205)',
+ name: '62mm continuous',
+ skus: ['DK-22205'],
```

If the wide-tier plan lands first, the `skus` extraction is
already done; this plan only edits the `name` to drop the now-
duplicated paren. If this plan lands first, `skus` extraction
folds in here and the wide-tier plan inherits clean names.
Either order works.

---

## 5. What changes in the package

### 5.1 `data/media.json5`

Mechanical edit on every row. ~50 entries:

- Add `id: '<slug>'` per §4.
- Rename existing `id` field to `firmwareId`.
- Strip SKU paren suffix from `name` (if §4.1 is folded in).
- Update the leading comment block to document the new shape:
  `id` = slug; `firmwareId` = wire byte.

### 5.2 `src/types.ts`

Narrow `BrotherQLMedia['id']` to `string`. Add
`firmwareId: number`. Update `MEDIA: Record<string, BrotherQLMedia>`.

### 5.3 `src/media.ts`

```diff
- export function findMedia(id: number): BrotherQLMedia | undefined {
-   return MEDIA[id];
- }
+ export function findMedia(slug: string): BrotherQLMedia | undefined {
+   return MEDIA[slug];
+ }
+
+ /**
+  * Resolve a media row by the firmware byte the printer reports
+  * in its 32-byte status response (byte 11). Used by parseStatus
+  * via findMediaByDimensions; external callers should prefer
+  * findMedia(slug) or findMediaByDimensions().
+  */
+ export function findMediaByFirmwareId(
+   byte: number,
+ ): BrotherQLMedia | undefined {
+   return MEDIA_BY_FIRMWARE_ID.get(byte);
+ }

  // Build the firmware-id index once at module load.
+ const MEDIA_BY_FIRMWARE_ID = new Map(
+   Object.values(MEDIA).map(m => [m.firmwareId, m] as const),
+ );

- export const DEFAULT_MEDIA: BrotherQLMedia = MEDIA[259]!;
+ export const DEFAULT_MEDIA: BrotherQLMedia = MEDIA['dk-62mm']!;

- export const DEFAULT_PT_MEDIA: BrotherQLMedia = MEDIA[404]!;
+ export const DEFAULT_PT_MEDIA: BrotherQLMedia = MEDIA['tze-12mm']!;
```

`findMediaByDimensions` doesn't change shape — it still walks
`Object.values(MEDIA)`. Its callers don't see the keying.

### 5.4 `src/status.ts`

`parseStatus` currently uses dimensions + two-colour flag to
resolve the registry entry, not the firmware byte directly
(see existing implementation: `findMediaByDimensions(mediaWidthMm,
mediaLengthMm, twoColorFlag, engine)`). That path stays as-is.

If a future status parser switches to byte-direct lookup it
calls `findMediaByFirmwareId(byte)`. Either way, this rename
doesn't force a status-parser change.

### 5.5 Tests

Update every `MEDIA[<n>]` call site in
`__tests__/{media,protocol,preview}.test.ts` to slug form.
Mechanical, TS-driven (the type narrowing surfaces every site).

Add two new tests:

1. **Slug uniqueness** — every entry's `id` is unique across
   `MEDIA`. (Object-key uniqueness already enforces this at parse
   time, but a runtime assertion catches a build artifact that
   somehow lost a row.)
2. **`firmwareId` round-trip** — for every row,
   `findMediaByFirmwareId(m.firmwareId).id === m.id`. Catches a
   row whose `firmwareId` collides with another's (would silently
   make one unreachable via the byte path).

The `firmwareId` collision test is the one that actually
matters — slug uniqueness is mostly for hygiene, but firmware-id
collisions are a real risk if a transcription error sneaks in
during the rename.

---

## 6. Sequencing

Single PR, mechanical:

1. Edit `data/media.json5` — add `id` slug, rename old `id` →
   `firmwareId`, optionally strip SKU paren from `name`.
2. Update `src/types.ts` — narrow `id`, add `firmwareId`,
   re-key `MEDIA` to `Record<string, _>`.
3. Update `src/media.ts` — `findMedia(slug)`, new
   `findMediaByFirmwareId(byte)`, build the byte→entry index,
   update `DEFAULT_MEDIA` / `DEFAULT_PT_MEDIA` constants.
4. Sweep TS errors — TS surfaces every `MEDIA[<n>]` call site,
   replace with slug.
5. Add the two new tests.
6. Run `pnpm test`; commit.

Order vs. wide-tier:

- **Wide-tier first (recommended)** — wide-tier ships small. This
  plan rebases over it; the §4.1 SKU paren strip is then a
  follow-up tidy that runs on already-populated `skus`.
- **Slug-rename first** — equally fine; wide-tier rebases trivially
  because it's data-additive.

Don't bundle them — that's the whole reason this is a separate
plan.

---

## 7. Risks

- **Firmware-id collision during transcription.** Hand-editing 50
  rows from `id: 259` → `firmwareId: 259` is exactly the kind of
  edit where a copy-paste duplicates a number. The §5.5 round-trip
  test catches it; running the test before commit is mandatory.
- **External docs aggregator reading `m.id`.** The docs site at
  `thermal-label.github.io` may pull `m.id` for per-media page
  slugs or for cross-referencing firmware codes. After this
  rename, `m.id` is the slug; the firmware byte moves to
  `m.firmwareId`. Both fields are useful to the docs (slug for
  the URL, byte for the "firmware reports as 0x103" detail).
  Audit the aggregator — if it's reading `m.id` as a firmware
  byte, that breaks; if it's already treating it as a generic
  identifier, it now becomes a much nicer URL slug. Likely a
  one-line change on the docs side, in its own PR after this
  one merges and the package version bumps.
- **Apps depending on `findMedia(259)`.** Any downstream app
  passing numeric ids breaks. Search for known consumers
  (`@thermal-label/brother-ql-core` dependents) before merging;
  if the API surface is a real concern, keep a deprecated
  numeric overload that delegates to `findMediaByFirmwareId` for
  one minor version. Today no such consumer is known; default
  is the clean break.
- **Two-colour DK collision risk.** `dk-62mm` and `dk-62mm-red`
  are the only width-collision pair in the catalogue. Worth a
  named test case asserting both resolve and don't shadow each
  other.

---

## 8. Optional contracts follow-ups (not blocking)

Both are independent of this plan and can land anytime after.

1. **Tighten `MediaDescriptor.id` JSDoc** in
   `contracts/src/media.ts` to recommend string slugs:
   *"String slug recommended; numeric only where a wire-protocol
   id is the natural choice (and even then prefer a dedicated
   driver-side field)."* No shape change.

2. **Narrow `MediaDescriptor.id` to `string`** once brother
   converts. After this rename, all three active drivers use
   string ids (LW: `'address-standard'`, LM: `'d1-standard-bw-6'`,
   brother: `'dk-62mm'`). The `string | number` union in
   contracts becomes vestigial; narrowing is a one-line edit.
   Worth a short follow-up plan in `contracts/plans/backlog/`
   when the time comes — not blocking and not folded in here
   because it's the kind of contracts-shape change that should
   ride alone.

---

## 9. Out of scope

- SKU-level granularity for TZe / HSe. The slug captures the
  firmware-id resolution (width-level for tape); modelling
  TZe-231 vs TZe-241 as separate registry rows is a different
  problem (and probably not worth solving — Brother sells
  hundreds of variants).
- Renaming `tapeSystem` to `targetModels`. Tracked in
  `wide-tier-media-compatibility.md` decisions: the two fields
  serve different jobs (protocol discriminator vs.
  compatibility set) and stay separate.
- Numeric-id deprecation overload on `findMedia`. If the
  ecosystem ever shows a real downstream caller using the
  numeric form, add a one-version-deprecated overload then;
  today the default is a clean break.
- Status-parser switch from dimension-lookup to byte-lookup.
  `findMediaByDimensions` works; the new
  `findMediaByFirmwareId` is exposed for future use but no
  internal caller switches to it as part of this plan.
- LabelManager and LabelWriter slug audits. Both already use
  string slugs; their conventions (`'d1-standard-bw-6'`,
  `'address-standard'`) differ slightly from brother's
  substrate-prefixed style, but cross-driver consistency is
  not a goal here. Per-driver style is fine as long as each
  family is internally coherent.
