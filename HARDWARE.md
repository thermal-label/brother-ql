# Hardware Reference

All devices share Vendor ID `0x04F9` (Brother Industries, Ltd.) and use the
same raster command family. The driver branches per `engine.protocol`
(`'ql-raster'` for QL series, `'pt-raster'` for PT-P / PT-E series).

## QL Series — DK paper labels

| Device | USB PID | Head dots | DPI | Two-color | Network | Bluetooth | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| QL-500 | `0x2013` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | No auto-cut |
| QL-550 | `0x2016` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | No auto-cut |
| QL-560 | `0x2018` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-570 | `0x2019` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-580N | `0x201B` | 720 | 300 | ❌ | LAN | ❌ | 🟡 Expected | |
| QL-650TD | `0x201C` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-700 | `0x2042` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | Editor Lite mode — must disable |
| QL-710W | `0x2044` | 720 | 300 | ❌ | WiFi | ❌ | 🟡 Expected | |
| QL-720NW | `0x2045` | 720 | 300 | ❌ | LAN | ❌ | 🟡 Expected | |
| QL-800 | `0x209B` | 720 | 300 | ✅ | ❌ | ❌ | 🟡 Expected | |
| QL-810W | `0x209C` | 720 | 300 | ✅ | WiFi | ❌ | 🟡 Expected | |
| QL-820NWBc | `0x209D` | 720 | 300 | ✅ | WiFi + LAN | ✅ Classic SPP | ✅ Verified | Tested by maintainer; QL-820NWB and QL-820NWBc share this PID |
| QL-600 | `0x2100` | 720 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-1050 | `0x2027` | 1296 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | Wide head |
| QL-1060N | `0x2028` | 1296 | 300 | ❌ | LAN | ❌ | 🟡 Expected | Wide head |
| QL-1100 | `0x20A7` | 1296 | 300 | ❌ | ❌ | ❌ | 🟡 Expected | Wide head; mass-storage PID `0x20A9` |
| QL-1110NWB | `0x20A8` | 1296 | 300 | ❌ | WiFi + LAN | ✅ Classic SPP | 🟡 Expected | Wide head; mass-storage PID `0x20AA` |
| QL-1115NWB | `0x20AB` | 1296 | 300 | ❌ | WiFi + LAN | ❌ | 🟡 Expected | Wide head; mass-storage PID `0x20AC` |

## PT-P / PT-E Series — TZe + HSe tape

PC-connectable P-touch models that share Brother's raster command set
with the QL series. Pin configurations for TZe / HSe tape are sourced
from Brother's *Raster Command Reference* PDFs via
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch). All entries
ship as `🔲 Untested` until a hardware verification report is filed.

### 128-pin family — 180 dpi native, 360 dpi high-res

| Device | USB PID | Mass-storage PID | TZe widths | HSe widths | Network | Bluetooth | Status |
|---|---|---|---|---|---|---|---|
| PT-E550W | `0x2060` | unknown | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 2:1 + 3:1 (5 widths each) | WiFi | ❌ | 🔲 Untested |
| PT-P750W | `0x2062` | `0x2065` | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 2:1 + 3:1 (5 widths each) | WiFi | ❌ | 🔲 Untested |

PT-E550W has a documented quirk: **the cutter requires compression to be
enabled** when `autocut: true`. The encoder enforces this and throws
`autocut + compress=false` as an error. Source:
`nbuchwitz/ptouch:PTE550W` (discovered via testing, not in Brother's
manual).

PT-P750W's PID is contested between driver projects — see
[`DECISIONS.md`](./DECISIONS.md) (D15) for the resolution.

### 560-pin family — 360 dpi native, 720 dpi high-res

| Device | USB PID | TZe widths | HSe widths | Network | Bluetooth | Status |
|---|---|---|---|---|---|---|
| PT-P900 | `0x2083` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | 2:1 (5 widths) + 3:1 (5 widths) | ❌ | ❌ | 🔲 Untested |
| PT-P900W | `0x2085` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | 2:1 (5 widths) + 3:1 (5 widths) | WiFi | ❌ | 🔲 Untested |
| PT-P950NW | `0x2086` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | 2:1 (5 widths) + 3:1 (5 widths) | WiFi + LAN | ❌ | 🔲 Untested |
| PT-P910BT | `0x20C7` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm | **— (TZe-only)** | ❌ | ✅ Classic SPP (assumed) | 🔲 Untested |

The 560-pin family supports the **36 mm TZe and 31.0 mm HSe-3:1**
widths that the 128-pin family cannot print.

PT-P910BT is the highest-priority verification — the entry assumes
classic Bluetooth SPP per nbuchwitz/ptouch, but if the hardware
actually speaks BLE GATT it will need `bluetooth-gatt` declared
instead and the driver depends on a node BLE adapter which doesn't
exist yet.

Have a device marked 🔲? Run `BROTHER_INTEGRATION=1 pnpm test` and
open a [hardware verification issue](.github/ISSUE_TEMPLATE/hardware_verification.md).
We'll mark it verified and add you to the contributors list.

## Unsupported Models

The handheld P-touch line — **PT-D210, PT-H110, PT-1010, PT-2730**, and
similar consumer-grade handheld labellers — uses Brother's ESC/P-style
"P-touch Tape Editor" protocol, **not** the raster command set this
driver implements. Adding support would belong in a separate
`brother-handheld` driver (analogous to how `labelmanager` is split off
from `labelwriter`); please do not file issues against this driver for
those models. See [`DECISIONS.md`](./DECISIONS.md) D12 for context.

## Mass Storage Mode PIDs

When the printer is in Editor Lite (USB Mass Storage) mode, it
enumerates on a different PID and does not accept raster commands.
The driver's discovery filter recognises these as mass-storage and
emits a console warning so users can switch the printer back to
printer-class.

| PID | Device |
|---|---|
| `0x20A9` | QL-1100 (mass storage mode) |
| `0x20AA` | QL-1110NWB (mass storage mode) |
| `0x20AC` | QL-1115NWB (mass storage mode) |
| `0x2065` | PT-P750W (mass storage / PLite mode) |

The PLite/mass-storage sibling PIDs for **PT-E550W, PT-P900, PT-P900W,
PT-P950NW, and PT-P910BT** are not in any public source we've checked.
If you have one of those models, please run `lsusb` (or equivalent)
when the printer is stuck in mass-storage mode and file an issue with
the captured PID — the registry is incomplete until those land.

## Editor Lite Mode (QL only)

Models QL-700 and later have an "Editor Lite" mode. In this mode the
printer operates as a mass storage device and does not accept raster
commands over USB. The LED on the printer must **not** be lit.

To disable: hold the Editor Lite button until the LED turns off. This
is a hardware toggle — the driver cannot change it programmatically.

PT models do *not* expose Editor Lite as a printer-side feature; what
PT-P750W has is a separate mass-storage *mode* handled via the
chassis-level `capabilities.massStoragePid`.

## High-Resolution Mode

PT-* engines support a high-resolution print mode that doubles the
vertical resolution along the tape feed axis (set
`BrotherQLPrintOptions.highRes: true`). The encoder sets `ESC i K`
bit 6, doubles the feed margin, and emits each raster line twice.

- **128-pin family (PT-E550W, PT-P750W):** 180×180 native, 180×360
  high-res.
- **560-pin family (PT-P900 / P900W / P950NW / P910BT):** 360×360
  native, 360×720 high-res.

QL engines do not support this option (legacy `highResolution`
page-option remains as the QL 300×600 toggle on `ESC i K` bit 4).

## Linux udev Rule

To access the printer without `sudo`, create
`/etc/udev/rules.d/99-brother-ql.rules`:

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="04f9", MODE="0666"
```

Then reload: `sudo udevadm control --reload-rules && sudo udevadm trigger`
