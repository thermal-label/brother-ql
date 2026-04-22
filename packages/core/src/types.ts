import { type LabelBitmap } from '@mbtech-nl/bitmap';

export type MediaType = 'continuous' | 'die-cut';
export type HeadWidth = 720 | 1296;
export type ColorMode = 'single' | 'two-color';
export type NetworkSupport = 'none' | 'wifi' | 'wired' | 'wifi+wired';

export interface DeviceDescriptor {
  name: string;
  vid: number;
  pid: number;
  headPins: HeadWidth;
  bytesPerRow: number;
  twoColor: boolean;
  network: NetworkSupport;
  bluetooth: boolean;
  autocut: boolean;
  compression: boolean;
  editorLite: boolean;
  massStoragePid?: number;
}

export interface MediaDescriptor {
  id: number;
  name: string;
  type: MediaType;
  widthMm: number;
  lengthMm: number;
  printAreaDots: number;
  leftMarginPins: number;
  rightMarginPins: number;
  dieCutMaskedAreaDots?: number;
}

export interface PageData {
  bitmap: LabelBitmap;
  redBitmap?: LabelBitmap;
  media: MediaDescriptor;
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

export interface PrinterStatus {
  ready: boolean;
  mediaWidthMm: number;
  mediaType: MediaType | null;
  errors: string[];
  editorLiteMode: boolean;
  rawBytes: Uint8Array;
}
