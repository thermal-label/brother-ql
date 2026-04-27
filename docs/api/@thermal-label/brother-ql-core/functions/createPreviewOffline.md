[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / createPreviewOffline

# Function: createPreviewOffline()

> **createPreviewOffline**(`image`, `media`): [`PreviewResult`](../interfaces/PreviewResult.md)

Defined in: [packages/core/src/preview.ts:14](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/preview.ts#L14)

Offline preview without a live printer connection.

Multi-ink aware: when `media.palette` is defined (DK-22251 today),
the image is split per-plane via `renderMultiPlaneImage()` — the
same code path `print()` takes for that media. Single-ink media
returns one black plane via dithered `renderImage`.

## Parameters

### image

[`RawImageData`](../interfaces/RawImageData.md)

### media

[`BrotherQLMedia`](../interfaces/BrotherQLMedia.md)

## Returns

[`PreviewResult`](../interfaces/PreviewResult.md)
