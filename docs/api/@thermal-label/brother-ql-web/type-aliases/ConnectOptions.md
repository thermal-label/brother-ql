[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-web](../README.md) / ConnectOptions

# Type Alias: ConnectOptions

> **ConnectOptions** = \{ `deviceKey?`: `string`; `transport`: `"usb"`; \} \| \{ `baudRate?`: `number`; `deviceKey?`: `string`; `transport`: `"serial"`; \} \| \{ `baudRate?`: `number`; `deviceKey?`: `string`; `transport`: `"bluetooth-spp"`; \} \| \{ `deviceKey?`: `string`; `transport`: `"bluetooth-gatt"`; \}

Options for the unified driver-web `requestPrinters(opts)` factory.

One factory per driver, dispatched on the `transport` discriminator.
The browser's transport-appropriate picker (`navigator.usb` /
`navigator.serial` / `navigator.bluetooth`) opens; the picked
port/device is wrapped in the matching transport class; the
factory tries to auto-identify which registry entry the picked
device corresponds to.

**Auto-identification capability per transport:**

| Transport          | Auto-identify via                              |
| ------------------ | ---------------------------------------------- |
| `'usb'`            | `usbDevice.vendorId`/`productId` vs registry   |
| `'bluetooth-gatt'` | observed service UUID vs registry              |
| `'serial'`         | (none in the standard Web Serial API)          |
| `'bluetooth-spp'`  | (none in the standard Web Serial API)          |

If auto-identification can't decide and `deviceKey` was omitted,
the factory throws `DeviceIdentificationRequiredError` carrying
the candidate registry entries (filtered by transport) and a
`continueWith` closure to resume after operator confirmation.
