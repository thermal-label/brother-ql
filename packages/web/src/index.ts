export { WebBrotherQLPrinter } from './printer.js';
export { requestPrinter, fromUSBDevice } from './request.js';
export type { RequestOptions } from './request.js';

export type {
  DeviceDescriptor,
  MediaDescriptor,
  PageData,
  PageOptions,
  JobOptions,
  PrinterStatus,
  TextPrintOptions,
  ImagePrintOptions,
  MediaType,
} from '@thermal-label/brother-ql-core';

export {
  DEVICES,
  MEDIA,
  findDevice,
  findMedia,
  findMediaByWidth,
  renderText,
  renderImage,
  rotateBitmap,
} from '@thermal-label/brother-ql-core';
export type { LabelBitmap, RawImageData } from '@thermal-label/brother-ql-core';
