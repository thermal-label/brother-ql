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
The single `print()` takes full RGBA. When `media.colorCapable` is
true (e.g. DK-22251), the driver runs `splitTwoColor()` internally and
hands the two planes to `encodeJob()`.

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

## D6 — `discovery` named export

Node package exports `discovery: PrinterDiscovery` with USB
enumeration. Editor-Lite mass-storage devices (PIDs `0x20AA`, `0x20AB`)
are skipped with a console warning — same behaviour as pre-retrofit.

TCP discovery returns USB matches only from `listPrinters()`; network
printers open via `openPrinter({ host, port })`. mDNS not implemented.

Web packages do not implement `PrinterDiscovery`.

## D7 — Transport byte-interface

All transports use `Uint8Array` and `async close()`. Local
`UsbTransport`/`TcpTransport` replaced with
`@thermal-label/transport/node`; web plumbing replaced with
`WebUsbTransport` from `@thermal-label/transport/web`.

## D8 — Two-colour handling

`splitTwoColor(image, options?)` lives in
`packages/core/src/colour.ts`. `isRedish()` threshold: `r > 180`,
`g < 100`, `b < 100`, alpha ≥ 128. Non-matching pixels go to the black
plane; matching pixels to the red plane. Overlaps resolve in favour
of black (red bit cleared).

## D9 — Bluetooth UUIDs (TBD)

The QL-820NWB supports Web Bluetooth in principle. GATT service and
characteristic UUIDs are not yet discovered — entries in the device
registry carry placeholder strings (`'TBD'`). The
`web-bluetooth` transport path will not work until real UUIDs are
filled in. Out of scope for this retrofit.

## D10 — CLI removal + version bump

- `packages/cli/` removed; superseded by the unified `thermal-label-cli`.
- Maintainer unpublishes `@thermal-label/brother-ql-cli` separately.
- core/node/web bump 0.0.1 → 0.2.0.
