import type { LabelBitmap } from '@mbtech-nl/bitmap';
import type {
  DeviceEntry,
  MediaDescriptor,
  PrintEngineCapabilities,
  PrintOptions,
  PrinterStatus,
} from '@thermal-label/contracts';

export type MediaType = 'continuous' | 'die-cut';
export type HeadWidth = 720 | 1296;
export type ColorMode = 'single' | 'two-color';

/**
 * Brother-specific engine capabilities.
 *
 * Extends the contracts-defined `PrintEngineCapabilities` (which
 * carries the multi-vendor named flags `autocut` and `mediaDetection`)
 * with the driver-side `twoColor` flag — Brother-only today, so it
 * lands here via the contracts open index signature. Promote to a
 * named contracts key when a second vendor implements the same
 * capability with compatible semantics.
 */
export interface BrotherEngineCapabilities extends PrintEngineCapabilities {
  /** Two-colour ribbon path — black + red plane raster encoding. */
  twoColor?: boolean;
}

/**
 * Brother QL device entry — alias for the contracts `DeviceEntry`
 * shape. Re-exported under a driver-named type so consumers don't
 * have to import contracts directly. Per-device chassis-level
 * capabilities (`editorLite`, `massStoragePid`) ride on the open
 * index signature of `DeviceEntry.capabilities`; engine-level flags
 * (`autocut`, `mediaDetection`, `twoColor`) ride on
 * `engines[].capabilities`.
 *
 * **Bluetooth on the QL-820NWB / 820NWBc**: not exposed over GATT.
 * Classic Bluetooth SPP is paired at the OS level — declared as the
 * `bluetooth-spp` transport. The runtime's serial implementation
 * satisfies that transport key by opening the OS-paired RFCOMM
 * device path. macOS dropped classic Bluetooth SPP — no SPP route
 * there.
 */
export type BrotherQLDevice = DeviceEntry;

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
