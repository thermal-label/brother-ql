# Protocol Reference

This page documents the USB topology and raster print protocol of Brother QL
label printers, based on hands-on reverse engineering conducted while building
this driver. It is written for developers porting the driver to new languages,
debugging hardware issues, or extending the existing packages.

::: tip Related page
[Core](/core) documents the TypeScript API (`encodeJob`, `parseStatus`, etc.)
that generates the byte streams described here.
:::

## USB device topology

After the device is attached, it enumerates as a composite USB device with a
single configuration. For example, the QL-820NWB:

```
Bus 001 Device 004: ID 04f9:20a7 Brother Industries, Ltd. QL-820NWB
```

```
Configuration 1
  Interface 0  —  Printer class  (bInterfaceClass 0x07)
  Interface 1  —  CDC Data       (used by some models for Wi-Fi management)
```

### Interface 0 — Printer class (the printing path)

```
bInterfaceClass     7   Printer
bInterfaceSubClass  1   Printer
bInterfaceProtocol  2   Bidirectional
  Endpoint 0x02  OUT   Bulk  512 bytes  (print data)
  Endpoint 0x81  IN    Bulk  512 bytes  (status responses)
```

All print data and status communication flows through Interface 0. You must
claim this interface via `libusb` (Node.js `usb` package) or the WebUSB API
in the browser.

### Editor Lite / Mass Storage PIDs

Models QL-700 and later have an **Editor Lite** hardware mode. When the green
LED is lit, the device re-enumerates under different USB product IDs:

| Normal PID | Editor Lite PID | Model     |
| :--------: | :-------------: | --------- |
|  `0x20a7`  |    `0x20aa`     | QL-820NWB |
|  `0x2042`  |    `0x20ab`     | QL-700    |

In Editor Lite mode the printer presents a mass storage interface. Raster print
commands are silently discarded. `listPrinters()` detects this and emits a
console warning. `isMassStorageMode(pid)` is exported from
`@thermal-label/brother-ql-core` for programmatic detection.

**To exit Editor Lite mode:** hold the Editor Lite button on the printer until
the green LED turns off. The device will reconnect under its normal PID.

## Status communication

Before printing, the driver queries the printer for the currently loaded media.

### Status request

Send these 3 bytes to the OUT endpoint:

```
1B 69 53
```

(`ESC i S`)

### Status response (32 bytes)

The printer replies with exactly 32 bytes on the IN endpoint:

| Offset | Field            | Notes                             |
| -----: | ---------------- | --------------------------------- |
|      0 | `0x80`           | Print head mark                   |
|      1 | `0x20`           | Size — always 32                  |
|      2 | `0x42`           | ASCII `'B'` — Brother             |
|      3 | `0x30`           | ASCII `'0'` — QL series           |
|    4–5 | Model code       |                                   |
|      6 | `0x30`           | Country code                      |
|      8 | Error info 1     | See bit table below               |
|      9 | Error info 2     | See bit table below               |
|     10 | Media width (mm) | e.g. `0x3E` = 62 mm               |
|     11 | Media type       | `0x0A` continuous, `0x0B` die-cut |
|     14 | Status type      | `0x00` reply, `0x02` error        |
|     16 | Phase type       |                                   |
|  17–18 | Phase number     | Big-endian                        |

Byte 0 (`0x80`) is the fastest way to confirm you got a valid response rather
than leftover USB noise.

#### Error info 1 (byte 8)

| Bit | Error                |
| --: | -------------------- |
|   0 | No media             |
|   1 | End of media         |
|   2 | Cutter jam           |
|   3 | Weak battery         |
|   4 | Printer in use       |
|   6 | High voltage adapter |
|   7 | Fan motor error      |

#### Error info 2 (byte 9)

| Bit | Error                     |
| --: | ------------------------- |
|   0 | Replace media             |
|   1 | Expansion buffer full     |
|   2 | Transmission error        |
|   3 | Communication buffer full |
|   4 | Cover open                |
|   5 | Cancel key                |
|   6 | Media cannot be fed       |
|   7 | System error              |

## Print job structure

A complete job consists of a fixed preamble followed by one or more pages, each
terminated by a print command. All values are hexadecimal.

```
(1) INVALIDATE        — 400 × 0x00
(2) INITIALIZE        — 1B 40
(3) [for each page]
    a) RASTER MODE    — 1B 69 61 01
    b) STATUS NOTIFY  — 1B 69 21 00
    c) PRINT INFO     — 1B 69 7A [10 bytes]
    d) VARIOUS MODE   — 1B 69 4D [flags]
    e) CUT EACH       — 1B 69 41 01
    f) EXPANDED MODE  — 1B 69 4B [flags]
    g) MARGIN         — 1B 69 64 [n1] [n2]
    [raster rows]
    h) PRINT COMMAND  — 0C (not last page) / 1A (last page)
```

### (1) Invalidate — 400 × `0x00`

Clears any partial command the printer may have buffered from a previous
interrupted job. 400 null bytes is the minimum; sending more is harmless.

### (2) Initialize — `1B 40`

Resets the printer's internal state machine. Always send this after the
invalidate block and before any mode or info commands.

### (a) Raster mode — `1B 69 61 01`

Switches the printer into raster graphics mode (`0x01`). Brother QL printers
also support a template/P-touch mode (`0x00`), which is not used here.

### (b) Status notification — `1B 69 21 00`

`0x00` = do not send status automatically. With `0x01` the printer would send
unsolicited status packets after each print — avoided here to keep the protocol
synchronous.

### (c) Print information — `1B 69 7A [10 bytes]`

13 bytes total. The 10 parameter bytes:

| Offset | Field             | Notes                                                           |
| -----: | ----------------- | --------------------------------------------------------------- |
|      0 | Valid flags       | Bit 1 = width valid, bit 2 = type valid, bit 6 = recovery mode |
|      1 | Media type        | `0x0A` continuous, `0x0B` die-cut                              |
|      2 | Media width (mm)  | e.g. `0x3E` = 62                                               |
|      3 | Media length (mm) | `0x00` for continuous                                          |
|    4–5 | Row count         | Total raster rows, little-endian 16-bit                         |
|      6 | Page index        | 0-indexed                                                       |
|    7–9 | Reserved          | `0x00`                                                          |

Row count is the total number of raster rows in the page (i.e. the label height
in pixels at the print resolution). For QL printers the print resolution is
300 DPI along both axes; feed resolution can be doubled to 600 DPI via the
expanded mode flag.

### (d) Various mode — `1B 69 4D [flags]`

One flag byte:

| Bit | Function               |
| --: | ---------------------- |
|   6 | Auto-cut (1 = enabled) |
|   3 | Mirror printing        |

### (e) Cut each — `1B 69 41 01`

Instructs the printer to cut after every label in a multi-page job. Send
`0x01` unconditionally — the various mode auto-cut flag controls whether the
final cut happens at all; this command controls cuts between pages.

### (f) Expanded mode — `1B 69 4B [flags]`

One flag byte:

| Bit | Function                                |
| --: | --------------------------------------- |
|   3 | Cut at end of job                       |
|   4 | High resolution (600 DPI feed direction) |

### (g) Margin — `1B 69 64 [n1] [n2]`

Feed margin before the label, in dots, as a little-endian 16-bit value. QL
printers have a minimum feed margin of a few mm imposed by the cutter geometry.
Setting `n1 = 0x00, n2 = 0x00` uses the printer's hardware minimum.

### Raster rows

Each raster row is 92 bytes: a 2-byte command header followed by 90 bytes of
pixel data (720 dots, 1 bit per pixel, MSB first).

**Single-color (black):**

```
67 00 [90 bytes]
```

**Two-color black layer:**

```
67 00 [90 bytes]
```

**Two-color red layer:**

```
77 00 [90 bytes]
```

For two-color jobs, **all black rows come first, then all red rows** for the
same page — the layers are not interleaved row-by-row.

For labels narrower than 720 dots, the pixel data must still be 90 bytes. Pad
unused dots with zeros. The print info command tells the printer how many dots
are active; the printer clips the rest.

### (h) Print command

| Byte   | Meaning                    |
| :----: | -------------------------- |
| `0x0C` | Print page, more pages follow |
| `0x1A` | Print page, end of job     |

The last page of every job **must** end with `0x1A`. Ending with `0x0C` causes
the final page to sit in the printer buffer unprinted until the next job starts.

## TIFF compression (run-length encoding)

Before the raster rows, optionally send:

```
4D 02
```

This enables TIFF-style RLE compression for the remainder of the page. In
compressed mode a fully blank raster row can be sent as the single byte `0x5A`
instead of the full 92-byte row.

| Mode        | Empty row encoding | Behavior                                            |
| ----------- | :----------------: | --------------------------------------------------- |
| Uncompressed | 92 bytes (`67 00 00…`) | Printer prints rows as they arrive (concurrent) |
| Compressed  | 1 byte (`5A`)      | Printer buffers the full page before printing       |

The Node.js driver uses **uncompressed** mode for USB (concurrent printing is
safe and latency is low) and **compressed** mode for TCP (buffered mode avoids
timing issues over network paths where packet delivery is less predictable).

## Two-color encoding rules

Two-color printing is only available on devices with the `twoColor` flag set in
the device descriptor (QL-800, QL-810W, QL-820NWB).

- Both bitmaps must have identical dimensions.
- A pixel must not be set in both layers simultaneously. Black takes priority
  if violated.
- The valid flags byte in the Print Information command must have bit 0 set for
  two-color jobs.
- All black raster rows for a page are sent, then all red raster rows. The
  printer composes them internally.

## TCP printing (port 9100)

Brother QL printers with Wi-Fi or LAN connectivity accept the same raster byte
stream over a raw TCP connection on **port 9100**. The protocol is identical to
USB — the same invalidate preamble, the same command sequence, the same raster
rows — with no framing or handshake layer added.

The driver uses compressed (TIFF RLE) mode over TCP because the network path
may introduce reordering or fragmentation that makes concurrent printing
unreliable.

```typescript
const printer = await openPrinterTcp('192.168.1.100');  // default port 9100
```

## WebUSB (browser)

The `@thermal-label/brother-ql-web` package uses the browser
[WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API).

```typescript
device.open()
  → device.selectConfiguration(1)
  → device.claimInterface(0)
```

Print data is sent via `device.transferOut(2, chunk)` (endpoint 2 = OUT) and
status is read via `device.transferIn(1, 32)` (endpoint 1 = IN endpoint address
`0x81`). The byte stream is identical to what the Node.js USB driver sends.

WebUSB requires a secure context (`https://` or `localhost`) and is supported
in Chrome 89+ and Edge 89+. Firefox and Safari do not implement WebUSB.

## Porting checklist

If you are implementing the protocol in another language or runtime:

- [ ] Use `libusb` (or equivalent) and claim Interface 0 directly
- [ ] Send exactly 400 zero bytes at the start (invalidate)
- [ ] Send `1B 40` (initialize) immediately after
- [ ] Set raster mode with `1B 69 61 01` before any page data
- [ ] Include the Print Information command with correct media type, width,
      and total row count
- [ ] For two-color jobs: set bit 0 in the valid flags byte and check device
      descriptor for `twoColor: true`
- [ ] Raster rows must be full-width (90 data bytes) regardless of label width
- [ ] End the last page with `0x1A`, not `0x0C`
- [ ] Bitmaps are in print orientation: rows across the 720-dot print head
      width, columns along the feed direction
- [ ] For two-color: send all black rows first, then all red rows (not
      interleaved)
- [ ] Query status with `1B 69 53` and read 32 bytes before printing to
      confirm media width/type matches expectations
- [ ] Detect Editor Lite PIDs (`0x20aa`, `0x20ab`) and warn the user
