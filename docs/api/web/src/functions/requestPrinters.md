[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [web/src](../README.md) / requestPrinters

# Function: requestPrinters()

> **requestPrinters**(`opts`): `Promise`\<`Readonly`\<`Record`\<`string`, [`PrinterAdapter`](/contracts/api/interfaces/PrinterAdapter)\>\>\>

Unified browser-picker factory for the brother-ql driver family.

Dispatches on `opts.transport`:

- `'usb'` — opens `navigator.usb` picker. Auto-identifies via
  `usbDevice.vendorId/productId` against the registry. Throws
  `DeviceIdentificationRequiredError` only if the picked device's
  VID/PID is not in the brother-ql registry.
- `'bluetooth-spp'` — always-ask (Web Serial has no BT name
  surface). `opts.deviceKey` required; if omitted, throws
  `DeviceIdentificationRequiredError` with the BT-SPP-capable
  subset of `DEVICES` (e.g. QL_820NWBc, PT_P910BT).
  `continueWith(deviceKey)` opens the Web Serial picker for the
  chosen device.
- `'serial'` — not declared in the brother-ql registry today;
  throws unconditionally.
- `'bluetooth-gatt'` — not declared in the brother-ql registry today;
  throws unconditionally.

Returns a 1-key `PrinterAdapterMap` keyed by the device's primary
engine role.

## Parameters

### opts

[`ConnectOptions`](/contracts/api/type-aliases/ConnectOptions)

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, [`PrinterAdapter`](/contracts/api/interfaces/PrinterAdapter)\>\>\>
