[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / ROTATE\_DIRECTION

# Variable: ROTATE\_DIRECTION

> `const` **ROTATE\_DIRECTION**: [`RotateDirection`](../type-aliases/RotateDirection.md) = `90`

Defined in: [packages/core/src/orientation.ts:11](https://github.com/thermal-label/brother-ql/blob/d0ec9fe85807f2ab345c5459dea92f1d08797936/packages/core/src/orientation.ts#L11)

Direction the Brother QL print head rotates landscape input.

`90` = clockwise. Verified once on hardware with a die-cut "F"
landscape print (see plan §6 step 1). Identical across every QL
model — this is a print-head/leading-edge mechanical fact, not a
per-media setting.
