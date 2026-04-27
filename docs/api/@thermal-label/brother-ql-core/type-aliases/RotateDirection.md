[**Documentation**](../../../README.md)

---

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / RotateDirection

# Type Alias: RotateDirection

> **RotateDirection** = `90` \| `270`

Defined in: node_modules/.pnpm/@thermal-label+contracts@0.2.0/node_modules/@thermal-label/contracts/dist/orientation.d.ts:10

Direction the printer family rotates landscape input.

`90` = clockwise, `270` = counter-clockwise. Each driver picks the
value that matches its head/leading-edge geometry — confirm once on
hardware with a die-cut "F" landscape print, then export the constant
from the driver core.
