[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / BrotherQLDevice

# Type Alias: BrotherQLDevice

> **BrotherQLDevice** = [`DeviceEntry`](../interfaces/DeviceEntry.md)

Brother QL device entry — alias for the contracts `DeviceEntry`
shape. Re-exported under a driver-named type so consumers don't
have to import contracts directly. Per-device chassis-level
capabilities (`editorLite`, `massStoragePid`) ride on the open
index signature of `DeviceEntry.capabilities`; engine-level flags
(`autocut`, `mediaDetection`, `twoColor`) ride on
`engines[].capabilities`.

**Bluetooth on the QL-820NWB / 820NWBc**: not exposed over GATT.
Classic Bluetooth SPP is paired at the OS level — declared as the
`bluetooth-spp` transport. The runtime's serial implementation
satisfies that transport key by opening the OS-paired RFCOMM
device path. macOS dropped classic Bluetooth SPP — no SPP route
there.
