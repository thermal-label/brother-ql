[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DeviceRegistry

# Interface: DeviceRegistry

A driver's full device registry.

`schemaVersion: 1` is the initial published shape. Bump when a
future change is genuinely incompatible; the aggregator and
cross-driver consumers refuse unknown values rather than silently
mishandle shape divergence.

## Properties

### devices

> **devices**: readonly [`DeviceEntry`](DeviceEntry.md)[]

***

### driver

> **driver**: `string`

Driver family identifier — matches `DeviceEntry.family`.

***

### schemaVersion

> **schemaVersion**: `1`
