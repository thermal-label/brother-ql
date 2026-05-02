[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / DeviceTransports

# Interface: DeviceTransports

Per-transport schema for a device.

Only the keys this device actually supports are present. Each key
carries the parameters its transport needs — VID/PID under `usb`,
port under `tcp`, etc. — instead of bunching them at the top level.

## Properties

### bluetooth-gatt?

> `optional` **bluetooth-gatt?**: `BluetoothGattTransport`

***

### bluetooth-spp?

> `optional` **bluetooth-spp?**: `BluetoothSppTransport`

***

### serial?

> `optional` **serial?**: `SerialTransport`

***

### tcp?

> `optional` **tcp?**: `TcpTransport`

***

### usb?

> `optional` **usb?**: [`UsbTransport`](UsbTransport.md)
