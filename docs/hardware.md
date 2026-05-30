# Hardware

This driver covers two Brother families that share the raster command
set: the **QL series** (DK paper labels, 300 dpi, head widths 720 or 1296) and the **PT-P / PT-E series** (TZe laminated tape and HSe
heat-shrink, 180 / 360 dpi, head widths 128 or 560). The encoder
branches on `engine.protocol` (`'ql-raster'` vs `'pt-raster'`); see
[`DECISIONS.md`](https://github.com/thermal-label/brother-ql/blob/main/DECISIONS.md) D12 for why both live in one driver.

## Supported devices

<!-- HARDWARE_TABLE:START -->
**24 devices** — 3 verified · 0 partial · 15 expected · 0 unsupported · 6 unverified

| Model | Key | USB PID | Transports | Status |
| --- | --- | --- | --- | --- |
| [PT-E550W](https://thermal-label.github.io/hardware/brother-ql/pt-e550w) | `PT_E550W` | 0x2060 | USB, TCP | ⏳ unverified |
| [PT-P750W](https://thermal-label.github.io/hardware/brother-ql/pt-p750w) | `PT_P750W` | 0x2062 | USB, TCP | ⏳ unverified |
| [PT-P900](https://thermal-label.github.io/hardware/brother-ql/pt-p900) | `PT_P900` | 0x2083 | USB | ⏳ unverified |
| [PT-P900W](https://thermal-label.github.io/hardware/brother-ql/pt-p900w) | `PT_P900W` | 0x2085 | USB, TCP | ⏳ unverified |
| [PT-P910BT](https://thermal-label.github.io/hardware/brother-ql/pt-p910bt) | `PT_P910BT` | 0x20c7 | USB, BT SPP | ⏳ unverified |
| [PT-P950NW](https://thermal-label.github.io/hardware/brother-ql/pt-p950nw) | `PT_P950NW` | 0x2086 | USB, TCP | ⏳ unverified |
| [QL-500](https://thermal-label.github.io/hardware/brother-ql/ql-500) | `QL_500` | 0x2013 | USB | 🔄 expected |
| [QL-550](https://thermal-label.github.io/hardware/brother-ql/ql-550) | `QL_550` | 0x2016 | USB | 🔄 expected |
| [QL-560](https://thermal-label.github.io/hardware/brother-ql/ql-560) | `QL_560` | 0x2018 | USB | 🔄 expected |
| [QL-570](https://thermal-label.github.io/hardware/brother-ql/ql-570) | `QL_570` | 0x2019 | USB | 🔄 expected |
| [QL-580N](https://thermal-label.github.io/hardware/brother-ql/ql-580n) | `QL_580N` | 0x201b | USB, TCP | 🔄 expected |
| [QL-600](https://thermal-label.github.io/hardware/brother-ql/ql-600) | `QL_600` | 0x2100 | USB | 🔄 expected |
| [QL-650TD](https://thermal-label.github.io/hardware/brother-ql/ql-650td) | `QL_650TD` | 0x201c | USB | 🔄 expected |
| [QL-700](https://thermal-label.github.io/hardware/brother-ql/ql-700) | `QL_700` | 0x2042 | USB | ✅ verified |
| [QL-710W](https://thermal-label.github.io/hardware/brother-ql/ql-710w) | `QL_710W` | 0x2044 | USB, TCP | 🔄 expected |
| [QL-720NW](https://thermal-label.github.io/hardware/brother-ql/ql-720nw) | `QL_720NW` | 0x2045 | USB, TCP | 🔄 expected |
| [QL-800](https://thermal-label.github.io/hardware/brother-ql/ql-800) | `QL_800` | 0x209b | USB | ✅ verified |
| [QL-810W](https://thermal-label.github.io/hardware/brother-ql/ql-810w) | `QL_810W` | 0x209c | USB, TCP | 🔄 expected |
| [QL-820NWBc](https://thermal-label.github.io/hardware/brother-ql/ql-820nwbc) | `QL_820NWBc` | 0x209d | USB, TCP, BT SPP | ✅ verified |
| [QL-1050](https://thermal-label.github.io/hardware/brother-ql/ql-1050) | `QL_1050` | 0x2027 | USB | 🔄 expected |
| [QL-1060N](https://thermal-label.github.io/hardware/brother-ql/ql-1060n) | `QL_1060N` | 0x2028 | USB, TCP | 🔄 expected |
| [QL-1100](https://thermal-label.github.io/hardware/brother-ql/ql-1100) | `QL_1100` | 0x20a7 | USB | 🔄 expected |
| [QL-1110NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1110nwb) | `QL_1110NWB` | 0x20a8 | USB, TCP | 🔄 expected |
| [QL-1115NWB](https://thermal-label.github.io/hardware/brother-ql/ql-1115nwb) | `QL_1115NWB` | 0x20ab | USB, TCP | 🔄 expected |

Click any model to open its detail page on the docs site, where engines, supported media, and verification reports live. The same data backs the [interactive cross-driver table](https://thermal-label.github.io/hardware/).
<!-- HARDWARE_TABLE:END -->

## QL series (DK labels)

All QL devices share Vendor ID `0x04F9` (Brother Industries Ltd.)
and speak `ql-raster` at 300 dpi over USB Printer Class or TCP
port 9100.

| Device       | USB PID  | Head pins | Two-color | Network    | Status      |
| ------------ | -------- | --------- | --------- | ---------- | ----------- |
| QL-820NWB(c) | `0x209D` | 720       | ✅        | WiFi + LAN | ✅ Verified |
| QL-800       | `0x209B` | 720       | ✅        | —          | 🟡 Expected |
| QL-810W      | `0x209C` | 720       | ✅        | WiFi       | 🟡 Expected |
| QL-700       | `0x2042` | 720       | —         | —          | 🟡 Expected |
| QL-710W      | `0x2044` | 720       | —         | WiFi       | 🟡 Expected |
| QL-720NW     | `0x2045` | 720       | —         | LAN        | 🟡 Expected |
| QL-600       | `0x2100` | 720       | —         | —          | 🟡 Expected |
| QL-580N      | `0x201B` | 720       | —         | LAN        | 🟡 Expected |
| QL-570       | `0x2019` | 720       | —         | —          | 🟡 Expected |
| QL-560       | `0x2018` | 720       | —         | —          | 🟡 Expected |
| QL-550       | `0x2016` | 720       | —         | —          | 🟡 Expected |
| QL-500       | `0x2013` | 720       | —         | —          | 🟡 Expected |
| QL-650TD     | `0x201C` | 720       | —         | —          | 🟡 Expected |
| QL-1050      | `0x2027` | 1296      | —         | —          | 🟡 Expected |
| QL-1060N     | `0x2028` | 1296      | —         | LAN        | 🟡 Expected |
| QL-1100      | `0x20A7` | 1296      | —         | —          | 🟡 Expected |
| QL-1110NWB   | `0x20A8` | 1296      | —         | WiFi + LAN | 🟡 Expected |
| QL-1115NWB   | `0x20AB` | 1296      | —         | WiFi + LAN | 🟡 Expected |

The QL-820NWB and QL-820NWBc share PID `0x209D`; the `c` is a regional marketing variant with identical firmware.

## PT-P / PT-E series (TZe / HSe tape)

PC-connectable P-touch models that share Brother's raster command set
with the QL series. Pin configurations sourced from Brother's
_Raster Command Reference_ PDFs via
[`nbuchwitz/ptouch`](https://github.com/nbuchwitz/ptouch). All entries
ship as 🔲 Untested until a hardware report is filed.

### 128-pin family — 180 dpi native, 360 dpi high-res

| Device   | USB PID  | Mass-storage PID | TZe widths                    | HSe       | Network | Status      |
| -------- | -------- | ---------------- | ----------------------------- | --------- | ------- | ----------- |
| PT-E550W | `0x2060` | unknown          | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 2:1 + 3:1 | WiFi    | 🔲 Untested |
| PT-P750W | `0x2062` | `0x2065`         | 3.5 / 6 / 9 / 12 / 18 / 24 mm | 2:1 + 3:1 | WiFi    | 🔲 Untested |

PT-E550W will not cut when compression is disabled — the encoder
throws on `autocut: true && compress: false` for that model. PT-P750W's
PID is contested between driver projects ([`DECISIONS.md`](https://github.com/thermal-label/brother-ql/blob/main/DECISIONS.md) D15).

### 560-pin family — 360 dpi native, 720 dpi high-res

| Device    | USB PID  | TZe widths                             | HSe              | Network    | Bluetooth             | Status      |
| --------- | -------- | -------------------------------------- | ---------------- | ---------- | --------------------- | ----------- |
| PT-P900   | `0x2083` | 3.5 / 6 / 9 / 12 / 18 / 24 / **36 mm** | 2:1 + 3:1        | —          | —                     | 🔲 Untested |
| PT-P900W  | `0x2085` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm     | 2:1 + 3:1        | WiFi       | —                     | 🔲 Untested |
| PT-P950NW | `0x2086` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm     | 2:1 + 3:1        | WiFi + LAN | —                     | 🔲 Untested |
| PT-P910BT | `0x20C7` | 3.5 / 6 / 9 / 12 / 18 / 24 / 36 mm     | **— (TZe-only)** | —          | Classic SPP (assumed) | 🔲 Untested |

The 560-pin family supports the **36 mm TZe and 31.0 mm HSe-3:1**
widths that the 128-pin family cannot print. PT-P910BT is the
highest-priority verification — if it speaks BLE GATT instead of
classic SPP, it'll need `bluetooth-gatt` declared and dropped from
the supported list until the niimbot BLE work lands.

> Going further than the two-step CTA below? Run the
> [verification harness](./verification-checklist) — the browser app
> handles detection, diagnostic-print, and report submission; the
> page also points at the CLI harness for TCP-9100 models.

<div class="hw-cta">
  <div class="hw-cta-header">
    <span class="hw-cta-icon">🔌</span>
    <div class="hw-cta-text">
      <strong>Got one of the 16 untested devices?</strong>
      <span>A two-minute test helps everyone who buys one of these printers.</span>
    </div>
  </div>
  <div class="hw-cta-steps">
    <span>Run these two commands and report what happens:</span>
    <div class="hw-cta-cmds">
      <code>brother-ql list</code>
      <span class="hw-cta-arrow">→</span>
      <code>brother-ql print text "test" --media 259</code>
    </div>
  </div>
  <div class="hw-cta-actions">
    <a class="hw-chip hw-chip-works" href="https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml&title=Verified%3A+%5BDevice+name%5D&labels=hardware%2Cverified" target="_blank" rel="noopener">✅ It works</a>
    <a class="hw-chip hw-chip-partial" href="https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml&title=Partial%3A+%5BDevice+name%5D&labels=hardware%2Cpartial" target="_blank" rel="noopener">⚠️ Partially works</a>
    <a class="hw-chip hw-chip-broken" href="https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml&title=Broken%3A+%5BDevice+name%5D&labels=hardware%2Cbroken" target="_blank" rel="noopener">❌ Doesn't work</a>
  </div>
</div>

## Print head geometry

| Model family                                       | Total pins | Bytes per raster row |
| -------------------------------------------------- | ---------- | -------------------- |
| QL-500 through QL-820NWB                           | 720        | 90                   |
| QL-1050, QL-1060N, QL-1100, QL-1110NWB, QL-1115NWB | 1296       | 162                  |
| PT-E550W, PT-P750W                                 | 128        | 16                   |
| PT-P900, PT-P900W, PT-P950NW, PT-P910BT            | 560        | 70                   |

The print head is fixed width. The label stock determines how many pins are active — the host always sends full-width rows. Margins are handled by the printer based on the Print Information Command.

## Unsupported models

The handheld P-touch line — **PT-D, PT-H, PT-1xxx, PT-2xxx** — uses
Brother's ESC/P-style "P-touch Tape Editor" protocol, not the raster
command set this driver implements. Adding support would belong in a
separate `brother-handheld` driver. Please don't file issues for those
models against this driver.

## Label media

See [Media](./media) for the full label and roll reference, including media IDs, DK codes, print area dimensions, and CAS switch pin patterns.

## Editor Lite mode

Models QL-700 and later include an **Editor Lite** mode. When enabled (green LED lit), the printer presents as a mass storage device and ignores all raster print commands.

**To disable:** hold the Editor Lite button until the LED turns off. The printer reconnects as a USB printer class device.

The driver detects Editor Lite mode in `listPrinters()` by checking for known mass storage PIDs and logs a warning with instructions. It does not include Editor Lite devices in the results.

### Mass storage mode PIDs

These are printer class PIDs' paired mass storage alternatives. They should never appear in printer selection — the physical device is the same hardware in a different USB mode.

| PID      | Device                        |
| -------- | ----------------------------- |
| `0x20A9` | QL-1100 (mass storage)        |
| `0x20AA` | QL-1110NWB (mass storage)     |
| `0x20AC` | QL-1115NWB (mass storage)     |
| `0x2065` | PT-P750W (PLite mass storage) |

The mass-storage sibling PIDs for **PT-E550W, PT-P900, PT-P900W,
PT-P950NW, and PT-P910BT** are not in any source we've checked. If
you have one of those models, please run `lsusb` (or equivalent)
when the printer is stuck in mass-storage mode and file an issue with
the captured PID.

The verification status surfaced in the table above is stored in
each device's `support` block in `packages/core/data/devices/<KEY>.json5`.
Contributors file reports via the
[Hardware verification issue template](https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml);
maintainers transcribe the accepted reports into the device's
`support.reports` array on merge.
