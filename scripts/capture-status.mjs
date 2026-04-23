// Captures raw status and amedia bytes from the printer.
// Run: node scripts/capture-status.mjs DK-22251
// Then swap roll and run: node scripts/capture-status.mjs DK-11201
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const usb = require('/home/mannes/thermal-label/brother-ql/node_modules/.pnpm/usb@2.17.0/node_modules/usb/dist/index.js');

const BROTHER_VID = 0x04f9;
const LABEL = process.argv[2] ?? 'unknown';

const STATUS_REQUEST = Buffer.from([0x1b, 0x69, 0x53]);
const AMEDIA_REQUEST = Buffer.from([0x1b, 0x69, 0x55, 0x77, 0x01]);

const BYTE_NAMES = [
  'Print head mark', 'Size', 'Fixed B', 'Device dep', 'Device dep',
  'Fixed 0x30', 'Country?', 'Fixed 0x00',
  'Error info 1', 'Error info 2',
  'Media width mm', 'Media type',
  'Fixed?', 'Fixed?', 'Reserved?', 'Mode',
  'Fixed?', 'Media length mm', 'Status type', 'Phase type',
  'Phase no hi', 'Phase no lo', 'Notification', 'Reserved', 'Reserved',
];

function hex(buf, label) {
  if (!buf || buf.length === 0) { console.log('  (no data)'); return; }
  console.log(`  ${label} (${buf.length} bytes):`);
  for (let i = 0; i < buf.length; i++) {
    const name = BYTE_NAMES[i] ? ` ← ${BYTE_NAMES[i]}` : '';
    console.log(`  [${String(i).padStart(2, '0')}] 0x${buf[i].toString(16).padStart(2, '0').toUpperCase()}  (${buf[i]})${name}`);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function write(ep, data) {
  return new Promise((resolve, reject) =>
    ep.transfer(data, err => (err ? reject(err) : resolve())),
  );
}

function read(ep, len) {
  return new Promise((resolve, reject) =>
    ep.transfer(len, (err, data) => (err ? reject(err) : resolve(data ?? Buffer.alloc(0)))),
  );
}

const dev = usb.getDeviceList().find(d => d.deviceDescriptor.idVendor === BROTHER_VID);
if (!dev) { console.error('No Brother QL printer found'); process.exit(1); }
console.log(`Printer: VID=0x${dev.deviceDescriptor.idVendor.toString(16)} PID=0x${dev.deviceDescriptor.idProduct.toString(16)}  roll: ${LABEL}\n`);

dev.open();
const iface = dev.interface(0);
if (process.platform === 'linux' && iface.isKernelDriverActive()) iface.detachKernelDriver();
iface.claim();
const out = iface.endpoints.find(e => e.direction === 'out');
const inp = iface.endpoints.find(e => e.direction === 'in');

// --- 32-byte status ---
await write(out, STATUS_REQUEST);
await sleep(200);
const statusBytes = await read(inp, 64); // read up to 64 to catch any overflow
hex(statusBytes.slice(0, 32), `STATUS  (${LABEL})`);

await sleep(100);

// --- amedia (127 bytes) ---
await write(out, AMEDIA_REQUEST);
await sleep(300);
let amediaBytes;
try {
  amediaBytes = await read(inp, 256);
  if (amediaBytes.length > 0) {
    hex(amediaBytes, `AMEDIA  (${LABEL})`);
  } else {
    console.log('AMEDIA: no response (command not supported?)');
  }
} catch (e) {
  console.log(`AMEDIA: error — ${e.message}`);
}

iface.release(() => dev.close());
