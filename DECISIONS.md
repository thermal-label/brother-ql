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
