#!/usr/bin/env node
// Aggregates packages/core/data/devices/*.json5 + packages/core/data/media.json5
// into the runtime artifacts:
//
//   - data/devices.json — rich aggregated DeviceRegistry artifact
//     (with `verificationGrid` + `supportStatus` per device) for
//     non-TS consumers (validators, external doc generators).
//   - data/media.json   — flat aggregated media list, same role.
//   - src/devices.generated.ts — typed re-export of the device data
//     (lean, with rolled-up `supportStatus` per device), consumed by
//     src/devices.ts.
//   - src/media.generated.ts   — typed re-export of the media data.
//
// All four outputs are gitignored — the script regenerates them on
// every prebuild / pretest / pretypecheck step. Naming + commit
// policy mirror @thermal-label/labelwriter-core and
// @thermal-label/labelmanager-core.
//
// Validates each entry against a structural subset of the contracts
// shapes, including the optional new `verifications` block (rungs
// `verified`/`partial`/`unsupported`, `issues[].length ≤ 2`, ISO
// `lastReported`, transport keys must match declared transports).
// Continues to validate the legacy `support` field; codegen
// synthesises a `verifications` block from `support` when none is
// authored, so downstream consumers see a single shape.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';
import { expandVerifications, mapLegacyStatus } from '@thermal-label/contracts';

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
// Substrate tags engines may declare in `mediaCompatibility` and media
// in `targetModels`. Wide-tier QL chassis (1296-dot) accept both 'dk'
// and 'dk-wide'; narrow-tier QL chassis accept only 'dk'. PT engines
// list one or more of the tape-system tags directly.
const KNOWN_SUBSTRATE_TAGS = new Set(['dk', 'dk-wide', 'tze', 'hse-2to1', 'hse-3to1']);
const LEGACY_SUPPORT_STATUS = new Set(['verified', 'partial', 'broken', 'untested']);
const VERIFICATION_RUNGS = new Set(['verified', 'partial', 'unsupported']);
const MAX_ISSUES_PER_CELL = 2;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
          fail(
            `${filename}: unknown transport key "${k}" (allowed: ${[...TRANSPORT_KEYS].join('|')})`,
          );
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
        if (Array.isArray(eng?.mediaCompatibility)) {
          for (const tag of eng.mediaCompatibility) {
            if (!KNOWN_SUBSTRATE_TAGS.has(tag)) {
              fail(
                `${filename}: engines[${i}].mediaCompatibility has unknown tag "${tag}" (allowed: ${[...KNOWN_SUBSTRATE_TAGS].join('|')})`,
              );
            }
          }
          // Wide tier implies base: a chassis that takes 102 mm DK
          // rolls also takes everything narrower. Catches a typo that
          // declares only `['dk-wide']` and would silently reject
          // every standard DK roll the QL-1xxx ships with.
          if (
            eng.mediaCompatibility.includes('dk-wide') &&
            !eng.mediaCompatibility.includes('dk')
          ) {
            fail(
              `${filename}: engines[${i}].mediaCompatibility includes 'dk-wide' but not 'dk' (wide tier must also accept narrow DK)`,
            );
          }
        }
      }
    }

    if (!entry.support || !LEGACY_SUPPORT_STATUS.has(entry.support.status)) {
      fail(
        `${filename}: \`support.status\` must be one of ${[...LEGACY_SUPPORT_STATUS].join('|')} (got ${JSON.stringify(entry.support?.status)})`,
      );
    }

    // Optional `verifications` block — new shape, runs alongside legacy
    // `support` during the alias transition (see plan #0).
    if (entry?.verifications !== undefined) {
      if (typeof entry.verifications !== 'object' || Array.isArray(entry.verifications)) {
        fail(`${filename}: \`verifications\` must be a keyed object`);
      } else {
        const declared = new Set(Object.keys(entry.transports ?? {}));
        for (const [k, cell] of Object.entries(entry.verifications)) {
          const cwhere = `${filename} verifications.${k}`;
          if (!TRANSPORT_KEYS.has(k)) {
            fail(`${cwhere}: unknown transport key`);
            continue;
          }
          if (!declared.has(k)) {
            fail(`${cwhere}: transport not declared on this device`);
          }
          if (!cell || typeof cell !== 'object') {
            fail(`${cwhere}: cell must be an object`);
            continue;
          }
          if (!VERIFICATION_RUNGS.has(cell.status)) {
            fail(`${cwhere}: status must be one of ${[...VERIFICATION_RUNGS].join('|')}`);
          }
          if (cell.issues !== undefined) {
            if (!Array.isArray(cell.issues)) {
              fail(`${cwhere}: issues must be an array`);
            } else {
              if (cell.issues.length > MAX_ISSUES_PER_CELL) {
                fail(`${cwhere}: issues may have at most ${MAX_ISSUES_PER_CELL} entries`);
              }
              for (const n of cell.issues) {
                if (!Number.isInteger(n) || n <= 0) {
                  fail(`${cwhere}: issues entries must be positive integers`);
                }
              }
            }
          }
          if (cell.reason !== undefined && typeof cell.reason !== 'string') {
            fail(`${cwhere}: reason must be a string`);
          }
          if (cell.lastReported !== undefined && !ISO_DATE_RE.test(cell.lastReported ?? '')) {
            fail(`${cwhere}: lastReported must be ISO date YYYY-MM-DD`);
          }
        }
      }
    }

    devices.push(entry);
  }

  return devices;
}

// Synthesise a `verifications` block from the legacy `support` field
// when no explicit `verifications` is authored. Prefers per-transport
// `support.transports.<t>` when authored; otherwise falls back to the
// device-level `support.status`. Returns an empty object when the
// effective status is `'untested'` (no claim).
//
// `mapLegacyStatus` is imported from `@thermal-label/contracts`.
function legacyToVerifications(entry) {
  const declared = Object.keys(entry?.transports ?? {});
  const supportTransports = entry?.support?.transports;
  const out = {};
  if (supportTransports && typeof supportTransports === 'object') {
    for (const t of declared) {
      const mapped = mapLegacyStatus(supportTransports[t]);
      if (mapped) out[t] = { status: mapped };
    }
    // If author specified per-transport entries, trust the granularity
    // — do not fall back to device-level status for unmentioned transports.
    if (Object.keys(supportTransports).length > 0) return out;
  }
  const deviceStatus = mapLegacyStatus(entry?.support?.status);
  if (!deviceStatus) return {};
  for (const t of declared) {
    if (out[t] === undefined) out[t] = { status: deviceStatus };
  }
  return out;
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
      if (typeof m.printableDots !== 'number') {
        fail(`media[${i}] (id ${m?.id}): DK entries require flat \`printableDots\``);
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

    // Substrate gate (consumed by `mediaCompatibleWith()` from
    // `@thermal-label/contracts`). Without `targetModels`, the helper
    // falls to its "either side omits → unrestricted" rule and the
    // entry would silently match every engine, defeating the gate.
    if (!Array.isArray(m?.targetModels) || m.targetModels.length === 0) {
      fail(`media[${i}] (id ${m?.id}): \`targetModels\` must be a non-empty array`);
    } else {
      for (const tag of m.targetModels) {
        if (!KNOWN_SUBSTRATE_TAGS.has(tag)) {
          fail(
            `media[${i}] (id ${m?.id}): unknown targetModels tag "${tag}" (allowed: ${[...KNOWN_SUBSTRATE_TAGS].join('|')})`,
          );
        }
      }
      // Belt-and-suspenders: targetModels must include the tapeSystem
      // value (or, for DK, the wider 'dk-wide' substrate sibling). Two
      // fields encoding the same substrate; this catches drift if
      // someone updates one without the other.
      if (m.tapeSystem === 'dk') {
        const ok = m.targetModels.includes('dk') || m.targetModels.includes('dk-wide');
        if (!ok) {
          fail(
            `media[${i}] (id ${m?.id}): DK entry must include 'dk' or 'dk-wide' in targetModels (got ${JSON.stringify(m.targetModels)})`,
          );
        }
      } else if (m?.tapeSystem && !m.targetModels.includes(m.tapeSystem)) {
        fail(
          `media[${i}] (id ${m?.id}): targetModels must include tapeSystem "${m.tapeSystem}" (got ${JSON.stringify(m.targetModels)})`,
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

const devices = loadDevices();
const media = loadMedia();

if (errors.length > 0) {
  console.error(`[compile-data] ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

// Build a registry shadow where each device has a populated
// `verifications` field — explicit when authored, synthesised from
// legacy `support` otherwise — so the contracts `expandVerifications`
// sees one consistent shape.
const synthesizedDevices = devices.map(d => {
  const v =
    d.verifications && Object.keys(d.verifications).length > 0
      ? d.verifications
      : legacyToVerifications(d);
  return { ...d, verifications: v };
});

const expanded = expandVerifications({
  schemaVersion: SCHEMA_VERSION,
  driver: DRIVER,
  devices: synthesizedDevices,
});

// Lean device entries for the bundled TS: drop authoring-only blocks
// (`verifications`) and stamp the rolled-up `supportStatus`.
const leanDevices = devices.map((d, i) => {
  const { verifications: _v, ...rest } = d;
  return { ...rest, supportStatus: expanded.devices[i].supportStatus };
});

// Rich device entries for the JSON projection: keep `verifications`
// + stamp the expanded `verificationGrid` and rolled-up `supportStatus`.
const richDevices = devices.map((d, i) => ({
  ...d,
  verificationGrid: expanded.devices[i].verificationGrid,
  supportStatus: expanded.devices[i].supportStatus,
}));

const richRegistry = { schemaVersion: SCHEMA_VERSION, driver: DRIVER, devices: richDevices };
writeJson(DEVICES_OUT, richRegistry);

writeJson(MEDIA_OUT, { schemaVersion: SCHEMA_VERSION, driver: DRIVER, media });

const leanRegistry = { schemaVersion: SCHEMA_VERSION, driver: DRIVER, devices: leanDevices };
const deviceEntries = leanDevices.map((d, i) => `  ${d.key}: REGISTRY.devices[${i}],`).join('\n');
const deviceKeyUnion = leanDevices.map(d => `'${d.key}'`).join(' | ');
const devicesBody = `// AUTO-GENERATED by scripts/compile-data.mjs from packages/core/data/devices/*.json5.
// Edit those files, not this one. Run \`pnpm --filter @thermal-label/brother-ql-core compile-data\`.

import type { DeviceEntry, DeviceRegistry } from '@thermal-label/contracts';

/**
 * Render-time effective status — superset of the contracts' stored
 * verification rungs that includes \`'expected'\` (propagated lift)
 * and \`'unverified'\` (no claim). Mirrors \`EffectiveStatus\` in
 * @thermal-label/contracts ≥ 0.6; literal here so codegen does not
 * require the matching contracts version on consumers' machines.
 */
export type EffectiveStatus = 'verified' | 'partial' | 'unsupported' | 'expected' | 'unverified';

/** Each entry carries a rolled-up \`supportStatus\` from the verification grid. */
export type RegistryDeviceEntry = DeviceEntry & { supportStatus: EffectiveStatus };

/** Registry shape with \`supportStatus\` stamped on each device. */
export type RegistryWithStatus = Omit<DeviceRegistry, 'devices'> & {
  devices: readonly RegistryDeviceEntry[];
};

export const REGISTRY = ${JSON.stringify(leanRegistry, null, 2)} as const satisfies RegistryWithStatus;

export type DeviceKey = ${deviceKeyUnion};

export const DEVICES: Record<DeviceKey, RegistryDeviceEntry> = {
${deviceEntries}
};
`;
mkdirSync(dirname(DEVICES_TS), { recursive: true });
writeFileSync(DEVICES_TS, devicesBody);

const mediaObject = Object.fromEntries(media.map(m => [m.id, m]));
const mediaBody = `// AUTO-GENERATED by scripts/compile-data.mjs from packages/core/data/media.json5.
// Edit that file, not this one. Run \`pnpm --filter @thermal-label/brother-ql-core compile-data\`.

import type { BrotherQLMedia } from './types.js';

const MEDIA_BY_ID: Record<number, BrotherQLMedia> = ${JSON.stringify(mediaObject, null, 2)};

export const MEDIA: Record<number, BrotherQLMedia> = MEDIA_BY_ID;
export const MEDIA_LIST: readonly BrotherQLMedia[] = Object.freeze(${JSON.stringify(media, null, 2)});
`;
mkdirSync(dirname(MEDIA_TS), { recursive: true });
writeFileSync(MEDIA_TS, mediaBody);

console.log(
  `[compile-data] OK — ${devices.length} devices, ${media.length} media entries → data/devices.json, data/media.json`,
);
