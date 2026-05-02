[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DEVICES

# Variable: DEVICES

> `const` **DEVICES**: `Record`\<`"PT_E550W"` \| `"PT_P750W"` \| `"PT_P900"` \| `"PT_P900W"` \| `"PT_P910BT"` \| `"PT_P950NW"` \| `"QL_1050"` \| `"QL_1060N"` \| `"QL_1100"` \| `"QL_1110NWB"` \| `"QL_1115NWB"` \| `"QL_500"` \| `"QL_550"` \| `"QL_560"` \| `"QL_570"` \| `"QL_580N"` \| `"QL_600"` \| `"QL_650TD"` \| `"QL_700"` \| `"QL_710W"` \| `"QL_720NW"` \| `"QL_800"` \| `"QL_810W"` \| `"QL_820NWBc"`, [`DeviceEntry`](../interfaces/DeviceEntry.md)\>

Per-key map of device entries. Built from the registry array via
`Object.fromEntries`, but typed as `Record<DeviceKey, BrotherQLDevice>`
so consumers can write `DEVICES.QL_820NWBc` and get a precise type
back without literal narrowing leaking into engine capability access.
