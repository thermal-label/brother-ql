# Core API

The `@thermal-label/brother-ql-core` package is the zero-dependency protocol encoder shared by the Node.js and Web packages. It runs in Node.js and browsers equally and has no platform-specific code.

```bash
pnpm add @thermal-label/brother-ql-core
```

::: tip Looking for byte-level details?
The [Protocol reference](protocol.md) documents the exact USB byte sequences, raster row format, status response layout, and a porting checklist for other languages.
:::

## Exports

| Export                       | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `encodeJob(pages, options?)` | Encode a complete print job to bytes             |
| `DEVICES`                    | Full device descriptor registry                  |
| `MEDIA`                      | Full media descriptor registry                   |
| `findDevice(vid, pid)`       | Look up a device descriptor by USB VID/PID       |
| `findMedia(id)`              | Look up a media descriptor by numeric ID         |
| `findMediaByWidth(mm, type)` | Find all media descriptors matching a width      |
| `isMassStorageMode(pid)`     | Returns `true` for Editor Lite PIDs              |
| `parseStatus(bytes)`         | Parse a 32-byte printer status response          |
| `STATUS_REQUEST`             | `Uint8Array` — the 3-byte status request command |
| `renderText(text, options?)` | Render text to a 1bpp `LabelBitmap`              |
| `renderImage(raw, options?)` | Convert a raw RGBA image to a 1bpp `LabelBitmap` |
| `rotateBitmap(bitmap, deg)`  | Rotate a `LabelBitmap` by 90 / 180 / 270 degrees |
| `flipHorizontal(bitmap)`     | Flip a `LabelBitmap` left-to-right               |

## Key types

```typescript
interface MediaDescriptor {
  id: number; // numeric media ID (e.g. 259)
  name: string; // human-readable name including DK code
  type: 'continuous' | 'die-cut';
  widthMm: number;
  lengthMm: number; // 0 for continuous tape
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
  twoColorTape?: boolean; // true for DK-22251
  dieCutMaskedAreaDots?: number;
}

interface PageData {
  bitmap: LabelBitmap; // black layer
  redBitmap?: LabelBitmap; // red layer (two-color only)
  media: MediaDescriptor;
  options?: PageOptions;
}

interface PageOptions {
  autoCut?: boolean; // default true
  cutAtEnd?: boolean; // default true
  highResolution?: boolean; // default false
  marginDots?: number; // default 35
  compress?: boolean; // default false
}

interface JobOptions {
  copies?: number; // default 1
}

interface PrinterStatus {
  mediaWidthMm: number;
  mediaType: 'continuous' | 'die-cut' | 'none';
  errorInfo1: number;
  errorInfo2: number;
  statusType: number;
  phaseType: number;
  phaseNumber: number;
}

interface LabelBitmap {
  widthPx: number;
  heightPx: number;
  data: Uint8Array; // 1bpp packed, MSB first
}
```

## Usage

### Encode a print job

```typescript
import {
  encodeJob,
  findMedia,
  renderText,
  rotateBitmap,
  flipHorizontal,
} from '@thermal-label/brother-ql-core';

const media = findMedia(259)!; // 62mm DK-22205

const rawBitmap = renderText('Hello QL', { scaleX: 10, scaleY: 10 });
const bitmap = flipHorizontal(rotateBitmap(rawBitmap, 270));

const bytes = encodeJob([{ bitmap, media }]);
// bytes is a Uint8Array ready to write to the printer endpoint
```

### Look up media

```typescript
import { findMedia, findMediaByWidth, MEDIA } from '@thermal-label/brother-ql-core';

findMedia(259); // → MediaDescriptor for DK-22205
findMedia(251); // → MediaDescriptor for DK-22251 (two-color)
findMediaByWidth(62, 'continuous'); // → [DK-22205 descriptor, DK-22251 descriptor]
Object.values(MEDIA); // → all MediaDescriptor entries
```

### Look up a device

```typescript
import { findDevice, DEVICES } from '@thermal-label/brother-ql-core';

findDevice(0x04f9, 0x20a7); // → DeviceDescriptor for QL-820NWB
DEVICES.QL_820NWB; // → same thing by name
```

### Parse a status response

```typescript
import { parseStatus, STATUS_REQUEST } from '@thermal-label/brother-ql-core';

// Write STATUS_REQUEST to the printer, read 32 bytes back, then:
const status = parseStatus(responseBytes);
console.log(status.mediaWidthMm); // e.g. 62
```

## Media IDs

See the [hardware reference](hardware.md#label-media) for the full table of media IDs, sizes, DK product codes, and print-area geometry.
