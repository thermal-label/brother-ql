# brother-ql — Migrate to the contracts device & media shape

> Port `BrotherQLDevice` (and the wider Brother lineup once the PT
> series is added) onto the shared shape defined in
> `../../../contracts/plans/backlog/generic-device-media-library.md`.
> Folds in the verification overlay (`docs/hardware-status.yaml` →
> inline `support` block in `data/devices/<KEY>.json5`) and subsumes the
> existing `add-pt-series` backlog plan.
>
> The shape itself is not litigated here — the contracts plan owns
> that. This plan covers what changes in the `brother-ql` /
> `brother` package and how the migration lands.

---

## 1. Subsumed backlog plans

This plan replaces the schema portions of:

- `add-pt-series.md` — adds PT-P / PT-E PC-connectable lineup. The
  schema bits (engines/transports, capability flag placement) move
  here; the device/media catalogue and protocol implementation stay
  there.

The package rename (`brother-ql` → `brother`,
`BrotherQLDevice` → `BrotherDevice`) used to live as the lead-off
step here. **It has been spun off into its own plan**
(`rename-to-brother.md`) because bundling a global identifier rename
with a shape migration doubled the review surface. This plan now
assumes the rename will happen on its own cadence — either before or
after this work — and does not depend on it. The current package
names (`@thermal-label/brother-ql-*`, `BrotherQLDevice`, etc.) are
used throughout this plan unless and until the rename plan lands
first.

Non-schema bits from `add-pt-series` to preserve:

- PT-series-specific protocol bytes / status parsing — separate
  protocol implementation work, lands in `src/protocols.ts`
  alongside `ql-raster`.
- Per-device feature flags — placement under the new shape
  follows the contracts-plan rule (named in contracts iff
  implemented by ≥2 active drivers AND a registry consumer
  branches on it):
  - `autocut`, `mediaDetection` → `engine.capabilities` as
    **named contracts keys** (multi-vendor, consumers branch).
  - `twoColor` → `engine.capabilities` via the open
    `[k: string]: unknown` index signature. Brother-only today
    in our active driver set, so by the promotion rule it stays
    driver-side. Promote to a named contracts key when a second
    vendor (Niimbot, Phomemo, …) lands the same capability with
    compatible semantics.
  - `compression` → **protocol-internal**, not a registry field.
    The wire-format details live in `src/protocols.ts` inside the
    `ql-raster` `encode()` implementation. Dymo's protocols carry
    their own RLE without surfacing it as a capability either —
    no consumer branches on it.
  - `editorLite`, `massStoragePid` → `DeviceEntry.capabilities`
    via the open index signature (chassis-level, vendor-specific:
    Brother's USB-Mass-Storage P-touch trick is about how the
    chassis enumerates, not what the head does, and no other
    vendor has the same mechanism).

The brother package ships a typed extension for its driver-side
engine keys (`twoColor`, plus any future Brother-specific
capabilities), letting Brother-side code type-check `twoColor`
even though it lands via the index signature on the contracts
shape.

---

## 2. What changes in the package

### 2.1 New files

- `packages/core/data/devices/<KEY>.json5` — one file per device,
  source of truth. JSON5 with comments. Replaces the in-source
  `DEVICES` constant. PR blast radius scales with the change.
- `packages/core/data/devices.json` — build artifact, aggregated
  `DeviceRegistry`.
- `packages/core/data/media.json5` — Brother DK rolls (and PT
  TZe-tape lineup, as `add-pt-series` proposes). Single file for
  media is fine.
- `scripts/compile-data.mjs` — globs `data/devices/*.json5`,
  validates and aggregates them, writes `data/devices.json`.

### 2.2 Modified files

- `packages/core/src/devices.ts` — thin re-export of the compiled
  JSON, typed as `DeviceRegistry` with `family: 'brother'`.
- `packages/core/src/media.ts` — same shape; thin re-export.
- `packages/core/src/protocols.ts` — `PROTOCOLS` registry.
  `ql-raster` ships day one; PT-series protocols (`pt-raster` or
  whatever `add-pt-series` picks) layer on as their impls land.
- The rasterizer — reads `engine.headDots`. `headPins` and
  `headDots` were both carried at top level today; under the new
  shape `headDots` lives on the engine and `headPins` either
  becomes a derived value (most QL devices have a 1:1 mapping) or
  stays as `engine.headPins` if the relationship is not 1:1
  somewhere in the lineup. Driver-internal field, not on the
  contracts shape.
- The transport-resolution logic — reads
  `device.transports.{usb,tcp,bluetooth-spp,bluetooth-gatt}`.
- `validate-hardware-status.mjs` — extended to validate the whole
  entry shape.

### 2.3 Removed files

- `docs/hardware-status.yaml` — content folds inline.
- `docs/hardware.md` — reduced to a one-line pointer to the docs
  site's per-device pages.

---

## 3. Worked entries

### 3.1 QL-820NWB — multi-transport, network + Bluetooth-SPP

See contracts plan §3.4 for the full JSON. Three transports
declared; the runtime resolver intersects with whichever ones the
hosting platform supports. The `bluetooth-spp` block names the
device's Bluetooth name prefix; the runtime's serial impl
(`nodeSerialImpl` satisfies both `serial` and `bluetooth-spp`)
opens the OS-paired RFCOMM device.

Worth surfacing in the entry's `hardwareQuirks` prose: macOS SPP
support is untested as of this plan. Linux and Windows both work
via the OS-paired path.

### 3.2 QL-700 / QL-800 — USB-only

Single engine, USB transport, engine-level `mediaDetection: true`
(cassette-based detection). The mismatch behavior (printer
hard-rejects with an error code on cassette/host mismatch) is
`hardwareQuirks` prose:

```json5
{
  key: "QL_700",
  name: "Brother QL-700",
  family: "brother",
  transports: { usb: { vid: "0x04f9", pid: "0x2042" } },
  engines: [
    {
      role: "primary",
      protocol: "ql-raster",
      dpi: 300,
      headDots: 720,
      mediaCompatibility: ["dk"],
      capabilities: { mediaDetection: true, autocut: true }
    }
  ],
  hardwareQuirks: "Cassette-based media detection. Printer hard-rejects with an error code if the host's job dimensions don't match the loaded DK cassette. Apps that compare detected vs selected media should switch to the matching cassette before sending.",
  support: { status: "untested" }
}
```

### 3.3 QL-820NWB two-colour

`engine.capabilities.twoColor: true` — driver-side via the index
signature, not a named contracts key (Brother-only today). The
two-colour rendering is a rasterizer / protocol concern; the
registry just declares the capability.

### 3.4 PT-P / PT-E series

Land with `add-pt-series`'s entries, restructured to the new
shape. Each PT entry:

- `transports.usb` for the USB-connectable models.
- `engines[0]` with `dpi: 180` (or whatever the PT lineup uses)
  and the appropriate `headDots`. Engine `capabilities` carries
  cutter / two-colour flags as applicable.
- `DeviceEntry.capabilities.editorLite` for the chassis models
  that do the Mass-Storage-Class P-touch Editor Lite trick (the
  trick is about how the USB controller enumerates, not what the
  head does — chassis-level).
- `mediaCompatibility: ['tze']` (or the lineup-appropriate
  matchstring).

The PT lineup adds the `tze` cartridge media class; entries for TZe
tapes land in `data/media.json5` with `targetModels: ['tze']`.

---

## 4. YAML → JSON5 migration

Mechanical 1:1 migration as in the labelwriter plan. The Brother
ledger today is smaller (fewer verified entries); migration is a
single sitting.

---

## 5. Test plan

- TS compile passes against `DeviceRegistry`.
- Rasterizer fixtures produce identical bytes.
- Transport tests still find their devices via the new
  transport-keyed object.
- The QL-820NWB resolves with USB on Linux/Windows/macOS and with
  `bluetooth-spp` on platforms that satisfy the transport.
- WebUSB filter generation matches the previous list.
- The validator catches malformed entries.

---

## 6. Sequencing

The package rename has been deferred to `rename-to-brother.md` — see
§1. Sequencing below assumes current names; if the rename lands
first, do a global s/brother-ql/brother/ and s/BrotherQL/Brother/
across the new artifacts before the first PR here.

1. **JSON5 + compile script** — port the existing `DEVICES` constant
   into JSON5 under `data/devices/<KEY>.json5`; add
   `scripts/compile-data.mjs` (mirroring labelmanager's); thin
   re-export from `src/devices.ts` via a generated
   `src/devices.generated.ts`. Bump
   `@thermal-label/contracts` to `^0.3.0`. CI passes; runtime
   behavior unchanged.
2. **Migrate `hardware-status.yaml` inline** — fold support data
   into the JSON5 entries' `support` block.
3. **Promote engines / transports** — restructure entries to the
   new shape (`engines[]`, keyed `transports`, capability flag
   placement per §1). Migrate rasterizer + transport-resolution
   to read from the new paths.
4. **Add multi-transport entries** — QL-820NWBc declares its three
   transports honestly (`usb` + `tcp` + `bluetooth-spp`) instead
   of the current serial-workaround note.
5. **Add PT-series entries + protocol** (from `add-pt-series`) —
   entries land in the new shape from day one; protocol
   implementation lands in `src/protocols.ts`.
6. **Cleanup** — remove the subsumed schema sections of
   `add-pt-series`, reduce `docs/hardware.md` to a one-line
   pointer.

Steps 3 onward layer cleanly on top of step 1+2.
