export { UsbTransport, TcpTransport } from './transport.js';
export { BrotherQLPrinter, openPrinter, openPrinterTcp } from './printer.js';
export { listPrinters } from './discovery.js';
export { UnsupportedOperationError, PrinterError } from './errors.js';

export type { Transport } from './transport.js';
export type { OpenOptions, PrinterInfo } from './types.js';

// Re-export core API so consumers only need one import
export {
  DEVICES,
  MEDIA,
  findDevice,
  findMedia,
  findMediaByWidth,
  encodeJob,
  renderText,
  renderImage,
} from '@thermal-label/brother-ql-core';
export type {
  DeviceDescriptor,
  MediaDescriptor,
  PageData,
  PageOptions,
  JobOptions,
  PrinterStatus,
  LabelBitmap,
  RawImageData,
  MediaType,
  TextPrintOptions,
  ImagePrintOptions,
} from '@thermal-label/brother-ql-core';
