interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: 'ok' | 'stall' | 'babble';
}

interface USBInTransferResult {
  readonly data: DataView | null;
  readonly status: 'ok' | 'stall' | 'babble';
}

interface USBInterface {
  readonly interfaceNumber: number;
  readonly claimed: boolean;
}

interface USBConfiguration {
  readonly interfaces: USBInterface[];
}

declare class USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly serialNumber: string | undefined;
  readonly configuration: USBConfiguration | null;
  readonly opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
}

interface USB {
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface Navigator {
  readonly usb: USB;
}
