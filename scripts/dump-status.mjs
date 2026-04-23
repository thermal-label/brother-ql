// Uses the real compiled transport (same path as printing) to dump raw status bytes.
// Run: node scripts/dump-status.mjs DK-22251
import { UsbTransport } from '../packages/node/dist/transport.js';

const LABEL = process.argv[2] ?? 'unknown';
const VID = 0x04f9;
const PID = 0x209d;

const BYTE_NAMES = [
  'Print head mark','Size','Fixed B','Device dep','Device dep',
  'Fixed 0x30','Country?','Fixed 0x00',
  'Error info 1','Error info 2',
  'Media width mm','Media type',
  'byte12','byte13','byte14','Mode',
  'byte16','Media length mm','Status type','Phase type',
  'Phase no hi','Phase no lo','Notification','byte23','byte24',
  'byte25','byte26','byte27','byte28','byte29','byte30','byte31',
];

function dump(bytes, label) {
  console.log(`\n=== ${label} (${bytes.length} bytes) ===`);
  for (let i = 0; i < bytes.length; i++) {
    const name = BYTE_NAMES[i] ?? `byte${i}`;
    console.log(`  [${String(i).padStart(2,'0')}] 0x${bytes[i].toString(16).padStart(2,'0').toUpperCase()}  (${String(bytes[i]).padStart(3)})  ${name}`);
  }
}

const STATUS_REQUEST = new Uint8Array([0x1b, 0x69, 0x53]);
const AMEDIA_REQUEST = new Uint8Array([0x1b, 0x69, 0x55, 0x77, 0x01]);

console.log(`Connecting to VID=0x${VID.toString(16)} PID=0x${PID.toString(16)} — roll: ${LABEL}`);
const t = await UsbTransport.open(VID, PID);
console.log('Connected.');

// Preamble: put printer in raster mode so it will respond to status request
const preamble = new Uint8Array([
  0x1b, 0x69, 0x61, 0x01,   // raster mode
  ...new Array(200).fill(0), // invalidate
  0x1b, 0x40,                // initialize
  0x1b, 0x69, 0x61, 0x01,   // raster mode (per-page)
]);
await t.write(preamble);

// Read and discard any buffered response from initialize
await new Promise(r => setTimeout(r, 400));

// STATUS — read with retries since transferAsync returns 0 immediately if not yet queued
await t.write(STATUS_REQUEST);
let statusBytes = new Uint8Array(0);
for (let attempt = 0; attempt < 8 && statusBytes.length === 0; attempt++) {
  await new Promise(r => setTimeout(r, 300));
  statusBytes = await t.read(32);
  if (statusBytes.length === 0) process.stdout.write('.');
}
process.stdout.write('\n');
dump(statusBytes, `STATUS — ${LABEL}`);

// AMEDIA — drain any leftover, then send
await new Promise(r => setTimeout(r, 200));
await t.write(AMEDIA_REQUEST);
let amediaBytes = new Uint8Array(0);
for (let attempt = 0; attempt < 8 && amediaBytes.length === 0; attempt++) {
  await new Promise(r => setTimeout(r, 300));
  amediaBytes = await t.read(128);
  if (amediaBytes.length === 0) process.stdout.write('.');
}
process.stdout.write('\n');
if (amediaBytes.length > 0) {
  dump(amediaBytes, `AMEDIA — ${LABEL}`);
} else {
  console.log('AMEDIA: no response (command not supported by this firmware)');
}

await t.close();
console.log('\nDone.');
