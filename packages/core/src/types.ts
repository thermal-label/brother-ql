/* eslint-disable import-x/consistent-type-specifier-style */
import { type LabelBitmap } from '@mbtech-nl/bitmap';
import type {
  BluetoothConfig,
  DeviceDescriptor,
  MediaDescriptor,
  PrinterStatus,
} from '@thermal-label/contracts';

export type MediaType = 'continuous' | 'die-cut';
export type HeadWidth = 720 | 1296;
export type ColorMode = 'single' | 'two-color';
export type NetworkSupport = 'none' | 'wifi' | 'wired' | 'wifi+wired';

/**
 * Brother QL device descriptor.
 *
 * Extends the contracts base with QL-specific fields (head geometry,
 * protocol feature flags, the optional mass-storage PID for Editor
 * Lite mode). BLE configuration is carried on the inherited
 * `bluetooth?: BluetoothConfig` field — UUIDs are TBD for all models
 * until GATT sniffing is done (see DECISIONS.md D9).
 */
export interface BrotherQLDevice extends DeviceDescriptor {
  family: 'brother-ql';
  vid: number;
  pid: number;
  headPins: HeadWidth;
  bytesPerRow: number;
  twoColor: boolean;
  network: NetworkSupport;
  autocut: boolean;
  compression: boolean;
  editorLite: boolean;
  /** Alternate PID seen when the printer is in Editor Lite mass-storage mode. */
  massStoragePid?: number;
  bluetooth?: BluetoothConfig;
}

/**
 * Brother QL media descriptor.
 *
 * Extends `MediaDescriptor` with the dots-based geometry the raster
 * encoder needs. `colorCapable: true` flips the driver into
 * two-colour mode — only DK-22251 has this set in the registry.
 */
export interface BrotherQLMedia extends MediaDescriptor {
  id: number;
  type: MediaType;
  colorCapable: boolean;
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
  /** Die-cut masked area in dots (registration windows). */
  dieCutMaskedAreaDots?: number;
}

/**
 * Brother QL status — contracts `PrinterStatus` plus the
 * `editorLiteMode` flag (pre-paired QL-820NWB silently drops raster
 * jobs when in Editor Lite mode; callers need to know).
 */
export interface BrotherQLStatus extends PrinterStatus {
  editorLiteMode: boolean;
}

export interface PageData {
  bitmap: LabelBitmap;
  redBitmap?: LabelBitmap;
  media: BrotherQLMedia;
  options?: PageOptions;
}

export interface PageOptions {
  autoCut?: boolean;
  cutAtEnd?: boolean;
  highResolution?: boolean;
  marginDots?: number;
  compress?: boolean;
}

export interface JobOptions {
  copies?: number;
}
