# brother-ql — Wide-tier media compatibility

> Apply the convention from
> `../../../contracts/plans/backlog/wide-tier-media-compatibility.md`:
> tag the three 102mm DK rows with `'dk-wide'`, list both `'dk'`
> and `'dk-wide'` on the QL-1xxx engines, and add `targetModels` /
> `skus` / `category` to every media entry to close the
> `generic-device-media-library.md` §3.2 gap that brother-ql
> skipped on its first migration pass.
>
> The convention itself is not litigated here — the contracts plan
> owns that. This plan covers what changes in the brother-ql
> package and how it lands.

---

## 1. What's particular about brother-ql

- **`MediaDescriptor.tapeSystem` already exists** as a
  driver-specific protocol discriminator (`'dk' | 'tze' |
  'hse-2to1' | 'hse-3to1'`). Used by `src/protocol.ts` and
  `src/media.ts` to branch on encoding family. **Stays as-is.**
  `targetModels` is added alongside it, not as a rename.
- **No `skus`, `category`, or `targetModels` on media today.**
  `data/media.json5` predates the contracts §3.2 fields. This
  plan adds all three.
- **Wide-tier devices** are the QL-1xxx series — five entries
  with `headDots: 1296`: `QL_1050`, `QL_1060N`, `QL_1100`,
  `QL_1110NWB`, `QL_1115NWB`. Everything else is 720-dot or
  smaller (PT-series narrow/wide TZe heads, separate axis).
- **Wide-tier media** is the three 102mm DK rows: id 260
  (DK-22243 102mm continuous), id 365 (DK-11240 102×51), id 366
  (DK-11241 102×152).
- **TZe / HSe stay narrow/wide via `geometry`.** That axis is
  about head pin count (128-pin vs 560-pin wire format), not
  chassis width tier. No `'tze-wide'` tag today — 36mm TZe is
  already gated by `geometry.narrow` being omitted.
- **The substrate gate is the first-order job, not the wide
  tier.** brother-ql carries four substrate families across two
  device lines, and the existing engine entries already declare
  per-substrate compatibility correctly. After this plan adds
  `targetModels` to the media side, `mediaCompatibleWith()`
  enforces the substrate boundary too — a DK roll never matches a
  P-series engine, a TZe tape never matches a QL engine. Today
  the gate works *only* because every QL `findMediaByDimensions()`
  caller passes its engine-aware filter; once external consumers
  (docs, future pickers) read directly via the contracts helper,
  this plan is what makes the gate hold.

### 1.1 Engine classes covered

| Class | `mediaCompatibility` (after plan) | Devices |
| --- | --- | --- |
| QL standard | `['dk']` | QL-500, QL-550, QL-560, QL-570, QL-580N, QL-600, QL-650TD, QL-700, QL-710W, QL-720NW, QL-800, QL-810W, QL-820NWBc |
| QL wide | `['dk', 'dk-wide']` | QL-1050, QL-1060N, QL-1100, QL-1110NWB, QL-1115NWB |
| PT TZe + HSe | `['tze', 'hse-2to1', 'hse-3to1']` (unchanged) | PT-E550W, PT-P750W, PT-P900, PT-P900W, PT-P950NW |
| PT TZe-only | `['tze']` (unchanged) | PT-P910BT |

The PT rows do not change — their compatibility sets are already
correct. They are listed because the §2.4 cross-substrate test
matrix asserts what they reject, not just what the QL changes
accept.

---

## 2. What changes in the package

### 2.1 `data/media.json5`

For every entry, add three fields:

```js
{
  id: 259,
  tapeSystem: 'dk',                      // unchanged
  name: '62mm continuous (DK-22205)',
  type: 'continuous',
  widthMm: 62,
  // NEW:
  targetModels: ['dk'],
  skus: ['DK-22205'],
  category: 'continuous',
  // ...existing geometry fields
}
```

For the three wide-tier rows:

```js
{ id: 260, /* DK-22243 */  targetModels: ['dk-wide'], ... }
{ id: 365, /* DK-11240 */  targetModels: ['dk-wide'], ... }
{ id: 366, /* DK-11241 */  targetModels: ['dk-wide'], ... }
```

`category` mapping (per contracts cross-driver-consistency list):

| Media type | Category |
| --- | --- |
| DK continuous rolls | `'continuous'` |
| DK die-cut address / shipping labels | `'die-cut'` |
| DK round die-cut | `'die-cut'` |
| TZe / HSe laminated tape | `'tape'` |

`skus` extracted from the existing `name` field where embedded
(e.g. `'DK-22214'` from `'12mm continuous (DK-22214)'`). TZe / HSe
entries don't have a single SKU — Brother sells dozens of TZe-XXX
variants per width. Leave `skus` undefined on those rather than
fabricate.

### 2.2 `data/devices/QL_*.json5` — wide-tier engines

The five 1296-dot entries flip from `['dk']` to `['dk', 'dk-wide']`:

```diff
-      mediaCompatibility: ['dk'],
+      mediaCompatibility: ['dk', 'dk-wide'],
```

Files: `QL_1050.json5`, `QL_1060N.json5`, `QL_1100.json5`,
`QL_1110NWB.json5`, `QL_1115NWB.json5`. All other QL entries
unchanged.

### 2.3 `src/types.ts` — `BrotherQLMedia` extension

The driver type already extends `MediaDescriptor`, so `targetModels`,
`skus`, `category` come along structurally. No type changes needed
unless we want to *narrow* `BrotherQLMedia['targetModels']` to a
finite union — defer; the open string set matches contracts.

### 2.4 `src/__tests__/media.test.ts` — invariant tests

Three groups of cases. **Substrate gating** is the first-order
job; **wide tier** rides on top.

**A. Field-shape invariants** (catches authoring mistakes):

1. Every entry has `targetModels` containing its `tapeSystem`
   (consistency between the two fields).
2. Every DK entry with `widthMm > 62` has `'dk-wide'` in
   `targetModels` (catches a 102mm row that forgot the tag).
3. The five QL-1xxx devices have both `'dk'` and `'dk-wide'` in
   their engine's `mediaCompatibility`.

**B. Substrate-gate enforcement matrix** — exhaustive, table-driven.
For each of the four engine classes from §1.1, assert:

| Engine class | Must accept | Must reject |
| --- | --- | --- |
| QL standard (`['dk']`) | every DK row with `targetModels: ['dk']` | every DK-wide row, every TZe row, every HSe-2to1 row, every HSe-3to1 row |
| QL wide (`['dk', 'dk-wide']`) | every DK row, every DK-wide row | every TZe row, every HSe-2to1 row, every HSe-3to1 row |
| PT TZe+HSe (`['tze', 'hse-2to1', 'hse-3to1']`) | every TZe row, every HSe row of either ratio | every DK row, every DK-wide row |
| PT TZe-only (`['tze']`) | every TZe row | every DK row, every DK-wide row, every HSe row of either ratio |

Implemented as a single matrix walk over `(engine class
representative, every media row)` calling
`mediaCompatibleWith()` from `@thermal-label/contracts` and
asserting the cell. Catches: a DK row that loses its
`targetModels` (would falsely pass the PT engines), an HSe row
mistakenly tagged `'tze'`, a future engine that drops the
substrate tag, a 102mm row that loses `'dk-wide'`. The matrix is
small (~4 engines × ~40 media = ~160 assertions) and exhaustive,
which is the property that matters for a gate.

**C. The PT-P910BT regression case** — explicitly named because
the device's `hardwareQuirks` field documents the constraint:

```ts
test('PT-P910BT does not surface HSe media', () => {
  const engine = DEVICES.PT_P910BT.engines[0];
  for (const m of MEDIA) {
    if (m.tapeSystem === 'hse-2to1' || m.tapeSystem === 'hse-3to1') {
      expect(mediaCompatibleWith(m, engine)).toBe(false);
    }
  }
});
```

Strictly redundant with the matrix in (B), but worth keeping
separately so a future bisect on a "P910BT shows HSe media"
report finds a test named after the case.

### 2.5 `scripts/validate-hardware-status.mjs`

Two rules from the contracts plan §4, plus one brother-specific:

- **Substrate required** — every media entry's `targetModels`
  must include at least one of `['dk', 'tze', 'hse-2to1',
  'hse-3to1']`. Without this, an entry with undefined
  `targetModels` would fall to the helper's "unrestricted" rule
  and silently match every engine in the registry.
- **Substrate ↔ `tapeSystem` consistency** (brother-specific) —
  every entry's `targetModels` must include its `tapeSystem`
  value. Belt-and-suspenders next to the §2.4-A invariant test;
  the validator catches it during data-only PRs that don't run
  the full test suite.
- **Wide tier implies base** — if any engine's
  `mediaCompatibility` contains `'dk-wide'`, it must also
  contain `'dk'`.

The script already validates support-block fields; extend with
the three checks. Run as part of `pnpm test` and CI.

---

## 3. Risks

- **`tapeSystem` / `targetModels` drift.** Two fields encoding
  the same substrate. Mitigation: invariant test in §2.4; if
  someone updates one without the other, the test fails.
  Long-term option (not this plan): make `tapeSystem` a derived
  getter over `targetModels`. Defer until there's a second-axis
  reason to consolidate.
- **SKU extraction from names.** A few entries have parenthetical
  SKUs in `name`; a few don't (`'23×23mm die-cut'` has no SKU
  visible). Manual extraction in this PR; spot-check against the
  Brother catalogue. Acceptable miss rate is "any" — `skus` is
  optional and a missing array is honest.
- **Niimbot stub.** Out of scope for this plan; niimbot conforms
  on first non-stub commit per the contracts plan.

---

## 4. Sequencing

Single PR is fine — the changes are all data-side and the
invariant tests prevent partial states from landing:

1. Edit `data/media.json5` (all rows: add `targetModels`, `skus`,
   `category`; flag 3 wide-tier rows).
2. Edit the 5 QL-1xxx device files.
3. Add invariant tests in `media.test.ts`.
4. Extend `validate-hardware-status.mjs`.
5. Re-run `pnpm test`; commit.

No downstream coordination — the docs aggregator at
`thermal-label.github.io` does not branch on these tags today (it
will, once `per-device-pages.md` lands and uses
`compatibleMediaFor()` for the per-device "supported media"
table). When it does, this plan is a prerequisite — without it,
the table on a QL-700 page would falsely list 102mm rolls.

---

## 5. Out of scope

- Replacing `tapeSystem` with `targetModels`. Two fields, two
  jobs (protocol discriminator vs. compatibility set), kept
  in sync via test.
- TZe / HSe `'tze-wide'` etc. The narrow/wide axis there is
  head-pin-count, not chassis-width — different mechanism
  (`geometry: { narrow, wide }`), already in place.
- Brother PT-D / PT-H consumer label-makers. Not in the registry
  yet; conform to this convention on first commit per the
  add-pt-series plan.
- Rename of the `brother-ql` package to `brother`. Tracked
  separately in `rename-to-brother.md`. This plan is a no-op
  under either name.
