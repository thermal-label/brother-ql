import { type DeviceDescriptor } from '@thermal-label/brother-ql-core';

export interface OpenOptions {
  vid?: number;
  pid?: number;
  serialNumber?: string;
}

export interface PrinterInfo {
  device: DeviceDescriptor;
  serialNumber: string | undefined;
  path: string;
  transport: 'usb';
}
