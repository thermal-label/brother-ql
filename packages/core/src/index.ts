export type { LabelBitmap, PaletteEntry, RawImageData } from '@mbtech-nl/bitmap';
export {
  flipHorizontal,
  renderImage,
  renderMultiPlaneImage,
  renderText,
  rotateBitmap,
} from '@mbtech-nl/bitmap';

export type {
  DeviceEntry,
  DeviceRegistry,
  DeviceTransports,
  MediaDescriptor,
  PreviewOptions,
  PreviewPlane,
  PreviewResult,
  PrintEngine,
  PrintEngineCapabilities,
  PrintOptions,
  PrinterAdapter,
  PrinterError,
  PrinterStatus,
  RotateDirection,
  Transport,
  TransportType,
  UsbTransport,
} from '@thermal-label/contracts';

export {
  MediaNotSpecifiedError,
  pickRotation,
  UnsupportedOperationError,
} from '@thermal-label/contracts';

export { DEVICE_REGISTRY, DEVICES, findDevice, getUsbIds, isMassStorageMode } from './devices.js';

/**
 * Protocols this core's encoder produces correct wire bytes for.
 * Pair with `DEVICE_REGISTRY` and pass to `resolveSupportedDevices`
 * from `@thermal-label/contracts` to filter a device list down to
 * what this runtime can actually drive.
 */
export const PROTOCOLS: ReadonlySet<string> = new Set(['ql-raster', 'pt-raster']);
export {
  DEFAULT_MEDIA,
  DEFAULT_PT_MEDIA,
  MEDIA,
  defaultMediaForEngine,
  findMedia,
  findMediaByDimensions,
  findMediaByWidth,
  resolveTapeGeometry,
} from './media.js';
export { ROTATE_DIRECTION } from './orientation.js';
export {
  buildInitialize,
  buildInvalidate,
  encodeJob,
  encodeJobForEngine,
  PT_PROTOCOL_CONFIG,
  QL_PROTOCOL_CONFIG,
} from './protocol.js';
export type { EncoderEngine, RasterProtocolConfig } from './protocol.js';
export { parseStatus, STATUS_REQUEST } from './status.js';
export { createPreviewOffline } from './preview.js';

export type {
  BrotherEngineCapabilities,
  BrotherQLDevice,
  BrotherQLMedia,
  BrotherQLPrintOptions,
  BrotherQLStatus,
  ColorMode,
  HeadWidth,
  JobOptions,
  MediaType,
  PageData,
  PageOptions,
  TapeGeometry,
  TapeSystem,
} from './types.js';
