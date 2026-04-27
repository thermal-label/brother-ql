[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / ROTATE_DIRECTION

# Variable: ROTATE_DIRECTION

> `const` **ROTATE_DIRECTION**: [`RotateDirection`](../type-aliases/RotateDirection.md) = `90`

Defined in: [packages/core/src/orientation.ts:11](https://github.com/thermal-label/brother-ql/blob/b9cf9bb9ed69fab105b536392a59cd11110468d5/packages/core/src/orientation.ts#L11)

Direction the Brother QL print head rotates landscape input.

`90` = clockwise. Verified once on hardware with a die-cut "F"
landscape print (see plan §6 step 1). Identical across every QL
model — this is a print-head/leading-edge mechanical fact, not a
per-media setting.
