#!/usr/bin/env node
// Generates a simple supported-hardware table from the compiled
// `packages/core/data/devices.json` registry (rich projection — carries
// the rolled-up `supportStatus` from the verification grid alongside
// each device) and injects it between marker comments in:
//   - README.md            (so npm/GitHub readers see it on first contact)
//   - docs/hardware.md     (so the driver's own docs page stays in sync)
//
// Reads from the generated registry (not raw JSON5) so the badge in
// each row reflects the propagated effective status from
// `expandVerifications`, not just the legacy device-level
// `support.status`. Sequenced as `predocs:hardware` runs `compile-data`
// first.
//
// The fancy interactive cross-driver table lives at
// https://thermal-label.github.io/hardware/. This script gives each
// driver repo its own simple, GitHub-rendered version sourced from the
// same JSON5 files.
//
// Markers (must exist in any file that should be patched):
//   <!-- HARDWARE_TABLE:START -->
//   <!-- HARDWARE_TABLE:END -->
// The script fails loudly if a target file is missing them.
//
// This script is duplicated across the three driver repos with only the
// DRIVER constant differing — extract to a shared package once edits
// here start getting copy-pasted three times in a row.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEVICES_JSON = resolve(REPO_ROOT, 'packages/core/data/devices.json');
const README_PATH = resolve(REPO_ROOT, 'README.md');
const HW_DOC_PATH = resolve(REPO_ROOT, 'docs/hardware.md');

// Per-driver constants. Change the DRIVER value to retarget this
// script at a different driver repo without touching anything else.
const DRIVER = 'brother-ql';
const SITE_BASE = 'https://thermal-label.github.io';

// Keys are `EffectiveStatus` values surfaced after `expandVerifications`
// (verified | partial | unsupported | expected | unverified). Legacy
// `broken` / `untested` retained as fallback for the rare case the
// registry lacks `supportStatus` (pre-codegen-migration debug runs).
const STATUS_BADGE = {
  verified:    '✅ verified',
  partial:     '⚠️ partial',
  unsupported: '❌ unsupported',
  expected:    '🔄 expected',
  unverified:  '⏳ unverified',
  broken:      '❌ broken',
  untested:    '⏳ untested',
};

const TRANSPORT_LABEL = {
  usb: 'USB',
  tcp: 'TCP',
  serial: 'Serial',
  'bluetooth-spp': 'BT SPP',
  'bluetooth-gatt': 'BT LE',
};

const MARKER_START = '<!-- HARDWARE_TABLE:START -->';
const MARKER_END   = '<!-- HARDWARE_TABLE:END -->';

function log(msg) { process.stdout.write(`[build-hardware-table] ${msg}\n`); }
function die(msg) { process.stderr.write(`[build-hardware-table] error: ${msg}\n`); process.exit(1); }

function loadDevices() {
  if (!existsSync(DEVICES_JSON)) {
    die(`devices registry not found at ${DEVICES_JSON} — run \`pnpm --filter @thermal-label/brother-ql-core compile-data\` first`);
  }
  const registry = JSON.parse(readFileSync(DEVICES_JSON, 'utf8'));
  if (!Array.isArray(registry?.devices)) die(`${DEVICES_JSON}: malformed registry (missing \`devices\` array)`);
  return [...registry.devices].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
}

function devSlug(key) {
  return key.toLowerCase().replace(/_/g, '-');
}

function transportList(dev) {
  const ts = Object.keys(dev.transports ?? {});
  if (ts.length === 0) return '—';
  return ts.map(t => TRANSPORT_LABEL[t] ?? t).join(', ');
}

function statusBadge(dev) {
  // `supportStatus` is the rolled-up effective status emitted by
  // `expandVerifications` during codegen. Falls back to the legacy
  // `support.status` if running against a pre-migration registry.
  const s = dev.supportStatus ?? dev.support?.status ?? 'unverified';
  return STATUS_BADGE[s] ?? s;
}

function detailUrl(dev) {
  return `${SITE_BASE}/hardware/${DRIVER}/${devSlug(dev.key)}`;
}

function renderCounts(devices) {
  const c = { total: devices.length, verified: 0, partial: 0, unsupported: 0, expected: 0, unverified: 0 };
  for (const d of devices) {
    const s = d.supportStatus ?? d.support?.status ?? 'unverified';
    // Coalesce legacy `untested` → `unverified`, `broken` → `unsupported`.
    const k = s === 'untested' ? 'unverified' : s === 'broken' ? 'unsupported' : s;
    if (k in c) c[k]++;
  }
  return `**${c.total} devices** — ${c.verified} verified · ${c.partial} partial · ${c.expected} expected · ${c.unsupported} unsupported · ${c.unverified} unverified`;
}

function renderTable(devices) {
  const rows = devices.map(d => {
    const name = `[${d.name}](${detailUrl(d)})`;
    const usbPid = d.transports?.usb?.pid ?? '—';
    return `| ${name} | \`${d.key}\` | ${usbPid} | ${transportList(d)} | ${statusBadge(d)} |`;
  });
  return [
    '| Model | Key | USB PID | Transports | Status |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function renderSection(devices) {
  return [
    renderCounts(devices),
    '',
    renderTable(devices),
    '',
    'Click any model to open its detail page on the docs site, where engines, supported media, and verification reports live. The same data backs the [interactive cross-driver table](' + SITE_BASE + '/hardware/).',
  ].join('\n');
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function patchFile(path, section, { required }) {
  if (!existsSync(path)) {
    if (required) die(`${path}: not found`);
    log(`${path}: not found, skipping`);
    return;
  }
  const original = readFileSync(path, 'utf8');
  if (!original.includes(MARKER_START) || !original.includes(MARKER_END)) {
    die(`${path} is missing ${MARKER_START} / ${MARKER_END} markers — add them where the table should appear`);
  }
  const re = new RegExp(`${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}`);
  const replaced = original.replace(re, `${MARKER_START}\n${section}\n${MARKER_END}`);
  if (replaced === original) {
    log(`${path}: no change`);
    return;
  }
  writeFileSync(path, replaced);
  log(`${path}: updated`);
}

function main() {
  const devices = loadDevices();
  log(`${DRIVER}: loaded ${devices.length} devices`);
  const section = renderSection(devices);
  patchFile(README_PATH, section, { required: true });
  patchFile(HW_DOC_PATH, section, { required: false });
}

main();
