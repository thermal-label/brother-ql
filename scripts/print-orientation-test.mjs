// Orientation test print for Brother QL.
//
// Builds an image where every edge / corner / asymmetry is visually
// distinct, saves it as orientation-test.png in the project root, then
// sends it to the connected printer using the Node driver.
//
// Run: node scripts/print-orientation-test.mjs
//
// What to look for on the printed tape:
//   - Which long edge is RED (intended TOP) vs BLACK (intended BOTTOM)
//   - Which short edge has 'L' vs 'R'
//   - Whether the 'F' reads correctly or is mirrored (⅂)
//   - Which corner has the circle / square / triangle / X
//
// Reference (canvas-coordinate intent, +x right, +y down):
//   TL = circle    TR = square
//   BL = triangle  BR = X
//   top edge       = red bar
//   bottom edge    = black bar
//   left edge text = 'L'
//   right edge text= 'R'
//   center letter  = red 'F'

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const require = createRequire(`${projectRoot}/packages/node/package.json`);
const { createCanvas } = require('@napi-rs/canvas');
const { getDeviceList, InEndpoint, OutEndpoint } = require('usb');

const { BrotherQLPrinter } = await import(`${projectRoot}/packages/node/dist/printer.js`);
const { findDevice, isMassStorageMode } = await import(
  `${projectRoot}/packages/core/dist/devices.js`
);
const { MEDIA } = await import(`${projectRoot}/packages/core/dist/media.js`);
const { BROTHER_QL_TWO_COLOR_PALETTE } = await import(
  `${projectRoot}/packages/core/dist/palette.js`
);
const { encodeJob } = await import(`${projectRoot}/packages/core/dist/protocol.js`);
const { flipHorizontal, renderMultiPlaneImage } = await import(
  `${projectRoot}/packages/node/node_modules/@mbtech-nl/bitmap/dist/index.js`
);

class InlineUsbTransport {
  constructor(device, iface, inEp, outEp) {
    this.device = device;
    this.iface = iface;
    this.inEp = inEp;
    this.outEp = outEp;
    this._connected = true;
  }
  get connected() {
    return this._connected;
  }
  async write(data) {
    await this.outEp.transferAsync(Buffer.from(data));
  }
  async read(length, timeout) {
    this.inEp.timeout = timeout ?? 0;
    const buf = await this.inEp.transferAsync(length);
    return buf ? new Uint8Array(buf) : new Uint8Array(0);
  }
  async close() {
    if (!this._connected) return;
    this._connected = false;
    await this.iface.releaseAsync();
    this.device.close();
  }
  static open(vid, pid) {
    const device = getDeviceList().find(
      d => d.deviceDescriptor.idVendor === vid && d.deviceDescriptor.idProduct === pid,
    );
    if (!device) throw new Error(`USB device ${vid.toString(16)}:${pid.toString(16)} not found`);
    device.open();
    if (process.platform === 'linux' && typeof device.setAutoDetachKernelDriver === 'function') {
      try { device.setAutoDetachKernelDriver(true); } catch { /* not supported, fall back */ }
    }
    const iface = device.interface(0);
    if (process.platform === 'linux' && iface.isKernelDriverActive()) {
      try { iface.detachKernelDriver(); } catch { /* already detached */ }
    }
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      try { iface.claim(); lastErr = undefined; break; }
      catch (e) {
        lastErr = e;
        // BUSY can be transient (kernel re-attaching, prior libusb still releasing).
        // Sleep briefly and retry.
        const wait = 100 * (attempt + 1);
        const end = Date.now() + wait;
        while (Date.now() < end) { /* spin */ }
        if (process.platform === 'linux' && iface.isKernelDriverActive()) {
          try { iface.detachKernelDriver(); } catch { /* ignore */ }
        }
      }
    }
    if (lastErr) throw lastErr;
    const inEp = iface.endpoints.find(e => e instanceof InEndpoint);
    const outEp = iface.endpoints.find(e => e instanceof OutEndpoint);
    if (!inEp || !outEp) throw new Error('USB device missing bulk IN/OUT on interface 0');
    return new InlineUsbTransport(device, iface, inEp, outEp);
  }
}

const WIDTH = 696;
const HEIGHT = 280;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// 4px black border
ctx.strokeStyle = 'black';
ctx.lineWidth = 4;
ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);

// TOP red bar with white "TOP" text
ctx.fillStyle = '#ff0000';
ctx.fillRect(8, 8, WIDTH - 16, 28);
ctx.fillStyle = 'white';
ctx.font = 'bold 22px Ubuntu';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('TOP  (red plane)', WIDTH / 2, 22);

// BOTTOM black bar with white "BOTTOM" text
ctx.fillStyle = 'black';
ctx.fillRect(8, HEIGHT - 36, WIDTH - 16, 28);
ctx.fillStyle = 'white';
ctx.fillText('BOTTOM  (black plane)', WIDTH / 2, HEIGHT - 22);

// Big red asymmetric "F" in the center — detects mirroring
ctx.fillStyle = '#ff0000';
ctx.font = 'bold 170px Ubuntu';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('F', WIDTH / 2, HEIGHT / 2 + 8);

// Big black "L" near left edge
ctx.fillStyle = 'black';
ctx.font = 'bold 110px Ubuntu';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('L', 30, HEIGHT / 2 + 10);

// Big black "R" near right edge
ctx.textAlign = 'right';
ctx.fillText('R', WIDTH - 30, HEIGHT / 2 + 10);

// Corner markers (each 36×36, inset 14 from inner border)
const cs = 36;
const inset = 14;
ctx.fillStyle = 'black';

// TL: filled circle
ctx.beginPath();
ctx.arc(inset + cs / 2, 8 + 28 + inset + cs / 2, cs / 2, 0, Math.PI * 2);
ctx.fill();

// TR: filled square
ctx.fillRect(WIDTH - inset - cs, 8 + 28 + inset, cs, cs);

// BL: filled triangle pointing up
const blX = inset;
const blY = HEIGHT - 36 - inset - cs;
ctx.beginPath();
ctx.moveTo(blX + cs / 2, blY);
ctx.lineTo(blX, blY + cs);
ctx.lineTo(blX + cs, blY + cs);
ctx.closePath();
ctx.fill();

// BR: "X" of two crossed lines
ctx.lineWidth = 6;
ctx.strokeStyle = 'black';
const brX = WIDTH - inset - cs;
const brY = HEIGHT - 36 - inset - cs;
ctx.beginPath();
ctx.moveTo(brX, brY);
ctx.lineTo(brX + cs, brY + cs);
ctx.moveTo(brX + cs, brY);
ctx.lineTo(brX, brY + cs);
ctx.stroke();

// Save reference PNG
const pngPath = resolve(projectRoot, 'orientation-test.png');
writeFileSync(pngPath, canvas.toBuffer('image/png'));
console.log(`Saved reference image: ${pngPath}`);

// Hand the raw RGBA buffer to the driver
const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
let rgba = {
  width: imageData.width,
  height: imageData.height,
  data: imageData.data,
};

// Optional pre-flip to compensate for printer head pin orientation.
// Pass --mirror to horizontally flip the RGBA before sending.
if (process.argv.includes('--mirror')) {
  const w = rgba.width, h = rgba.height;
  const src = rgba.data;
  const dst = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sIdx = (y * w + x) * 4;
      const dIdx = (y * w + (w - 1 - x)) * 4;
      dst[dIdx] = src[sIdx];
      dst[dIdx + 1] = src[sIdx + 1];
      dst[dIdx + 2] = src[sIdx + 2];
      dst[dIdx + 3] = src[sIdx + 3];
    }
  }
  rgba = { width: w, height: h, data: dst };
  console.log('Applied --mirror (horizontal flip on RGBA).');
}

// --debug-planes: dump the post-split black and red 1-bpp planes as PNGs
// so we can verify whether the bitmap handed to the wire is actually solid
// in the regions we care about. White = bit unset, dark colour = bit set.
if (process.argv.includes('--debug-planes')) {
  const { black, red } = renderMultiPlaneImage(rgba, { palette: BROTHER_QL_TWO_COLOR_PALETTE });
  const renderPlane = (plane, ink) => {
    const c = createCanvas(plane.widthPx, plane.heightPx);
    const cx = c.getContext('2d');
    cx.fillStyle = 'white';
    cx.fillRect(0, 0, plane.widthPx, plane.heightPx);
    const id = cx.getImageData(0, 0, plane.widthPx, plane.heightPx);
    const rowBytes = Math.ceil(plane.widthPx / 8);
    for (let y = 0; y < plane.heightPx; y++) {
      for (let x = 0; x < plane.widthPx; x++) {
        const byte = plane.data[y * rowBytes + (x >> 3)];
        const bit = (byte >> (7 - (x & 7))) & 1;
        if (bit) {
          const idx = (y * plane.widthPx + x) * 4;
          id.data[idx] = ink[0];
          id.data[idx + 1] = ink[1];
          id.data[idx + 2] = ink[2];
          id.data[idx + 3] = 255;
        }
      }
    }
    cx.putImageData(id, 0, 0);
    return c.toBuffer('image/png');
  };
  const blackPath = resolve(projectRoot, 'orientation-test-black-plane.png');
  const redPath = resolve(projectRoot, 'orientation-test-red-plane.png');
  writeFileSync(blackPath, renderPlane(black, [0, 0, 0]));
  writeFileSync(redPath, renderPlane(red, [220, 0, 0]));
  // Coverage of the red top bar (canvas y 8..36, x 8..688 inclusive)
  const rowBytesRed = Math.ceil(red.widthPx / 8);
  let total = 0,
    set = 0;
  for (let y = 8; y < 36; y++) {
    for (let x = 8; x < 688; x++) {
      total++;
      const bit = (red.data[y * rowBytesRed + (x >> 3)] >> (7 - (x & 7))) & 1;
      if (bit) set++;
    }
  }
  console.log(`Red bar bitmap coverage: ${set}/${total} = ${((set / total) * 100).toFixed(1)}%`);
  console.log(`Wrote ${blackPath} and ${redPath}`);
}

if (process.argv.includes('--no-print')) {
  console.log('Dry run (--no-print): skipping printer.');
  process.exit(0);
}

const BROTHER_VID = 0x04f9;
const found = getDeviceList().find(d => d.deviceDescriptor.idVendor === BROTHER_VID);
if (!found) {
  console.error('No Brother USB device found.');
  process.exit(1);
}
const pid = found.deviceDescriptor.idProduct;
if (isMassStorageMode(pid)) {
  console.error(
    `Printer is in Editor Lite (mass storage) mode (PID 0x${pid.toString(16)}). ` +
      'Hold the Editor Lite button until the LED turns off and retry.',
  );
  process.exit(1);
}
const descriptor = findDevice(BROTHER_VID, pid);
if (!descriptor) {
  console.error(`Unsupported Brother PID 0x${pid.toString(16)}.`);
  process.exit(1);
}
const transport = InlineUsbTransport.open(BROTHER_VID, pid);
const printer = new BrotherQLPrinter(descriptor, transport, 'usb');
console.log(`Opened printer: ${printer.model}  (transport: ${printer.transportType})`);

// Optional status check — pass --status to query first. Skipped by default
// because the printer occasionally stalls on status after a prior print job
// and we're forcing media id 251 anyway, so detection is not needed.
if (process.argv.includes('--status')) {
  const status = await printer.getStatus();
  console.log(
    `Status — detected media: ${status.detectedMedia?.name ?? 'unknown'}` +
      `  editorLite: ${status.editorLiteMode}` +
      `  errors: ${status.errors?.join(', ') || 'none'}`,
  );
  if (status.editorLiteMode) {
    console.error('Printer is in Editor Lite mode — hold the Editor Lite button until the LED turns off, then retry.');
    await printer.close();
    process.exit(1);
  }
}

// Force DK-22251 (two-colour 62 mm) regardless of what the printer reported.
// Status-reported media id is unreliable on this unit; we know physically
// DK-22251 is loaded. Sharing the 62 mm geometry means no 'wrong paper' error.
const forcedMedia = MEDIA[251];
console.log(`Forcing media: ${forcedMedia.name} (id ${forcedMedia.id}) — colorCapable=${forcedMedia.colorCapable}`);

const highRes = process.argv.includes('--high-res');
const compress = process.argv.includes('--compress');

if (highRes || compress) {
  // PageOptions (highResolution / compress) aren't surfaced through
  // printer.print(), so bypass the adapter and encode manually. Chunked
  // writes are still done here so this path matches driver behaviour.
  const { black, red } = renderMultiPlaneImage(rgba, { palette: BROTHER_QL_TWO_COLOR_PALETTE });
  const pageOptions = {
    ...(highRes ? { highResolution: true } : {}),
    ...(compress ? { compress: true } : {}),
  };
  const page = {
    bitmap: flipHorizontal(black),
    redBitmap: flipHorizontal(red),
    media: forcedMedia,
    options: pageOptions,
  };
  const bytes = encodeJob([page]);
  const flags = [highRes && 'high-res', compress && 'compressed'].filter(Boolean).join(', ');
  console.log(`Job: ${bytes.length} bytes (${flags}) — chunked write`);
  for (let off = 0; off < bytes.length; off += 1024) {
    const slice = bytes.subarray(off, Math.min(off + 1024, bytes.length));
    await transport.write(slice);
    if (off + 1024 < bytes.length) await new Promise(r => setTimeout(r, 20));
  }
} else {
  // Default path: route through the driver so we exercise the same code
  // production callers do.
  await printer.print(rgba, forcedMedia);
}
console.log('Done — printer should advance and cut.');

await printer.close();
