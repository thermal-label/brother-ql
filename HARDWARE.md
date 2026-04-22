# Hardware Reference

## Supported Devices

All devices share Vendor ID `0x04F9` (Brother Industries, Ltd.) and use the same raster command protocol over USB Printer Class or TCP port 9100.

| Device | USB PID | Head dots | Two-color | Network | Bluetooth | Status | Notes |
|---|---|---|---|---|---|---|---|
| QL-820NWB | `0x20A7` | 720 | ✅ | WiFi + LAN | ✅ (out of scope) | ✅ Verified | Tested by maintainer |
| QL-800 | `0x209B` | 720 | ✅ | ❌ | ❌ | 🟡 Expected | Same protocol |
| QL-810W | `0x209C` | 720 | ✅ | WiFi | ❌ | 🟡 Expected | Same protocol |
| QL-700 | `0x2042` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | Editor Lite mode — must disable |
| QL-710W | `0x2044` | 720 | ❌ | WiFi | ❌ | 🟡 Expected | |
| QL-720NW | `0x2045` | 720 | ❌ | LAN | ❌ | 🟡 Expected | |
| QL-600 | `0x2100` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-580N | `0x201B` | 720 | ❌ | LAN | ❌ | 🟡 Expected | |
| QL-570 | `0x2019` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-560 | `0x2018` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-550 | `0x2016` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | No auto-cut |
| QL-500 | `0x2013` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | No auto-cut |
| QL-650TD | `0x201C` | 720 | ❌ | ❌ | ❌ | 🟡 Expected | |
| QL-1050 | `0x2027` | 1296 | ❌ | ❌ | ❌ | 🟡 Expected | Wide head — needs verification |
| QL-1060N | `0x2028` | 1296 | ❌ | LAN | ❌ | 🟡 Expected | Wide head — needs verification |
| QL-1100 | `0x20A8` | 1296 | ❌ | ❌ | ❌ | 🟡 Expected | Wide head — needs verification |
| QL-1110NWB | `0x20A9` | 1296 | ❌ | WiFi + LAN | ✅ (out of scope) | 🟡 Expected | Wide head |
| QL-1115NWB | `0x20AC` | 1296 | ❌ | WiFi + LAN | ✅ (out of scope) | 🟡 Expected | Wide head |

Have a device marked 🟡 Expected? Run `BROTHER_INTEGRATION=1 pnpm test` and open a [hardware verification issue](.github/ISSUE_TEMPLATE/hardware_verification.md). We'll mark it verified and add you to the contributors list.

## Mass Storage Mode PIDs

These are the same physical printers in a different USB mode and must not be included in the device registry. The printer must be in printer class mode:

| PID | Device |
|---|---|
| `0x20AA` | QL-1100 (mass storage mode) |
| `0x20AB` | QL-1110NWB (mass storage mode) |

## Editor Lite Mode

Models QL-700 and later have an "Editor Lite" mode. In this mode the printer operates as a mass storage device and does not accept raster commands over USB. The LED on the printer must **not** be lit.

To disable: hold the Editor Lite button until the LED turns off.

This is a hardware toggle — the driver cannot change it programmatically.

## USB Identifiers

- **Vendor ID:** `0x04F9` (Brother Industries, Ltd.)
- **Interface class:** USB Printer Class (bulk transfer)
- **Port:** TCP 9100 for network models

## Print Head Geometry

| Model family | Total pins | Bytes per raster row |
|---|---|---|
| QL-500 through QL-820NWB | 720 | 90 |
| QL-1050/1060N/1100/1110NWB/1115NWB | 1296 | 162 |

## Media Reference

### Continuous Length Tape

| Label ID | Width | Print area dots | Left offset | Right offset |
|---|---|---|---|---|
| 257 | 12mm | 106 | 585 | 29 |
| 258 | 29mm | 306 | 408 | 6 |
| 264 | 38mm | 413 | 295 | 12 |
| 262 | 50mm | 554 | 154 | 12 |
| 261 | 54mm | 590 | 130 | 0 |
| 259 | 62mm | 696 | 12 | 12 |
| 260 | 102mm | 1164 | 76 | 56 |

### Die-Cut Labels

| Label ID | Size | Print area (W×H dots) |
|---|---|---|
| 269 | 17×54mm | 165×566 |
| 270 | 17×87mm | 165×956 |
| 370 | 23×23mm | 236×202 |
| 271 | 29×90mm | 306×991 |
| 272 | 38×90mm | 413×991 |
| 367 | 39×48mm | 425×495 |
| 374 | 52×29mm | 578×271 |
| 274 | 62×29mm | 696×271 |
| 275 | 62×100mm | 696×1109 |
| 365 | 102×51mm | 1164×526 |
| 366 | 102×152mm | 1164×1660 |
| 362 | 12mm Ø | 94×94 |
| 363 | 24mm Ø | 236×236 |
| 273 | 58mm Ø | 618×618 |

## Linux udev Rule

To access the printer without `sudo`, create `/etc/udev/rules.d/99-brother-ql.rules`:

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="04f9", MODE="0666"
```

Then reload: `sudo udevadm control --reload-rules && sudo udevadm trigger`
