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
 * Tape-system discriminator on `BrotherQLMedia`. DK is the QL series'
 * paper-label system; TZe is the laminated-tape system used by the
 * PT-P / PT-E line; HSe 2:1 and HSe 3:1 are heat-shrink tubing systems
 * supported by most P900-series and PT-E550W. Lookup paths gate on
 * this so a QL printer never resolves a TZe entry, and vice versa.
 */
export type TapeSystem = 'dk' | 'tze' | 'hse-2to1' | 'hse-3to1';

/**
 * Per-head-family geometry on `BrotherQLMedia`.
 *
 * Brother's PT-P / PT-E line ships two head families with different
 * per-tape pin layouts. The same TZe id maps to different
 * `printableDots` / `leftMarginPins` / `rightMarginPins` values on a
 * 128-pin head (PT-E550W, PT-P750W) versus a 560-pin head (PT-P900,
 * P900W, P950NW, P910BT). DK media leaves these unset and resolves via
 * the flat fields on `BrotherQLMedia` directly.
 */
export interface TapeGeometry {
  printableDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
}

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
  /**
   * Doubled-density mode along the feed axis (`ESC i K` bit 6).
   * `360` on PT-E550W / PT-P750W (native 180); `720` on the PT-P900
   * family (native 360). Undefined on QL and PT models that don't
   * support high-res. The encoder branches on this when
   * `BrotherQLPrintOptions.highRes` is set.
   */
  highResDpi?: 360 | 720;
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
  /**
   * Tape system this entry belongs to. Drives lookup gating in
   * `findMediaByDimensions(width, height, engine)` so QL engines never
   * resolve TZe / HSe entries and vice versa.
   */
  tapeSystem: TapeSystem;
  /**
   * Per-head-family geometry. `narrow` = 128-pin head (PT-E550W,
   * PT-P750W); `wide` = 560-pin head (PT-P900 family). DK entries
   * leave both unset and use the flat fields below; TZe / HSe entries
   * leave the flat fields undefined and populate `narrow` and/or
   * `wide` per the *Raster Command Reference* PDFs. `undefined` on a
   * head family means "this tape doesn't fit this head" (e.g. 36 mm
   * TZe and 31 mm HSe-3:1 have no `narrow` entry).
   */
  geometry?: { narrow?: TapeGeometry; wide?: TapeGeometry };
  /** DK-only flat geometry. PT-* entries populate `geometry` instead. */
  printableDots?: number;
  leftMarginPins?: number;
  rightMarginPins?: number;
  /** Die-cut masked area in dots (registration windows). */
  dieCutMaskedAreaDots?: number;
}

/**
 * Brother QL status — the plain contract `PrinterStatus`. Brother QL
 * adds no structural extension: driver-specific diagnostic facts (print
 * phase, head cooling) ride in the contract-standard `details[]` rows.
 */
export type BrotherQLStatus = PrinterStatus;

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
  /**
   * Opt into high-resolution mode (doubles dpi along the feed axis).
   * Requires the engine's `capabilities.highResDpi` to be set; throws
   * at job-build time otherwise. PT-* only — QL ignores the option.
   */
  highRes?: boolean;
}
