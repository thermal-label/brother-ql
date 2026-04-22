import usb from 'usb';
import { DEVICES, findDevice, isMassStorageMode } from '@thermal-label/brother-ql-core';
import { type PrinterInfo } from './types.js';

const BROTHER_VID = 0x04f9;

export function listPrinters(): PrinterInfo[] {
  const results: PrinterInfo[] = [];

  for (const usbDevice of usb.getDeviceList()) {
    const desc = usbDevice.deviceDescriptor;
    if (desc.idVendor !== BROTHER_VID) continue;

    if (isMassStorageMode(desc.idProduct)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[brother-ql] Detected printer in Editor Lite (mass storage) mode (PID 0x${desc.idProduct.toString(16).toUpperCase()}). ` +
          'Hold the Editor Lite button until the LED turns off to switch to printer mode.',
      );
      continue;
    }

    const device = findDevice(desc.idVendor, desc.idProduct);
    if (!device) continue;

    const path = `${usbDevice.busNumber.toString()}.${usbDevice.deviceAddress.toString()}`;

    results.push({
      device,
      serialNumber: undefined,
      path,
      transport: 'usb',
    });
  }

  return results;
}

export { DEVICES };
