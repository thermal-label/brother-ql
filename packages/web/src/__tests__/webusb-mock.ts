import { vi } from 'vitest';

export interface MockUSBDeviceSpies {
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  selectConfiguration: ReturnType<typeof vi.fn>;
  claimInterface: ReturnType<typeof vi.fn>;
  releaseInterface: ReturnType<typeof vi.fn>;
  transferOut: ReturnType<typeof vi.fn>;
  transferIn: ReturnType<typeof vi.fn>;
}

export interface MockUSBDevice {
  device: USBDevice;
  spies: MockUSBDeviceSpies;
}

export function createMockUSBDevice(overrides?: {
  vendorId?: number;
  productId?: number;
  serialNumber?: string;
  statusBytes?: Uint8Array;
}): MockUSBDevice {
  const spies: MockUSBDeviceSpies = {
    open: vi.fn().mockImplementation(() => Promise.resolve()),
    close: vi.fn().mockImplementation(() => Promise.resolve()),
    selectConfiguration: vi.fn().mockImplementation(() => Promise.resolve()),
    claimInterface: vi.fn().mockImplementation(() => Promise.resolve()),
    releaseInterface: vi.fn().mockImplementation(() => Promise.resolve()),
    transferOut: vi
      .fn()
      .mockImplementation(() => Promise.resolve({ bytesWritten: 0, status: 'ok' })),
    transferIn: vi.fn().mockImplementation(() =>
      Promise.resolve({
        status: 'ok',
        data: new DataView((overrides?.statusBytes ?? new Uint8Array(32)).buffer),
      }),
    ),
  };

  let opened = false;
  spies.open.mockImplementation(() => {
    opened = true;
    return Promise.resolve();
  });
  spies.close.mockImplementation(() => {
    opened = false;
    return Promise.resolve();
  });

  const device = {
    vendorId: overrides?.vendorId ?? 0x04f9,
    productId: overrides?.productId ?? 0x20a7,
    serialNumber: overrides?.serialNumber,
    configuration: { interfaces: [{ interfaceNumber: 0, claimed: false }] },
    get opened() {
      return opened;
    },
    open: spies.open,
    close: spies.close,
    selectConfiguration: spies.selectConfiguration,
    claimInterface: spies.claimInterface,
    releaseInterface: spies.releaseInterface,
    transferOut: spies.transferOut,
    transferIn: spies.transferIn,
  } as unknown as USBDevice;

  return { device, spies };
}
