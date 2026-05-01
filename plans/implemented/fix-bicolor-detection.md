# brother-ql — Fix two-color roll auto-detection (DK-22251)

> `parseStatus` in `packages/core/src/status.ts` reads enough of the
> 32-byte status response to identify width + length + media type,
> but **hardcodes `twoColorMode = false`** when calling
> `findMediaByDimensions`. The result: a loaded DK-22251 (62mm
> two-color continuous) collides on dimensions with DK-22205 (62mm
> single-color continuous) and always resolves to the single-color
> entry, never the two-color one.
>
> Prior status-byte capture work (see
> [`scripts/STATUS-CAPTURE.md`](../../scripts/STATUS-CAPTURE.md))
> identified **byte 25 bit 7** as the likely two-color flag from a
> diff between DK-22251 (`0x81`) and DK-11201 (`0x01`). This plan
> ships the parse fix and the missing confirmation capture together.

---

## 1. The bug, precisely

`packages/core/src/status.ts:71`:

```ts
const detected = mediaLoaded
  ? findMediaByDimensions(mediaWidthMm, mediaLengthMm, false)  // ← always false
  : undefined;
```

`findMediaByDimensions(width, length, twoColorMode)` exists (and
works) — it picks between same-dimension media based on whether the
caller wants the two-color variant. The caller doesn't know.

Practical effect: a user with a real DK-22251 loaded gets
`detectedMedia = DK_22205` (or whatever the 62mm single-color
continuous entry is). Their app picks single-ink rendering instead
of two-plane red+black, and the print comes out wrong.

This becomes more pressing under the contracts-level
`mediaDetection: 'enforced'` model (see
`../../../contracts/plans/backlog/generic-device-media-library.md`
§3.1) — Brother QL is `'enforced'` because the printer rejects
mismatches. If our `detectedMedia` is wrong, the runtime mismatch
helper will block the print on what is actually a compatible roll.
Wrong detection cascades into a blocked print rather than a silent
misprint.

---

## 2. The hypothesis to confirm

From `scripts/STATUS-CAPTURE.md` (already captured):

| Byte | DK-22251 (two-color)| DK-11201 (single-color) | Hypothesis |
|-----:|:-------------------:|:-----------------------:|------------|
|   25 | `0x81` (`10000001`) | `0x01` (`00000001`)     | Bit 7 = two-color flag |

Bit 0 is set in both cases (some unrelated steady-state bit). Bit
7 differs and aligns with the only meaningful difference between
the rolls (color capability). High confidence but two data points
isn't proof — DK-22251 happens to also be continuous while
DK-11201 is die-cut, so byte 25 could in principle be encoding
something co-varying with two-color rather than two-color itself.

The minimum disambiguating capture is **DK-22205** (62mm
single-color continuous — same width, same media type, no
two-color):

- If byte 25 = `0x01` → bit 7 is the two-color flag. Ship the fix.
- If byte 25 = `0x81` → bit 7 means something else (e.g. continuous
  flag); we need another hypothesis. Capture more rolls per
  `STATUS-CAPTURE.md` priority list.

The other priority captures (DK-22210 29mm continuous, DK-11202
62×100mm die-cut, DK-11204 17×54mm die-cut) are nice-to-have for
filling in byte 14 and byte 17 cross-checks; only DK-22205 is
load-bearing for *this* fix.

---

## 3. The fix

Once byte 25 bit 7 is confirmed:

```ts
// packages/core/src/status.ts
const twoColorFlag = (view.getUint8(25) & 0x80) !== 0;

const detected = mediaLoaded
  ? findMediaByDimensions(mediaWidthMm, mediaLengthMm, twoColorFlag)
  : undefined;
```

Three lines changed. The parse function already reads enough; only
the byte-25 read and the third argument are new.

Surface the flag on `BrotherQLStatus` so callers can introspect
without reparsing — useful for diagnostics and for the runtime
mismatch helper that wants to know *why* detection landed where
it did:

```ts
// packages/core/src/types.ts
export interface BrotherQLStatus extends PrinterStatus {
  // ...existing fields...
  /** True when the loaded roll reports two-color capability (byte 25 bit 7). */
  twoColorRoll?: boolean;
}
```

`twoColorRoll` is undefined when the response can't be parsed for
it (e.g. older firmware that doesn't set the bit) so consumers can
distinguish "single-color" from "unknown".

---

## 4. Tests

Three synthetic 32-byte fixtures in
`packages/core/src/__tests__/status.test.ts`:

1. DK-22251 capture from `STATUS-CAPTURE.md` → asserts
   `detectedMedia.id === 251` (DK-22251) and
   `twoColorRoll === true`.
2. DK-11201 capture from `STATUS-CAPTURE.md` → asserts
   `detectedMedia.id === 271` (29×90mm die-cut entry) and
   `twoColorRoll === false`.
3. **DK-22205 capture (newly captured per §2)** → asserts
   `detectedMedia.id === 259` (62mm single-color continuous) and
   `twoColorRoll === false`.

The third fixture *is* the disambiguating data point — tests
crystallise it as a permanent regression guard. Without it, future
changes to the media registry could re-introduce the
DK-22251/DK-22205 ambiguity silently.

Add a fourth fixture if available:

4. DK-22251 with continuous-mode override (set non-default mode
   bytes) → confirms the two-color flag is independent of mode
   bytes.

---

## 5. Phasing

Two PRs, ordered:

1. **Capture** — run `node scripts/dump-status.mjs DK-22205` on
   bench, append the dump block to `scripts/STATUS-CAPTURE.md`
   under "Captured rolls", update the diff table at the bottom,
   delete DK-22205 from the "What we still need" priority list.
   Trivial diff; locks the evidence into the repo.
2. **Fix + tests** — three-line `parseStatus` change,
   `BrotherQLStatus.twoColorRoll` field, three (ideally four)
   regression-guard tests. Cross-references the capture from PR 1.

The fix ships only after the capture lands. The fix without the
capture would be a guess; the capture without the fix would be
data with no consumer. Together they're a coherent change.

---

## 6. Cross-cutting impact

### `contracts/plans/backlog/generic-device-media-library.md`

This driver carries `mediaDetection: 'enforced'` per §3.1 of that
plan. The mismatch helper (`compareDetectedToSelected`,
`mediaIdentitiesMatch`) returns `'override-blocked'` when
detected ≠ selected — meaning a mis-detected DK-22251 today causes
the runtime to *block* the print on a roll the user actually has
loaded. Until this fix lands, the runtime helper will appear
buggy on Brother QL hardware whenever a two-color roll is in the
machine.

Mention this in the cross-impact section of the contracts plan
once both land — the helper itself is correct, the bug was
upstream in `parseStatus`.

### `brother-ql/plans/backlog/add-pt-series.md`

The PT-P / PT-E lineup uses the same raster command family and
likely the same status-response layout. If byte 25 bit 7 holds for
PT models too, the fix is automatically inherited. If PT models
encode two-color elsewhere (or don't have two-color media at all),
the parse function may need to gate on family. Defer until PT
hardware is on the bench.

### `scripts/STATUS-CAPTURE.md`

The "Known issues in parseStatus (to fix)" section already lists
"Byte [25] may encode two-color — pending confirmation, but worth
adding once confirmed". After PR 2 ships, update that list to
mark the item resolved and link the test fixtures.

---

## 7. Open questions

- **Is byte 25 bit 7 set on *all* two-color rolls Brother makes,
  or only DK-22251 specifically?** Brother's two-color lineup is
  small (DK-22251 being the prominent one); if DK-22606 or any
  newer two-color SKU surfaces, capture and verify. Cheap to add
  rolls to the byte-25 confirmation set.
- **Does the bit reliably clear on a single-color roll loaded into
  a printer that just printed a two-color job?** I.e. is byte 25
  driven purely by the cassette, or does it carry residual state
  from prior jobs? Probably cassette-driven (the byte changes when
  rolls change in our existing captures), but bench-confirm.
- **Do older firmware revisions of QL-820NWB always populate byte
  25?** Our captures are from one specific firmware (QL-820NWBc).
  If older firmware leaves byte 25 as `0x00`, our `(byte25 & 0x80)
  !== 0` check returns `false` — which is the safe fallback (treat
  as single-color, same as today's behaviour). No regression risk.
