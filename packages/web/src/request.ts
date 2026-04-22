import { DEVICES, findDevice } from '@thermal-label/brother-ql-core';
import { WebBrotherQLPrinter, openWebDevice } from './printer.js';

export interface RequestOptions {
  filters?: USBDeviceFilter[];
}

function defaultFilters(): USBDeviceFilter[] {
  return Object.values(DEVICES).map(d => ({ vendorId: d.vid, productId: d.pid }));
}

export async function requestPrinter(options?: RequestOptions): Promise<WebBrotherQLPrinter> {
  const filters = options?.filters ?? defaultFilters();
  const device = await navigator.usb.requestDevice({ filters });
  return openWebDevice(device);
}

export function fromUSBDevice(device: USBDevice): WebBrotherQLPrinter {
  const descriptor = findDevice(0x04f9, device.productId);
  if (!descriptor) {
    throw new Error(`Unsupported device: productId=0x${device.productId.toString(16)}`);
  }
  return new WebBrotherQLPrinter(device, descriptor);
}
