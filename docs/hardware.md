# Hardware

## Supported devices

All devices share Vendor ID `0x04F9` (Brother Industries Ltd.) and use the same raster command protocol over USB Printer Class or TCP port 9100.

| Device     | USB PID  | Head pins | Two-color | Network    | Status      |
| ---------- | -------- | --------- | --------- | ---------- | ----------- |
| QL-820NWB  | `0x20A7` | 720       | ✅        | WiFi + LAN | ✅ Verified |
| QL-820NWBc | `0x209D` | 720       | ✅        | WiFi + LAN | ✅ Verified |
| QL-800     | `0x209B` | 720       | ✅        | —          | 🟡 Expected |
| QL-810W    | `0x209C` | 720       | ✅        | WiFi       | 🟡 Expected |
| QL-700     | `0x2042` | 720       | —         | —          | 🟡 Expected |
| QL-710W    | `0x2044` | 720       | —         | WiFi       | 🟡 Expected |
| QL-720NW   | `0x2045` | 720       | —         | LAN        | 🟡 Expected |
| QL-600     | `0x2100` | 720       | —         | —          | 🟡 Expected |
| QL-580N    | `0x201B` | 720       | —         | LAN        | 🟡 Expected |
| QL-570     | `0x2019` | 720       | —         | —          | 🟡 Expected |
| QL-560     | `0x2018` | 720       | —         | —          | 🟡 Expected |
| QL-550     | `0x2016` | 720       | —         | —          | 🟡 Expected |
| QL-500     | `0x2013` | 720       | —         | —          | 🟡 Expected |
| QL-650TD   | `0x201C` | 720       | —         | —          | 🟡 Expected |
| QL-1050    | `0x2027` | 1296      | —         | —          | 🟡 Expected |
| QL-1060N   | `0x2028` | 1296      | —         | LAN        | 🟡 Expected |
| QL-1100    | `0x20A8` | 1296      | —         | —          | 🟡 Expected |
| QL-1110NWB | `0x20A9` | 1296      | —         | WiFi + LAN | 🟡 Expected |
| QL-1115NWB | `0x20AC` | 1296      | —         | WiFi + LAN | 🟡 Expected |

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

The print head is fixed width. The label stock determines how many pins are active — the host always sends full-width rows (90 or 162 bytes). Margins are handled by the printer based on the Print Information Command.

## Label media

### Continuous length tape

| Label ID | Width | DK code  | Print area (dots) | Left margin | Right margin | Notes                              |
| -------- | ----- | -------- | ----------------- | ----------- | ------------ | ---------------------------------- |
| 257      | 12mm  | —        | 106               | 585         | 29           |                                    |
| 258      | 29mm  | DK-22210 | 306               | 408         | 6            |                                    |
| 264      | 38mm  | DK-22225 | 413               | 295         | 12           |                                    |
| 262      | 50mm  | DK-22246 | 554               | 154         | 12           |                                    |
| 261      | 54mm  | DK-22214 | 590               | 130         | 0            |                                    |
| 259      | 62mm  | DK-22205 | 696               | 12          | 12           | black on white                     |
| 251      | 62mm  | DK-22251 | 696               | 12          | 12           | black+red, requires two-color mode |
| 260      | 102mm | DK-22243 | 1164              | 76          | 56           |                                    |

::: tip DK-22251 (media ID 251)
The 62mm black+red two-color tape is marked **"251"** on the roll. It requires
two-color print mode even for black-only jobs — use `--media 251`, not `--media 259`.
The driver handles this automatically: it sets expanded mode bit 0 and sends an
empty red plane when no red bitmap is supplied.
:::

::: info Roll markings vs media IDs
The number printed on the roll is the last three digits of the DK product code
(DK-22**251** → "251", DK-11**201** → "201"). This does **not** directly map to
the media ID — for example, DK-11201 (29×90mm standard address labels, marked
"201") uses media ID **271**.
:::

### Die-cut labels

| Label ID | Size      | DK code  | Print area (W×H dots) |
| -------- | --------- | -------- | --------------------- |
| 269      | 17×54mm   | DK-11204 | 165×566               |
| 270      | 17×87mm   | DK-11203 | 165×956               |
| 370      | 23×23mm   | —        | 236×202               |
| 271      | 29×90mm   | DK-11201 | 306×991               |
| 272      | 38×90mm   | DK-11218 | 413×991               |
| 367      | 39×48mm   | DK-11219 | 425×495               |
| 374      | 52×29mm   | —        | 578×271               |
| 274      | 62×29mm   | DK-11209 | 696×271               |
| 275      | 62×100mm  | DK-11202 | 696×1109              |
| 365      | 102×51mm  | DK-11240 | 1164×526              |
| 366      | 102×152mm | DK-11241 | 1164×1660             |
| 362      | 12mm Ø    | —        | 94×94                 |
| 363      | 24mm Ø    | DK-11221 | 236×236               |
| 273      | 58mm Ø    | DK-11207 | 618×618               |

## Editor Lite mode

Models QL-700 and later include an **Editor Lite** mode. When enabled (green LED lit), the printer presents as a mass storage device and ignores all raster print commands.

**To disable:** hold the Editor Lite button until the LED turns off. The printer reconnects as a USB printer class device.

The driver detects Editor Lite mode in `listPrinters()` by checking for known mass storage PIDs and logs a warning with instructions. It does not include Editor Lite devices in the results.

### Mass storage mode PIDs

These are printer class PIDs' paired mass storage alternatives. They should never appear in printer selection — the physical device is the same hardware in a different USB mode.

| PID      | Device                    |
| -------- | ------------------------- |
| `0x20AA` | QL-1100 (mass storage)    |
| `0x20AB` | QL-1110NWB (mass storage) |
