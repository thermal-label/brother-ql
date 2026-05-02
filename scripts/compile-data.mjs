#!/usr/bin/env node
// Aggregates packages/core/data/devices/*.json5 + packages/core/data/media.json5
// into the runtime artifacts:
//
//   - data/devices.json — published JSON form of the DeviceRegistry,
//     consumed by downstream tooling (validator, docs aggregator).
//   - data/media.json   — published JSON form of the media list.
//   - src/devices.generated.ts — typed re-export consumed by src/devices.ts.
//   - src/media.generated.ts   — typed re-export consumed by src/media.ts.
//
// Invariants enforced before write: every entry has a string `key` matching
// its filename, `family === 'brother-ql'`, `transports` is a keyed object
// with valid USB hex strings, `engines[]` is non-empty with a known
// `protocol` tag, USB PIDs are unique across the registry, and
// `support.status` is one of the contracts values. Bad input fails the
// build; nothing partial is written.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const CORE_PKG = resolve(REPO_ROOT, 'packages/core');
const DEVICES_DIR = resolve(CORE_PKG, 'data/devices');
const MEDIA_FILE = resolve(CORE_PKG, 'data/media.json5');
const DEVICES_OUT = resolve(CORE_PKG, 'data/devices.json');
const MEDIA_OUT = resolve(CORE_PKG, 'data/media.json');
const DEVICES_TS = resolve(CORE_PKG, 'src/devices.generated.ts');
const MEDIA_TS = resolve(CORE_PKG, 'src/media.generated.ts');

const DRIVER = 'brother-ql';
const SCHEMA_VERSION = 1;
const KNOWN_PROTOCOLS = new Set(['ql-raster', 'pt-raster']);
const KNOWN_TAPE_SYSTEMS = new Set(['dk', 'tze', 'hse-2to1', 'hse-3to1']);
const STATUS_VALUES = new Set(['verified', 'partial', 'broken', 'untested']);
const TRANSPORT_KEYS = new Set(['usb', 'tcp', 'serial', 'bluetooth-spp', 'bluetooth-gatt']);

const errors = [];
const fail = msg => errors.push(msg);

function readJson5(path) {
  return JSON5.parse(readFileSync(path, 'utf8'));
}

function loadDevices() {
  const files = readdirSync(DEVICES_DIR)
    .filter(f => f.endsWith('.json5'))
    .sort();

  const seenUsbPids = new Map();
  const devices = [];

  for (const filename of files) {
    const path = join(DEVICES_DIR, filename);
    const expectedKey = basename(filename, '.json5');
    let entry;
    try {
      entry = readJson5(path);
    } catch (err) {
      fail(`${filename}: parse error — ${err.message}`);
      continue;
    }

    if (entry?.key !== expectedKey) {
      fail(`${filename}: \`key\` must equal "${expectedKey}" (got ${JSON.stringify(entry?.key)})`);
    }
    if (typeof entry?.name !== 'string') {
      fail(`${filename}: missing string \`name\``);
      continue;
    }
    if (entry.family !== DRIVER) {
      fail(`${filename}: family must be "${DRIVER}" (got ${JSON.stringify(entry.family)})`);
    }

    const transports = entry.transports;
    if (!transports || typeof transports !== 'object' || Array.isArray(transports)) {
      fail(`${filename}: \`transports\` must be a keyed object`);
    } else {
      for (const k of Object.keys(transports)) {
        if (!TRANSPORT_KEYS.has(k)) {
          fail(`${filename}: unknown transport key "${k}" (allowed: ${[...TRANSPORT_KEYS].join('|')})`);
        }
      }
      if (transports.usb) {
        const { vid, pid } = transports.usb;
        if (typeof vid !== 'string' || !/^0x[0-9a-fA-F]+$/.test(vid)) {
          fail(`${filename}: transports.usb.vid must be a hex string (got ${JSON.stringify(vid)})`);
        }
        if (typeof pid !== 'string' || !/^0x[0-9a-fA-F]+$/.test(pid)) {
          fail(`${filename}: transports.usb.pid must be a hex string (got ${JSON.stringify(pid)})`);
        }
        const collision = seenUsbPids.get(pid);
        if (collision) {
          fail(`${filename}: USB pid ${pid} already used by \`${collision}\``);
        } else if (typeof pid === 'string') {
          seenUsbPids.set(pid, entry.key);
        }
      }
    }

    if (!Array.isArray(entry.engines) || entry.engines.length === 0) {
      fail(`${filename}: \`engines\` must be a non-empty array`);
    } else {
      for (const [i, eng] of entry.engines.entries()) {
        if (typeof eng?.protocol !== 'string' || !KNOWN_PROTOCOLS.has(eng.protocol)) {
          fail(
            `${filename}: engines[${i}].protocol must be one of ${[...KNOWN_PROTOCOLS].join('|')} (got ${JSON.stringify(eng?.protocol)})`,
          );
        }
        if (typeof eng?.headDots !== 'number') {
          fail(`${filename}: engines[${i}].headDots must be a number`);
        }
        if (typeof eng?.dpi !== 'number') {
          fail(`${filename}: engines[${i}].dpi must be a number`);
        }
        if (typeof eng?.role !== 'string') {
          fail(`${filename}: engines[${i}].role must be a string`);
        }
      }
    }

    if (!entry.support || !STATUS_VALUES.has(entry.support.status)) {
      fail(
        `${filename}: \`support.status\` must be one of ${[...STATUS_VALUES].join('|')} (got ${JSON.stringify(entry.support?.status)})`,
      );
    }

    devices.push(entry);
  }

  return devices;
}

function loadMedia() {
  const list = readJson5(MEDIA_FILE);
  if (!Array.isArray(list)) {
    fail('media.json5: top-level must be an array');
    return [];
  }
  const seenIds = new Set();
  for (const [i, m] of list.entries()) {
    if (m?.id == null) fail(`media[${i}]: missing \`id\``);
    else if (seenIds.has(m.id)) fail(`media[${i}]: duplicate id \`${m.id}\``);
    else seenIds.add(m.id);
    if (typeof m?.widthMm !== 'number') fail(`media[${i}]: \`widthMm\` must be a number`);
    if (typeof m?.type !== 'string') fail(`media[${i}]: \`type\` must be a string`);
    if (typeof m?.tapeSystem !== 'string' || !KNOWN_TAPE_SYSTEMS.has(m.tapeSystem)) {
      fail(
        `media[${i}] (id ${m?.id}): \`tapeSystem\` must be one of ${[...KNOWN_TAPE_SYSTEMS].join('|')} (got ${JSON.stringify(m?.tapeSystem)})`,
      );
    }
    if (m?.tapeSystem === 'dk') {
      if (typeof m.printAreaDots !== 'number') {
        fail(`media[${i}] (id ${m?.id}): DK entries require flat \`printAreaDots\``);
      }
    } else if (m?.tapeSystem) {
      // TZe / HSe entries must populate at least one head-family geometry.
      const narrow = m.geometry?.narrow;
      const wide = m.geometry?.wide;
      if (!narrow && !wide) {
        fail(
          `media[${i}] (id ${m?.id}): tape-system "${m.tapeSystem}" requires \`geometry.narrow\` or \`geometry.wide\``,
        );
      }
    }
  }
  return list;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeGeneratedTs(path, header, body) {
  const content = `// AUTO-GENERATED by scripts/compile-data.mjs — do not edit by hand.
// Regenerate with \`pnpm --filter @thermal-label/brother-ql-core compile-data\`.
${header}

${body}
`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

const devices = loadDevices();
const media = loadMedia();

if (errors.length > 0) {
  console.error(`[compile-data] ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

const deviceRegistry = {
  schemaVersion: SCHEMA_VERSION,
  driver: DRIVER,
  devices,
};

writeJson(DEVICES_OUT, deviceRegistry);
writeJson(MEDIA_OUT, { schemaVersion: SCHEMA_VERSION, driver: DRIVER, media });

writeGeneratedTs(
  DEVICES_TS,
  "import type { DeviceRegistry } from '@thermal-label/contracts';\nimport type { BrotherQLDevice } from './types.js';",
  `export const DEVICE_REGISTRY = ${JSON.stringify(deviceRegistry, null, 2)} as const satisfies DeviceRegistry;

type DeviceKey = (typeof DEVICE_REGISTRY)['devices'][number]['key'];

/**
 * Per-key map of device entries. Built from the registry array via
 * \`Object.fromEntries\`, but typed as \`Record<DeviceKey, BrotherQLDevice>\`
 * so consumers can write \`DEVICES.QL_820NWBc\` and get a precise type
 * back without literal narrowing leaking into engine capability access.
 */
export const DEVICES = Object.fromEntries(
  DEVICE_REGISTRY.devices.map(d => [d.key, d]),
) as unknown as Record<DeviceKey, BrotherQLDevice>;`,
);

const mediaObject = Object.fromEntries(media.map(m => [m.id, m]));
writeGeneratedTs(
  MEDIA_TS,
  "import type { BrotherQLMedia } from './types.js';",
  `const MEDIA_BY_ID: Record<number, BrotherQLMedia> = ${JSON.stringify(mediaObject, null, 2)};

export const MEDIA: Record<number, BrotherQLMedia> = MEDIA_BY_ID;
export const MEDIA_LIST: readonly BrotherQLMedia[] = Object.freeze(${JSON.stringify(media, null, 2)});`,
);

console.log(
  `[compile-data] OK — ${devices.length} devices, ${media.length} media entries → data/devices.json, data/media.json`,
);
