// Two-colour DK-22251 demo label.
//
// Designed as a more typical layout than orientation-test.png to validate
// PackBits compression on a real-world-looking job (red header, black
// body, accent dot). Run:
//
//   node scripts/print-color-label.mjs               # uncompressed
//   node scripts/print-color-label.mjs --compress    # compressed
//   node scripts/print-color-label.mjs --no-print    # save reference PNG only
//
// Saves color-label.png in the project root for screen-vs-tape comparison.

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

const W = 696;
const H = 320;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, W, H);

// Red header band
ctx.fillStyle = '#ff0000';
ctx.fillRect(0, 0, W, 80);

// White title text inside the red band
ctx.fillStyle = 'white';
ctx.font = 'bold 44px Ubuntu';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('SHIPMENT', 30, 40);

// Red label code on the right of the band
ctx.font = 'bold 36px Ubuntu';
ctx.textAlign = 'right';
ctx.fillText('#A-2147', W - 30, 40);

// Black body — name + address style
ctx.fillStyle = 'black';
ctx.font = 'bold 36px Ubuntu';
ctx.textAlign = 'left';
ctx.fillText('Mannes Brak', 30, 130);
ctx.font = '28px Ubuntu';
ctx.fillText('Industrieweg 12', 30, 175);
ctx.fillText('1234 AB Amsterdam', 30, 210);

// Thin black divider
ctx.fillRect(30, 240, W - 60, 3);

// Footer line — small, black
ctx.font = 'italic 22px Ubuntu';
ctx.fillStyle = 'black';
ctx.fillText('Fragile — handle with care', 30, 270);

// Red filled circle accent on the right (priority indicator)
ctx.fillStyle = '#ff0000';
ctx.beginPath();
ctx.arc(W - 60, 265, 22, 0, Math.PI * 2);
ctx.fill();
// White "P" inside the red circle
ctx.fillStyle = 'white';
ctx.font = 'bold 28px Ubuntu';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('P', W - 60, 265);

// Save reference PNG
const pngPath = resolve(projectRoot, 'color-label.png');
writeFileSync(pngPath, canvas.toBuffer('image/png'));
console.log(`Saved reference image: ${pngPath}`);

const id = ctx.getImageData(0, 0, W, H);
const rgba = { width: id.width, height: id.height, data: id.data };

if (process.argv.includes('--no-print')) {
  console.log('Dry run (--no-print): skipping printer.');
  process.exit(0);
}

const compress = process.argv.includes('--compress');
const { black, red } = renderMultiPlaneImage(rgba, { palette: BROTHER_QL_TWO_COLOR_PALETTE });
const page = {
  bitmap: flipHorizontal(black),
  redBitmap: flipHorizontal(red),
  media: MEDIA[251],
  ...(compress ? { options: { compress: true } } : {}),
};
const bytes = encodeJob([page]);
console.log(`Job: ${bytes.length} bytes${compress ? ' (compressed)' : ''}`);

const BROTHER_VID = 0x04f9;
const found = getDeviceList().find(d => d.deviceDescriptor.idVendor === BROTHER_VID);
if (!found) { console.error('No Brother USB device found.'); process.exit(1); }
if (isMassStorageMode(found.deviceDescriptor.idProduct)) {
  console.error('Editor Lite mode — switch out and retry.');
  process.exit(1);
}
const descriptor = findDevice(BROTHER_VID, found.deviceDescriptor.idProduct);

found.open();
if (typeof found.setAutoDetachKernelDriver === 'function') found.setAutoDetachKernelDriver(true);
const iface = found.interface(0);
if (process.platform === 'linux' && iface.isKernelDriverActive()) iface.detachKernelDriver();
for (let i = 0; i < 5; i++) {
  try { iface.claim(); break; }
  catch (e) { if (i === 4) throw e; await new Promise(r => setTimeout(r, 100)); }
}
const outEp = iface.endpoints.find(e => e instanceof OutEndpoint);

console.log('Sending raster to printer…');
await new Promise((res, rej) => outEp.transfer(Buffer.from(bytes), e => e ? rej(e) : res()));
console.log('Done.');

await new Promise(r => setTimeout(r, 200));
await new Promise(res => iface.release(() => { found.close(); res(); }));
