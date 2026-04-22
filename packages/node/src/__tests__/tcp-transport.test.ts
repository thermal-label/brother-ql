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
  end = vi.fn((cb?: () => void) => {
    cb?.();
  });
  connect = vi.fn((_port: number, _host: string, cb: () => void) => {
    process.nextTick(cb);
  });
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
  mockSocket.end.mockReset().mockImplementation((cb?: () => void) => {
    cb?.();
  });
  mockSocket.connect
    .mockReset()
    .mockImplementation((_port: number, _host: string, cb: () => void) => {
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

  it('read returns immediately when data is already buffered', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    mockSocket.emit('data', Buffer.from([0x01, 0x02, 0x03, 0x04]));
    const result = await transport.read(4);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(0x01);
    await transport.close();
  });

  it('read keeps remainder bytes when more data is buffered than needed', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    mockSocket.emit('data', Buffer.from([0x0a, 0x0b, 0x0c, 0x0d, 0x0e]));
    const first = await transport.read(4);
    expect(first).toHaveLength(4);
    expect(first[3]).toBe(0x0d);
    const second = await transport.read(1);
    expect(second[0]).toBe(0x0e);
    await transport.close();
  });

  it('deferred read keeps remainder when more data arrives than needed', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    const readPromise = transport.read(4);
    mockSocket.emit('data', Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]));
    const result = await readPromise;
    expect(result).toHaveLength(4);
    const remainder = await transport.read(1);
    expect(remainder[0]).toBe(0x05);
    await transport.close();
  });

  it('write rejects when socket write fails', async () => {
    const { TcpTransport } = await import('../transport.js');
    const transport = await TcpTransport.connect('192.168.1.1', 9100);
    mockSocket.write.mockImplementationOnce((_data: unknown, cb?: (err?: Error) => void) => {
      cb?.(new Error('socket write error'));
      return true;
    });
    await expect(transport.write(new Uint8Array([0x01]))).rejects.toThrow('socket write error');
    await transport.close();
  });
});
