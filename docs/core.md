# Core Protocol Reference

The `@thermal-label/brother-ql-core` package is a zero-dependency protocol encoder. It runs in Node.js and browsers equally and has no platform-specific code.

## Core API

| Export | Description |
|---|---|
| `encodeJob(pages, options?)` | Encode a complete print job to bytes |
| `DEVICES` | Full device descriptor registry |
| `MEDIA` | Full media descriptor registry |
| `findDevice(vid, pid)` | Look up device by USB VID/PID |
| `findMedia(id)` | Look up media by numeric ID |
| `findMediaByWidth(mm, type)` | Look up media by width |
| `isMassStorageMode(pid)` | Returns true for Editor Lite PIDs |
| `parseStatus(bytes)` | Parse 32-byte status response |
| `STATUS_REQUEST` | Status request byte sequence |
| `renderText(text, options?)` | Render 1bpp text bitmap (from `@mbtech-nl/bitmap`) |
| `renderImage(raw, options?)` | Render 1bpp image bitmap (from `@mbtech-nl/bitmap`) |
| `rotateBitmap(bitmap, deg)` | Rotate bitmap (from `@mbtech-nl/bitmap`) |

## Print job structure

A complete print job has this structure:

```
(1) INVALIDATE        — 400 × 0x00
(2) INITIALIZE        — 0x1B 0x40
(3) [for each page]
    a) RASTER MODE    — 0x1B 0x69 0x61 0x01
    b) STATUS NOTIFY  — 0x1B 0x69 0x21 0x00
    c) PRINT INFO     — 0x1B 0x69 0x7A [10 bytes]
    d) VARIOUS MODE   — 0x1B 0x69 0x4D [flags]
    e) CUT EACH       — 0x1B 0x69 0x41 0x01
    f) EXPANDED MODE  — 0x1B 0x69 0x4B [flags]
    g) MARGIN         — 0x1B 0x69 0x64 [n1] [n2]
    h) [COMPRESSION]  — 0x4D 0x02  (optional)
    [raster rows]
    i) PRINT COMMAND  — 0x0C (not last) / 0x1A (last page)
```

### Raster rows

**Single color (black):**
```
0x67 0x00 [90 bytes]
```

**Two-color black layer:**
```
0x67 0x00 [90 bytes]
```

**Two-color red layer:**
```
0x77 0x00 [90 bytes]
```

For two-color jobs, **all black rows come first, then all red rows** for each page.

### Print information command (0x1B 0x69 0x7A)

13 bytes total: 3-byte command prefix + 10 parameter bytes.

| Byte | Field | Notes |
|---|---|---|
| 0 | Valid flags | Bit 1=width, bit 2=type, bit 3=quality, bit 6=recovery |
| 1 | Media type | `0x0A` = continuous, `0x0B` = die-cut |
| 2 | Media width (mm) | e.g. `0x3E` = 62mm |
| 3 | Media length (mm) | `0x00` = continuous |
| 4–5 | Row count | Total raster rows, little-endian |
| 6 | Page index | 0-indexed |
| 7–9 | Reserved | `0x00` |

### Mode flag bytes

**Various mode (0x1B 0x69 0x4D):**

| Bit | Function |
|---|---|
| 6 | Auto-cut (1 = enabled) |
| 3 | Mirror printing |

**Expanded mode (0x1B 0x69 0x4B):**

| Bit | Function |
|---|---|
| 3 | Cut at end of job |
| 4 | High resolution (600dpi feed direction) |

## Status response (32 bytes)

Sent in response to `0x1B 0x69 0x53` (STATUS_REQUEST).

| Offset | Field | Notes |
|---|---|---|
| 0 | `0x80` | Print head mark |
| 1 | `0x20` | Size (always 32) |
| 2 | `0x42` | `'B'` — Brother |
| 3 | `0x30` | `'0'` — QL series |
| 4–5 | Model code | |
| 6 | `0x30` | Country code |
| 8 | Error info 1 | See below |
| 9 | Error info 2 | See below |
| 10 | Media width (mm) | |
| 11 | Media type | `0x0A` continuous, `0x0B` die-cut |
| 14 | Status type | `0x00` reply, `0x02` error |
| 16 | Phase type | |
| 17–18 | Phase number | |

### Error info 1 (byte 8)

| Bit | Error |
|---|---|
| 0 | No media |
| 1 | End of media |
| 2 | Cutter jam |
| 3 | Weak battery |
| 4 | Printer in use |
| 6 | High voltage adapter |
| 7 | Fan motor error |

### Error info 2 (byte 9)

| Bit | Error |
|---|---|
| 0 | Replace media |
| 1 | Expansion buffer full |
| 2 | Transmission error |
| 3 | Communication buffer full |
| 4 | Cover open |
| 5 | Cancel key |
| 6 | Media cannot be fed |
| 7 | System error |

## Two-color encoding rules

- Both the black and red bitmaps must have the same dimensions
- A pixel must not be set in both layers simultaneously (black takes priority if violated)
- For single-color media, the red layer is simply absent — the printer ignores the absence
- Two-color printing is only possible with `twoColor: true` devices (QL-800/810W/820NWB)

## TIFF compression

TIFF compression mode (`0x4D 0x02`) enables run-length encoding of raster rows. An empty row can be sent as a single `0x5A` byte instead of 92 bytes (command + 90 data bytes). This is beneficial for labels with large blank areas.

Compressed mode starts printing only after the print command — the printer buffers the entire job. Uncompressed mode starts printing immediately as rows arrive (concurrent printing).

The driver uses uncompressed mode by default for USB (concurrent printing is safe over reliable USB) and compressed mode for TCP (buffered mode avoids timing issues over unreliable network paths).

## Porting checklist

If you're implementing the protocol in another language or runtime:

- [ ] Send exactly 400 zero bytes at the start (invalidate)
- [ ] Send `0x1B 0x40` to initialize (reset printer state)
- [ ] Set raster mode with `0x1B 0x69 0x61 0x01` before any page data
- [ ] Include the Print Information command with correct media width and row count
- [ ] For two-color jobs: set bit in valid flags byte
- [ ] Raster rows must be full-width (90 or 162 bytes) regardless of label width
- [ ] End the last page with `0x1A`, not `0x0C`
- [ ] Bitmaps must be in print orientation: rows across the print head width, columns along the feed direction
- [ ] For two-color: all black rows first, then all red rows (not interleaved per-row)
