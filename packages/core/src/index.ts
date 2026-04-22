export type { LabelBitmap, RawImageData } from '@mbtech-nl/bitmap';
export { renderText, renderImage } from '@mbtech-nl/bitmap';

export { DEVICES, findDevice, isMassStorageMode } from './devices.js';
export { MEDIA, findMedia, findMediaByWidth } from './media.js';
export { encodeJob } from './protocol.js';

export type {
  MediaType,
  HeadWidth,
  ColorMode,
  NetworkSupport,
  DeviceDescriptor,
  MediaDescriptor,
  PageData,
  PageOptions,
  JobOptions,
  PrinterStatus,
} from './types.js';
