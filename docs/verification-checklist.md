# Verification checklist — Brother QL / PT

Hardware verification now runs through the harness app. It walks
through device detection, prints a diagnostic, and submits a
hardware report issue automatically — no manual CLI transcription,
no scattered captures.

## Browser harness

> **Coming soon.** The `brother-ql` browser harness is scaffolded but
> not yet bench-validated. Track progress in the
> [harness monorepo](https://github.com/thermal-label/harness) —
> specifically `apps/harness-brother-ql/`. Once shipped it will live
> at <https://thermal-label.github.io/harness/brother-ql/>.

Until it ships, use the CLI harness (below) or the hand-rolled
fallback.

## CLI harness

For TCP-9100 network models (QL-720NW, QL-810W, QL-820NWB / NWBc,
QL-1110NWB / 1115NWB, QL-580N, QL-1060N) and any transport the
browser can't reach, run from a checkout of the harness monorepo:

```bash
pnpm --filter verify-cli verify brother-ql <model-key>
```

## Fallback

Hand-rolled report? Open the
[hardware verification issue template](https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml)
directly.

## Driver-specific notes for the verifier

- **PT-\* models are first-verifier territory.** The PT-P / PT-E
  registry is built from `nbuchwitz/ptouch`'s transcription of
  Brother's spec PDFs. If you have a PT, you are the first reporter
  on that chassis — flag this in the issue so the maintainer knows
  to scrutinise.
- **PT-E550W cutter quirk.** The encoder guard automates this, but
  if a print with `{ autoCut: true, compress: false }` does **not**
  throw on your unit, capture that — it would mean the firmware
  behaviour drifted from the documented quirk
  (see [`DECISIONS.md`](https://github.com/thermal-label/brother-ql/blob/main/DECISIONS.md)
  D14).
- **Mass-storage PIDs are missing for most PT models.** Only
  PT-P750W's mass-storage PID is currently in the registry. If your
  PT unit ever enumerates as mass storage on a PID different from
  its printer-class PID, capture that PID via `lsusb` / Device
  Manager / System Information and add it to the report.
