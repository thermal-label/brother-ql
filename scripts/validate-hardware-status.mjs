#!/usr/bin/env node
// Validates docs/hardware-status.yaml against the schema documented at
// https://github.com/thermal-label/.github/blob/main/CONTRIBUTING/hardware-status-schema.md
//
// Run via `pnpm validate:hardware-status`. The pre-push hook also runs
// this when the YAML changes. A clean run prints
// `OK — N devices, M reports` and exits 0.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const YAML_PATH = resolve(REPO_ROOT, 'docs/hardware-status.yaml');
const CORE_DIST = resolve(REPO_ROOT, 'packages/core/dist/index.js');

const EXPECTED_DRIVER = 'brother-ql';
const STATUS_VALUES = new Set(['verified', 'partial', 'broken']);
const REPORT_RESULT_VALUES = new Set(['verified', 'partial', 'broken', 'untested']);
const TRANSPORT_VALUES = new Set(['usb', 'tcp', 'webusb', 'web-bluetooth', 'web-serial', 'serial']);
const OS_VALUES = new Set(['Linux', 'macOS', 'Windows']);
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
function fail(msg) { errors.push(msg); }

function parseDate(s) {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

const { DEVICES } = await import(CORE_DIST);
// One PID may map to multiple device entries (e.g. labelmanager PnP/PC
// collide on 0x1002). The YAML's `name` only needs to match one of them.
const devicesByPid = new Map();
for (const dev of Object.values(DEVICES)) {
  const list = devicesByPid.get(dev.pid);
  if (list) list.push(dev); else devicesByPid.set(dev.pid, [dev]);
}

let raw;
try {
  raw = readFileSync(YAML_PATH, 'utf8');
} catch (err) {
  console.error(`[validate-hardware-status] cannot read ${YAML_PATH}: ${err.message}`);
  process.exit(1);
}

let doc;
try {
  doc = parse(raw);
} catch (err) {
  console.error(`[validate-hardware-status] YAML parse error: ${err.message}`);
  process.exit(1);
}

if (doc?.schemaVersion !== 1) {
  fail(`schemaVersion must be 1 (got ${JSON.stringify(doc?.schemaVersion)})`);
}
if (doc?.driver !== EXPECTED_DRIVER) {
  fail(`driver must be "${EXPECTED_DRIVER}" (got ${JSON.stringify(doc?.driver)})`);
}
if (!Array.isArray(doc?.devices)) {
  fail('devices must be a list');
  console.error(errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}

const seenPids = new Set();
const seenIssues = new Map(); // issue -> first device name where seen
let totalReports = 0;

for (const [i, entry] of doc.devices.entries()) {
  const where = `devices[${i}] (pid=${entry?.pid != null ? '0x' + Number(entry.pid).toString(16) : '?'})`;

  if (typeof entry?.pid !== 'number') {
    fail(`${where}: pid must be a number`);
    continue;
  }
  if (seenPids.has(entry.pid)) {
    fail(`${where}: duplicate pid`);
    continue;
  }
  seenPids.add(entry.pid);

  const candidates = devicesByPid.get(entry.pid);
  if (!candidates) {
    fail(`${where}: pid not found in DEVICES`);
    continue;
  }
  const dev = candidates.find(c => c.name === entry.name) ?? candidates[0];
  if (!candidates.some(c => c.name === entry.name)) {
    fail(`${where}: name "${entry.name}" does not match any DEVICES entry for pid 0x${entry.pid.toString(16)} (candidates: ${candidates.map(c => c.name).join(', ')})`);
  }

  if (!STATUS_VALUES.has(entry.status)) {
    fail(`${where}: status must be one of ${[...STATUS_VALUES].join('|')} (got ${JSON.stringify(entry.status)})`);
  }

  if (entry.transports != null) {
    if (typeof entry.transports !== 'object' || Array.isArray(entry.transports)) {
      fail(`${where}: transports must be a mapping`);
    } else {
      const allowed = new Set(dev.transports);
      for (const [k, v] of Object.entries(entry.transports)) {
        if (!TRANSPORT_VALUES.has(k)) {
          fail(`${where}: transport "${k}" is not a known transport`);
        } else if (!allowed.has(k)) {
          fail(`${where}: transport "${k}" not declared in DEVICES[].transports (allowed: ${[...allowed].join(', ')})`);
        }
        if (!STATUS_VALUES.has(v)) {
          fail(`${where}: transport "${k}" status must be one of ${[...STATUS_VALUES].join('|')} (got ${JSON.stringify(v)})`);
        }
      }
    }
  }

  const lastVerified = parseDate(entry.lastVerified);
  if (!lastVerified) {
    fail(`${where}: lastVerified must be YYYY-MM-DD (got ${JSON.stringify(entry.lastVerified)})`);
  }

  if (typeof entry.packageVersion !== 'string' || !SEMVER.test(entry.packageVersion)) {
    fail(`${where}: packageVersion must be semver (got ${JSON.stringify(entry.packageVersion)})`);
  }

  if (!Array.isArray(entry.reports)) {
    fail(`${where}: reports must be a list (use [] for none)`);
    continue;
  }

  let latestReportDate = null;
  for (const [j, rep] of entry.reports.entries()) {
    const rwhere = `${where} reports[${j}]`;
    totalReports++;

    if (typeof rep?.issue !== 'number') {
      fail(`${rwhere}: issue must be a number`);
    } else if (seenIssues.has(rep.issue)) {
      fail(`${rwhere}: issue #${rep.issue} already used by ${seenIssues.get(rep.issue)}`);
    } else {
      seenIssues.set(rep.issue, dev.name);
    }

    if (typeof rep?.reporter !== 'string' || !rep.reporter.startsWith('@')) {
      fail(`${rwhere}: reporter must be a "@handle" string`);
    }

    const repDate = parseDate(rep?.date);
    if (!repDate) {
      fail(`${rwhere}: date must be YYYY-MM-DD`);
    } else if (!latestReportDate || repDate > latestReportDate) {
      latestReportDate = repDate;
    }

    if (!REPORT_RESULT_VALUES.has(rep?.result)) {
      fail(`${rwhere}: result must be one of ${[...REPORT_RESULT_VALUES].join('|')}`);
    }

    if (rep?.os != null && !OS_VALUES.has(rep.os)) {
      fail(`${rwhere}: os must be one of ${[...OS_VALUES].join('|')} (got ${JSON.stringify(rep.os)})`);
    }

    if (rep?.selfVerified != null && typeof rep.selfVerified !== 'boolean') {
      fail(`${rwhere}: selfVerified must be a boolean`);
    }
  }

  if (lastVerified && latestReportDate && latestReportDate > lastVerified) {
    fail(`${where}: lastVerified ${entry.lastVerified} precedes latest report date ${latestReportDate.toISOString().slice(0, 10)}`);
  }
}

if (errors.length > 0) {
  console.error(`[validate-hardware-status] ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log(`OK — ${doc.devices.length} devices, ${totalReports} reports`);
