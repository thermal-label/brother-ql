import { type DeviceDescriptor, type PageOptions } from '@thermal-label/brother-ql-core';

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

export interface TextPrintOptions extends PageOptions {
  invert?: boolean;
  scaleX?: number;
  scaleY?: number;
}

export interface ImagePrintOptions extends PageOptions {
  threshold?: number;
  dither?: boolean;
  invert?: boolean;
  rotate?: 0 | 90 | 180 | 270;
}
