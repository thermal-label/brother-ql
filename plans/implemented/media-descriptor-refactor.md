# Combined plan — `MediaDescriptor` refactor + cross-driver orientation

Date: 2026-04-27
Scope: `@thermal-label/contracts`, `@thermal-label/brother-ql-*`,
`@thermal-label/labelmanager-*`, `@thermal-label/labelwriter-*`,
`@thermal-label/cli`.

This document supersedes the earlier `ORIENTATION_PLAN.md` and
`UPDATE_MEDIA_DESCRIPTOR.md` drafts — both are absorbed here. One
breaking-change release of `@thermal-label/contracts` carries every
field on this list, drivers update in lockstep.

---

## 1. Goals

Three problems share one surface (`MediaDescriptor`) and one release
window:

1. **Multi-ink media is encoded as a boolean.** `colorCapable: boolean`
   says "DK-22251 is two-colour" but doesn't say *which* inks. The
   driver has to import a hard-coded `BROTHER_QL_TWO_COLOR_PALETTE`
   constant and remember to feed it to `renderMultiPlaneImage`. One
   field should carry both facts.
2. **Image orientation is implicit and inconsistent across drivers.**
   LabelManager rotates 90° unconditionally; Brother QL never rotates;
   LabelWriter silently crops landscape input. Users want the same
   mental model across drivers: *"the image you supply is the visual
   you want — the driver auto-orients."*
3. **Design-time spec lives in vibes, not data.** Print margins
   (clip-safe inset) and corner radius (rounded die-cut shape) are
   facts about each label that designers need; the descriptor doesn't
   carry them. Adding them now lets preview tools render the actual
   paper outline, and is cheap if it rides the same release.

Combining all three changes into one `contracts@0.2.0` halves the
release ceremony and gives downstream callers one breaking commit to
absorb instead of two.

---

## 2. New `MediaDescriptor` shape

```ts
import type { PaletteEntry } from '@mbtech-nl/bitmap';

export interface MediaDescriptor {
  /** Unique identifier within the driver family. */
  id: string | number;
  /** Human-readable name, e.g. `"62mm continuous"` or `"DK-22251"`. */
  name: string;
  /** Physical width across the tape, in mm. */
  widthMm: number;
  /**
   * Physical length along the tape, in mm.
   * Undefined = continuous (variable length).
   */
  heightMm?: number;
  /** Driver-specific media type string (e.g. `'continuous'`, `'die-cut'`, `'tape'`). */
  type: string;

  // ──── new fields ────

  /**
   * Inks this media supports, beyond the implicit white substrate.
   *
   * - Undefined = single-colour black-on-white. Driver renders via
   *   `renderImage` (luminance threshold + optional dither).
   * - Defined = multi-plane media. Driver renders via
   *   `renderMultiPlaneImage` with this palette.
   *
   * For DK-22251 (the only multi-ink media we ship today):
   *   `[{ name: 'black', rgb: [0, 0, 0] },
   *     { name: 'red',   rgb: [255, 0, 0] }]`
   *
   * Replaces the old `colorCapable: boolean`.
   */
  palette?: readonly PaletteEntry[];

  /**
   * Hint for how the user is expected to author content for this media.
   * Drives the auto-rotate decision in `print()`:
   *
   * - `'horizontal'` — long axis horizontal when reading (landscape).
   *   Driver rotates 90° in the family-specific direction when input
   *   matches landscape dimensions. Examples: 89×28 mm address
   *   labels, 12 mm narrow tape with a name on it.
   * - `'vertical'` — long axis vertical when reading (portrait).
   *   Driver passes through.
   * - `undefined` — driver decides from input vs media geometry, or
   *   passes through. Recommended for continuous wide tape (62 mm)
   *   where users may go either way.
   */
  defaultOrientation?: 'horizontal' | 'vertical';

  /**
   * Informational: insets (mm) inside the media bounds where the
   * printer may clip a design (paper-feed tolerance, head edges,
   * die-cut slack). For label designers and previews — drivers do
   * not enforce these.
   *
   * When present, all four edges are required (pass `0` where there
   * is no margin). Omit the whole field when the entire media area
   * is safe to design within.
   */
  printMargins?: {
    readonly leftMm: number;
    readonly rightMm: number;
    readonly topMm: number;
    readonly bottomMm: number;
  };

  /**
   * Corner radius (mm) of die-cut labels with rounded corners.
   * Only meaningful for die-cut media. Undefined or 0 = sharp
   * corners. For round labels, set this to `widthMm / 2` so the
   * rounded rectangle degenerates to a circle.
   */
  cornerRadiusMm?: number;
}
```

### Why `palette` is the full ink list, not "extras beyond black"

A driver shouldn't have to reconstruct the palette by prepending an
implicit `black` to "extras". Multi-ink media declares its full ink
set; single-ink media declares nothing.

### Why `palette` is optional, not "always include black"

`renderImage` (single-plane) and `renderMultiPlaneImage` have
meaningfully different behaviour for grey input — `renderImage`
dithers, `renderMultiPlaneImage` nearest-neighbour-classifies. For a
single-ink b/w roll printing a greyscale photo we still want dither,
so single-colour media should route through `renderImage`. Encoding
that as "no palette" is cleaner than a length-1-special-case.

### Why `printMargins` is informational, not enforced

Each driver already handles its own protocol-level margins via
family-specific fields (Brother QL pin offsets, LabelWriter head-dot
fitting, …). Those continue unchanged. `printMargins` is a separate
concern: a design-tool spec saying "your design may get clipped
within this region". Drivers that want to validate or warn against
clipped designs can read this field, but the protocol path is
unaffected.

---

## 3. Driver-side orientation logic — **no bitmap changes**

`@mbtech-nl/bitmap@1.2.0` already exposes `rotate?: 0 | 90 | 180 |
270` on both `ImageRenderOptions` (`renderImage`) and
`MultiPlaneRenderOptions` (`renderMultiPlaneImage`). The rotation
operation is fully covered by the bitmap library; no helper is added
there. Print awareness stays out of the bitmap library — drivers
compute the right rotation value and pass it through as a render
option.

### 3.1 Per-family rotation direction

Each driver core exports a single constant for its printer family —
verified once on hardware:

```ts
// e.g. packages/core/src/orientation.ts
export const ROTATE_DIRECTION: 90 | 270 = 90; // CW (= rotate option `90`)
```

This is a printer-mechanical fact (which face of the label is the
leading edge) and identical across every media in that family. Brother
QL: presumed `90` (CW) — confirm with a die-cut "F" test print.
LabelManager: today's hard-coded `rotateBitmap(padded, 90)` already is
CW — keep `90`. LabelWriter: confirm.

### 3.2 Decision helper (lives in contracts)

```ts
// @thermal-label/contracts/src/orientation.ts
export function pickRotation(
  image: { width: number; height: number },
  media: MediaDescriptor,
  familyDirection: 90 | 270,
  override?: 'auto' | 0 | 90 | 180 | 270,
): 0 | 90 | 180 | 270 {
  if (override !== undefined && override !== 'auto') return override;
  const isLandscape = image.width > image.height;
  if (media.defaultOrientation === 'horizontal' && isLandscape) {
    return familyDirection;
  }
  return 0;
}
```

The helper is pure (no IO, no driver state) and tiny — natural fit for
contracts, which already exposes shared types. Drivers import and call;
no DRY duplication of the heuristic.

### 3.3 Driver wiring

Inside each driver's `print()`, after media resolution and before
calling `renderImage` / `renderMultiPlaneImage`:

```ts
const rotate = pickRotation(image, resolvedMedia, ROTATE_DIRECTION, options?.rotate);
const bitmap = renderImage(image, { dither: true, rotate });
// or for multi-plane:
const planes = renderMultiPlaneImage(image, {
  palette: resolvedMedia.palette!,
  rotate,
  // ...
});
```

For Brother QL specifically, `renderMultiPlaneImage` rotates both
planes together — they stay aligned, no extra work.

The existing `flipHorizontal` step (Brother QL pin-mirror) sits
**after** rotation: it compensates for head-pin geometry, which is
unaffected by image orientation.

---

## 4. Per-package change list

### 4.1 `@thermal-label/contracts` → `0.2.0` (breaking)

| File | Change |
|---|---|
| `package.json` | Bump `@mbtech-nl/bitmap` `^1.0.1` → `^1.2.0`. Bump self to `0.2.0`. |
| `src/bitmap.ts` | Add `PaletteEntry` to the existing re-export line: `export type { LabelBitmap, PaletteEntry, RawImageData } from '@mbtech-nl/bitmap';` |
| `src/index.ts` | Surface `PaletteEntry` alongside `LabelBitmap` / `RawImageData` in the top-level export. Surface the new `pickRotation` helper. |
| `src/media.ts` | Drop `colorCapable: boolean`. Add `palette?`, `defaultOrientation?`, `printMargins?`, `cornerRadiusMm?` per §2. Update JSDoc examples — show DK-22251 with palette, an address label with `defaultOrientation: 'horizontal'`, a round label with `cornerRadiusMm: widthMm / 2`. |
| `src/orientation.ts` (new) | `pickRotation` per §3.2, plus the `90 \| 270` family-direction type alias. |
| `src/adapter.ts` | Doc update only: "Multi-colour drivers check `media.palette` and split planes if defined; orientation is via `pickRotation` + render-option `rotate`." |
| `src/__tests__/types.test.ts` | Add assertions: `palette` is `readonly PaletteEntry[] \| undefined`; `defaultOrientation` accepts `'horizontal' \| 'vertical' \| undefined`; `printMargins` requires all four edges when present; `cornerRadiusMm` is optional `number`. |
| `src/__tests__/orientation.test.ts` (new) | Cover `pickRotation` truth table — explicit override wins; `'horizontal'` + landscape rotates; `'horizontal'` + portrait passes; `'vertical'` always passes; missing hint passes. |

### 4.2 `brother-ql` (this repo)

| File | Change |
|---|---|
| `packages/core/package.json` | Bump `@thermal-label/contracts` to `^0.2.0`. |
| `packages/node/package.json` | Same. |
| `packages/web/package.json` | Same. |
| `packages/core/src/types.ts` | Drop `colorCapable: boolean` from `BrotherQLMedia` (palette comes from base). Keep `printAreaDots`, `leftMarginPins`, `rightMarginPins`, `dieCutMaskedAreaDots` — these are protocol-internal cache, separate concern from the design-side `printMargins`. |
| `packages/core/src/media.ts` | Per-entry edits. DK-22251 (id 251): replace `colorCapable: true` with `palette: [{name:'black',rgb:[0,0,0]},{name:'red',rgb:[255,0,0]}]`. Drop `colorCapable: false` everywhere else. Tag rectangular die-cut entries (DK-11201 29×90, DK-11202 62×100, DK-11203 17×87, DK-11204 17×54, DK-11209 62×29, DK-11218 38×90, DK-11219 39×48, DK-11240 102×51, DK-11241 102×152, 23×23, 52×29) with `defaultOrientation: 'horizontal'`. Add `cornerRadiusMm: 3` to those die-cut entries (verify exact value from Brother DK datasheet). Round die-cuts (12∅, 24∅ DK-11221, 58∅ DK-11207): `cornerRadiusMm: widthMm / 2`. Continuous DK-22251 / DK-22205 (62 mm): leave `defaultOrientation` undefined for now, set after a hardware test of horizontal-vs-vertical 62 mm authoring. |
| `packages/core/src/media.ts:findMediaByDimensions` | Switch the prefer-two-colour predicate from `m.colorCapable` to `m.palette !== undefined`. |
| `packages/core/src/preview.ts` | `if (media.colorCapable)` → `if (media.palette)`. Use `media.palette` instead of importing `BROTHER_QL_TWO_COLOR_PALETTE`. |
| `packages/core/src/orientation.ts` (new) | `export const ROTATE_DIRECTION = 90;` (presumed CW; verify on hardware in §6 step 1). |
| `packages/core/src/palette.ts` | **Delete.** No longer needed. |
| `packages/core/src/index.ts` | Drop the `BROTHER_QL_TWO_COLOR_PALETTE` export. Re-export `PaletteEntry` from contracts. Export `ROTATE_DIRECTION` and re-export `pickRotation` from contracts. |
| `packages/node/src/printer.ts` | In `print()`, replace the explicit color-capable branch with: compute `rotate` via `pickRotation`, then pick `renderMultiPlaneImage` (when `media.palette`) or `renderImage` (otherwise), passing `{ rotate, ... }`. Drop the `BROTHER_QL_TWO_COLOR_PALETTE` import. Add `rotate?: 'auto' \| 0 \| 90 \| 180 \| 270` to the print options interface (TBD: where this lives — likely a new `PageOptions.rotate` mirrored in contracts `PrintOptions`). |
| `packages/web/src/printer.ts` | Same wiring. |
| `packages/core/src/__tests__/media.test.ts` | Drop `colorCapable` assertions. Add: DK-22251 carries a length-2 palette; rectangular die-cut entries carry `defaultOrientation: 'horizontal'`; round die-cuts carry `cornerRadiusMm == widthMm / 2`. |
| `packages/core/src/__tests__/preview.test.ts` | Replace `colorCapable: true` fixtures with `palette`. |
| `packages/core/src/__tests__/status.test.ts` | Same fixture swap if any. |
| `packages/node/src/__tests__/printer.test.ts` | Add a test that `print()` on a `defaultOrientation: 'horizontal'` die-cut with landscape input rotates the encoded raster (raster row width matches the *short* media axis after rotation). |
| `packages/web/src/__tests__/printer.test.ts` | Mirror the above test. |
| `scripts/print-color-label.mjs` | Drop `BROTHER_QL_TWO_COLOR_PALETTE` import; pass `MEDIA[251].palette` directly. |
| `scripts/print-orientation-test.mjs` | Same. |
| `docs/core.md` | Update palette example to use `MEDIA[251].palette`. Document `defaultOrientation`, `printMargins`, `cornerRadiusMm`. |
| `docs/node.md`, `docs/web.md`, `docs/getting-started.md` | "Driver runs `renderMultiPlaneImage` with `media.palette`" + "auto-rotates landscape input on labels with `defaultOrientation: 'horizontal'`". |
| `DECISIONS.md` D8 | Rewrite: palette lives on the descriptor, not as a separate constant. Add a new decision recording the orientation strategy. |

### 4.3 `labelmanager`

| File | Change |
|---|---|
| `packages/core/package.json` | Bump `@thermal-label/contracts` to `^0.2.0`. |
| `packages/core/src/types.ts` | Drop `colorCapable: false` from `LabelManagerMedia`. |
| `packages/core/src/media.ts` | Drop `colorCapable: false` from all four entries. Add `defaultOrientation: 'horizontal'` to all four (matches today's unconditional-rotate behaviour). Add `printMargins` per the LabelManager datasheet (~3 mm tape-start/end). |
| `packages/core/src/orientation.ts` (new) | `export const ROTATE_DIRECTION = 90;` (today's code rotates 90 = CW; keep). |
| `packages/core/src/protocol.ts` `buildBitmapRows` and `buildPrinterStream` | **Delete the hard-coded `rotateBitmap(padded, 90)` calls.** Rotation moves up to the driver via `pickRotation`. Net behaviour preserved for current users (every tape entry will carry `defaultOrientation: 'horizontal'`); now overridable via the print-option `rotate`. |
| `packages/node/src/printer.ts` + `web/src/printer.ts` | Same wiring as Brother QL §4.2: compute `rotate` via `pickRotation`, pass to `renderImage`. |
| Tests | Adjust mocks; add a "explicit `rotate: 0` bypasses the auto-rotate" test. |

### 4.4 `labelwriter`

| File | Change |
|---|---|
| `packages/core/package.json` | Bump `@thermal-label/contracts` to `^0.2.0`. |
| `packages/core/src/types.ts` | Drop `colorCapable: false` from `LabelWriterMedia`. |
| `packages/core/src/media.ts` | Drop `colorCapable: false` from all six entries. Tag rectangular die-cut entries (`ADDRESS_STANDARD`, `ADDRESS_LARGE`, `SHIPPING_STANDARD`, `SHIPPING_LARGE`, `FILE_FOLDER`) with `defaultOrientation: 'horizontal'`. Add `printMargins` (~1.5 mm on shipping labels per Dymo spec). Add `cornerRadiusMm: 3` to die-cut entries. Continuous 56 mm: omit `defaultOrientation` (user decides), no `cornerRadiusMm`. |
| `packages/core/src/orientation.ts` (new) | `export const ROTATE_DIRECTION` (verify CW vs CCW on hardware). |
| `packages/core/src/protocol.ts` `fitBitmapWidth` | Keep as-is — it pads/crops to head width, runs *after* rotation. |
| `packages/node/src/printer.ts` + `web/src/printer.ts` | Insert `pickRotation` between `renderImage` and `encodeLabel`. Today's silent landscape-crop becomes a correct rotated print. |
| `packages/core/src/__tests__/media.test.ts:28-32` | Remove the "every entry declares colorCapable: false" test — meaningless once the field is gone. |

### 4.5 `cli`

| File | Change |
|---|---|
| `package.json` | Bump `@thermal-label/contracts` to `^0.2.0`. Pick up the new driver versions. |
| `src/commands/status.ts:80` | `if (media.colorCapable) details.push('two-colour');` → `if (media.palette) details.push(`${media.palette.length}-colour`);` (or just `'multi-colour'`). |
| `src/__tests__/status.test.ts:120` | Drop `colorCapable: false` from the mock. |
| `src/__tests__/print-text.test.ts:81` | Drop `colorCapable: false` from `stdMedia`. |
| `src/__tests__/print-image.test.ts:93` | Drop `colorCapable: false` from `stdMedia`. |

---

## 5. Release order

`@thermal-label/contracts` is consumed from npm by the drivers (not as
a workspace link), so the publish order is forced:

1. **`@thermal-label/contracts` `0.1.x → 0.2.0`** — the breaking
   change. Publish first.
2. **`brother-ql`, `labelmanager`, `labelwriter`** — any order. Each
   bumps the contracts dep, drops `colorCapable`, applies the
   per-repo edits in §4. All three publish as a minor (the public
   `*Media` type loses a field but nothing consumed it externally).
3. **`cli`** — picks up all three new driver versions and publishes.

For end-to-end verification before publishing contracts, point each
driver's `@thermal-label/contracts` dep at a local file path or pnpm
override during the dev cycle, then revert before tag.

---

## 6. Hardware verification — do this **before** writing code

Three things need to be confirmed on real printers, because they're
mechanical facts:

1. **`ROTATE_DIRECTION` per family.** Print one die-cut "F" landscape
   on each of: Brother QL (DK-11201 29×90 if available), LabelManager
   (any tape), LabelWriter (89×28 address). The "F" reading the
   right way up confirms `90` (CW); upside-down or mirrored confirms
   the other direction. ~1 hour total.
2. **Brother QL 62 mm continuous default orientation.** Today's users
   author wide-and-short (image width = 696 dots). Decision: tag
   62 mm continuous (DK-22251 / DK-22205) with `defaultOrientation:
   'horizontal'` only if a portrait input (tall image with width <
   696) is something we want to auto-rotate. Test: build one
   portrait image (350 wide × 800 tall), pass to today's `print()`
   on DK-22251 → does it look right or bizarre? Inform the
   decision.
3. **`printMargins` and `cornerRadiusMm` values.** Pull from each
   manufacturer's datasheet. Verify with a calliper on one sample
   per family — known-rounded die-cut, tape ends. Cheap, but
   measure-once.

---

## 7. Backwards compatibility

- **`colorCapable` is removed (breaking).** Migration: callers reading
  `media.colorCapable` switch to `media.palette !== undefined` (or
  truthy-check). Callers constructing `MediaDescriptor` literals
  drop the field. Default behaviour for single-ink media is
  unchanged — `undefined` reads in `if` branches the same way `false`
  did.
- **`defaultOrientation` is additive (non-breaking by itself).** But:
  - **LabelManager users** who pre-rotated portrait bitmaps to
    work around the unconditional rotate get a behaviour change —
    their portrait input is now preserved, not double-rotated. This
    is arguably a bug fix, but flag in the changeset and bump
    `labelmanager-*` as a major.
  - **Brother QL** users who pre-rotated for die-cut: their rotated
    portrait bitmap stays portrait (no auto-rotate triggered). No
    change. Users who used to mis-print landscape input now get the
    intended visual. Pure improvement.
  - **LabelWriter** users who fed landscape input used to get a
    silent crop. They now get the intended visual. Pure improvement.
- **`printMargins` and `cornerRadiusMm` are purely additive
  informational fields.** No driver behaviour change.
- **Print option `rotate`** is additive on each driver's
  `PrintOptions`. Default `'auto'` matches the new heuristic.
  Existing call sites without the option keep working.

---

## 8. Suggested execution order

1. Hardware verification pass (§6). Lock in `ROTATE_DIRECTION`
   per family and the 62 mm orientation question. **Do not write
   code before this is settled.**
2. Land `MediaDescriptor` type + `pickRotation` helper in contracts.
   Publish `0.2.0`. Tests in contracts cover the new types and
   `pickRotation` truth table.
3. `brother-ql` repo (this one): tag MEDIA entries, swap
   `colorCapable` → `palette`, wire `pickRotation` into
   `print()` (Node + Web), delete `palette.ts`, update tests, ship.
4. `labelmanager`: tag MEDIA entries, delete the hard-coded rotate,
   wire `pickRotation`, ship as a major (behaviour change for
   pre-rotated callers).
5. `labelwriter`: tag MEDIA entries, wire `pickRotation`, ship.
   Closes the silent-landscape-crop bug.
6. `cli`: bump driver deps, fix `status` printout, ship.
7. Docs pass across the four repos: replace any
   `BROTHER_QL_TWO_COLOR_PALETTE` references and document the
   "input is what you see" convention.

Each step is independently shippable. Total scope: 1–2 days of
coding, plus the hardware-verify pass up front.

---

## 9. Open questions

- **Brother QL 62 mm continuous `defaultOrientation`** — see §6 step 2.
- **PT-series** (per `GAP_ANALYSIS.md` §2.1) — same orientation rules
  apply once that driver lands. Pin-layout / rotation direction TBD
  per Brother PT-series spec. No action now.
- **`printMargins` data source** — Brother DK datasheet, Dymo media
  catalogue, LabelManager tape spec. Sourcing is a separate effort
  on the catalogue side; this plan only requires the *shape* be
  available so the catalogue can populate it. Drivers that don't
  have authoritative numbers can leave `printMargins` undefined.
- **Future preview enhancement** — `createPreviewOffline` could
  honour `cornerRadiusMm` and `printMargins` to draw a properly
  clipped preview with rounded corners. Out of scope here; the
  field shape is enough to enable that future change.

---

## 10. How to work — per repo

Each of the four repos this plan touches (`contracts`, `brother-ql`,
`labelmanager`, `labelwriter`, `cli`) is a separate git repository
with its own commit history. Treat each one's slice of the work as a
self-contained unit: progress log, gates, commit, all inside that
repo before moving to the next.

### 10.1 Progress log

Every repo already carries a `PROGRESS.md` at its root in a
checkbox-style format (see e.g. [brother-ql/PROGRESS.md](PROGRESS.md)).
Append a new step block for this refactor:

```markdown
## Step N — MediaDescriptor refactor + orientation

> Plan: [MEDIA_DESCRIPTOR_REFACTOR.md](MEDIA_DESCRIPTOR_REFACTOR.md)

- [ ] Bump `@thermal-label/contracts` to `^0.2.0`
- [ ] Drop `colorCapable` from <family>Media type
- [ ] Add `palette` to multi-ink media entries (brother-ql only)
- [ ] Add `defaultOrientation: 'horizontal'` to applicable entries
- [ ] Add `printMargins` per datasheet (where applicable)
- [ ] Add `cornerRadiusMm` to die-cut entries (where applicable)
- [ ] Add `ROTATE_DIRECTION` constant
- [ ] Wire `pickRotation` into `print()` (Node + Web)
- [ ] Update tests and remove obsolete fixtures
- [ ] Update docs / scripts
- [ ] Gates green (§10.2)
- [ ] Hardware verification print (where applicable, see §6)
```

Tick items as they go. Don't move on to the next step until the gates
pass for the current one.

### 10.2 Gates — run **all** of these before committing

In the repo root:

```bash
pnpm typecheck
pnpm lint
pnpm format        # prettier --write — produces a clean diff if formatting drifted
pnpm test          # full suite, not the fast subset
pnpm build         # confirms downstream consumers compile against the new dist
```

If any gate fails, fix it before committing. If `format` produces
changes, those go in the same commit as the source edits — don't
split formatting from logic.

### 10.3 Commit, per repo

Conventional-commit style, scoped to the package being changed:

```
refactor(media)!: replace colorCapable with palette; add orientation/margin fields
```

(or `feat(orientation):` / `chore(deps):` depending on the slice).
The `!` marker is required on the contracts and labelmanager commits
(both are major-version bumps); brother-ql / labelwriter / cli
commits are minor.

For multi-step work in one repo, prefer multiple focused commits over
one mega-commit. Suggested splits:

- **contracts**: 1) type changes + `pickRotation`, 2) tests + JSDoc.
- **brother-ql**: 1) MEDIA registry tagging (palette + orientation +
  margins), 2) driver wiring (`pickRotation` + render-option `rotate`),
  3) docs + scripts cleanup, 4) `delete palette.ts`.
- **labelmanager**: 1) MEDIA + types, 2) delete the protocol-level
  `rotateBitmap`, wire `pickRotation`, 3) tests.
- **labelwriter**: same shape as labelmanager.
- **cli**: one commit — small surface.

After committing in a repo, **do not push** until the matching upstream
release (`contracts@0.2.0` published before driver pushes; driver
versions published before cli push). Local commits stack until each
repo's release window opens.

### 10.4 Cross-repo coordination

Because contracts is consumed via npm (not workspace links), the
"verify locally then publish" flow:

1. Land contracts changes locally; do **not** publish yet.
2. In each driver / cli repo, set `@thermal-label/contracts` to a local
   file path or use a `pnpm.overrides` block during the dev cycle.
3. Land driver / cli changes locally; verify gates green against the
   local contracts.
4. Revert the file-path override; publish contracts → drivers → cli
   in the order from §5.
5. Push commits in each repo as the matching publish lands.

---

## 11. Verification (per repo, after the change)

- `pnpm typecheck` — surfaces any forgotten `colorCapable` refs
- `pnpm lint`
- `pnpm test`
- For brother-ql, additionally:
  - `node scripts/print-color-label.mjs --no-print` and
    `node scripts/print-orientation-test.mjs --no-print --debug-planes`
    and confirm the red-bar coverage stays in the same ballpark
    (~95.9% with text knockouts).
  - One die-cut hardware print on DK-11201 (or whatever rectangular
    die-cut is on hand) with landscape RGBA input — verify the
    printed strip reads horizontally and matches the on-screen
    reference.
- For labelmanager / labelwriter: one hardware print each with
  landscape input, confirm the printed strip reads horizontally
  (no double-rotation, no silent crop).
