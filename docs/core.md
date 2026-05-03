# Core API

`@thermal-label/brother-ql-core` is the shared protocol layer used by
both the Node.js and Web packages. It contains the raster encoder,
the device and media registries, the status parser, the offline
preview, and the two-colour palette constant. Pixel-to-plane splitting
runs through `renderMultiPlaneImage` in `@mbtech-nl/bitmap`, which is
re-exported here. The package also re-exports the
`@thermal-label/contracts` base types.

```bash
pnpm add @thermal-label/brother-ql-core
```

::: tip Looking for byte-level details?
The [Protocol reference](./protocol/) documents the exact USB byte
sequences, raster row format, status response layout, and a porting
checklist — see [QL raster](./protocol/ql) for QL-series printers and
[PT raster](./protocol/pt) for the PT-P / PT-E lineup.
:::

## Exports

| Export                                                                                     | Description                                                   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `DEVICES` / `findDevice` / `isMassStorageMode`                                             | Device registry (family, transports, feature flags) + lookups |
| `MEDIA` / `DEFAULT_MEDIA`                                                                  | Media registry and the 62 mm continuous fallback for previews |
| `findMedia(id)` / `findMediaByWidth(mm, type)` / `findMediaByDimensions(w, h, twoColor?)`  | Media lookups                                                 |
| `STATUS_REQUEST`                                                                           | `ESC i S` — 3-byte status request                             |
| `parseStatus(bytes)`                                                                       | Parse the 32-byte response into `BrotherQLStatus`             |
| `ROTATE_DIRECTION`                                                                         | Brother QL's family rotation direction (`90` = CW)            |
| `pickRotation(image, media, dir, override?)`                                               | Re-exported from contracts — picks the rotation angle         |
| `createPreviewOffline(image, media)`                                                       | Render `PreviewResult` without a live connection              |
| `encodeJob(pages, options?)`                                                               | Encode a complete print job to bytes                          |
| `renderText` / `renderImage` / `renderMultiPlaneImage` / `rotateBitmap` / `flipHorizontal` | Bitmap helpers (re-exported from `@mbtech-nl/bitmap`)         |
| `BrotherQLDevice`                                                                          | Device descriptor type (extends contracts `DeviceDescriptor`) |
| `BrotherQLMedia`                                                                           | Media descriptor type (extends contracts `MediaDescriptor`)   |
| `BrotherQLStatus`                                                                          | `PrinterStatus` + `editorLiteMode`                            |
| `PageData` / `PageOptions` / `JobOptions`                                                  | Protocol-level job shape                                      |
| `PrinterAdapter`, `MediaDescriptor`, `Transport`, …                                        | Re-exported from `@thermal-label/contracts`                   |

## Key types

```ts
interface BrotherQLMedia extends MediaDescriptor {
  id: number; // numeric firmware ID (e.g. 259)
  type: 'continuous' | 'die-cut';
  widthMm: number;
  heightMm?: number; // omitted for continuous media
  // base MediaDescriptor adds (all optional):
  //   palette?           — present only on multi-ink media (DK-22251)
  //   defaultOrientation — 'horizontal' on rectangular die-cut entries
  //   printMargins       — design-tool clip-safe insets
  //   cornerRadiusMm     — round die-cuts set this to widthMm / 2
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
import {
  encodeJob,
  findMedia,
  renderMultiPlaneImage,
  rotateBitmap,
} from '@thermal-label/brother-ql-core';

const media = findMedia(251)!; // 62mm DK-22251 — carries `palette`
const { black, red } = renderMultiPlaneImage(image, {
  palette: media.palette!, // [black, red]
});
const bitmap = rotateBitmap(black, 270);
const redBitmap = rotateBitmap(red, 270);

const bytes = encodeJob([{ bitmap, redBitmap, media }]);
```

`renderMultiPlaneImage` classifies each pixel to its nearest palette
entry (black, red, or the implicit white background) by RGB distance,
which guarantees every dot lands in at most one plane. Pass
`colorSpace: 'lab'`, per-plane `dither` / `gamma` / `threshold`, or a
custom palette for richer control — see the bitmap library's docs.
The node and web drivers run `renderMultiPlaneImage` with the media's
palette automatically whenever `media.palette` is defined.

### Look up media

```ts
import { findMedia, findMediaByDimensions, MEDIA } from '@thermal-label/brother-ql-core';

findMedia(259); // DK-22205 descriptor
findMedia(251); // DK-22251 (multi-ink — carries `palette`)
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

See the [hardware reference](./hardware#label-media) for the full
table of media IDs, sizes, DK product codes, and print-area geometry.
DK lives in id range 200-399; TZe / HSe live in 401-459 with
per-head-family geometry (`narrow` for 128-pin PT-E550W / PT-P750W;
`wide` for 560-pin PT-P900 family).

## High-resolution mode (PT-\* only)

PT engines support a high-resolution print mode that doubles the
vertical resolution along the tape feed axis. Opt in per call:

```ts
await printer.print(image, media, { highRes: true });
```

This requires the engine's `capabilities.highResDpi` to be set —
defined for every PT-\* entry, undefined for QL entries. Calling
`print(..., { highRes: true })` on a QL printer throws at job-build
time with a clear error rather than silently falling back to native dpi.

| Engine head family           | Native dpi | High-res dpi |
| ---------------------------- | ---------- | ------------ |
| 128-pin (PT-E550W, PT-P750W) | 180×180    | 180×360      |
| 560-pin (PT-P900 family)     | 360×360    | 360×720      |

Internally the encoder sets `ESC i K` bit 6, doubles the feed margin,
and emits each raster line twice. Per-protocol wire-format details
(QL's 35-dot vs PT's 14-dot feed margin, QL's 200/400-byte invalidate
derivation from `engine.capabilities.twoColor`, PT's bit-6 high-res
flag) live inside `src/protocol.ts` as `RasterProtocolConfig` and are
not part of the device-registry data shape — see
[`DECISIONS.md`](https://github.com/thermal-label/brother-ql/blob/main/DECISIONS.md)
D18 for the rule.
