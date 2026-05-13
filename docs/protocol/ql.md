# QL Raster Protocol

The wire protocol of Brother's QL family of DK-tape label printers —
the QL-500, 550, 560, 570, 580N, 600, 650TD, 700, 710W, 720NW, 800,
810W, 820NWB, 1050, 1060N, 1100, 1110NWB, and 1115NWB. Two-colour
ribbon printing is exclusive to the QL-800, QL-810W, and QL-820NWB
chassis; everything else is shared across the family.

The sibling [PT raster protocol](./pt) covers Brother's P-touch
PT-P / PT-E lineup. PT shares most of QL's opcode shape but differs
in head geometry, feed margin, high-resolution flag, and per-line
raster duplication.

## USB topology

Composite USB device, single configuration. Vendor ID **`0x04F9`**
(Brother Industries). Per-model PIDs are listed on the
[Hardware](../hardware) page.

```
Configuration 1
  Interface 0 — Printer class (bInterfaceClass 0x07)
    Bulk OUT  (print data)
    Bulk IN   (status responses)
  Interface 1 — CDC Data (Wi-Fi management on networked models)
```

Networked chassis (QL-710W, 720NW, 810W, 820NWB, 1110NWB, 1115NWB)
additionally accept the same raster byte stream over raw TCP on port
**9100**; the QL-820NWB also offers Bluetooth SPP and Bluetooth GATT
transports. The wire protocol is identical across transports — no
framing or handshake layer is added.

Several models (QL-700 and later) expose an **Editor Lite** hardware
mode that re-enumerates the device as USB Mass Storage under a
different PID. Raster commands are silently discarded while Editor
Lite is active; the printer must be returned to its normal PID by
holding the Editor Lite button on the chassis.

## Opcode vocabulary

The byte values below are what the firmware accepts. Multi-byte
opcodes are listed in alphabetical order of the ASCII spelling.

| Opcode                                                                | Bytes                       | Description                                                       |
| --------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| [`NULL`](#null-—-invalidate)                                          | `00`                        | Invalidate — one byte of parser-reset padding.                    |
| [`ESC @`](#esc-—-initialize)                                          | `1B 40`                     | Initialize — reset mode settings; cancel any in-progress job.     |
| [`ESC i !`](#esc-i--—-switch-automatic-status-notification-mode)      | `1B 69 21 n`                | Switch automatic status notification mode.                        |
| [`ESC i A`](#esc-i-a-—-specify-cut-each-n-labels)                     | `1B 69 41 n`                | Specify the page number in "cut each N labels".                   |
| [`ESC i a`](#esc-i-a-—-switch-dynamic-command-mode)                   | `1B 69 61 n`                | Switch dynamic command mode (`01` = raster).                      |
| [`ESC i d`](#esc-i-d-—-specify-margin-amount)                         | `1B 69 64 n1 n2`            | Specify margin (feed) amount, little-endian dot count.            |
| [`ESC i K`](#esc-i-k-—-expanded-mode)                                 | `1B 69 4B n`                | Expanded mode — two-colour, cut-at-end, high-resolution flags.    |
| [`ESC i M`](#esc-i-m-—-various-mode)                                  | `1B 69 4D n`                | Various mode — autocut flag.                                      |
| [`ESC i S`](#esc-i-s-—-status-information-request)                    | `1B 69 53`                  | Status information request (32-byte reply).                       |
| [`ESC i z`](#esc-i-z-—-print-information)                             | `1B 69 7A n1..n10`          | Print information — declare media type, width, length, rasters.   |
| [`FF`](#ff-—-print-command)                                           | `0C`                        | Print command — end of a non-final page.                          |
| [`Control-Z`](#control-z-—-print-command-with-feeding)                | `1A`                        | Print command with feeding — end of the final page.               |
| [`g`](#g-—-raster-graphics-transfer)                                  | `67 00 n d1..dn`            | Raster graphics transfer (monochromatic).                         |
| [`M`](#m-—-select-compression-mode)                                   | `4D n`                      | Select compression mode (`00` = none, `02` = TIFF/PackBits).      |
| [`w`](#w-—-two-color-raster-graphics-transfer)                        | `77 c n d1..dn`             | Two-colour raster graphics transfer (`c` = plane: 01 black / 02 red). |
| [`Z`](#z-—-zero-raster-graphics)                                      | `5A`                        | Zero raster graphics — one fully-blank raster line.               |

## Print job structure

A complete job is a single byte stream sent to the OUT endpoint:

```
NULL × invalidateBytes      — parser reset (manual: 400 bytes; 200 is the widely-deployed short form)
ESC i a 01                  — switch to raster command mode
ESC @                       — initialize

[per page]
  ESC i z n1..n10           — print information (media, raster count, page index)
  ESC i M flags             — various mode (autocut)
  ESC i A 01                — cut-each page count (when autocut is on)
  ESC i K flags             — expanded mode (two-colour, cut-at-end, high-res)
  ESC i d n1 n2             — margin (feed) amount in dots
  [M 02]                    — optional: enable TIFF/PackBits compression
  [for each raster row]
    g 00 n d1..dn           — single-colour row
    or
    w 01 n d1..dn           — two-colour black plane row
    w 02 n d1..dn           — two-colour red plane row
    or
    Z                       — fully-blank row (compressed mode only)
  FF                        — non-final page
  or
  Control-Z                 — final page
```

Two-colour rows are interleaved **per raster line**: the black plane
for row R, then the red plane for row R, then the black plane for row
R+1, and so on. Planes are not batched.

The QL-800 manual specifies a **400-byte** invalidate run and uses
that length in its worked test-page example. A 200-byte run also
resets the parser on every QL chassis tested in the field and is the
length the `pklaus/brother_ql` driver has shipped for years; this
encoder defaults to 200 and bumps to 400 on two-colour-capable
chassis (QL-800 / QL-810W / QL-820NWB) to match the manual where it
matters most. Either run length works in practice — what matters is
that the run be longer than any in-flight multi-byte command the
previous job may have left mid-parse.

The final page of every job must terminate with `Control-Z` (`1A`).
Ending the last page with `FF` (`0C`) leaves the printed data in the
buffer unprinted until the next job starts.

## `NULL` — invalidate

```
00
```

A single `00` byte. Treated as a no-op by the parser. Sending a run
of them at the start of a job guarantees the device leaves any partial
command state from a previous interrupted job — useful precisely
because the run can be longer than the longest possible mid-command
expectation.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 22.

## `ESC @` — initialize

```
1B 40
```

Resets mode settings to their power-on defaults. Also cancels an
in-progress job. Emitted immediately after the invalidate run, before
the first per-page block.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 28.

## `ESC i !` — switch automatic status notification mode

```
1B 69 21 n
```

| `n`  | Behaviour                                              |
| ---- | ------------------------------------------------------ |
| `00` | Notify (default) — printer sends phase/status updates. |
| `01` | Do not notify — printer is silent except on request.   |

Persists until the printer is power-cycled. Useful when the host
polls explicitly with `ESC i S` rather than reading async status
frames mid-job.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 30.

## `ESC i A` — specify cut each N labels

```
1B 69 41 n
```

When autocut is enabled (via [`ESC i M`](#esc-i-m-—-various-mode)),
`n` is the number of labels per cut, in the range `1..255`. Default
`1` (cut after every label).

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 34.

## `ESC i a` — switch dynamic command mode

```
1B 69 61 n
```

| `n`  | Command mode                          |
| ---- | ------------------------------------- |
| `00` | ESC/P (default)                       |
| `01` | Raster — required before raster data. |
| `03` | P-touch Template                      |

The QL family ships in ESC/P mode by default; raster jobs must
switch to mode `01` before any raster command will be honoured.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 29.

## `ESC i d` — specify margin amount

```
1B 69 64 n1 n2
```

Feed margin at each end of the printed area, in dots, as a
little-endian 16-bit value (`margin = n1 + 256 × n2`). On continuous
tape the margin lands before and after the print region; on die-cut
labels the margin is fixed at zero regardless of the value sent.

The QL family enforces a minimum feed margin imposed by cutter
geometry — typical jobs use 35 dots (about 3 mm at 300 dpi).

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 28.

## `ESC i K` — expanded mode

```
1B 69 4B n
```

`n` is a bit mask:

| Bit | Mask   | Function                                                          |
| --: | -----: | ----------------------------------------------------------------- |
|   0 | `0x01` | Two-colour printing.                                              |
|   3 | `0x08` | Cut at end (1 = cut after last page; 0 = leave uncut).            |
|   4 | `0x10` | High-resolution mode (600 dpi in the feed direction; QL-only).    |

Bits 1, 2, 5, 6, 7 are reserved per the field-observed reading (see
the high-resolution divergence note below — the manual instead
reserves bits 1, 2, 4, 5, 7 and places high-resolution on bit 6).

Bit 0 is enforced by the firmware on two-colour-capable chassis: if
DK-22251 (62 mm black-and-red on white) is loaded and bit 0 is
clear, the printer rejects the job with a "replace media" error,
even if the raster data itself is single-colour. Set bit 0 whenever
the job carries `w`-plane raster rows or whenever the loaded tape is
a multi-ink stock.

The high-resolution bit selects 300 × 600 dpi printing on chassis
that support it. The QL-800 manual (p. 35, parameter table for
`ESC i K`) places this bit at **bit 6** (`0x40`, using 0-indexed
bit numbering — the manual labels it "7bit" in 1-indexed style).
The bit position that actually toggles 600 dpi on QL hardware in
the field — and the position long-standing community drivers such
as `pklaus/brother_ql` set — is **bit 4** (`0x10`). The sibling PT
chassis follow the manual's bit 6; the divergence is unresolved
against Brother.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 35.

## `ESC i M` — various mode

```
1B 69 4D n
```

`n` is a bit mask:

| Bit | Mask   | Function                                |
| --: | -----: | --------------------------------------- |
|   6 | `0x40` | Autocut (1 = enabled, 0 = disabled).    |

All other bits are reserved.

When autocut is enabled, the number of labels per cut is set by
[`ESC i A`](#esc-i-a-—-specify-cut-each-n-labels).

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 35.

## `ESC i S` — status information request

```
1B 69 53
```

The printer replies with a fixed-size **32-byte** frame on the IN
endpoint. Layout:

| Offset | Size | Field            | Notes                                                              |
| -----: | ---: | ---------------- | ------------------------------------------------------------------ |
|      0 |    1 | Print head mark  | Fixed `0x80`. First-byte sanity check for the reply.               |
|      1 |    1 | Size             | Fixed `0x20` (decimal 32).                                         |
|      2 |    1 | Reserved         | Fixed `0x42` (`'B'`).                                              |
|      3 |    1 | Series code      | Fixed `0x34` (`'4'`).                                              |
|      4 |    1 | Model code       | `0x38` `'8'` = QL-800; `0x39` `'9'` = QL-810W; `0x41` `'A'` = QL-820NWB; other models follow the same one-byte convention. |
|      5 |    1 | Reserved         | Fixed `0x30` (`'0'`).                                              |
|      6 |    1 | Reserved         | Fixed `0x30` (`'0'`).                                              |
|      7 |    1 | Reserved         | `0x00`.                                                            |
|      8 |    1 | Error info 1     | Bit mask, see below.                                               |
|      9 |    1 | Error info 2     | Bit mask, see below.                                               |
|     10 |    1 | Media width (mm) | e.g. `0x3E` = 62 mm.                                               |
|     11 |    1 | Media type       | `0x4A` continuous, `0x4B` die-cut, `0x00` no media.                |
|     12 |    1 | Reserved         | `0x00`.                                                            |
|     13 |    1 | Reserved         | `0x00`.                                                            |
|     14 |    1 | Reserved         | `0x3F`.                                                            |
|     15 |    1 | Mode             | Value last set via `ESC i M`, or `0x00`.                           |
|     16 |    1 | Reserved         | `0x00`.                                                            |
|     17 |    1 | Media length (mm)| `0x00` for continuous; label length for die-cut.                   |
|     18 |    1 | Status type      | See below.                                                         |
|     19 |    1 | Phase type       | `0x00` receiving, `0x01` printing.                                 |
|     20 |    1 | Phase number high| Big-endian, currently `0x00`.                                      |
|     21 |    1 | Phase number low | Big-endian, currently `0x00`.                                      |
|     22 |    1 | Notification     | `0x00` none, `0x03` cooling started, `0x04` cooling finished.      |
|     23 |    1 | Reserved         | `0x00`.                                                            |
|  24–31 |    8 | Reserved         | `0x00`.                                                            |

### Error info 1 (offset 8)

| Bit | Mask   | Meaning                                                            |
| --: | -----: | ------------------------------------------------------------------ |
|   0 | `0x01` | No media.                                                          |
|   1 | `0x02` | End of media (die-cut only).                                       |
|   2 | `0x04` | Cutter jam.                                                        |
|   3 | `0x08` | Not used (manual lists no name).                                   |
|   4 | `0x10` | Printer in use.                                                    |
|   5 | `0x20` | Printer turned off.                                                |
|   6 | `0x40` | High-voltage adapter (manual notes "not used").                    |
|   7 | `0x80` | Fan motor error (manual notes "not used").                         |

### Error info 2 (offset 9)

| Bit | Mask   | Meaning                                                            |
| --: | -----: | ------------------------------------------------------------------ |
|   0 | `0x01` | Replace media (wrong media for current job).                       |
|   1 | `0x02` | Expansion buffer full.                                             |
|   2 | `0x04` | Communication error.                                               |
|   3 | `0x08` | Communication buffer full (manual notes "not used").               |
|   4 | `0x10` | Cover open.                                                        |
|   5 | `0x20` | Cancel key (manual notes "not used").                              |
|   6 | `0x40` | Media cannot be fed (also: media end).                             |
|   7 | `0x80` | System error.                                                      |

### Status type (offset 18)

| Value         | Meaning                          |
| ------------- | -------------------------------- |
| `0x00`        | Reply to status request.         |
| `0x01`        | Printing completed.              |
| `0x02`        | Error occurred.                  |
| `0x04`        | Turned off.                      |
| `0x05`        | Notification.                    |
| `0x06`        | Phase change.                    |
| `0x08`–`0x20` | (Manual marks "not used".)       |
| `0x21`–`0xFF` | Reserved.                        |

Bytes 24–31 are documented as reserved (fixed `0x00`) in the
manual. **Bit 7 of offset 25** carries a "two-colour roll loaded"
flag on chassis that report it (i.e.
DK-22251 on QL-800 / 810W / 820NWB); this bit is not described
in the manual and the convention is inherited from on-the-wire
analysis. All other bits of offsets 24–31 remain reserved.

The status request should be issued **once** before sending print
data; during printing the printer emits status frames autonomously
unless silenced via [`ESC i !`](#esc-i--—-switch-automatic-status-notification-mode).

*Brother QL-800/810W/820NWB Raster Command Reference*, pp. 22–27.

## `ESC i z` — print information

```
1B 69 7A n1 n2 n3 n4 n5 n6 n7 n8 n9 n10
```

Declares the media and raster geometry of the page that follows. The
ten parameter bytes:

| Byte    | Field            | Notes                                                              |
| ------- | ---------------- | ------------------------------------------------------------------ |
| `n1`    | Valid flags      | Bit 1 (`0x02`) media type valid; bit 2 (`0x04`) media width valid; bit 3 (`0x08`) media length valid; bit 6 (`0x40`) priority on print quality (manual marks this invalid for two-colour printing); bit 7 (`0x80`) printer recovery always on. |
| `n2`    | Media type       | `0x0A` continuous tape, `0x0B` die-cut label, `0x00` unspecified.  |
| `n3`    | Media width (mm) | e.g. `0x3E` = 62.                                                  |
| `n4`    | Media length (mm)| `0x00` for continuous; label length for die-cut.                   |
| `n5–n8` | Raster count     | Little-endian 32-bit total raster line count for this page.        |
| `n9`    | Page position    | `0x00` first page of job, `0x01` subsequent pages.                 |
| `n10`   | Reserved         | `0x00`.                                                            |

For two-colour pages the raster count is the number of complete
black-plus-red line pairs, i.e. one less than the total wire-level
raster opcodes the page will emit.

If the loaded media does not match `n2`/`n3`/`n4` and the
corresponding valid-flag bits are set, the printer raises bit 0 of
Error info 2 (`replace media`) and aborts the page.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 32.

## `FF` — print command

```
0C
```

Ends a non-final page. The printed page advances to the cutter and
(if autocut is enabled) is cut. The next page begins immediately.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 31.

## `Control-Z` — print command with feeding

```
1A
```

Ends the final page of a job. Performs the same advance as `FF` and
then feeds the trailing margin so the cut lands cleanly. Every job
must end with exactly one `Control-Z`; ending with `FF` leaves the
final page in the buffer until the next job arrives.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 31.

## `g` — raster graphics transfer

```
67 00 n d1..dn
```

`0x67` is the single-plane raster opcode. The first parameter byte
is fixed at `0x00`. The second is the byte length `n` of the pixel
payload that follows: `0x5A` (90 bytes = 720 dots) on 720-pin heads,
`0xA2` (162 bytes = 1296 dots) on 1296-pin heads, when no compression
is in effect. With compression on (`M 02`), `n` is the post-PackBits
byte length and may be smaller — but always decodes to the
head's full pin width.

Pixel data is MSB-first within each byte. Bit 7 of `d1` is the pin
nearest pin 0 of the head; bit 0 of `dn` is the pin furthest from
pin 0. Tapes narrower than the head are centred by placing the
active payload at the correct bit offset within the row and zeroing
the unused margin pins.

The feed direction is **against** the print head: each raster row
emitted advances the tape one dot row past the head.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 30.

## `M` — select compression mode

```
4D n
```

| `n`  | Compression                              |
| ---- | ---------------------------------------- |
| `00` | None (default).                          |
| `01` | Reserved (manual marks disabled).        |
| `02` | TIFF / PackBits.                         |

Affects the encoding of `g` and `w` raster rows until the printer is
re-initialized. In compressed mode a fully-blank raster row may also
be emitted as the single-byte [`Z`](#z-—-zero-raster-graphics)
opcode instead of a full PackBits payload.

PackBits is standard TIFF run-length encoding (see References). Each
encoded run is a signed header byte followed by data:

| Header byte (signed) | Meaning                                             |
| -------------------- | --------------------------------------------------- |
| `0..127`             | Literal — the next `header + 1` bytes are verbatim. |
| `-127..-1`           | Repeat — the next byte repeats `1 - header` times.  |
| `-128`               | No-op (unused by typical encoders).                 |

If the compressed output exceeds the uncompressed length (90 / 162
bytes per row depending on chassis), implementations switch back to
uncompressed mode for that row.

The QL-800 firmware does not implement compression mode; QL-810W,
QL-820NWB, and the QL-1100 series do.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 33.

## `w` — two-colour raster graphics transfer

```
77 c n d1..dn
```

`0x77` is the two-plane raster opcode, supported on QL-800,
QL-810W, and QL-820NWB. The first parameter byte selects the
plane:

| `c`  | Plane                          |
| ---- | ------------------------------ |
| `01` | First colour (high energy).    |
| `02` | Second colour (low energy).    |

`n` is the payload length, identical to the `g` opcode (`0x5A` for
720-pin heads when uncompressed). Black-and-red DK tapes use plane
`01` for the black layer (higher strobe energy) and plane `02` for
the red layer.

Both planes must be emitted for every raster line, interleaved
black-then-red. A pixel set in both planes is printed black; the
firmware does not blend.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 30.

## `Z` — zero raster graphics

```
5A
```

One-byte opcode that decodes to a fully-blank raster row at the
current head width. Valid only when compression is enabled via
[`M 02`](#m-—-select-compression-mode); the QL-800 firmware does not
support it.

*Brother QL-800/810W/820NWB Raster Command Reference*, p. 31.

## References

- _Software Developer's Manual — Raster Command Reference,
  QL-800 / 810W / 820NWB_, Brother Industries, Ltd., Version 1.01
  (2016). Authoritative byte-level reference for the two-colour QL
  chassis; the single-colour QL family (QL-500 through QL-720NW and
  the QL-1050 / 1060N / 1100 series) follows the same command set
  minus the `w` two-plane opcode and the `M` / `Z` compression
  opcodes on QL-800. Cited inline by page; not redistributed.
- _TIFF 6.0 Specification_, Aldus Corporation (1992), § 9
  "PackBits compression". The compression scheme `M 02` selects.
  Accessible mirror:
  [libtiff TIFF 6.0 spec PDF](https://download.osgeo.org/libtiff/doc/TIFF6.pdf).
- [`pklaus/brother_ql`](https://github.com/pklaus/brother_ql) —
  Python driver implementing the QL command set against captured
  hardware traces. Reference for the 200-byte invalidate length,
  the per-line black/red interleave order, and the `ESC i K` bit-4
  high-resolution flag observed on QL hardware (where the published
  manual lists bit 6).
- [`fuzeman/brother-label`](https://github.com/fuzeman/brother-label)
  — Python driver covering QL and PT in one device hierarchy.
  Reference for the 35-dot QL feed margin and the QL-vs-PT
  high-resolution flag-bit split.
