// Uses the compiled node package transport directly — same path the printer uses.
import { UsbTransport } from '../packages/node/dist/transport.js';

const BROTHER_VID = 0x04f9;
const BROTHER_PID = 0x209d; // QL-820NWBc
const LABEL = process.argv[2] ?? 'unknown';

const STATUS_REQUEST = new Uint8Array([0x1b, 0x69, 0x53]);
const AMEDIA_REQUEST = new Uint8Array([0x1b, 0x69, 0x55, 0x77, 0x01]);

const BYTE_NAMES = [
  'Print head mark', 'Size', 'Fixed B', 'Device dep', 'Device dep',
  'Fixed 0x30', 'Country?', 'Fixed 0x00',
  'Error info 1', 'Error info 2',
  'Media width mm', 'Media type',
  'byte12', 'byte13', 'byte14 (Reserved?)', 'Mode',
  'byte16', 'Media length mm', 'Status type', 'Phase type',
  'Phase no hi', 'Phase no lo', 'Notification', 'byte23', 'byte24',
  'byte25', 'byte26', 'byte27', 'byte28', 'byte29', 'byte30', 'byte31',
];

function dump(bytes, label) {
  console.log(`\n=== ${label} (${bytes.length} bytes) ===`);
  for (let i = 0; i < bytes.length; i++) {
    const name = BYTE_NAMES[i] ?? `byte${i}`;
    console.log(`  [${String(i).padStart(2, '0')}] 0x${bytes[i].toString(16).padStart(2, '0').toUpperCase()}  ${name}`);
  }
}

const transport = await UsbTransport.open(BROTHER_VID, BROTHER_PID);
console.log(`Connected — roll: ${LABEL}`);

await transport.write(STATUS_REQUEST);
const statusBytes = await transport.read(32);
dump(statusBytes, `STATUS — ${LABEL}`);

try {
  await transport.write(AMEDIA_REQUEST);
  const amediaBytes = await transport.read(256);
  dump(amediaBytes, `AMEDIA — ${LABEL}`);
} catch (e) {
  console.log(`\nAMEDIA: no response — ${e.message}`);
}

await transport.close();
