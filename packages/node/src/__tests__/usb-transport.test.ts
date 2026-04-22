import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOutTransfer = vi.fn().mockResolvedValue(90);
const mockInTransfer = vi.fn().mockResolvedValue(Buffer.alloc(32));
const mockClaim = vi.fn();
const mockReleaseAsync = vi.fn().mockImplementation(() => Promise.resolve());
const mockClose = vi.fn();
const mockOpen = vi.fn();
const mockInterface = vi.fn();

vi.mock('usb', () => ({
  default: {
    getDeviceList: vi.fn(() => [
      {
        deviceDescriptor: { idVendor: 0x04f9, idProduct: 0x20a7 },
        busNumber: 1,
        deviceAddress: 5,
        open: mockOpen,
        close: mockClose,
        interface: mockInterface,
      },
    ]),
  },
}));

beforeEach(() => {
  mockOpen.mockReset();
  mockClose.mockReset();
  mockClaim.mockReset();
  mockReleaseAsync.mockReset().mockImplementation(() => Promise.resolve());
  mockOutTransfer.mockReset().mockResolvedValue(90);
  mockInTransfer.mockReset().mockResolvedValue(Buffer.alloc(32));
  mockInterface.mockReset().mockReturnValue({
    claim: mockClaim,
    releaseAsync: mockReleaseAsync,
    endpoints: [
      { direction: 'out', transferAsync: mockOutTransfer },
      { direction: 'in', transferAsync: mockInTransfer },
    ],
  });
});

describe('UsbTransport', () => {
  it('write calls the out endpoint transferAsync with correct buffer', async () => {
    const { UsbTransport } = await import('../transport.js');
    const transport = await UsbTransport.open(0x04f9, 0x20a7);
    const data = new Uint8Array([0x1b, 0x40]);
    await transport.write(data);
    expect(mockOutTransfer).toHaveBeenCalledOnce();
    const calledWith = mockOutTransfer.mock.calls[0]![0] as Buffer;
    expect(calledWith[0]).toBe(0x1b);
    expect(calledWith[1]).toBe(0x40);
    await transport.close();
  });

  it('read calls the in endpoint transferAsync with correct byte count', async () => {
    const { UsbTransport } = await import('../transport.js');
    const transport = await UsbTransport.open(0x04f9, 0x20a7);
    await transport.read(32);
    expect(mockInTransfer).toHaveBeenCalledWith(32);
    await transport.close();
  });

  it('throws when device not found', async () => {
    const { UsbTransport } = await import('../transport.js');
    await expect(UsbTransport.open(0x04f9, 0x9999)).rejects.toThrow('not found');
  });

  it('close releases interface and closes device', async () => {
    const { UsbTransport } = await import('../transport.js');
    const transport = await UsbTransport.open(0x04f9, 0x20a7);
    await transport.close();
    expect(mockReleaseAsync).toHaveBeenCalledOnce();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('read returns empty array when transferAsync returns null', async () => {
    mockInTransfer.mockResolvedValueOnce(null);
    const { UsbTransport } = await import('../transport.js');
    const transport = await UsbTransport.open(0x04f9, 0x20a7);
    const result = await transport.read(32);
    expect(result).toHaveLength(0);
    await transport.close();
  });

  it('throws when USB device has no OUT endpoint', async () => {
    mockInterface.mockReturnValueOnce({
      claim: mockClaim,
      releaseAsync: mockReleaseAsync,
      endpoints: [{ direction: 'in', transferAsync: mockInTransfer }],
    });
    const { UsbTransport } = await import('../transport.js');
    expect(() => UsbTransport.open(0x04f9, 0x20a7)).toThrow('no bulk OUT endpoint');
  });

  it('throws when USB device has no IN endpoint', async () => {
    mockInterface.mockReturnValueOnce({
      claim: mockClaim,
      releaseAsync: mockReleaseAsync,
      endpoints: [{ direction: 'out', transferAsync: mockOutTransfer }],
    });
    const { UsbTransport } = await import('../transport.js');
    expect(() => UsbTransport.open(0x04f9, 0x20a7)).toThrow('no bulk IN endpoint');
  });
});
