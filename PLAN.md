# brother-ql — Implementation Plan

> Agent implementation plan for a TypeScript monorepo providing a clean,
> cross-platform driver for Brother QL series label printers. Supports USB
> (Printer Class bulk transfer) and TCP network transport. Includes two-color
> (black + red) printing support for QL-800 series models.
>
> **Bluetooth is explicitly out of scope.** The QL-810W supports WiFi and
> the QL-820NWB supports Bluetooth, WiFi, and wired LAN. Only USB and TCP/IP
> (WiFi and wired LAN) transports are implemented. Bluetooth requires platform
> pairing, a different protocol stack, and significantly more complexity for
> uncertain benefit — document this clearly in the guide.

---

## 1. Supported Devices & Hardware Compatibility

All devices share Vendor ID `0x04F9` (Brother Industries, Ltd.) and use
the same raster command protocol over USB Printer Class or TCP port 9100.

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

> Have a device marked 🟡 Expected? Run `BROTHER_INTEGRATION=1 pnpm test`
> and open a [hardware verification issue](/.github/ISSUE_TEMPLATE/hardware_verification.md).
> We'll mark it verified and add you to the contributors list.

**Mass storage mode PIDs** (Editor Lite / mass storage class) — these are
the same physical printers in a different USB mode and must not be included
in the device registry. The printer must be in printer class mode:

| PID | Device |
|---|---|
| `0x20AA` | QL-1100 (mass storage mode) |
| `0x20AB` | QL-1110NWB (mass storage mode) |

See `HARDWARE.md` for full details.

---

## 2. Protocol Reference

> Sources: Brother QL-800/810W/820NWB Raster Command Reference v1.01 (official)
> and Brother QL-500/550/560/570/580N/650TD/700/1050/1060N Command Reference
> v6.0 (official). Both are publicly available from Brother's developer site.

### 2.1 Transport

**USB:** Standard USB 2.0 Printer Class. Data sent to the Bulk OUT endpoint.
No special mode-switching required — unlike the DYMO LabelManager, Brother
QL printers enumerate directly as printer class devices.

**TCP:** Raw TCP socket to port 9100. The byte stream is **byte-for-byte
identical** to the USB stream. Open a socket, write the same bytes, close.
Used for WiFi and wired LAN models.

### 2.2 Print Head Geometry

| Model family | Total pins | Bytes per raster row |
|---|---|---|
| QL-500 through QL-820NWB | 720 | 90 |
| QL-1050/1060N/1100/1110NWB/1115NWB | 1296 | 162 |

The print head is fixed width. The label stock determines how many of those
pins are active (the rest are margin). The host always sends full-width rows
(90 or 162 bytes) regardless of label width — margins are handled by the
printer based on the Print Information Command.

### 2.3 Label Media Types

**Continuous length tape** — the printer feeds and cuts to the specified length.

| Label ID | Width | Print area dots | Left offset | Right offset | Bytes/row (720-pin) | Notes |
|---|---|---|---|---|---|---|
| 257 | 12mm | 106 | 585 | 29 | 90 | |
| 258 | 29mm | 306 | 408 | 6 | 90 | |
| 264 | 38mm | 413 | 295 | 12 | 90 | |
| 262 | 50mm | 554 | 154 | 12 | 90 | |
| 261 | 54mm | 590 | 130 | 0 | 90 | |
| 259 | 62mm | 696 | 12 | 12 | 90 | DK-22205 (single-color) |
| 251 | 62mm | 696 | 12 | 12 | 90 | DK-22251 (two-color, marked "251" on roll) — requires two-color mode |
| 260 | 102mm | 1164 | 76 | 56 | 162 (QL-1050+ only) | |

**Die-cut labels** — fixed size, printer feeds to next gap.

| Label ID | Size | Print area (W×H dots) | Bytes/row |
|---|---|---|---|
| 269 | 17×54mm | 165×566 | 90 |
| 270 | 17×87mm | 165×956 | 90 |
| 370 | 23×23mm | 236×202 | 90 |
| 271 | 29×90mm | 306×991 | 90 |
| 272 | 38×90mm | 413×991 | 90 |
| 367 | 39×48mm | 425×495 | 90 |
| 374 | 52×29mm | 578×271 | 90 |
| 274 | 62×29mm | 696×271 | 90 |
| 275 | 62×100mm | 696×1109 | 90 |
| 365 | 102×51mm | 1164×526 | 162 |
| 366 | 102×152mm | 1164×1660 | 162 |
| 362 | 12mm Ø | 94×94 | 90 |
| 363 | 24mm Ø | 236×236 | 90 |
| 273 | 58mm Ø | 618×618 | 90 |

### 2.4 Complete Print Job Structure

> Verified by byte-comparison against Python `brother_ql` captures on QL-820NWBc
> with DK-22251 tape. Several details differ from the official command reference.

```
(0) RASTER MODE  ← sent BEFORE invalidate
    0x1B 0x69 0x61 0x01

(1) INVALIDATE
    200 × 0x00   ← 200 bytes, not 400
    Flushes any partial data in the printer buffer.

(2) INITIALIZE
    0x1B 0x40
    Resets printer state.

(3) [For each page: CONTROL CODES + RASTER DATA]

  CONTROL CODES (sent once per page):

  a) Switch to raster mode
     0x1B 0x69 0x61 0x01

  b) Status request  ← triggers 32-byte response on IN; NOT status notification disable
     0x1B 0x69 0x53

  c) Print information command
     0x1B 0x69 0x7A [10 bytes]  — see section 2.5

  d) Various mode (auto-cut etc.)
     0x1B 0x69 0x4D [flags]     — see section 2.6

  e) Cut every N labels
     0x1B 0x69 0x41 0x01        — cut after every label

  f) Expanded mode (cut at end flag etc.)
     0x1B 0x69 0x4B [flags]     — see section 2.6

  g) Specify margin / feed amount
     0x1B 0x69 0x64 [n1] [n2]   — little-endian dots, 0x0023 = 35 dots = 3mm

  h) Compression mode selection (optional, QL-580N and later)
     0x4D 0x02                   — enable TIFF compression
     (omit for uncompressed — always safe, slightly larger payload)

  RASTER DATA (interleaved per row for two-color):

  Single-color row (black):
    0x67 0x00 0x5A [90 bytes of pixel data]   ← 3-byte header: cmd, plane, length

  Two-color row — black layer (QL-800 series only):
    0x77 0x01 0x5A [90 bytes of black pixel data]

  Two-color row — red layer (QL-800 series only):
    0x77 0x02 0x5A [90 bytes of red pixel data]

  Two-color rows are INTERLEAVED: black row N, red row N, black row N+1, red row N+1, …
  NOT batched (all-black then all-red).

  Empty row shorthand (TIFF compression mode only):
    0x5A

(4) PRINT COMMAND
    For all pages except the last:  0x0C
    For the last page:              0x1A   (also triggers cut and feed)
```

### 2.5 Print Information Command (0x1B 0x69 0x7A)

13 bytes total: command (3 bytes) + 10 parameter bytes.

| Byte offset | Field | Notes |
|---|---|---|
| 0 | Valid flags | Bit 1=media width, bit 2=media type, bit 3=quality, bit 6=recovery |
| 1 | Media type | `0x0A` = continuous tape, `0x0B` = die-cut label |
| 2 | Media width (mm) | Physical width e.g. `0x3E` = 62mm |
| 3 | Media length (mm) | `0x00` = continuous |
| 4–5 | Raster line count | Total rows in label, little-endian |
| 6 | Page number | 0-indexed page within job |
| 7 | Reserved | `0x00` |
| 8–9 | Reserved | `0x00 0x00` |

Example — 62mm continuous tape, 200 rows, first page (QL-820NWB):
```
1B 69 7A  CE 0A 3E 00 C8 00 00 00 00 00
```

`valid_flags = 0xCE` for all QL-800/810W/820NWB jobs (single-color and two-color).
Older documentation shows `0x86`; that is incorrect for this model family.

### 2.6 Mode Flag Bytes

**Various mode (0x1B 0x69 0x4D):**

| Bit | Function |
|---|---|
| 6 | Auto-cut enabled (1 = yes) |
| 3 | Mirror printing |

Typical value for auto-cut: `0x40`

**Expanded mode (0x1B 0x69 0x4B):**

| Bit | Function |
|---|---|
| 0 | Two-color mode — **required for DK-22251 and any two-color job** |
| 3 | Cut at end of job (1 = yes) |
| 4 | High resolution (600dpi in feed direction) |

Typical value for single-color cut-at-end: `0x08`
Typical value for two-color cut-at-end: `0x09`

Bit 0 is enforced by the QL-820NWBc firmware: if DK-22251 tape is loaded and
bit 0 is not set, the printer displays "wrong roll type" and refuses the job.

### 2.7 Status Response (32 bytes)

Sent by printer in response to status request `0x1B 0x69 0x53`.
Also sent unsolicited when printing completes (if auto-notify enabled).

| Offset | Value | Meaning |
|---|---|---|
| 0 | `0x80` | Print head mark |
| 1 | `0x20` | Size (always 32) |
| 2 | `0x42` | `'B'` — Brother code |
| 3 | `0x30` | `'0'` — series code (QL series) |
| 4–5 | varies | Model code |
| 6 | `0x30` | `'0'` — country code |
| 7 | `0x00` | Reserved |
| 8 | error flags | Error info 1 — see below |
| 9 | error flags | Error info 2 — see below |
| 10 | mm | Media width |
| 11 | type | Media type (`0x0A` continuous, `0x0B` die-cut) |
| 12 | `0x00` | Reserved |
| 13 | `0x00` | Reserved |
| 14 | mode | Status type — see below |
| 15 | `0x00` | Reserved |
| 16 | type | Phase type |
| 17–18 | number | Phase number |
| 19 | notify | Notification number |
| 20–31 | `0x00` | Reserved |

**Error info 1 (byte 8):**

| Bit | Error |
|---|---|
| 0 | No media |
| 1 | End of media |
| 2 | Cutter jam |
| 3 | Weak battery |
| 4 | Printer in use |
| 5 | Reserved |
| 6 | High voltage adapter |
| 7 | Fan motor error |

**Error info 2 (byte 9):**

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

**Status type (byte 14):**

| Value | Meaning |
|---|---|
| `0x00` | Reply to status request |
| `0x01` | Printing completed |
| `0x02` | Error occurred |
| `0x05` | Notification |
| `0x06` | Phase change |

### 2.8 Two-Color Printing (QL-800 series only)

Two-color printing uses DK-22251 labels (black + red on white).
Two raster planes are interleaved row-by-row.

Black row:  `0x77 0x01 0x5A [90 bytes]`
Red row:    `0x77 0x02 0x5A [90 bytes]`

Rules:
- Both planes must have the same number of rows
- A pixel must not be set in both layers simultaneously (black wins if violated)
- Rows are **interleaved per line**: black N, red N, black N+1, red N+1, …
- Expanded mode **bit 0 must be set** (`0x09` instead of `0x08`)
- DK-22251 tape requires two-color mode even for black-only jobs

**DK-22251 tape and "wrong roll type":**

The QL-820NWBc enforces two-color mode when DK-22251 tape is installed.
Sending a single-color job (expanded mode bit 0 = 0, `0x67` row commands)
results in "wrong roll type" on the printer display. Send two-color rows
with expanded mode bit 0 set even when the red plane is all zeros.

The driver handles this automatically when `media.twoColorTape === true`
(media ID 251): it creates an empty red bitmap and sets bit 0.

**Two-color print job example structure (single page):**

```
1B 69 61 01         raster mode  ← FIRST
200 × 0x00          invalidate   ← 200 bytes, not 400
1B 40               initialize
1B 69 61 01         raster mode (per-page)
1B 69 53            status request (per-page)
1B 69 7A CE 0A 3E 00 [rows LE] 00 00 00 00 00  print info (valid_flags=0xCE)
1B 69 4D 40         auto-cut
1B 69 41 01         cut each
1B 69 4B 09         cut at end + two-color bit (bit 0 set)
1B 69 64 23 00      3mm margin
[for each row:]
  77 01 5A [90 bytes]  black layer row
  77 02 5A [90 bytes]  red layer row
1A                  print with feeding (last page)
```

### 2.9 Editor Lite Mode

Models QL-700 and later have an "Editor Lite" mode. In this mode the
printer operates as a mass storage device and does not accept raster
commands over USB. The LED on the printer must **not** be lit.

To disable: hold the Editor Lite button until the LED turns off.

This is a hardware toggle — the driver cannot change it programmatically.
The driver must detect this state via the status response and throw a
descriptive error if the printer is in Editor Lite mode.

Detection: if `listPrinters()` finds a printer with a mass storage PID
(`0x20AA`, `0x20AB`) instead of a printer class PID, warn the user to
disable Editor Lite mode.

### 2.10 Concurrent Printing (USB only)

When using uncompressed raster data over USB, the QL printer starts
printing as soon as it begins receiving raster data — it does not wait for
the print command. The print command still must be sent at the end to
trigger cut and feed.

When using compressed data (TIFF, `0x4D 0x02`), printing starts after the
print command is received (buffered mode). Compressed mode is safer but
slightly slower. Recommended for network transport where packet timing is
unpredictable.

---

## 3. Repository Structure

```
brother-ql/
├── .github/
│   ├── FUNDING.yml
│   ├── ISSUE_TEMPLATE/
│   │   └── hardware_verification.md
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── docs.yml
├── packages/
│   ├── core/                   # @thermal-label/brother-ql-core
│   ├── node/                   # @thermal-label/brother-ql-node
│   ├── cli/                    # @thermal-label/brother-ql-cli
│   └── web/                    # @thermal-label/brother-ql-web
├── docs/                       # VitePress documentation site
├── LICENSE
├── HARDWARE.md
├── eslint.config.js
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## 4. Tooling & Configuration

### 4.1 Runtime & Package Manager

- **Node.js**: `>=24.0.0`
- **Package manager**: `pnpm >=9.0.0`
- **TypeScript**: `~5.5.0`

### 4.2 `LICENSE`

MIT license, copyright Mannes Brak, current year.

### 4.3 `.github/FUNDING.yml`

```yaml
github: mannes
ko_fi: mannes
```

### 4.4 Root `package.json`

```json
{
  "name": "brother-ql",
  "private": true,
  "engines": { "node": ">=24.0.0", "pnpm": ">=9.0.0" },
  "prettier": "@mbtech-nl/prettier-config",
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "test:coverage": "pnpm -r run test:coverage",
    "lint": "eslint packages",
    "format": "prettier --write packages docs",
    "typecheck": "pnpm -r run typecheck",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:api": "typedoc --plugin typedoc-plugin-markdown --out docs/api packages/*/src/index.ts",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.0.0",
    "@mbtech-nl/eslint-config": "^1.0.0",
    "@mbtech-nl/prettier-config": "^1.0.0",
    "@mbtech-nl/tsconfig": "^1.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typedoc": "^0.26.0",
    "typedoc-plugin-markdown": "^4.0.0",
    "typescript": "~5.5.0",
    "vitepress": "^1.0.0",
    "vitest": "^2.0.0"
  }
}
```

### 4.5 `eslint.config.js`

```js
import mbtech from '@mbtech-nl/eslint-config';
export default [...mbtech];
```

### 4.6 `tsconfig.base.json`

```json
{
  "extends": "@mbtech-nl/tsconfig/node",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 4.7 Per-Package `package.json` Common Fields

Every package shares this shape. Package-specific values (name, description, keywords,
files, exports, dependencies) are filled in per-package in sections 5–8.

```json
{
  "version": "0.0.0",
  "type": "module",
  "author": "Mannes Brak",
  "license": "MIT",
  "homepage": "https://thermal-label.github.io/brother-ql/",
  "repository": {
    "type": "git",
    "url": "https://github.com/thermal-label/brother-ql.git",
    "directory": "packages/<package-name>"
  },
  "bugs": {
    "url": "https://github.com/thermal-label/brother-ql/issues"
  },
  "funding": [
    { "type": "github", "url": "https://github.com/sponsors/mannes" },
    { "type": "ko-fi",  "url": "https://ko-fi.com/mannes" }
  ],
  "files": ["dist", "README.md"],
  "engines": { "node": ">=24.0.0" },
  "publishConfig": { "access": "public" },
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Notes:
- `core` package points `types` and `exports.types` to `./src/index.ts` (not `./dist`)
  so workspace consumers get types without a build step.
- `cli` package adds `"bin": { "brother-ql": "./bin/brother-ql.js" }` and `"bin"` to `files`.
- All packages ship a `README.md` at their package root (included in `files`).

### 4.8 Testing

Vitest in all packages. `@vitest/coverage-v8` required in every package's devDependencies.
Hardware tests gated behind `BROTHER_INTEGRATION=1`.
Coverage uploaded to Codecov on every CI run.

**Coverage requirement: 90% across all metrics (lines, functions, branches, statements).**
Enforce via threshold in every package's `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 90,
    statements: 90,
  },
}
```

Thresholds are enforced only at the final step (step 7). Per-package development gates
use `pnpm test` (no threshold check) so coverage gaps don't block progress mid-build.
`pnpm test:coverage` in step 7 fails the release if any package falls below threshold.

---

## 5. Package: `@thermal-label/brother-ql-core`

**Path:** `packages/core/`
**Purpose:** Protocol encoding, device registry, media registry. Zero
runtime dependencies beyond `@mbtech-nl/bitmap`. No Node.js built-ins.
Runs in browser and Node.js equally.

### 5.1 Package Setup

```json
{
  "name": "@thermal-label/brother-ql-core",
  "description": "Protocol encoding, device registry, and media registry for Brother QL label printers",
  "keywords": ["brother", "brother-ql", "label-printer", "thermal-label", "usb", "protocol"],
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./src/index.ts"
    }
  },
  "dependencies": {
    "@mbtech-nl/bitmap": "^0.1.0"
  },
  "devDependencies": {
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.1.9",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

All other fields from section 4.7 apply. `types` points to source so workspace consumers
get types without building.

**`README.md`:** package name + one-line description. Note that consumers rarely import
core directly — use the node or web package instead. List the key exports
(`encodeJob`, `DEVICES`, `MEDIA`, `findDevice`, `findMedia`, re-exported bitmap helpers).
Requirements, links, license.

### 5.2 Public API

```typescript
// Re-exported from @mbtech-nl/bitmap — consumers use these directly
export type { LabelBitmap, RawImageData } from '@mbtech-nl/bitmap';
export { renderText, renderImage } from '@mbtech-nl/bitmap';

// Device registry
export const DEVICES: Record<string, DeviceDescriptor>;
export function findDevice(vid: number, pid: number): DeviceDescriptor | undefined;
export function isMassStorageMode(pid: number): boolean;

// Media registry
export const MEDIA: Record<string, MediaDescriptor>;
export function findMedia(id: number): MediaDescriptor | undefined;
export function findMediaByWidth(widthMm: number, type: MediaType): MediaDescriptor[];

// Protocol encoding
export function encodeJob(pages: PageData[], options?: JobOptions): Uint8Array;
// Returns the complete byte stream for a print job

// Types
export type MediaType = 'continuous' | 'die-cut';
export type HeadWidth = 720 | 1296;
export type ColorMode = 'single' | 'two-color';

export interface DeviceDescriptor {
  name: string;
  vid: number;
  pid: number;
  headPins: HeadWidth;
  bytesPerRow: number;        // headPins / 8 = 90 or 162
  twoColor: boolean;
  network: NetworkSupport;
  bluetooth: boolean;         // always false in this driver — BT out of scope
  autocut: boolean;           // QL-500/550 have no auto-cutter
  compression: boolean;       // QL-570+ support TIFF compression
  editorLite: boolean;        // true if model has Editor Lite mode
  massStoragePid?: number;    // paired mass-storage PID if applicable
}

export type NetworkSupport = 'none' | 'wifi' | 'wired' | 'wifi+wired';

export interface MediaDescriptor {
  id: number;
  name: string;
  type: MediaType;
  widthMm: number;
  lengthMm: number;           // 0 = continuous
  printAreaDots: number;      // dots in print direction
  leftMarginPins: number;
  rightMarginPins: number;
  dieCutMaskedAreaDots?: number;
}

export interface PageData {
  bitmap: LabelBitmap;          // black layer (or only layer for single-color)
  redBitmap?: LabelBitmap;      // red layer — only for two-color, must match dimensions
  media: MediaDescriptor;
  options?: PageOptions;
}

export interface PageOptions {
  autoCut?: boolean;            // default true
  cutAtEnd?: boolean;           // default true
  highResolution?: boolean;     // 600dpi in feed direction — default false
  marginDots?: number;          // feed margin, default 35 (3mm)
  compress?: boolean;           // TIFF compression — default false
}

export interface JobOptions {
  copies?: number;              // repeat full job N times
}

export interface PrinterStatus {
  ready: boolean;
  mediaWidthMm: number;
  mediaType: MediaType | null;
  errors: string[];
  editorLiteMode: boolean;
  rawBytes: Uint8Array;         // full 32-byte status for diagnostics
}
```

### 5.3 Device Registry (`src/devices.ts`)

```typescript
export const DEVICES = {
  QL_820NWB: {
    name: 'QL-820NWB', vid: 0x04F9, pid: 0x20A7,
    headPins: 720, bytesPerRow: 90, twoColor: true,
    network: 'wifi+wired', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
    massStoragePid: undefined,
  },
  QL_810W: {
    name: 'QL-810W', vid: 0x04F9, pid: 0x209C,
    headPins: 720, bytesPerRow: 90, twoColor: true,
    network: 'wifi', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
  },
  QL_800: {
    name: 'QL-800', vid: 0x04F9, pid: 0x209B,
    headPins: 720, bytesPerRow: 90, twoColor: true,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
  },
  QL_720NW: {
    name: 'QL-720NW', vid: 0x04F9, pid: 0x2045,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'wired', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_710W: {
    name: 'QL-710W', vid: 0x04F9, pid: 0x2044,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'wifi', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
  },
  QL_700: {
    name: 'QL-700', vid: 0x04F9, pid: 0x2042,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
  },
  QL_600: {
    name: 'QL-600', vid: 0x04F9, pid: 0x2100,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_580N: {
    name: 'QL-580N', vid: 0x04F9, pid: 0x201B,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'wired', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_570: {
    name: 'QL-570', vid: 0x04F9, pid: 0x2019,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_560: {
    name: 'QL-560', vid: 0x04F9, pid: 0x2018,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: false, editorLite: false,
  },
  QL_550: {
    name: 'QL-550', vid: 0x04F9, pid: 0x2016,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: false, compression: false, editorLite: false,
  },
  QL_500: {
    name: 'QL-500', vid: 0x04F9, pid: 0x2013,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: false, compression: false, editorLite: false,
  },
  QL_650TD: {
    name: 'QL-650TD', vid: 0x04F9, pid: 0x201C,
    headPins: 720, bytesPerRow: 90, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_1100: {
    name: 'QL-1100', vid: 0x04F9, pid: 0x20A8,
    headPins: 1296, bytesPerRow: 162, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
    massStoragePid: 0x20AA,
  },
  QL_1110NWB: {
    name: 'QL-1110NWB', vid: 0x04F9, pid: 0x20A9,
    headPins: 1296, bytesPerRow: 162, twoColor: false,
    network: 'wifi+wired', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
    massStoragePid: 0x20AB,
  },
  QL_1115NWB: {
    name: 'QL-1115NWB', vid: 0x04F9, pid: 0x20AC,
    headPins: 1296, bytesPerRow: 162, twoColor: false,
    network: 'wifi+wired', bluetooth: false,
    autocut: true, compression: true, editorLite: true,
  },
  QL_1050: {
    name: 'QL-1050', vid: 0x04F9, pid: 0x2027,
    headPins: 1296, bytesPerRow: 162, twoColor: false,
    network: 'none', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
  QL_1060N: {
    name: 'QL-1060N', vid: 0x04F9, pid: 0x2028,
    headPins: 1296, bytesPerRow: 162, twoColor: false,
    network: 'wired', bluetooth: false,
    autocut: true, compression: true, editorLite: false,
  },
} as const satisfies Record<string, DeviceDescriptor>;
```

### 5.4 Protocol Encoder (`src/protocol.ts`)

Implement these functions:

- `buildInvalidate(): Uint8Array` — 400 zero bytes
- `buildInitialize(): Uint8Array` — `1B 40`
- `buildRasterMode(): Uint8Array` — `1B 69 61 01`
- `buildStatusNotification(enabled: boolean): Uint8Array`
- `buildPrintInfo(media: MediaDescriptor, rowCount: number, pageIndex: number, twoColor?: boolean): Uint8Array`
- `buildVariousMode(autoCut: boolean): Uint8Array`
- `buildExpandedMode(cutAtEnd: boolean, highRes: boolean): Uint8Array`
- `buildCutEach(n: number): Uint8Array`
- `buildMargin(dots: number): Uint8Array`
- `buildCompression(enabled: boolean): Uint8Array`
- `buildRasterRow(rowBytes: Uint8Array, color: 'black' | 'red'): Uint8Array`
- `buildZeroRow(): Uint8Array` — `5A` (TIFF mode only)
- `buildPrintCommand(isLastPage: boolean): Uint8Array`
- `encodeJob(pages, options): Uint8Array` — assembles complete job stream

Key implementation notes:
- `buildRasterRow` uses `0x67` for black, `0x77` for red
- `buildPrintInfo` must set the two-color flag bit in the valid flags byte
  when `twoColor` is true
- `encodeJob` handles multi-page jobs by repeating control codes per page
- Two-color encoding: for each page, emit ALL black rows first, then ALL
  red rows. Both layers must have the same row count.
- The `bitmap` passed in is already in print orientation —
  use `rotateBitmap` from `@mbtech-nl/bitmap` before calling `encodeJob`
  if the source bitmap is in display orientation (label is wider than tall)

### 5.5 Tests (`src/__tests__/`)

- `protocol.test.ts`
  - Invalidate: exactly 400 zero bytes
  - Initialize: `[0x1B, 0x40]`
  - Raster row black: first byte `0x67`, second `0x00`, payload length correct
  - Raster row red: first byte `0x77`, second `0x00`
  - Print command last page: `[0x1A]`
  - Print command non-last: `[0x0C]`
  - Print info: byte 2 contains correct width, bytes 4-5 correct row count LE
  - `encodeJob` single page: starts with 400 zeros, ends with `0x1A`
  - `encodeJob` two-page: second page starts with control codes, ends `0x1A`
  - `encodeJob` two-color: black rows use `0x67`, red rows use `0x77`
  - `encodeJob` two-color: validates red bitmap dimensions match black
  - `encodeJob` throws if `twoColor` red bitmap provided for non-two-color device
- `devices.test.ts`
  - `findDevice` returns correct descriptor for known PIDs
  - `findDevice` returns undefined for unknown PID
  - `isMassStorageMode` returns true for `0x20AA`, `0x20AB`
  - `isMassStorageMode` returns false for all printer-class PIDs
  - Every device with `twoColor: true` has `bytesPerRow: 90`
  - Every device with `headPins: 1296` has `bytesPerRow: 162`
- `media.test.ts`
  - `findMedia` returns correct descriptor for known IDs
  - `findMediaByWidth` returns all 62mm continuous options
  - Die-cut media has non-zero `lengthMm`
  - Continuous media has `lengthMm === 0`

---

## 6. Package: `@thermal-label/brother-ql-node`

**Path:** `packages/node/`
**Purpose:** Node.js driver. USB via `usb` package (libusb bindings) and
TCP via `net.Socket`. Wraps `@thermal-label/brother-ql-core`.

### 6.1 Package Setup

```json
{
  "name": "@thermal-label/brother-ql-node",
  "description": "Node.js USB and TCP driver for Brother QL label printers",
  "keywords": ["brother", "brother-ql", "label-printer", "thermal-label", "usb", "tcp", "node"],
  "dependencies": {
    "@thermal-label/brother-ql-core": "workspace:*",
    "usb": "^2.0.0"
  },
  "optionalDependencies": {
    "@napi-rs/canvas": "^0.1.0"
  },
  "devDependencies": {
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.1.9",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

All other fields from section 4.7 apply. Uses `usb` (libusb), not `node-hid` — Brother QL
is USB Printer Class (bulk transfer), not HID.

**`README.md`:** package name + description. Install snippet. Quick start
(`openPrinter` + `printText`). Sections for: discover printers (`listPrinters`),
print an image (`printImage`), two-color printing (`printTwoColor`, QL-800 series),
TCP/network (`openPrinterTcp`). Requirements (Node 24, USB access, Linux udev note,
optional `@napi-rs/canvas` for image decoding). Links, license.

### 6.2 Transport Interface

```typescript
export interface Transport {
  write(data: Uint8Array): Promise<void>;
  read(byteCount: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export class UsbTransport implements Transport {
  constructor(device: usb.Device) {}
  static async open(vid: number, pid: number): Promise<UsbTransport>;
}

export class TcpTransport implements Transport {
  constructor(host: string, port?: number) {}  // port defaults to 9100
  static async connect(host: string, port?: number): Promise<TcpTransport>;
}
```

### 6.3 Public API

```typescript
export function listPrinters(): PrinterInfo[];
export async function openPrinter(options?: OpenOptions): Promise<BrotherQLPrinter>;
export async function openPrinterTcp(host: string, port?: number): Promise<BrotherQLPrinter>;

export class BrotherQLPrinter {
  readonly device: DeviceDescriptor;
  readonly transport: 'usb' | 'tcp';

  getStatus(): Promise<PrinterStatus>;
  print(pages: PageData[], options?: JobOptions): Promise<void>;
  printText(text: string, media: MediaDescriptor, options?: TextPrintOptions): Promise<void>;
  printImage(
    image: Buffer | string,        // Buffer = decoded PNG/JPEG, string = file path
    media: MediaDescriptor,
    options?: ImagePrintOptions,
  ): Promise<void>;
  printTwoColor(
    black: LabelBitmap,
    red: LabelBitmap,
    media: MediaDescriptor,
    options?: PageOptions,
  ): Promise<void>;
  close(): Promise<void>;
}

export interface OpenOptions {
  vid?: number;
  pid?: number;
  serialNumber?: string;
}

export interface PrinterInfo {
  device: DeviceDescriptor;
  serialNumber: string | undefined;
  path: string;
  transport: 'usb';
}

export interface TextPrintOptions extends PageOptions {
  invert?: boolean;
  scaleX?: number;
  scaleY?: number;
}

export interface ImagePrintOptions extends PageOptions {
  threshold?: number;
  dither?: boolean;
  invert?: boolean;
  rotate?: 0 | 90 | 180 | 270;
}
```

### 6.4 Implementation Notes

- USB: use `usb` package to find device by VID/PID, claim interface 0 (printer class), use bulk OUT endpoint for writes and bulk IN for status reads
- TCP: `net.Socket` connecting to port 9100; `write()` wraps `socket.write()` in a Promise; `read()` waits for N bytes from the incoming stream
- `printTwoColor` validates that the device's `twoColor` capability is true before encoding — throw `UnsupportedOperationError` if not
- `getStatus()` writes the status request command (`0x1B 0x69 0x53`) and reads 32 bytes back
- Status polling between pages: wait for `0x06` (phase change) before sending next page
- Editor Lite detection: `listPrinters()` checks for mass storage PIDs and warns via console — does not include them in results but logs a helpful message
- Image loading: if `@napi-rs/canvas` is installed, use it to decode PNG/JPEG to `RawImageData`. If not installed, accept only pre-decoded `RawImageData` via `print()`

### 6.5 Tests (`src/__tests__/`)

- Mock `usb` and `net` modules with `vi.mock`
- `usb-transport.test.ts`: write calls correct bulk endpoint, read returns mocked bytes
- `tcp-transport.test.ts`: write calls socket.write, read waits for N bytes
- `printer.test.ts`: `print()` writes correct byte sequence via mocked transport
- `printer.test.ts`: `printTwoColor()` throws on non-two-color device
- `printer.test.ts`: `getStatus()` sends `1B 69 53`, parses 32-byte response
- `discovery.test.ts`: `listPrinters()` returns correct devices for mocked USB enumeration
- `discovery.test.ts`: mass storage PIDs are excluded from results with warning

Integration tests (`BROTHER_INTEGRATION=1`):
- `integration/print-text.test.ts` — prints a text label, verifies no error
- `integration/print-image.test.ts` — prints a PNG image
- `integration/print-two-color.test.ts` — prints black+red label (QL-820NWB only)
- `integration/tcp.test.ts` — prints via TCP transport (requires `BROTHER_TCP_HOST` env)
- Each test includes a manual hardware verification checklist in a comment block

---

## 7. Package: `@thermal-label/brother-ql-cli`

**Path:** `packages/cli/`
**Purpose:** Thin CLI tool. Deliberately scoped — no batching, no templates,
no barcode generation. These belong in `labelforge-cli`.

### 7.1 Package Setup

```json
{
  "name": "@thermal-label/brother-ql-cli",
  "description": "CLI for Brother QL label printers",
  "keywords": ["brother", "brother-ql", "label-printer", "thermal-label", "cli"],
  "files": ["bin", "dist", "README.md"],
  "bin": { "brother-ql": "./bin/brother-ql.js" },
  "dependencies": {
    "@thermal-label/brother-ql-node": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.1.9",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

All other fields from section 4.7 apply. `files` includes `"bin"` in addition to `"dist"`.

**`README.md`:** package name + description. Install snippet (global + devDep).
Usage examples for every command: `list`, `status`, `print text`, `print image`,
`print two-color`. Requirements (Node 24). Links, license.

### 7.2 Commands

```
brother-ql list                              list connected printers
brother-ql status                            show printer status
brother-ql status --host <ip>                status via TCP
brother-ql print text <text> [options]       print a text label
brother-ql print image <file> [options]      print an image
brother-ql print two-color <black> <red>     print two-color (QL-800 series)
```

**`print text` options:**
```
-m, --media <id>        media ID from registry (e.g. 259 for 62mm continuous)
    --invert            white text on black
    --scale-x <n>       integer horizontal scale (default 1)
    --scale-y <n>       integer vertical scale (default 1)
    --no-cut            disable auto-cut
    --density normal|high
    --host <ip>         use TCP transport instead of USB
    --serial <sn>       target printer by serial number
```

**`print image` options:**
```
-m, --media <id>
    --threshold <0-255> B&W threshold (default 128)
    --dither            Floyd-Steinberg dithering
    --invert
    --rotate <0|90|180|270>
    --no-cut
    --host <ip>
    --serial <sn>
```

**`print two-color` options:**
```
-m, --media <id>
    --no-cut
    --host <ip>
    --serial <sn>
    (inherits threshold/dither/invert per file from image options)
```

### 7.3 Binary

`bin/brother-ql.js` — ESM shim:
```js
#!/usr/bin/env node
import('../dist/index.js').then(m => m.run());
```

`package.json` bin field: `{ "brother-ql": "./bin/brother-ql.js" }`

### 7.4 Tests

- Mock `@thermal-label/brother-ql-node`
- `commands/list.test.ts`: correct table output for 0 and N printers
- `commands/status.test.ts`: correct status display, error state display
- `commands/print-text.test.ts`: correct args passed to `printText`
- `commands/print-image.test.ts`: correct args passed to `printImage`
- `commands/print-two-color.test.ts`: correct files loaded, correct call to `printTwoColor`

---

## 8. Package: `@thermal-label/brother-ql-web`

**Path:** `packages/web/`
**Purpose:** Browser package using WebUSB API. ESM only. No Node.js.

### 8.1 Package Setup

```json
{
  "name": "@thermal-label/brother-ql-web",
  "description": "WebUSB browser driver for Brother QL label printers",
  "keywords": ["brother", "brother-ql", "label-printer", "thermal-label", "webusb", "browser"],
  "dependencies": {
    "@thermal-label/brother-ql-core": "workspace:*"
  },
  "peerDependencies": {
    "typescript": ">=5.0"
  },
  "devDependencies": {
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@vitest/coverage-v8": "^2.1.9",
    "jsdom": "^26.1.0",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

All other fields from section 4.7 apply. No `@types/node` — this package targets
the browser only.

**`README.md`:** package name + description. Browser support table (Chrome/Edge ✅,
Firefox/Safari ❌). Install snippet. Quick start (`requestPrinter` + `printText`).
Two-color example. Requirements (secure context, Chrome/Edge). Links, license.

### 8.2 Public API

```typescript
export async function requestPrinter(options?: RequestOptions): Promise<WebBrotherQLPrinter>;
export function fromUSBDevice(device: USBDevice): WebBrotherQLPrinter;

export class WebBrotherQLPrinter {
  readonly device: USBDevice;
  readonly descriptor: DeviceDescriptor;

  getStatus(): Promise<PrinterStatus>;
  print(pages: PageData[], options?: JobOptions): Promise<void>;
  printText(text: string, media: MediaDescriptor, options?: TextPrintOptions): Promise<void>;
  printImage(imageData: ImageData, media: MediaDescriptor, options?: ImagePrintOptions): Promise<void>;
  printImageURL(url: string, media: MediaDescriptor, options?: ImagePrintOptions): Promise<void>;
  printTwoColor(
    blackImageData: ImageData,
    redImageData: ImageData,
    media: MediaDescriptor,
    options?: PageOptions,
  ): Promise<void>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export interface RequestOptions {
  filters?: USBDeviceFilter[];  // defaults to all known device PIDs
}
```

### 8.3 Implementation Notes

- `requestPrinter()` calls `navigator.usb.requestDevice({ filters })` using all printer-class PIDs from the device registry (excluding mass storage PIDs)
- USB writes use `device.transferOut(endpointNumber, data)`
- Status reads use `device.transferIn(endpointNumber, 32)`
- `printImageURL`: fetch URL → `createImageBitmap` → `OffscreenCanvas` → `getImageData` → `renderImage` from `@mbtech-nl/bitmap`
- `printTwoColor`: validate descriptor `twoColor` flag, throw descriptively if not supported
- Extends `@mbtech-nl/tsconfig/browser` — no `@types/node`

### 8.4 Build Output

ESM only. `"type": "module"`.

### 8.5 Tests

- Vitest with `jsdom` environment
- `webusb-mock.ts`: fake `USBDevice` with transfer spies
- `printer.test.ts`: correct byte stream written for text/image/two-color
- `printer.test.ts`: `printTwoColor` throws on non-two-color descriptor
- `request.test.ts`: correct PID filters passed to `navigator.usb.requestDevice`
- `request.test.ts`: mass storage PIDs are excluded from filters

---

## 9. Documentation (`docs/`)

VitePress with custom theme. Deployed to GitHub Pages.

### 9.1 Site Structure

Flat layout — one page per section, same pattern as the labelmanager sister project.

```
docs/
├── index.md            landing page — hero, features, ecosystem links, hardware + core ref cards
├── getting-started.md  quickstart for Node.js, CLI, and Web; Linux udev note; Editor Lite note
├── node.md             full Node.js guide — USB, TCP, text, images, two-color, multi-printer, status, API table
├── cli.md              all CLI commands with examples and flags tables
├── web.md              browser support, install, quick start, React example, two-color, API table, demo link
├── hardware.md         device table with verification CTA, media reference (continuous + die-cut), print head geometry, Editor Lite, mass storage PIDs
├── core.md             protocol reference — raster commands, two-color encoding, status response, TIFF compression, porting checklist
├── demo.md             single page that renders <LiveDemo />
├── api/                auto-generated via typedoc
└── .vitepress/
    ├── config.ts
    ├── components/
    │   └── LiveDemo.vue
    └── theme/
        └── index.ts    registers LiveDemo globally
```

**Page content guide:**

- `index.md` — VitePress home layout. Hero with Get started / Try it now / GitHub buttons.
  Feature cards for Node.js, CLI, and Browser. Ref links to `/hardware` and `/core`.
  Ecosystem links to labelmanager and labelwriter sister projects.

- `getting-started.md` — Install + first label for all three surfaces (Node.js, CLI, Web),
  each as its own section with a working code snippet. Linux udev note (raw USB access),
  Windows note, Editor Lite mode note with how to disable it.

- `node.md` — Install. Quick example. USB connection (`openPrinter`, `listPrinters`,
  Editor Lite detection). TCP/network connection (`openPrinterTcp`). Printing text
  (`printText`, options table). Printing images (`printImage`, options table). Two-color
  printing (`printTwoColor`, DK-22251 note, options). Multi-printer targeting by serial
  number. Status checks. API summary table.

- `cli.md` — Install. `brother-ql list`, `brother-ql status` (USB + `--host`),
  `brother-ql print text` (flags table), `brother-ql print image` (flags table),
  `brother-ql print two-color` (flags table). Each command with a usage example.

- `web.md` — Browser support table (Chrome/Edge ✅, Firefox/Safari ❌). Install.
  Vanilla JS quick start. React example. Two-color example. How it works (requestDevice →
  open → claimInterface → transferOut). API summary table. Link to `/demo`.

- `hardware.md` — Full supported device table with verification CTA (GitHub issue links for
  "it works / partial / broken"). USB identifiers (VID `0x04F9`). Media reference:
  continuous tape table + die-cut labels table (both from the media registry). Print head
  geometry (720 vs 1296 pins). Editor Lite mode explanation and toggle instructions.
  Mass storage PIDs and how the driver detects them.

- `core.md` — Core API export table. Protocol reference: job structure (invalidate,
  initialize, raster mode, control codes, raster data, print command). Print information
  command byte layout. Mode flag bytes. Status response byte layout + error bit tables.
  Two-color encoding rules (all black rows then all red rows). TIFF compression behavior.
  Concurrent printing note. Porting checklist.

- `demo.md` — layout: page. Renders `<LiveDemo />`. Short intro: type a label, preview
  instantly, connect a Brother QL via WebUSB to print. Chrome/Edge note.

### 9.2 Live Browser Demo (`LiveDemo.vue`)

Two-color capable — since the maintainer has a QL-820NWB this demo can
showcase the unique two-color feature.

**What it does:**
- Connects to a Brother QL printer via WebUSB
- Media selector (choose from common label sizes)
- Two tabs: **Single color** and **Two-color**
  - Single color: text input + invert toggle + bitmap preview
  - Two-color: separate text/color inputs for black and red layers,
    composite preview showing both layers overlaid
- Live 1bpp bitmap preview updated on every keystroke
- Print button
- Clear note: Chrome/Edge only for printing, preview works everywhere
- Note about Editor Lite mode with link to `/hardware`

**Component location:**
`docs/.vitepress/components/LiveDemo.vue` — registered globally in `theme/index.ts`.

Imports `@thermal-label/brother-ql-web` and `@mbtech-nl/bitmap`.

### 9.3 VitePress Config

```typescript
import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  title: 'brother-ql',
  description: 'TypeScript driver for Brother QL label printers — USB, TCP, WebUSB',
  base: '/brother-ql/',
  ignoreDeadLinks: [
    /^\.\/LICENSE$/,
    /^\.\/(cli|core|node|web)\/dist\/README$/,
    /^\.\/(cli|core|node|web)\/dist\/src\/README$/,
  ],
  themeConfig: {
    nav: [
      { text: 'Get started', link: '/getting-started' },
      { text: 'Node.js', link: '/node' },
      { text: 'CLI', link: '/cli' },
      { text: 'Web', link: '/web' },
      { text: 'Hardware', link: '/hardware' },
      { text: 'Core', link: '/core' },
    ],
    sidebar: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Node.js', link: '/node' },
      { text: 'CLI', link: '/cli' },
      { text: 'Web', link: '/web' },
      { text: 'Hardware', link: '/hardware' },
      { text: 'Core', link: '/core' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/thermal-label/brother-ql' }],
    search: { provider: 'local' },
  },
  vite: {
    resolve: {
      alias: {
        '@thermal-label/brother-ql-web': fileURLToPath(
          new URL('../../packages/web/src/index.ts', import.meta.url),
        ),
      },
    },
  },
})
```

---

## 10. CI/CD

### `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm prettier --check "packages/**/*.ts"

      - name: Test with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unittests
          fail_ci_if_error: true

      - name: Build
        run: pnpm build
```

### `release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  id-token: write

jobs:
  release:
    name: Publish & Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify version matches tag
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          for pkg in packages/*/package.json; do
            PKG_VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$pkg','utf8')).version")
            if [ "$PKG_VERSION" != "$TAG" ]; then
              echo "❌ Version mismatch in $pkg: expected $TAG, got $PKG_VERSION"
              exit 1
            fi
          done
          echo "✅ All versions match tag $TAG"

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Publish
        run: pnpm release

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          make_latest: true
```

### `docs.yml`

```yaml
name: Docs

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy docs
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Generate API reference
        run: pnpm docs:api

      - name: Build docs
        run: pnpm docs:build

      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs/.vitepress/dist

      - uses: actions/deploy-pages@v5
        id: deployment
```

---

## 11. Root `README.md`

```markdown
[![CI](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml/badge.svg)](https://github.com/thermal-label/brother-ql/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/thermal-label/brother-ql/branch/main/graph/badge.svg)](https://codecov.io/gh/thermal-label/brother-ql)
[![npm core](https://img.shields.io/npm/v/@thermal-label/brother-ql-core)](https://npmjs.com/package/@thermal-label/brother-ql-core)
[![npm node](https://img.shields.io/npm/v/@thermal-label/brother-ql-node)](https://npmjs.com/package/@thermal-label/brother-ql-node)
[![npm web](https://img.shields.io/npm/v/@thermal-label/brother-ql-web)](https://npmjs.com/package/@thermal-label/brother-ql-web)
[![npm cli](https://img.shields.io/npm/v/@thermal-label/brother-ql-cli)](https://npmjs.com/package/@thermal-label/brother-ql-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# brother-ql

TypeScript-first Brother QL label printer driver suite for Node.js, browser WebUSB, and CLI workflows.

- Project website: https://thermal-label.github.io/brother-ql/
- Repository: https://github.com/thermal-label/brother-ql
- Issues: https://github.com/thermal-label/brother-ql/issues

## Install

Install only what you need:

```bash
pnpm add @thermal-label/brother-ql-node
```

For browser-only usage:

```bash
pnpm add @thermal-label/brother-ql-web
```

For CLI usage:

```bash
npm install -g @thermal-label/brother-ql-cli
```

## Quick Start

### Node.js

```ts
import { openPrinter } from '@thermal-label/brother-ql-node';

const printer = await openPrinter();
await printer.printText('Hello QL', media);
await printer.close();
```

### Browser (WebUSB)

```ts
import { requestPrinter } from '@thermal-label/brother-ql-web';

const printer = await requestPrinter();
await printer.printText('Hello WebUSB', media);
```

### CLI

```bash
brother-ql list
brother-ql print text "Hello" --media 259
```

## Packages

- `@thermal-label/brother-ql-core`: protocol encoding, device registry, media registry. Runs in browser and Node.js.
- `@thermal-label/brother-ql-node`: Node.js USB (libusb) and TCP transport with full printer API.
- `@thermal-label/brother-ql-web`: browser WebUSB transport and printer API.
- `@thermal-label/brother-ql-cli`: command-line tool (`brother-ql`) for listing, printing, and status.

## Supported Devices

Verified and expected models are listed on the project website:
https://thermal-label.github.io/brother-ql/hardware

## Platform Notes

- Node packages require Node.js `>=24`.
- Browser package requires WebUSB-compatible browsers (Chrome/Edge) and secure contexts (`https://` or `localhost`).
- Linux users typically need a `udev` rule for raw USB access without `sudo`.

## License

MIT
```

---

## 12. Implementation Sequence

```
1. Scaffold
   - LICENSE (MIT, Mannes Brak, current year)
   - .github/FUNDING.yml
   - .github/ISSUE_TEMPLATE/hardware_verification.yml
   - Root package.json, eslint.config.js, tsconfig.base.json
   - pnpm-workspace.yaml, .gitignore
   - .changeset/ directory
   - GitHub Actions workflows (ci.yml, release.yml, docs.yml)
   - HARDWARE.md
   - Root README.md (per section 11)
   - Create PROGRESS.md with all steps and substeps as checkboxes
   - pnpm install — must complete without errors

2. @thermal-label/brother-ql-core
   - package.json (per section 5.1) + README.md
   - src/types.ts — all types
   - src/devices.ts — full device registry
   - src/media.ts — full media registry
   - src/protocol.ts — all encoder functions
   - src/__tests__/ — all tests (protocol, devices, media)
   - Gate: typecheck + lint + test:coverage + build

3. @thermal-label/brother-ql-node
   - package.json (per section 6.1) + README.md
   - UsbTransport
   - TcpTransport
   - BrotherQLPrinter class
   - Discovery (listPrinters, Editor Lite detection)
   - Mocked unit tests
   - Integration test stubs with hardware verification checklists
   - Gate: typecheck + lint + test:coverage + build

4. @thermal-label/brother-ql-cli
   - package.json (per section 7.1) + README.md
   - commander setup
   - list command
   - status command
   - print text command
   - print image command
   - print two-color command
   - Tests
   - Gate: typecheck + lint + test:coverage + build

5. @thermal-label/brother-ql-web
   - package.json (per section 8.1) + README.md
   - WebUSB transport
   - WebBrotherQLPrinter class including printTwoColor
   - Mocked tests
   - Gate: typecheck + lint + test:coverage + build

6. Docs
   - VitePress config + theme/index.ts (registers LiveDemo globally)
   - index.md, getting-started.md, node.md, cli.md, web.md, hardware.md, core.md, demo.md
   - All pages fully authored — complete prose, real API examples, no placeholder content
   - Two-color content woven through node.md, web.md, core.md — it is a showcase feature
   - Media reference and device table in hardware.md (sourced from the media/device registries)
   - LiveDemo.vue (single-color + two-color tabs, media selector, live bitmap preview)
   - API reference via typedoc
   - Gate: docs:build completes without errors

7. Final
   - Verify all PROGRESS.md checkboxes are ticked
   - Verify ci.yml steps pass locally
```

Do not proceed to step N+1 until step N's gate checks pass.
Do not skip writing tests — they are part of each step, not optional.
Docs must be fully authored in this pass — complete prose, real examples
using the actual implemented API. No placeholder content.

---

## 13. Key Constraints & Agent Notes

- **Do not implement a bitmap pipeline in `core`** — delegate entirely to
  `@mbtech-nl/bitmap`. Re-export `LabelBitmap`, `RawImageData`,
  `renderText`, `renderImage` from core so consumers only need one import.
- **`@types/node`** is required as a devDependency in `node` package and
  any other package extending `@mbtech-nl/tsconfig/node`.
- **Never** import Node.js built-ins in `core` or `web` packages.
- **USB transport** uses `usb` package (libusb), not `node-hid`. Brother QL
  is USB Printer Class, not HID. Use the bulk OUT endpoint for writes and
  bulk IN for status reads.
- **TCP transport** connects to port 9100. The byte stream is identical to
  USB. `TcpTransport` wraps `net.Socket` with Promise-based write/read.
- **Two-color validation**: always check `descriptor.twoColor` before
  encoding a two-color job. Throw `UnsupportedOperationError` with a
  helpful message if the device doesn't support it.
- **Editor Lite mode**: detect mass storage PIDs in `listPrinters()`. Log
  a warning with instructions rather than silently excluding the device.
- **Raster row orientation**: the bitmap from `@mbtech-nl/bitmap` has rows
  across the width of the label. The printer expects the opposite — the
  print head spans the width and the label feeds past it. Apply
  `rotateBitmap(bitmap, 90)` before encoding if the source is in display
  orientation (wider than tall).
- **Web package** extends `@mbtech-nl/tsconfig/browser` directly — not
  `tsconfig.base.json`. DOM types must not leak into `core`.
- **All `package.json` files** must declare `"sideEffects": false`.
- **Changesets** for versioning — `.changeset/` initialized in scaffold.
- **Bluetooth** — do not implement, do not mention in the API, document
  clearly in `getting-started.md` that Bluetooth is out of scope and
  explain why (platform pairing complexity, different protocol stack).
- **Concurrent printing** (section 2.10) — for simplicity, default to
  compressed mode for TCP and uncompressed for USB. This avoids the
  timing sensitivity of concurrent printing over unreliable network paths.
```