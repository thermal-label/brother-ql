import {
  DEFAULT_MEDIA,
  ROTATE_DIRECTION,
  STATUS_REQUEST,
  createPreviewOffline,
  encodeJobForEngine,
  flipHorizontal,
  hasTwoColourSibling,
  parseStatus,
  pickRotation,
  renderImage,
  renderMultiPlaneImage,
  statusFromPrinterMib,
} from '@thermal-label/brother-ql-core';
import type {
  BrotherQLDevice,
  BrotherQLMedia,
  BrotherQLPrintOptions,
  BrotherQLStatus,
  LabelBitmap,
  MediaDescriptor,
  PageData,
  PreviewOptions,
  PreviewResult,
  PrinterAdapter,
  RawImageData,
  Transport,
  TransportType,
} from '@thermal-label/brother-ql-core';
import {
  MediaNotSpecifiedError,
  TransportTimeoutError,
  WriteSerializer,
} from '@thermal-label/contracts';
import { PRINTER_MIB, snmpGet, type SnmpValue } from '@thermal-label/transport/node';

const STATUS_BYTE_COUNT = 32;
const STATUS_POLL_INTERVAL_MS = 150;
const STATUS_POLL_ATTEMPTS = 10;

// TCP print confirmation (plan 17 D5): port 9100 never answers, so the
// only proof a job ran is `prtMarkerLifeCount` moving. A label takes
// ~2 s; keep waiting while the agent says "printing".
const CONFIRM_POLL_INTERVAL_MS = 500;
const CONFIRM_IDLE_BUDGET_MS = 10_000;
const CONFIRM_MAX_WAIT_MS = 60_000;
const HR_PRINTER_STATUS_PRINTING = 4;

const STATUS_OIDS = [
  PRINTER_MIB.hrPrinterStatus,
  PRINTER_MIB.hrPrinterDetectedErrorState,
  PRINTER_MIB.prtInputMediaName,
  PRINTER_MIB.prtInputDimUnit,
  PRINTER_MIB.prtInputMediaDimFeedDir,
  PRINTER_MIB.prtInputMediaDimXFeedDir,
] as const;

/**
 * Where the SNMP side channel of a `'tcp'` printer lives. Status and
 * print confirmation go there; the 9100 socket only ever receives.
 */
export interface BrotherQLNetworkOptions {
  host: string;
  /** SNMP community. Default `'public'`. */
  community?: string;
}

export interface BrotherQLNodePrintOptions extends BrotherQLPrintOptions {
  /**
   * TCP only: after sending, wait for `prtMarkerLifeCount` to move and
   * reject when it does not. Default `true`. Pass `false` when the
   * printer has SNMP disabled; the job is then sent blind.
   */
  confirm?: boolean;
}

function integerValue(value: SnmpValue | undefined): number | undefined {
  return value?.type === 'integer' ? value.value : undefined;
}

function stringValue(value: SnmpValue | undefined): string | undefined {
  return value?.type === 'string' ? value.value : undefined;
}

function rawValue(value: SnmpValue | undefined): Uint8Array | undefined {
  return value?.type === 'string' || value?.type === 'octets' ? value.raw : undefined;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// Empirical: a single libusb bulk transfer of an entire raster job (~50 kB
// uncompressed two-colour at 280 rows) reliably hangs the QL-820NWBc
// firmware mid-print. Chunking the OUT pipe to ~1 kB with a 20 ms gap
// keeps the printer's input ring buffer drained at roughly its raster
// processing rate (~175 bytes/ms at 80 mm/s feed). Adds about 1 s to a
// 50 kB job, which is negligible compared to physical print time.
//
// Python `brother_ql` users hit this less often because the typical CLI
// path writes through `/dev/usb/lpN` where the kernel's usblp driver
// provides flow control; libusb bypasses that.
const USB_CHUNK_SIZE = 1024;
const USB_CHUNK_DELAY_MS = 20;

/**
 * Node.js driver for Brother QL label printers.
 *
 * Implements `PrinterAdapter`. Callers get a printer instance from
 * `discovery.openPrinter()` (USB or TCP) and interact solely through
 * the adapter surface: `print(rgba, media?, options?)`, `createPreview`,
 * `getStatus`, `close`.
 *
 * Multi-ink media (DK-22251) is handled transparently — when the
 * resolved media carries a `palette`, the driver runs the bitmap
 * library's `renderMultiPlaneImage()` internally before encoding.
 *
 * Orientation is auto-decided via `pickRotation`: landscape input on
 * media tagged `defaultOrientation: 'horizontal'` rotates 90° CW so
 * the visual reads along the tape feed direction. Override per-call
 * with `options.rotate`.
 */
export class BrotherQLPrinter implements PrinterAdapter {
  readonly family = 'brother-ql' as const;
  readonly device: BrotherQLDevice;
  readonly transportType: TransportType;

  private readonly transport: Transport;
  private readonly network: BrotherQLNetworkOptions | undefined;
  private lastStatus: BrotherQLStatus | undefined;
  /**
   * Serialises every bulk-OUT operation (print + getStatus) so a
   * `getStatus()` write can't interleave into an in-flight print()'s
   * raster stream. The node driver ships no `onStatus` poll today
   * (plan 14 F1), so there's no concurrent poll to collide with — but
   * any consumer calling `getStatus()` during `print()` hits the same
   * hazard the web driver guards against. Adopting the shared
   * `WriteSerializer` (plan 15 A4) closes that latent drift and keeps
   * all four drivers identical. See `@thermal-label/contracts`.
   */
  private readonly serializer = new WriteSerializer();

  constructor(
    device: BrotherQLDevice,
    transport: Transport,
    transportType: TransportType,
    network?: BrotherQLNetworkOptions,
  ) {
    this.device = device;
    this.transport = transport;
    this.transportType = transportType;
    this.network = network;
  }

  get model(): string {
    return this.device.name;
  }

  get connected(): boolean {
    return this.transport.connected;
  }

  async print(
    image: RawImageData,
    media?: MediaDescriptor,
    options?: BrotherQLNodePrintOptions,
  ): Promise<void> {
    const resolvedMedia = (media ?? this.lastStatus?.detectedMedia) as BrotherQLMedia | undefined;
    if (!resolvedMedia) {
      throw new MediaNotSpecifiedError();
    }

    const rotate = pickRotation(image, resolvedMedia, ROTATE_DIRECTION, options?.rotate);

    // Brother QL print head: pin 0 (the first pin in each raster row) sits
    // on the right side of the printed face when the leading edge is held
    // up. Mirror the rendered bitmap so the input image's x-axis matches
    // the printed x-axis. Verified on QL-820NWBc + DK-22251.
    const pageOptions = options?.highRes === true ? { highResolution: true } : undefined;

    let page: PageData;
    if (resolvedMedia.palette) {
      const { black, red } = renderMultiPlaneImage(image, {
        palette: resolvedMedia.palette,
        rotate,
      }) as Record<'black' | 'red', LabelBitmap>;
      page = {
        bitmap: flipHorizontal(black),
        redBitmap: flipHorizontal(red),
        media: resolvedMedia,
        ...(pageOptions ? { options: pageOptions } : {}),
      };
    } else {
      const bitmap = flipHorizontal(renderImage(image, { dither: true, rotate }));
      page = {
        bitmap,
        media: resolvedMedia,
        ...(pageOptions ? { options: pageOptions } : {}),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- every brother-ql device has at least one engine (data invariant)
    const engine = this.device.engines[0]!;
    const bytes = encodeJobForEngine([page], {}, engine, this.device.name);
    if (this.transportType === 'tcp' && options?.confirm !== false) {
      await this.serializer.run(() => this.writeConfirmed(bytes, resolvedMedia));
      return;
    }
    await this.serializer.run(() => this.writeChunked(bytes));
  }

  /**
   * Send the job and wait for the page counter to move. Reads the
   * counter first: when SNMP is unreachable nothing is sent, and the
   * caller gets told to pass `confirm: false` rather than a job that
   * silently went nowhere.
   */
  private async writeConfirmed(bytes: Uint8Array, media: BrotherQLMedia): Promise<void> {
    const net = this.requireNetwork();
    let before: number;
    try {
      before = await this.readCounter(net);
    } catch (err) {
      throw new Error(
        `Cannot confirm prints on ${net.host}: SNMP prtMarkerLifeCount unreadable (${errorMessage(err)}). Pass confirm: false to send the job blind.`,
        { cause: err },
      );
    }

    await this.writeChunked(bytes);

    const started = Date.now();
    for (;;) {
      await sleep(CONFIRM_POLL_INTERVAL_MS);
      let answers: Record<string, SnmpValue>;
      try {
        answers = await snmpGet(
          net.host,
          [PRINTER_MIB.prtMarkerLifeCount, PRINTER_MIB.hrPrinterStatus],
          { community: net.community ?? 'public' },
        );
      } catch (err) {
        throw new Error(
          `Job sent to ${net.host} but could not be confirmed: SNMP stopped answering (${errorMessage(err)}).`,
          { cause: err },
        );
      }
      const count = integerValue(answers[PRINTER_MIB.prtMarkerLifeCount]);
      if (count !== undefined && count !== before) return;
      const elapsed = Date.now() - started;
      const printing =
        integerValue(answers[PRINTER_MIB.hrPrinterStatus]) === HR_PRINTER_STATUS_PRINTING;
      if (elapsed >= CONFIRM_MAX_WAIT_MS || (elapsed >= CONFIRM_IDLE_BUDGET_MS && !printing)) {
        throw new Error(notPrintedMessage(net.host, media, elapsed));
      }
    }
  }

  private async readCounter(net: BrotherQLNetworkOptions): Promise<number> {
    const answers = await snmpGet(net.host, [PRINTER_MIB.prtMarkerLifeCount], {
      community: net.community ?? 'public',
    });
    const count = integerValue(answers[PRINTER_MIB.prtMarkerLifeCount]);
    if (count === undefined) throw new Error('agent has no prtMarkerLifeCount');
    return count;
  }

  private requireNetwork(): BrotherQLNetworkOptions {
    if (this.network) return this.network;
    throw new Error(
      'This TCP printer was constructed without its host; SNMP status and print confirmation need it.',
    );
  }

  private async writeChunked(bytes: Uint8Array): Promise<void> {
    for (let off = 0; off < bytes.length; off += USB_CHUNK_SIZE) {
      const end = Math.min(off + USB_CHUNK_SIZE, bytes.length);
      await this.transport.write(bytes.subarray(off, end));
      if (end < bytes.length) {
        await sleep(USB_CHUNK_DELAY_MS);
      }
    }
  }

  createPreview(image: RawImageData, options?: PreviewOptions): Promise<PreviewResult> {
    const override = options?.media as BrotherQLMedia | undefined;
    const detected = this.lastStatus?.detectedMedia as BrotherQLMedia | undefined;
    if (override) return Promise.resolve(createPreviewOffline(image, override));
    if (detected) return Promise.resolve(createPreviewOffline(image, detected));
    return Promise.resolve({
      ...createPreviewOffline(image, DEFAULT_MEDIA),
      assumed: true,
    });
  }

  /**
   * USB / serial: poll the status endpoint until 32 bytes are available.
   * The USB `transferAsync()` call resolves immediately with 0 bytes if
   * the printer hasn't queued a response yet; a transport that blocks
   * instead is bounded by the read timeout. `STATUS_POLL_ATTEMPTS`
   * rounds of `STATUS_POLL_INTERVAL_MS` either way.
   *
   * TCP: port 9100 never answers, so the status comes from the
   * printer's SNMP agent and the socket is not touched.
   */
  getStatus(): Promise<BrotherQLStatus> {
    if (this.transportType === 'tcp') return this.getNetworkStatus();
    // Serialised against `print()` so the status request + poll-read
    // round-trip can't interleave into an in-flight raster stream.
    return this.serializer.run(async () => {
      await this.transport.write(STATUS_REQUEST);
      for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt++) {
        const started = Date.now();
        const bytes = await this.transport
          .read(STATUS_BYTE_COUNT, STATUS_POLL_INTERVAL_MS)
          .catch((err: unknown) => {
            if (err instanceof TransportTimeoutError) return new Uint8Array(0);
            throw err;
          });
        if (bytes.length >= STATUS_BYTE_COUNT) {
          const status = parseStatus(bytes, this.device.engines[0]);
          this.lastStatus = status;
          return status;
        }
        const remaining = STATUS_POLL_INTERVAL_MS - (Date.now() - started);
        if (remaining > 0) await sleep(remaining);
      }
      throw new Error('Printer did not respond to status request within 1.5s');
    });
  }

  private async getNetworkStatus(): Promise<BrotherQLStatus> {
    const net = this.requireNetwork();
    let answers: Record<string, SnmpValue>;
    try {
      answers = await snmpGet(net.host, STATUS_OIDS, { community: net.community ?? 'public' });
    } catch (err) {
      throw new Error(
        `Could not read status from ${net.host} over SNMP (${errorMessage(err)}); port 9100 carries no status. Pass media explicitly.`,
        { cause: err },
      );
    }
    const feedDir = integerValue(answers[PRINTER_MIB.prtInputMediaDimFeedDir]);
    const xFeedDir = integerValue(answers[PRINTER_MIB.prtInputMediaDimXFeedDir]);
    const dimUnit = integerValue(answers[PRINTER_MIB.prtInputDimUnit]);
    const status = statusFromPrinterMib(
      {
        printerStatus: integerValue(answers[PRINTER_MIB.hrPrinterStatus]) ?? 2,
        errorState: rawValue(answers[PRINTER_MIB.hrPrinterDetectedErrorState]) ?? new Uint8Array(0),
        mediaName: stringValue(answers[PRINTER_MIB.prtInputMediaName]) ?? '',
        ...(feedDir === undefined ? {} : { feedDir }),
        ...(xFeedDir === undefined ? {} : { xFeedDir }),
        ...(dimUnit === undefined ? {} : { dimUnit }),
      },
      this.device.engines[0],
    );
    this.lastStatus = status;
    return status;
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

function notPrintedMessage(host: string, media: BrotherQLMedia, elapsedMs: number): string {
  const seconds = (elapsedMs / 1000).toFixed(0);
  const hint = hasTwoColourSibling(media)
    ? ` ${String(media.widthMm)} mm rolls come in a two-colour variant that is invisible over the network and rejects single-colour jobs; on such a roll pass its media (DK-22251 = id 251).`
    : '';
  return `Job sent to ${host} but the page counter did not move in ${seconds} s: the printer did not print it.${hint}`;
}
