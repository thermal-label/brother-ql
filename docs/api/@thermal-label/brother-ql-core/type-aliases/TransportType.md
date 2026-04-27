[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / TransportType

# Type Alias: TransportType

> **TransportType** = `"usb"` \| `"tcp"` \| `"serial"` \| `"webusb"` \| `"web-serial"` \| `"web-bluetooth"`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/device.d.ts:15

Supported transport types a driver can use to talk to a printer.

- `usb`: raw USB via a platform USB API (e.g. `node-usb`).
- `tcp`: network printer on port 9100 (JetDirect) or a driver-specific port.
- `serial`: Node.js serial port — physical UART, USB-serial adapter, or
  Bluetooth SPP bound to `/dev/rfcomm0` / `COM3`.
- `webusb`: WebUSB in the browser.
- `web-serial`: Web Serial API in the browser — covers USB-serial adapters
  and OS-paired Bluetooth SPP devices.
- `web-bluetooth`: Web Bluetooth GATT in the browser. Classic Bluetooth
  SPP printers (e.g. Brother QL-820NWB) do NOT use this — they use
  `serial` / `web-serial` instead.
