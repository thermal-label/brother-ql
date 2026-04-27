[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / pickRotation

# Function: pickRotation()

> **pickRotation**(`image`, `media`, `familyDirection`, `override?`): `0` \| `90` \| `180` \| `270`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/orientation.d.ts:32

Pick the rotation value to pass to `renderImage` / `renderMultiPlaneImage`.

Pure function — no IO, no driver state. The driver supplies its
family-specific rotation direction; this helper combines that with
the media's `defaultOrientation` hint and the caller's optional
override to produce a single rotation angle.

Decision table:

- `override` is set (and not `'auto'`) → returned verbatim.
- media `defaultOrientation === 'horizontal'` and image is landscape
  (`width > height`) → return `familyDirection`.
- everything else → `0` (pass through).

## Parameters

### image

Source image dimensions.

#### height

`number`

#### width

`number`

### media

[`MediaDescriptor`](../interfaces/MediaDescriptor.md)

Resolved media descriptor.

### familyDirection

[`RotateDirection`](../type-aliases/RotateDirection.md)

Driver family's rotation direction.

### override?

`0` \| `"auto"` \| `90` \| `180` \| `270`

Caller's per-print override. `'auto'` means
                        "use the heuristic" (same as omitted).

## Returns

`0` \| `90` \| `180` \| `270`
