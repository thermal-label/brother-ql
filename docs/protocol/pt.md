# PT Raster Protocol

The wire protocol of Brother's PC-connectable P-touch tape printers —
PT-E550W, PT-P750W, PT-P900, PT-P900W, PT-P950NW, and PT-P910BT. All
six speak the same raster command set; the family splits into a
128-pin head tier (PT-E550W, PT-P750W) and a 560-pin head tier (the
P900 / P910BT models).

The closely related Brother QL series (DK die-cut and continuous
roll) uses the same opcode dispatcher with different geometry, feed
margin, and two-colour rules — see
[QL raster protocol](/brother-ql/protocol/ql).

## USB topology

Single configuration, Printer-class interface (`bInterfaceClass 0x07`)
with one bulk OUT (print data) and one bulk IN (status responses).
Vendor ID is `0x04F9` (Brother Industries, Ltd.); per-model product
IDs are listed on [Hardware](/brother-ql/hardware).

```
Configuration 1
  Interface 0 — Printer class (bInterfaceClass 0x07)
    Bulk OUT  (print data)
    Bulk IN   (32-byte status reply)
```

PT-P910BT is a Bluetooth-primary chassis and exposes the same byte
stream over Bluetooth Serial Port Profile. PT-P750W, PT-P900W,
PT-P950NW, and PT-E550W additionally accept the byte stream over raw
TCP on port 9100. The wire format is identical across transports.

## Opcode vocabulary

| Opcode                                                       | Bytes            | Description                                                   |
| ------------------------------------------------------------ | ---------------- | ------------------------------------------------------------- |
| [`NULL`](#null-—-invalidate)                                 | `00`             | Invalidate byte — flushes any in-progress command.            |
| [`ESC @`](#esc-—-initialize)                                 | `1B 40`          | Reset mode settings; cancel any in-flight print.              |
| [`ESC i !`](#esc-i-—-set-automatic-status-notification-mode) | `1B 69 21 n`     | Enable or disable automatic status notifications.             |
| [`ESC i A`](#esc-i-a-—-set-cut-each-n-labels)                | `1B 69 41 n`     | Cut every `n`-th label in a multi-page job.                   |
| [`ESC i a`](#esc-i-a-—-switch-dynamic-command-mode)          | `1B 69 61 n`     | Switch command mode (raster, ESC/P, P-touch Template).        |
| [`ESC i d`](#esc-i-d-—-specify-margin-amount)                | `1B 69 64 n1 n2` | Specify feed margin in dots (little-endian 16-bit).           |
| [`ESC i K`](#esc-i-k-—-advanced-mode-settings)               | `1B 69 4B flags` | Advanced mode flags (half-cut, chain print, high-res).        |
| [`ESC i M`](#esc-i-m-—-various-mode-settings)                | `1B 69 4D flags` | Various mode flags (auto-cut, mirror print).                  |
| [`ESC i S`](#esc-i-s-—-status-information-request)           | `1B 69 53`       | Request 32-byte status reply on the IN endpoint.              |
| [`ESC i z`](#esc-i-z-—-print-information)                    | `1B 69 7A` + 10  | Declare media type, width, length, row count, page index.     |
| [`FF`](#ff-—-print-command)                                  | `0C`             | Print page; more pages follow.                                |
| [`G`](#g-—-raster-graphics-transfer)                         | `67 n1 n2 d…`    | Transfer one raster line; `n1+n2*256` payload bytes follow.   |
| [`M`](#m-—-select-compression-mode)                          | `4D n`           | Select uncompressed (`0`) or TIFF PackBits (`2`) raster mode. |
| [`SUB`](#sub-—-print-command-with-feeding)                   | `1A`             | Print page; last page of the job (feeds the tape out).        |
| [`Z`](#z-—-zero-raster-graphics)                             | `5A`             | One blank raster line (PackBits-compressed jobs only).        |

## Print job structure

```
NULL × 200           — invalidate (560-pin family; third-party drivers report 100 for the 128-pin family — treat 200 as a safe over-count)
ESC @                — initialize
ESC i a 01           — switch to raster mode
[per page]
  ESC i S            — status information request (32-byte reply on IN)
  ESC i z …          — print information (media type, width, length, row count, page index)
  ESC i M flags      — various mode (auto-cut, mirror)
  ESC i A 01         — cut each 1 label
  ESC i K flags      — advanced mode (half-cut, no chain, high-res)
  ESC i d n1 n2      — feed margin in dots
  [M 02]             — opt-in TIFF PackBits compression
  [for each row]
    G n1 n2 d…       — raster graphics transfer
    or Z             — single blank row (compressed jobs only)
  FF  | SUB          — FF between pages, SUB on the last page of the job
```

A complete job is a single byte stream sent to the OUT endpoint.
Send the invalidate prologue and `ESC @` once per connection-level
reset, then one block per page. The terminating opcode on the last
page is `SUB` (`0x1A`); all earlier pages end with `FF` (`0x0C`).

Compressed and uncompressed rows must not be mixed within a single
page — `M 02` is sticky for the rest of the job and applies to every
subsequent `G` payload until the next `ESC @`. In uncompressed mode,
each `G` row carries exactly `headDots / 8` bytes — `70` on the
560-pin head (manual p. 20), `16` on the 128-pin head. In
compressed mode, `G`'s `n1/n2` bytes carry the
post-compression payload length and the decoded line is always
`headDots / 8` bytes wide. Per p. 38, if a row's compressed form
would exceed 70 bytes the firmware accepts a 71-byte literal-only
encoding (1 header byte + 70 raw bytes); encoders that can't
guarantee a shrink should fall back to uncompressed for that row.

The 560-pin family runs at 360 × 360 DPI by default and 360 × 720 DPI
when high-resolution mode is requested via `ESC i K` bit 6 (PT-P900 /
P900W / P950NW only; PT-P910BT has no high-res mode). The 128-pin
family runs at 180 × 180 DPI / 180 × 360 DPI per third-party drivers;
the manual edition covering that family is not on hand to confirm.
When high-resolution mode is on, each raster line is transmitted
twice and the feed margin is doubled — both are required to keep the
expanded image at the right physical scale, since the firmware
advances the tape half as far per row at high resolution. High-res
on the 560-pin family also requires `ESC i z` `n2` to be `0x09` for
laminated tape (manual p. 33); HSe and Fle don't support high-res.

Tape geometry is fixed per cassette width. Each `G` row covers the
full head width; the printable portion of the tape sits inside a
fixed left/right margin window that depends on cassette width and
head family. On a 560-pin head, 24 mm TZe gives 320 print-area pins
between a 112-pin left margin and a 128-pin right margin; the same
cassette on a 128-pin head fits 128 print-area pins edge-to-edge.

TZe tape spans 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm widths (manual
p. 13). HSe heat-shrink tubing on the 560-pin family comes in 2:1
ratios at 5.8 / 8.8 / 11.7 / 17.7 / 23.6 mm and 3:1 ratios at
5.2 / 9.0 / 11.2 / 21.0 / 31.0 mm (manual p. 14). PT-P910BT is
TZe-only — every HSe row in the 560-pin manual's compatibility
column reads "not supported" for PT-P910BT. PT-E550W is reported by
third-party drivers to accept a subset of HSe widths; the manual
edition covering that family is not on hand to confirm.

## `NULL` — invalidate

```
00
```

A single zero byte is skipped by the parser. Long runs of `NULL`
flush any partial command from the print buffer back to the
receiving state, which is why every job begins with a fixed-size run
of zero bytes before the first real opcode.

The 560-pin manual specifies a 200-byte invalidate run before
`ESC @`. The 128-pin manual edition (covering PT-E550W / PT-P750W)
is not in hand to confirm a different count; third-party drivers
report 100 bytes for the 128-pin chassis. Sending 200 on either
head family is safe as an over-count.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, pp. 5, 22.

## `ESC @` — initialize

```
1B 40
```

Resets all mode settings and discards anything still in the print
buffer. Also used to cancel an in-flight print. Emitted once at the
top of every job, immediately after the invalidate run.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 23.

## `ESC i !` — set automatic status notification mode

```
1B 69 21 n
```

`n = 0` notifies (the printer pushes phase-change and error status
frames during printing); `n = 1` silences automatic notifications.
Default is `1`. The setting persists until power-off. On
PT-P910BT, automatic notification is the only way to receive
status during a print — the chassis does not enable bidirectional
communication automatically when `PI_RECOVER` is set.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 41.

## `ESC i A` — set "cut each N labels"

```
1B 69 41 n
```

When auto-cut is enabled (via [`ESC i M`](#esc-i-m-—-various-mode-settings)
bit 6), the cutter fires every `n`-th label in the page sequence.
Range `1..255`; default `1` (cut every label). `n = 0` disables
cutting entirely for the remainder of the job.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 37.

## `ESC i a` — switch dynamic command mode

```
1B 69 61 n
```

Selects the printer's command-language mode. The printer holds the
selected mode until power-off.

| `n` | Mode                                        |
| --: | ------------------------------------------- |
|   0 | ESC/P (default on PT-P900 / P900W / P950NW) |
|   1 | Raster                                      |
|   3 | P-touch Template                            |

Always send `01` (raster) before raster data. On PT-P910BT the
default is already raster; sending it again is harmless.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 32.

## `ESC i d` — specify margin amount

```
1B 69 64 n1 n2
```

Sets the leading/trailing feed margin in dots, as a little-endian
16-bit value: `margin = n1 + n2 * 256`. Range per the manual is
`14..1800` dots at 360 × 360 DPI (roughly 1 mm to 127 mm) and
`28..3600` dots at 360 × 720 DPI. Below the minimum, the firmware
clamps to a hardware-imposed floor driven by the cutter-to-head
distance — emitted output never feeds less than ~27 mm regardless
of the requested margin.

In high-resolution mode the requested margin must be doubled to keep
the resulting tape margin at the same physical length, because the
feed-axis step is halved.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 37.

## `ESC i K` — advanced mode settings

```
1B 69 4B flags
```

One flag byte:

| Bit |   Mask | Function                                                           |
| --: | -----: | ------------------------------------------------------------------ |
|   0 | `0x01` | Draft printing (PT-P900 / P900W / P950NW; must be 0 on PT-P910BT). |
|   2 | `0x04` | Half-cut on.                                                       |
|   3 | `0x08` | No chain printing — feed and cut after the last label.             |
|   4 | `0x10` | Special tape (no cutting).                                         |
|   6 | `0x40` | High-resolution printing.                                          |
|   7 | `0x80` | No buffer clearing between labels.                                 |

Bit 6 toggles the high-resolution mode described in
[Print job structure](#print-job-structure): each raster line is sent
twice and the feed margin is doubled. PT-P910BT does not support
high-res or draft and must keep bits 0 and 6 clear. Bit 7 is "not
used" on PT-P910BT per the manual. Bits 1 and 5 are reserved.

Note that the QL raster dialect uses bit 4 for high resolution; PT
uses bit 6 for the same feature.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 36.

## `ESC i M` — various mode settings

```
1B 69 4D flags
```

One flag byte:

| Bit |   Mask | Function         |
| --: | -----: | ---------------- |
|   6 | `0x40` | Auto-cut.        |
|   7 | `0x80` | Mirror printing. |

Bits 0–5 are reserved or unused.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 35.

## `ESC i S` — status information request

```
1B 69 53
```

The printer replies with a fixed **32-byte** frame on the IN
endpoint. Bytes 0–3 are constant (`80 20 'B' '0'`), useful as a sync
marker against any trailing USB noise:

| Offset | Field               | Notes                                                                                                                                                                                                                                                   |
| -----: | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      0 | Print-head mark     | `0x80`.                                                                                                                                                                                                                                                 |
|      1 | Size                | `0x20` (32).                                                                                                                                                                                                                                            |
|      2 | Brother code        | `'B'` (`0x42`).                                                                                                                                                                                                                                         |
|      3 | Series code         | `'0'` (`0x30`).                                                                                                                                                                                                                                         |
|      4 | Model code          | `'q'` P900, `'o'` P900W, `'p'` P950NW, `'x'` P910BT.                                                                                                                                                                                                    |
|      5 | Country code        | `'0'` (`0x30`).                                                                                                                                                                                                                                         |
|      6 | Battery level       | 560-pin AC models: `0x00` full / `0x01` half / `0x02` low / `0x03` charge needed / `0x04` AC adapter / `0xFF` unknown. PT-P910BT uses a separate table with bit 4 set when the AC adapter is connected (`0x20`–`0x24` on battery, `0x30`–`0x37` on AC). |
|      7 | Extended error      | `0x10` Fle tape end, `0x1D` high-res/draft printing error, `0x1E` adapter pull/insert error, `0x21` incompatible media error.                                                                                                                           |
|      8 | Error information 1 | Bitmask — see table below.                                                                                                                                                                                                                              |
|      9 | Error information 2 | Bitmask — see table below.                                                                                                                                                                                                                              |
|     10 | Media width (mm)    | `0x04` 3.5 mm … `0x24` 36 mm. `0x00` if no tape.                                                                                                                                                                                                        |
|     11 | Media type          | `0x01` laminated, `0x03` non-laminated, `0x04` fabric, `0x11` HSe 2:1, `0x13` Fle, `0x14` flexible ID, `0x15` satin, `0x17` HSe 3:1, `0xFF` incompatible.                                                                                               |
|     12 | Number of colours   | Fixed `0x00`.                                                                                                                                                                                                                                           |
|     15 | Mode                | Last `ESC i M` value (or `0x00` if never set).                                                                                                                                                                                                          |
|     17 | Media length (mm)   | Always `0x00` for TZe/HSe.                                                                                                                                                                                                                              |
|     18 | Status type         | `0x00` reply, `0x01` print done, `0x02` error, `0x05` notification, `0x06` phase change.                                                                                                                                                                |
|     19 | Phase type          | `0x00` editing / `0x01` printing.                                                                                                                                                                                                                       |
|  20–21 | Phase number        | Big-endian.                                                                                                                                                                                                                                             |
|     22 | Notification number | Cover open / closed, cooling start / finish.                                                                                                                                                                                                            |
|     24 | Tape colour ID      | Cassette tape colour (see manual table 8).                                                                                                                                                                                                              |
|     25 | Text colour ID      | Cassette ink colour (see manual table 9).                                                                                                                                                                                                               |

Error information 1 (byte 8):

| Bit |   Mask | Meaning                                   |
| --: | -----: | ----------------------------------------- |
|   0 | `0x01` | No media.                                 |
|   1 | `0x02` | End of media (not reported on PT-P910BT). |
|   2 | `0x04` | Cutter jam.                               |
|   3 | `0x08` | Weak batteries.                           |
|   6 | `0x40` | High-voltage adapter (not on PT-P910BT).  |

Error information 2 (byte 9):

| Bit |   Mask | Meaning                                        |
| --: | -----: | ---------------------------------------------- |
|   0 | `0x01` | Replace media / wrong media.                   |
|   1 | `0x02` | Expansion buffer full (not on PT-P910BT).      |
|   2 | `0x04` | Communication error.                           |
|   3 | `0x08` | Communication buffer full.                     |
|   4 | `0x10` | Cover open (not on PT-P910BT).                 |
|   5 | `0x20` | Overheating error.                             |
|   6 | `0x40` | Black-marking not detected (not on PT-P910BT). |
|   7 | `0x80` | System error.                                  |

A status request is conventionally emitted once per page, before the
print-information command. The 32-byte reply must be drained from the
IN endpoint before the next request, otherwise the firmware will
queue the next reply behind it. Do **not** send `ESC i S` while a
page is actively printing — error and phase-change frames are pushed
automatically and an extra request mid-print interferes with that
stream.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, pp. 23–31.

## `ESC i z` — print information

```
1B 69 7A n1 n2 n3 n4 n5 n6 n7 n8 n9 n10
```

Declares the print job's media and dimensions. 13 bytes total.

|    Param | Field                                                                                                                                                         |
| -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     `n1` | Valid-flag bitmask. `0x02` media type, `0x04` media width, `0x08` media length, `0x40` priority quality (unused), `0x80` recovery / bidirectional.            |
|     `n2` | Media type: `0x00` lam/non-lam, `0x11` HSe 2:1, `0x17` HSe 3:1, `0x13` Fle, `0xFF` incompatible. `0x09` is required when printing high-res on laminated tape. |
|     `n3` | Media width (mm).                                                                                                                                             |
|     `n4` | Media length (mm). `0x00` for TZe and HSe regardless of length; `0x2D` (45 mm) for FLe 21 × 45 mm.                                                            |
| `n5..n8` | Raster row count, little-endian 32-bit: `n5 + n6*256 + n7*65536 + n8*16777216`.                                                                               |
|     `n9` | Page index. `0` first page, `1` middle page, `2` last page. Single-page jobs use `2`.                                                                         |
|    `n10` | Fixed `0x00`.                                                                                                                                                 |

The valid-flag byte must claim every field the printer is supposed to
validate. When all three of `PI_KIND`, `PI_WIDTH`, and `PI_LENGTH`
are set and the loaded cassette doesn't match, the printer raises
"Replace media" via error info 2 bit 0.

Setting bit 7 (`PI_RECOVER`) enables printer recovery and, on the
560-pin chassis, also turns on bidirectional communication so status
frames arrive during printing. PT-P910BT does **not** enable
bidirectional communication from this bit; use
[`ESC i !`](#esc-i-—-set-automatic-status-notification-mode) `00`
instead.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, pp. 33–34.

## `FF` — print command

```
0C
```

Marks the end of one page in a multi-page job. The next page's
control block follows immediately.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 40.

## `G` — raster graphics transfer

```
67 n1 n2 d1 … dk
```

One raster line. `k = n1 + n2 * 256` bytes follow, expanded across
the print head from the left-margin offset. If the expanded data
falls short of the head width, the firmware zero-fills the remainder;
overflow is truncated.

In uncompressed mode (the post-`M 00` default), `k` is fixed at
`headDots / 8` — `70` on the 560-pin head per p. 40 and p. 20. The
128-pin head is encoder-hardcoded to `16` bytes; the manual edition
covering that family is not on hand to confirm.
In TIFF PackBits mode (after `M 02`), `k` is the post-compression
length and the decoded line is still `headDots / 8` bytes wide.

Note: PDF p. 40 reads "Hexadecimal: 47" in the per-command panel —
that's a typo for the ASCII `'G'` codepoint. The print-command list
on p. 22 and every observed wire capture put the opcode at `0x67`
(ASCII `'g'`) — `0x67` is the on-the-wire value.

Each raster row covers the full head width; content is placed at the
cassette's left-margin pin count, with unused dots zeroed. Cassette
left/right margins per width are in
[Print job structure](#print-job-structure).

When high-resolution mode is on (see
[`ESC i K`](#esc-i-k-—-advanced-mode-settings) bit 6), each `G`
payload must be transmitted twice in succession. The 560-pin manual
doesn't spell this out; the rule is documented in nbuchwitz/ptouch.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 40.

## `M` — select compression mode

```
4D n
```

`n = 0` selects uncompressed transfer; `n = 2` selects TIFF
PackBits. `n = 1` is reserved and unused. The mode is sticky and
applies to every subsequent `G` and `Z` opcode until the next
`ESC @`. PackBits is standard TIFF run-length encoding (see
References); each encoded run is a signed header byte followed by
data:

| Header byte (signed) | Meaning                                             |
| -------------------- | --------------------------------------------------- |
| `0..127`             | Literal — the next `header + 1` bytes are verbatim. |
| `-127..-1`           | Repeat — the next byte repeats `1 - header` times.  |
| `-128`               | No-op (unused by typical encoders).                 |

Tech Ref worked example: `ED 00` encodes a 20-byte run of `0x00`
(header `0xED` is signed `-19`, so the next byte repeats `1 - (-19) = 20`
times); `FF 22` encodes two `0x22` bytes; `05 23 BA BF A2 22 2B`
encodes six literal bytes (`header + 1 = 6`).

Each encoded line still decodes to `headDots / 8` bytes (70 on the
560-pin head); trailing zero bytes in the margin are not optional in
the decoded form.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, pp. 38–39.

## `SUB` — print command with feeding

```
1A
```

Marks the end of the last page in the job. Feeds the printed tape
forward past the cutter and (when auto-cut is enabled) fires the
blade. Every job must end with `SUB`; ending with `FF` leaves the
last page sitting in the print buffer until the next job arrives.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 40.

## `Z` — zero raster graphics

```
5A
```

One blank raster line. Only valid in TIFF PackBits mode — it
substitutes for a fully zeroed `G` payload at one byte instead of the
`3 + headDots/8` bytes a literal `G` row would cost. Uncompressed
jobs must use a full `G` row with a zero payload instead.

_Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, p. 40.

## References

- _Raster Command Reference — PT-P900/P900W/P950NW/P910BT_, Version
  1.02, Brother Industries, Ltd. (2020). Authoritative byte-level
  reference for the 560-pin family; cited inline by page. Not
  redistributed. The same opcode set is used by the 128-pin
  chassis (PT-E550W, PT-P750W); pin counts and per-tape geometry
  for that family are sourced from the equivalent
  PT-E550W / P750W / P710BT Raster Command Reference and from
  cross-checks against active open-source drivers.
- _TIFF 6.0 Specification_, Aldus Corporation (1992), § 9
  "PackBits compression". The compression scheme `M 02` selects.
  Accessible mirror:
  [libtiff TIFF 6.0 spec PDF](https://download.osgeo.org/libtiff/doc/TIFF6.pdf).
- [`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch) —
  active LGPL-2.1 Python driver; primary cross-reference for the
  128-pin head pin counts, the high-resolution line-duplication
  rule, and the PT-E550W "compression required for auto-cut"
  firmware quirk.
- [`hannesweisbach/ptouch-print`](https://github.com/hannesweisbach/ptouch-print)
  — older C driver; secondary cross-reference, especially for the
  PT-P750W PLite-vs-printer USB-PID handling on first connect.
