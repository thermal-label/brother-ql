# Core API

`@thermal-label/brother-ql-core` is the shared protocol layer used by
both the Node.js and Web packages. It contains the raster encoder,
the device and media registries, the status parser, the
`splitTwoColor` helper, and the offline preview. It also re-exports
the `@thermal-label/contracts` base types.

```bash
pnpm add @thermal-label/brother-ql-core
```

::: tip Looking for byte-level details?
The [Protocol reference](/protocol) documents the exact USB byte
sequences, raster row format, status response layout, and a porting
checklist for other languages.
:::

## Exports

| Export                                                                                    | Description                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `DEVICES` / `findDevice` / `isMassStorageMode`                                            | Device registry (family, transports, feature flags) + lookups |
| `MEDIA` / `DEFAULT_MEDIA`                                                                 | Media registry and the 62 mm continuous fallback for previews |
| `findMedia(id)` / `findMediaByWidth(mm, type)` / `findMediaByDimensions(w, h, twoColor?)` | Media lookups                                                 |
| `STATUS_REQUEST`                                                                          | `ESC i S` — 3-byte status request                             |
| `parseStatus(bytes)`                                                                      | Parse the 32-byte response into `BrotherQLStatus`             |
| `splitTwoColor(image, options?)`                                                          | RGBA → `{ black, red }` 1bpp planes for DK-22251              |
| `isRedish(r, g, b, a)`                                                                    | Driver's red-pixel heuristic (threshold 180/100/100)          |
| `createPreviewOffline(image, media)`                                                      | Render `PreviewResult` without a live connection              |
| `encodeJob(pages, options?)`                                                              | Encode a complete print job to bytes                          |
| `renderText` / `renderImage` / `rotateBitmap` / `flipHorizontal`                          | Bitmap helpers (re-exported from `@mbtech-nl/bitmap`)         |
| `BrotherQLDevice`                                                                         | Device descriptor type (extends contracts `DeviceDescriptor`) |
| `BrotherQLMedia`                                                                          | Media descriptor type (extends contracts `MediaDescriptor`)   |
| `BrotherQLStatus`                                                                         | `PrinterStatus` + `editorLiteMode`                            |
| `PageData` / `PageOptions` / `JobOptions`                                                 | Protocol-level job shape                                      |
| `PrinterAdapter`, `MediaDescriptor`, `Transport`, …                                       | Re-exported from `@thermal-label/contracts`                   |

## Key types

```ts
interface BrotherQLMedia extends MediaDescriptor {
  id: number; // numeric firmware ID (e.g. 259)
  type: 'continuous' | 'die-cut';
  widthMm: number;
  heightMm?: number; // omitted for continuous media
  colorCapable: boolean; // true only for DK-22251
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
  dieCutMaskedAreaDots?: number;
}

interface BrotherQLStatus extends PrinterStatus {
  editorLiteMode: boolean;
}

interface PageData {
  bitmap: LabelBitmap; // black plane
  redBitmap?: LabelBitmap; // red plane (two-colour only)
  media: BrotherQLMedia;
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
```

## Usage

### Encode a single-colour print job

```ts
import { encodeJob, findMedia, renderImage, rotateBitmap } from '@thermal-label/brother-ql-core';

const media = findMedia(259)!; // 62mm DK-22205
const rawBitmap = renderImage(image, { dither: true });
const bitmap = rotateBitmap(rawBitmap, 270);

const bytes = encodeJob([{ bitmap, media }]);
// bytes is a Uint8Array ready to write to the printer transport
```

### Encode a two-colour job (DK-22251)

```ts
import { encodeJob, findMedia, splitTwoColor, rotateBitmap } from '@thermal-label/brother-ql-core';

const media = findMedia(251)!; // 62mm DK-22251
const { black, red } = splitTwoColor(image); // RGBA → two 1bpp planes
const bitmap = rotateBitmap(black, 270);
const redBitmap = rotateBitmap(red, 270);

const bytes = encodeJob([{ bitmap, redBitmap, media }]);
```

`splitTwoColor` classifies a pixel as red when
`r > 180 && g < 100 && b < 100 && a >= 128`. Overlaps resolve to
black. The node and web drivers call `splitTwoColor` automatically
whenever `media.colorCapable` is `true` — you only invoke it directly
if you want to customise the threshold or pre-render the planes.

### Look up media

```ts
import { findMedia, findMediaByDimensions, MEDIA } from '@thermal-label/brother-ql-core';

findMedia(259); // DK-22205 descriptor
findMedia(251); // DK-22251 (colorCapable)
findMediaByDimensions(62, 29); // die-cut 62×29 mm
findMediaByDimensions(62, 0, false); // 62mm continuous (DK-22205)
findMediaByDimensions(62, 0, true); // prefers DK-22251 over DK-22205
Object.values(MEDIA); // all BrotherQLMedia entries
```

### Parse a status response

```ts
import { parseStatus, STATUS_REQUEST } from '@thermal-label/brother-ql-core';

// Write STATUS_REQUEST to the printer, read 32 bytes back, then:
const status = parseStatus(responseBytes);
status.ready; // boolean
status.detectedMedia; // BrotherQLMedia | undefined — resolved from bytes
status.errors; // PrinterError[] — { code, message }
status.editorLiteMode; // brother-ql extension
```

## Media IDs

See the [hardware reference](/hardware#label-media) for the full
table of media IDs, sizes, DK product codes, and print-area geometry.
