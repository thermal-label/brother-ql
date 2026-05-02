import { vi } from 'vitest';

export interface MockUSBDevice extends USBDevice {
  __transfers: { endpointNumber: number; data: Uint8Array }[];
  __statusBytes: Uint8Array;
  /**
   * Inject an unsolicited status frame into the bulk-IN pipe. Used by
   * tests to simulate spontaneous events the printer pushes outside of
   * a getStatus request (lid open/close, media insert, etc.).
   */
  __pushUnsolicited: (frame: Uint8Array) => void;
}

export function createMockUSBDevice(overrides?: {
  vendorId?: number;
  productId?: number;
  /**
   * Response template for ESC iS (`1B 69 53`). Each status request
   * enqueues a copy of this frame — modelling the real printer's
   * "request → one response" cycle. Defaults to a 32-byte zero frame.
   */
  statusBytes?: Uint8Array;
}): MockUSBDevice {
  const transfers: { endpointNumber: number; data: Uint8Array }[] = [];
  let opened = false;
  // Single in-flight pipe queue. Each ESC iS write appends a response
  // copy. Pending readers (calls to `transferIn` made while the queue
  // is empty) park in `waiters` and are resolved as soon as a frame is
  // appended — matching real WebUSB bulk-IN behaviour.
  const frameQueue: Uint8Array[] = [];
  const waiters: ((frame: Uint8Array) => void)[] = [];

  function enqueue(frame: Uint8Array): void {
    const waiter = waiters.shift();
    if (waiter) waiter(frame);
    else frameQueue.push(frame);
  }

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
      // Reject any pending readers with a TransportClosed-shaped error
      // so the read loop can exit cleanly.
      while (waiters.length > 0) {
        const waiter = waiters.shift();
        if (waiter) {
          const err = new Error('Transport closed') as Error & { name: string };
          err.name = 'TransportClosedError';
          // The mock's transferIn signals via the resolved Promise — to
          // surface a rejection, route via the waiter as a thrown call.
          // Using a sentinel "empty" frame works because the read loop
          // checks `transport.connected` which flips to false on close.
          waiter(new Uint8Array(0));
        }
      }
      return Promise.resolve();
    }),
    selectConfiguration: vi.fn(() => Promise.resolve()),
    claimInterface: vi.fn(() => Promise.resolve()),
    releaseInterface: vi.fn(() => Promise.resolve()),
    transferOut: vi.fn((endpointNumber: number, data: BufferSource) => {
      const array = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      transfers.push({ endpointNumber, data: Uint8Array.from(array) });
      // Brother ESC iS = `1B 69 53`. Enqueue a response copy.
      if (array.length >= 3 && array[0] === 0x1b && array[1] === 0x69 && array[2] === 0x53) {
        enqueue(Uint8Array.from(statusBytes));
      }
      return Promise.resolve({ bytesWritten: array.byteLength, status: 'ok' as const });
    }),
    transferIn: vi.fn((_endpointNumber: number, length: number) => {
      // Drain any pre-queued frames first.
      const next = frameQueue.shift();
      if (next) {
        const out = new Uint8Array(length);
        out.set(next.subarray(0, length));
        return Promise.resolve({
          data: new DataView(out.buffer),
          status: 'ok' as const,
        });
      }
      // Park as a waiter; resolve when a future frame is enqueued.
      return new Promise<USBInTransferResult>(resolve => {
        waiters.push(frame => {
          const out = new Uint8Array(length);
          out.set(frame.subarray(0, Math.min(length, frame.length)));
          resolve({
            data: new DataView(out.buffer, 0, frame.length),
            status: 'ok' as const,
          });
        });
      });
    }),
    __transfers: transfers,
    __statusBytes: statusBytes,
    __pushUnsolicited: (frame: Uint8Array): void => {
      enqueue(Uint8Array.from(frame));
    },
  } as unknown as MockUSBDevice;

  return device;
}
