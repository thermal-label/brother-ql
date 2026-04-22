import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

class MockSocket extends EventEmitter {
  write = vi.fn((_data: unknown, cb?: (err?: Error) => void) => {
    cb?.();
    return true;
  });
  override removeListener = vi.fn();
  override once = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    super.once(event, handler);
    return this;
  });
  override on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    super.on(event, handler);
    return this;
  });
  end = vi.fn((cb?: () => void) => { cb?.(); });
  connect = vi.fn((_port: number, _host: string, cb: () => void) => { process.nextTick(cb); });
}

const mockSocket = new MockSocket();

vi.mock('node:net', () => ({
  default: {
    Socket: vi.fn(() => mockSocket),
  },
}));

beforeEach(() => {
  mockSocket.write.mockReset().mockImplementation((_data: unknown, cb?: (err?: Error) => void) => {
    cb?.();
    return true;
  });
  mockSocket.end.mockReset().mockImplementation((cb?: () => void) => { cb?.(); });
  mockSocket.connect.mockReset().mockImplementation((_port: number, _host: string, cb: () => void) => {
    process.nextTick(cb);
  });
  mockSocket.removeAllListeners();
});

describe('TcpTransport', () => {
  it('write calls socket.write with correct data', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    const data = new Uint8Array([0x1b, 0x40]);
    await transport.write(data);
    expect(mockSocket.write).toHaveBeenCalledOnce();
    const calledWith = mockSocket.write.mock.calls[0]![0] as Buffer;
    expect(calledWith[0]).toBe(0x1b);
    expect(calledWith[1]).toBe(0x40);
    await transport.close();
  });

  it('read waits for N bytes from the stream', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);

    const readPromise = transport.read(4);
    mockSocket.emit('data', Buffer.from([0x01, 0x02, 0x03, 0x04]));
    const result = await readPromise;
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(0x01);
    await transport.close();
  });

  it('close ends the socket', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    await transport.close();
    expect(mockSocket.end).toHaveBeenCalledOnce();
  });
});
