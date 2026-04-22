import net from 'node:net';
import usb from 'usb';

export interface Transport {
  write(data: Uint8Array): Promise<void>;
  read(byteCount: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export class UsbTransport implements Transport {
  private readonly outEndpoint: usb.OutEndpoint;
  private readonly inEndpoint: usb.InEndpoint;
  private readonly iface: usb.Interface;
  private readonly device: usb.Device;

  constructor(device: usb.Device) {
    this.device = device;
    device.open();
    const iface = device.interface(0);
    // On Linux the usblp kernel driver claims printer-class interfaces
    // automatically — detach it before claiming with libusb.
    if (process.platform === 'linux' && iface.isKernelDriverActive()) {
      iface.detachKernelDriver();
    }
    iface.claim();
    this.iface = iface;

    const outEp = iface.endpoints.find((e): e is usb.OutEndpoint => e.direction === 'out');
    const inEp = iface.endpoints.find((e): e is usb.InEndpoint => e.direction === 'in');

    if (!outEp) throw new Error('USB device has no bulk OUT endpoint');
    if (!inEp) throw new Error('USB device has no bulk IN endpoint');

    this.outEndpoint = outEp;
    this.inEndpoint = inEp;
  }

  static open(vid: number, pid: number): Promise<UsbTransport> {
    const device = usb
      .getDeviceList()
      .find(d => d.deviceDescriptor.idVendor === vid && d.deviceDescriptor.idProduct === pid);
    if (!device)
      return Promise.reject(
        new Error(`USB device ${vid.toString(16)}:${pid.toString(16)} not found`),
      );
    return Promise.resolve(new UsbTransport(device));
  }

  async write(data: Uint8Array): Promise<void> {
    await this.outEndpoint.transferAsync(Buffer.from(data));
  }

  async read(byteCount: number): Promise<Uint8Array> {
    const buf = await this.inEndpoint.transferAsync(byteCount);
    return buf ? new Uint8Array(buf) : new Uint8Array(0);
  }

  async close(): Promise<void> {
    await this.iface.releaseAsync();
    this.device.close();
  }
}

export class TcpTransport implements Transport {
  private readonly socket: net.Socket;
  private readonly chunks: Buffer[] = [];
  private resolveRead: ((buf: Uint8Array) => void) | null = null;
  private needed = 0;

  constructor(socket: net.Socket) {
    this.socket = socket;
    socket.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.tryResolveRead();
    });
  }

  static async connect(host: string, port = 9100): Promise<TcpTransport> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.once('error', reject);
      socket.connect(port, host, () => {
        socket.removeListener('error', reject);
        resolve(new TcpTransport(socket));
      });
    });
  }

  private buffered(): number {
    return this.chunks.reduce((sum, c) => sum + c.length, 0);
  }

  private tryResolveRead(): void {
    if (this.resolveRead && this.buffered() >= this.needed) {
      const combined = Buffer.concat(this.chunks);
      this.chunks.length = 0;
      const result = combined.subarray(0, this.needed);
      const remainder = combined.subarray(this.needed);
      if (remainder.length > 0) this.chunks.push(Buffer.from(remainder));
      const resolve = this.resolveRead;
      this.resolveRead = null;
      this.needed = 0;
      resolve(new Uint8Array(result));
    }
  }

  async write(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(Buffer.from(data), err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async read(byteCount: number): Promise<Uint8Array> {
    if (this.buffered() >= byteCount) {
      const combined = Buffer.concat(this.chunks);
      this.chunks.length = 0;
      const result = combined.subarray(0, byteCount);
      const remainder = combined.subarray(byteCount);
      if (remainder.length > 0) this.chunks.push(Buffer.from(remainder));
      return new Uint8Array(result);
    }
    return new Promise(resolve => {
      this.resolveRead = resolve;
      this.needed = byteCount;
    });
  }

  async close(): Promise<void> {
    return new Promise(resolve => {
      this.socket.end(() => {
        resolve();
      });
    });
  }
}
