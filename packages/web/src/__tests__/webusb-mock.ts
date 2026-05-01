import { vi } from 'vitest';

export interface MockUSBDevice extends USBDevice {
  __transfers: { endpointNumber: number; data: Uint8Array }[];
  __statusBytes: Uint8Array;
}

export function createMockUSBDevice(overrides?: {
  vendorId?: number;
  productId?: number;
  statusBytes?: Uint8Array;
}): MockUSBDevice {
  const transfers: { endpointNumber: number; data: Uint8Array }[] = [];
  let opened = false;

  const endpoints = [
    { endpointNumber: 2, direction: 'out' },
    { endpointNumber: 1, direction: 'in' },
  ] as unknown as USBEndpoint[];

  const configuration: USBConfiguration = {
    configurationValue: 1,
    configurationName: null,
    interfaces: [
      {
        interfaceNumber: 0,
        alternate: {
          alternateSetting: 0,
          interfaceClass: 7,
          interfaceSubclass: 1,
          interfaceProtocol: 2,
          interfaceName: null,
          endpoints,
        },
        alternates: [],
        claimed: false,
      },
    ],
  };

  const statusBytes = overrides?.statusBytes ?? new Uint8Array(32);

  const device = {
    vendorId: overrides?.vendorId ?? 0x04f9,
    productId: overrides?.productId ?? 0x209d,
    serialNumber: undefined,
    get opened() {
      return opened;
    },
    configuration,
    open: vi.fn(() => {
      opened = true;
      return Promise.resolve();
    }),
    close: vi.fn(() => {
      opened = false;
      return Promise.resolve();
    }),
    selectConfiguration: vi.fn(() => Promise.resolve()),
    claimInterface: vi.fn(() => Promise.resolve()),
    releaseInterface: vi.fn(() => Promise.resolve()),
    transferOut: vi.fn((endpointNumber: number, data: BufferSource) => {
      const array = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      transfers.push({ endpointNumber, data: Uint8Array.from(array) });
      return Promise.resolve({ bytesWritten: array.byteLength, status: 'ok' as const });
    }),
    transferIn: vi.fn((_endpointNumber: number, length: number) => {
      const out = new Uint8Array(length);
      out.set(statusBytes.subarray(0, length));
      return Promise.resolve({
        data: new DataView(out.buffer),
        status: 'ok' as const,
      });
    }),
    __transfers: transfers,
    __statusBytes: statusBytes,
  } as unknown as MockUSBDevice;

  return device;
}
