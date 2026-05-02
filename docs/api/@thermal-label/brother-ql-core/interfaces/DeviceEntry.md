[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DeviceEntry

# Interface: DeviceEntry

A device entry in a driver's registry.

Each driver's `data/devices.json` lists entries of this shape. The
driver still owns the data; contracts owns only the shape.

## Properties

### capabilities?

> `optional` **capabilities?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Chassis-level capability flags — properties of the box, not the
printhead. Most boolean capabilities are engine-level; this bag
is for genuinely chassis-y things (Brother's `editorLite`
USB-Mass-Storage trick, eventual battery / display flags). Open
shape so drivers can extend without touching contracts.

***

### engines

> **engines**: readonly [`PrintEngine`](PrintEngine.md)[]

Print engines in this device. Always an array, never empty —
single-engine devices fabricate a `'primary'` entry. Composite
devices (Duo, Twin) carry one entry per independent engine.

***

### family

> **family**: `string`

Driver family this device belongs to, e.g. `'labelwriter'`.

***

### hardwareQuirks?

> `optional` **hardwareQuirks?**: `string`

In-source hardware quirks — immutable facts about the chassis.

Distinct from `support.quirks`, which is editorial and changes
with firmware revisions. Example: "PID collides with the
LabelManager PnP variant; needs usb_modeswitch on Linux".

***

### key

> **key**: `string`

Stable key used as the registry export name (e.g. `'LW_450'`).

***

### name

> **name**: `string`

Human-readable model name, e.g. `'LabelWriter 450'`.

***

### support

> **support**: `DeviceSupport`

Always defined; defaults to `{ status: 'untested' }`.

***

### transports

> **transports**: [`DeviceTransports`](DeviceTransports.md)

Wire-protocol transports this device exposes.
