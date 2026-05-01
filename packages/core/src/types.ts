import type { LabelBitmap } from '@mbtech-nl/bitmap';
import type {
  DeviceDescriptor,
  MediaDescriptor,
  PrintOptions,
  PrinterStatus,
} from '@thermal-label/contracts';

export type MediaType = 'continuous' | 'die-cut';
export type HeadWidth = 720 | 1296;
export type ColorMode = 'single' | 'two-color';
export type NetworkSupport = 'none' | 'wifi' | 'wired' | 'wifi+wired';

/**
 * Brother QL device descriptor.
 *
 * Extends the contracts base with QL-specific fields: head geometry,
 * protocol feature flags, and the optional mass-storage PID for Editor
 * Lite mode.
 *
 * **Bluetooth on the QL-820NWB / 820NWBc**: not exposed over GATT.
 * Classic Bluetooth (SPP) is paired at the OS level; the kernel/driver
 * exposes an RFCOMM serial port, reachable via the `'serial'` transport
 * in Node.js and the `'web-serial'` transport in Chrome/Edge. macOS has
 * dropped classic Bluetooth SPP — no serial route there.
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
}

/**
 * Brother QL media descriptor.
 *
 * Extends `MediaDescriptor` with the dots-based geometry the raster
 * encoder needs. The base `palette` field flips the driver into
 * multi-plane mode — only DK-22251 declares one in the registry.
 */
export interface BrotherQLMedia extends MediaDescriptor {
  id: number;
  type: MediaType;
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
  /**
   * True when the loaded roll reports two-color capability via byte 25
   * bit 7 of the status response. Undefined when no media is loaded.
   */
  twoColorRoll?: boolean;
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

/**
 * Per-call print options for `BrotherQLPrinter.print()`.
 *
 * Extends the cross-driver `PrintOptions` with QL-specific knobs. The
 * `rotate` override picks the rotation angle passed to
 * `renderImage` / `renderMultiPlaneImage` — `'auto'` (the default)
 * defers to the media's `defaultOrientation` heuristic.
 */
export interface BrotherQLPrintOptions extends PrintOptions {
  rotate?: 'auto' | 0 | 90 | 180 | 270;
}
