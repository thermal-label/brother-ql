[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [core/src](../README.md) / createPreviewOffline

# Function: createPreviewOffline()

> **createPreviewOffline**(`image`, `media`): [`PreviewResult`](/contracts/api/interfaces/PreviewResult)

Offline preview without a live printer connection.

Multi-ink aware: when `media.palette` is defined (DK-22251 today),
the image is split per-plane via `renderMultiPlaneImage()` — the
same code path `print()` takes for that media. Single-ink media
returns one black plane via dithered `renderImage`.

## Parameters

### image

[`RawImageData`](/contracts/api/interfaces/RawImageData)

### media

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)

## Returns

[`PreviewResult`](/contracts/api/interfaces/PreviewResult)
