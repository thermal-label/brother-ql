# Decisions — Brother QL retrofit to contracts/transport

Phase C of the three-driver retrofit. Shared conventions identical to
`../labelmanager/DECISIONS.md` and `../labelwriter/DECISIONS.md`.
Brother QL adds the two-colour printing path and media auto-detection.

## D1 — contracts + transport

- `@thermal-label/contracts@^0.1.1` — interface package.
- `@thermal-label/transport@^0.1.0` — shared USB/TCP/WebUSB classes.

Consumed from npm.

## D2 — One `print(RawImageData, media?, options?)`

`printText`, `printImage`, `printImageURL`, `printTwoColor` are deleted.
The single `print()` takes full RGBA. When the resolved media carries
a `palette` (e.g. DK-22251), the driver runs `renderMultiPlaneImage()`
from `@mbtech-nl/bitmap` with that palette and hands the two planes
to `encodeJob()`. `options.rotate` accepts `'auto'` (default) | `0` |
`90` | `180` | `270` to override the orientation heuristic (see D11).

## D3 — Local type renames

- `DeviceDescriptor` (local) → `BrotherQLDevice extends DeviceDescriptor`.
- `MediaDescriptor` (local) → `BrotherQLMedia extends MediaDescriptor`.
- Protocol options stay as `PageOptions` / `JobOptions` — they're
  structure types, not public API for callers, so no rename needed.
- `PrinterStatus` (local) → `BrotherQLStatus extends PrinterStatus`
  adding `editorLiteMode: boolean` (user-confirmed per-driver extension
  for the QL-820NWB pre-paired "raster jobs silently dropped" case).

## D4 — `PrinterStatus` shape

Status comes from the 32-byte response. Structured error codes:

- `no_media` — no roll installed
- `cover_open` — cover is open
- `cutter_jam` — cutter jammed
- `media_end` — end of roll
- `wrong_media` — loaded media doesn't match specified media
- `system_error` — internal error (raw code in the message)

Byte 10 / 11 of the response feed `findMediaByDimensions()` →
`detectedMedia`. When the response indicates two-colour mode (expanded
mode bit), we prefer `DK_22251` (id 251) over the regular 62mm
continuous (id 259) when both match the dimensions.

`editorLiteMode` is populated by checking the firmware status flag and
left on `BrotherQLStatus` as a driver-specific extension. Not an
error — the QL raster jobs simply won't print until the user flips
out of Editor Lite mode.

## D5 — `DEFAULT_MEDIA`

62mm continuous (`DK_22205`, id 259) — the common single-colour roll.
Used when `createPreview()` is called without media and without a
detected roll.

## D6 — `discovery` named export; network printers via SNMP

Node package exports `discovery: PrinterDiscovery`. `listPrinters()`
is the USB enumeration plus one SNMP broadcast of `hrDeviceDescr.1`
on the local subnets (transport's `enumerateNetworkDevices`), run
concurrently, USB first; either half may be unavailable without
hiding the other. Editor-Lite mass-storage devices expose a PID
outside the registry and are simply absent.

Port 9100 is write-only (raster reference §5.9; bench 2026-09-15,
QL-820NWBc: every `ESC i S` framing returns 0 bytes), so a network
printer's identity, status and print confirmation all come from its
SNMP agent (standard Host-Resources-MIB / Printer-MIB, no vendor
OIDs). `openPrinter({ host })` resolves the registry entry before
connecting: `deviceKey`, else `identifyNetworkDevice`, else
`DeviceIdentificationRequiredError`. `getStatus()` over TCP never
touches the socket. `print()` over TCP reads `prtMarkerLifeCount`
before and after the job and rejects when it does not move, because a
single-colour job on a DK-22251 roll (indistinguishable from DK-22205
on every network surface) is rejected silently; `confirm: false`
sends blind.

Behaviour change in 0.6.2: `listPrinters()` and
`openPrinter({ serialNumber })` now broadcast on the LAN and take at
least the 1 s collection window; `new BrotherQLDiscovery({ network:
false })` opts out. IPP and mDNS are not built (plan 17 D1): SNMP
covers every Brother NC print server and needs only `node:dgram`.

Web packages do not implement `PrinterDiscovery`.

## D7 — Transport byte-interface

All transports use `Uint8Array` and `async close()`. Local
`UsbTransport`/`TcpTransport` replaced with
`@thermal-label/transport/node`; web plumbing replaced with
`WebUsbTransport` from `@thermal-label/transport/web`.

## D8 — Multi-ink handling lives on the media descriptor

The multi-plane split is delegated to `renderMultiPlaneImage()` in
`@mbtech-nl/bitmap` (added in v1.2). The palette lives directly on
each `BrotherQLMedia` entry — DK-22251 declares `palette:
[{name:'black', rgb:[0,0,0]}, {name:'red', rgb:[255,0,0]}]`; every
other media leaves it undefined. The driver branches on
`media.palette !== undefined` to pick `renderMultiPlaneImage` vs the
single-plane dithered `renderImage`.

The previous standalone `BROTHER_QL_TWO_COLOR_PALETTE` constant in
`packages/core/src/palette.ts` is gone — there's no need for callers
to reconstruct the palette from a separate file. The legacy
`isRedish` heuristic (`r > 180 && g < 100 && b < 100`) and
`splitTwoColor` helper are also removed.

## D11 — Cross-driver orientation strategy

Orientation moved from the protocol layer to the driver layer via
`pickRotation` in `@thermal-label/contracts`. Each media entry may
declare `defaultOrientation: 'horizontal' | 'vertical'`; the driver
combines that with the input image's aspect ratio and a per-family
`ROTATE_DIRECTION` constant (Brother QL: `90` = CW) to pick the
rotation angle, which is then passed to `renderImage` /
`renderMultiPlaneImage` via the `rotate` option.

Net effect for users: input images are treated as the intended
visual; landscape input on rectangular die-cut media auto-rotates
to read along the tape feed direction. `print(image, media, { rotate
})` lets callers force a specific angle. `flipHorizontal` (the
pin-mirror compensation) still runs *after* rotation since it
addresses head geometry, not image orientation.

## D9 — Bluetooth on the QL-820NWB goes through the serial transports

The QL-820NWB / 820NWBc expose classic Bluetooth (SPP), not BLE/GATT —
so Web Bluetooth cannot drive them. After pairing the printer via the
OS Bluetooth settings, the kernel exposes an RFCOMM serial port:

- **Linux**: `/dev/rfcomm0` (after `bluetoothctl pair` + `rfcomm bind`).
- **Windows**: an auto-assigned `COM<n>`.
- **macOS**: unsupported — Apple removed classic Bluetooth SPP.

Drivers talk to the printer through
`SerialTransport` from `@thermal-label/transport/node` and
`WebSerialTransport` from `@thermal-label/transport/web`. The device
registry tags both models with `transports: [..., 'serial', 'web-serial']`
and no `'web-bluetooth'` entry anywhere.

On the node side, `discovery.openPrinter({ path, baudRate? })` opens
the serial port; `baudRate` defaults to 9600 (ignored by RFCOMM). On
the web side, callers use the browser picker; paired devices show up
in the Web Serial port list alongside wired serial adapters.

## D10 — CLI removal + version bump

- `packages/cli/` removed; superseded by the unified `thermal-label-cli`.
- Maintainer unpublishes `@thermal-label/brother-ql-cli` separately.
- core/node/web bump 0.0.1 → 0.2.0.

## D12 — Combined Brother driver covers QL + PT-P / PT-E

The PC-connectable PT-P / PT-E line shares the QL raster command set
~95% — same status request (`ESC i S`), same 32-byte response shape,
same raster opcode (`G`), same PackBits compression, same multi-plane
two-colour encoding, same vendor and VID. Per-device variation
(feed-margin, expanded-mode flag bit, head pin count, two-colour
support, cutter quirks) is exactly the kind of variation the contracts
0.3.0 device shape already handles.

Splitting QL and PT into separate packages would duplicate the
encoder, the PackBits implementation, the status parser, the framer,
the transport plumbing, and the docs site for no architectural
payoff. The labelmanager/labelwriter precedent does not apply —
those split because Dymo's tape command set and ESC/raster are
different protocol families with no shared opcodes; QL and PT-P
share the bulk of opcodes and only differ on a small set of
constants that fit cleanly behind a per-protocol config object
(`PT_PROTOCOL_CONFIG` / `QL_PROTOCOL_CONFIG` in `src/protocol.ts`).

The handheld P-touch line (PT-D, PT-H, PT-1xxx, PT-2xxx) is
explicitly out of scope — it uses Brother's ESC/P-style "P-touch
Tape Editor" protocol, not the raster command set. If ever covered,
it would be a separate driver (analogous to how labelmanager is
split off from labelwriter).

## D13 — TZe / HSe id ranges 400-499; lookup gated by tapeSystem and head family

DK consumes 200-299 + 300-399. PT consumables get 400-499 to avoid
public-API collision even if firmware never reports both ranges in
the same response:

- 401-419 — TZe laminated tape (currently 7 widths, room to grow).
- 421-439 — HSe 2:1 heat-shrink (5 widths today).
- 441-459 — HSe 3:1 heat-shrink (5 widths today).
- 460-499 — reserved for future PT media (TZeFA flexible-ID,
  paper-on-paper, fluorescent, etc.).

`findMediaByDimensions(widthMm, heightMm, twoColorMode, engine?)`
gates by `engine.mediaCompatibility` (so PT-P910BT, which is TZe-only,
never resolves an HSe entry) and by head-family geometry availability
(so a 128-dot head cannot reach 36 mm TZe / 31 mm HSe-3:1 — those
rows have no `geometry.narrow`). The legacy no-engine call preserves
DK-only behaviour for back-compat.

Per-head-family geometry sits at `BrotherQLMedia.geometry: { narrow?,
wide? }`. DK entries leave it unset and use the flat
`printAreaDots` / `leftMarginPins` / `rightMarginPins` fields as
before. The `resolveTapeGeometry(media, engine)` helper centralises
the dispatch (DK → flat fields, TZe/HSe → narrow/wide via
`engine.headDots`).

## D14 — nbuchwitz/ptouch is the source-of-truth for PT PIDs and pin configs

`nbuchwitz/ptouch` (Python, LGPL-2.1, active 2024-2026) transcribes
Brother's official *Raster Command Reference* PDFs and ships per-model
USB PIDs and full pin configurations. We treat it as primary. Each PT
device entry's `hardwareQuirks` field cites the source path
(`nbuchwitz/ptouch/src/ptouch/printers.py:<class>`) and the Brother
PDF filename it transcribed from, so future maintainers can re-check.

Secondary sources kept for cross-reference:

- **`hannesweisbach/ptouch-print/src/libptouch.c`** — disagrees with
  nbuchwitz on PT-P750W's printer PID (see D15).
- **`brother-label` / `pklaus/brother_ql`** — useful for golden-byte
  stream generation only. Their `Model(...)` entries carry no USB
  PIDs (vendor-only enumeration, runtime-PID-from-URL pattern), so
  they are *not* useful for PID lookup.

The 128-pin HSe configs carry an inherited "shifted -2 pins (up) based
on testing" correction from nbuchwitz; the 560-pin HSe configs carry
"shifted +17 pins down based on Brother software analysis". We
inherit those corrections rather than reverting to raw spec-PDF
values; phase 4 hardware verification on the maintainer's first PT
unit should confirm.

## D15 — PT-P750W stores both PIDs (libptouch.c authoritative)

libptouch.c says PT-P750W's printer PID is `0x2062` and `0x2065` is
the PLite mass-storage mode. nbuchwitz/ptouch says `0x2065` is the
printer PID. We treat libptouch.c as authoritative because:

- Most public USB databases (the-sz, linux-usb.org/usb.ids) list
  `0x2065` under the name "PT-P750W" — per libptouch.c that's
  the PLite mode the unit ships in by default.
- nbuchwitz may have copied the PID from those databases without
  verifying which mode it represents.

Resolution: `transports.usb.pid: '0x2062'` (printer) +
`capabilities.massStoragePid: '0x2065'`. The existing
`MASS_STORAGE_PIDS` discovery filter in `src/devices.ts` then handles
the dual-PID case via the same pattern as QL-700 / QL-1100. If a
PT-P750W contributor reports `findDevice()` doesn't match their unit,
flip the assignment.

## D16 — HSe heat-shrink ships in the same release as TZe

Including HSe rather than deferring because:

- Pin configs are already in the source we're porting from —
  excluding them would mean writing extra code to ignore them, not
  saving any work.
- HSe is the differentiator for the maker / industrial market; every
  PT-P900-series user we know of bought it specifically for HSe.
- Schema impact equals TZe: just `tapeSystem: 'hse-2to1' | 'hse-3to1'`
  vs `'tze'`, no new fields, no new code paths in the encoder.

The "shifted N pins" corrections from nbuchwitz are real risk and the
phase-4 hardware verification should print HSe samples and measure to
confirm.

## D17 — Linux usb-ids is the source-of-truth for QL PIDs (resolved 2026-05-01)

The pre-existing `packages/core/src/devices.ts` shipped with PIDs
that contradicted the Linux usb-ids database. The maintainer's actual
hardware (QL-820NWBc, PID `0x209d`) agreed with the Linux DB, which
strongly suggested the rest of the table was wrong rather than the
DB. Resolved as a pre-flight on 2026-05-01 (commit `66883d1`):

- The wrong `QL_820NWB` entry was dropped. PID `0x20a7` is QL-1100;
  the 820-series is covered by the existing `QL_820NWBc` entry at
  `0x209d` (the QL-820NWB and QL-820NWBc share that PID).
- QL-1100 / QL-1110NWB / QL-1115NWB PIDs and their mass-storage
  siblings re-aligned to the Linux DB.

Not a PT-series concern strictly, but the rename PR was going to
touch every device entry, so it was the natural moment to correct
them. The PT-series work then proceeded against a known-clean
registry.

## D18 — Per-protocol wire-format details live inside src/protocol.ts, not on the registry

Feed-margin (35 dots QL / 14 dots PT), invalidate-byte count
(QL bumps 200 → 400 when the engine declares
`capabilities.twoColor`; PT always 200), `ESC i K` high-res flag bit
(0x10 QL / 0x40 PT), raster-line duplication on PT high-res, and the
PT-E550W cutter-requires-compression quirk all sit inside
`src/protocol.ts` as part of `RasterProtocolConfig` plus a small
per-name set. None of these reach the registry data shape.

A registry capability is justified iff:

1. ≥2 active drivers implement it AND
2. a registry consumer branches on it.

The cutter-compression quirk fails (1) — it's PT-E550W only. The
high-res flag bit fails (2) — only the encoder branches on it; no
docs site, validator, or third-party tool needs to read it. The
two-colour invalidate boost is derivable from the engine capability
already present (`twoColor`) and so doesn't need its own flag.

This rule was applied to drop the proposed `compression`,
`numInvalidateBytes`, `feedMarginDots`, `modeSetting`, `expandedMode`,
`bytesPerRow`, and `line` fields that an earlier revision of the plan
proposed adding to the registry.

## D19 — `printableArea` stays zero on every QL/PT engine; brother solved this in firmware

Contracts `0.6.0` ships an optional `PrintEngine.printableArea` field
(see [`../../plans/backlog/08-dead-zone-model.md`](../../plans/backlog/08-dead-zone-model.md)
§4 + §5) that other drivers will populate to model the head-to-cutter /
sensor-window dead zone. On QL/PT engines the field stays at the
default `{ leading: 0, trailing: 0, left: 0, right: 0 }` — that's
not "not yet measured", it's "by design": Brother's `ESC i d` /
`feedMarginDots` (35 dots QL, 14 dots PT, on `RasterProtocolConfig`
in `src/protocol.ts`; provenance per plan §3 / D18) already enacts
the equivalent leading feed at the firmware level, and trailing
clearance is the firmware's autocut. The new field is the
encoder-side pad amount, which is zero here. The field becomes
relevant if a future Brother device ever ships without firmware feed
support; until then, omit / default.

## D20 — Die-cut pages are sent at the print-area length with margin 0

The QL cuts at raster count + `ESC i d` margin, not at the label gap.
Sending the bitmap's own height with the 35-dot continuous margin cut
a 608-row job on DK-11201 at ~54 mm, mid-label (bench 2026-09-15,
QL-820NWBc over TCP; USB has the same defect). The reference is
explicit: die-cut length is "Fixed" (§2.3.4), the margin command must
carry 0 (§2.3.3, `ESC i d`), and §2.3.2(b) column 4 gives the
print-area length per label (991 dots for 29×90). Python `brother_ql`
enforces the same by refusing images that are not exactly
`dots_printable`.

`encodeRasterJob` therefore treats `media.type === 'die-cut'` as a
fixed page: raster number and rows sent = `dieCutMaskedAreaDots`
(the column-4 value; the field name predates this reading and is
kept), doubled when the caller supplies QL high-res rows, the bitmap
centred with blank rows around it, margin 0 whatever `marginDots`
says. A taller bitmap is an error naming both numbers rather than a
crop: the excess would never have fitted on the label. Continuous
media is untouched (locked by a digest test). There is no layout step
to move this into: `print()` encodes the caller's bitmap as-is, so
the encoder is the one place the page length is known.
