# Node.js Guide

`@thermal-label/brother-ql-node` implements the `PrinterAdapter`
interface from
[`@thermal-label/contracts`](https://www.npmjs.com/package/@thermal-label/contracts),
built on
[`@thermal-label/transport`](https://www.npmjs.com/package/@thermal-label/transport).
Single `print(image, media?, options?)` handles both single-ink and
multi-ink labels — the driver runs `renderMultiPlaneImage()` from
`@mbtech-nl/bitmap` internally whenever the resolved media carries a
`palette`, and auto-rotates landscape input on media tagged
`defaultOrientation: 'horizontal'`.

## Install

```bash
pnpm add @thermal-label/brother-ql-node
```

## Quick example

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

const printer = await discovery.openPrinter();
try {
  await printer.print(image, MEDIA[259]); // 62mm continuous
} finally {
  await printer.close();
}
```

---

## The adapter

`BrotherQLPrinter` implements `PrinterAdapter`:

| Method                                                        | Description                                            |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `print(image, media?, options?)`                              | Print one label (single- or two-colour)                |
| `createPreview(image, options?)`                              | Render 1bpp planes for UI previews                     |
| `getStatus()`                                                 | `BrotherQLStatus` — contracts shape + `editorLiteMode` |
| `close()`                                                     | Release the transport                                  |
| `family` / `model` / `device` / `transportType` / `connected` | Identification                                         |

Over TCP, `getStatus()` and the print confirmation in `print()` use
the printer's SNMP agent; see [Network printers](#network-printers).

---

## Discovery

```ts
import { discovery } from '@thermal-label/brother-ql-node';

const printers = await discovery.listPrinters();
// [
//   { device, serialNumber, transport: 'usb', connectionId: '1:3' },
//   { device, serialNumber, transport: 'tcp', connectionId: '192.168.1.67:9100',
//     host: '192.168.1.67', port: 9100 },
// ]

// First connected USB printer
const printer = await discovery.openPrinter();

// Target by serial number — USB descriptor or the network printer's
// SNMP serial, whichever has it
const specific = await discovery.openPrinter({ serialNumber: 'SN001234' });

// Target by VID/PID
const ql820 = await discovery.openPrinter({ pid: 0x209d });

// Re-open a listed network printer without a second identification
const remote = printers.find(p => p.transport === 'tcp')!;
const same = await discovery.openPrinter({
  host: remote.host,
  port: remote.port,
  deviceKey: remote.device.key,
});
```

`listPrinters()` enumerates USB and sends one SNMP broadcast to the
local subnets, concurrently; USB entries come first. The broadcast
collects answers for one second, so the call takes at least that
long, and either half can be missing (no `usb` addon installed, no
network) without hiding the other. Printers in Editor Lite
(mass-storage) mode expose a PID outside the registry and are absent
from the USB list.

`new BrotherQLDiscovery({ network: false })` skips the broadcast
(tests, air-gapped hosts, USB-only callers); `{ community }` sets the
SNMP community for the scan (default `public`). The exported
`discovery` singleton uses the defaults.

`listMedia()` returns the core media catalog, for callers that let a
user pick media by id or name instead of relying on detection.

### Network printers

```ts
const printer = await discovery.openPrinter({ host: '192.168.1.67' });
// Custom port (default 9100) and SNMP community (default 'public')
const printer = await discovery.openPrinter({
  host: '10.0.0.5',
  port: 9101,
  snmpCommunity: 'office',
});
// Skip identification: use this registry entry
const printer = await discovery.openPrinter({ host: '192.168.1.67', deviceKey: 'QL_820NWBc' });
```

Port 9100 is write-only on every Brother print server (the raster
reference's network flow has no status arrows; measured on a
QL-820NWBc: `ESC i S` in any framing returns nothing). Everything the
driver knows about a network printer therefore comes from its SNMP
agent (UDP 161, SNMPv1, community `public`), which every Brother NC
print server ships enabled:

| What                                      | Source                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Model (`openPrinter` without `deviceKey`) | `hrDeviceDescr` → `DeviceEntry.modelNames`                                         |
| Serial (`listPrinters`)                   | `prtGeneralSerialNumber`                                                           |
| `getStatus()`                             | `hrPrinterStatus`, `hrPrinterDetectedErrorState`, `prtInputMediaName` + dimensions |
| Print confirmation                        | `prtMarkerLifeCount`                                                               |

`openPrinter({ host })` resolves the registry entry **before**
connecting, in this order:

1. `deviceKey` given → that entry, no SNMP.
2. SNMP names a model in the registry → that entry.
3. Otherwise `DeviceIdentificationRequiredError` from
   `@thermal-label/contracts`, carrying the TCP-capable entries as
   `candidates` and a `continueWith(deviceKey)` closure. Its message
   says which case you are in: `… reports "DYMO LabelWriter 550",
which is not in the brother-ql registry` (SNMP answered, the
   printer is not a Brother QL/PT; status would still work), or `No
SNMP answer from <host> (…); the model cannot be identified and
status is unavailable, so pass media too` (SNMP disabled or
   filtered). The `thermal-label` CLI matches the phrases `no SNMP
answer` / `status is unavailable` in that message to decide
   whether its hint adds `--media`; keep them if you change the
   wording.

A printer that declines never gets a 9100 connection, so walking
several drivers over the same host is safe.

#### Status over the network

`getStatus()` on a `'tcp'` printer never writes to the socket. It
reads the Printer-MIB in one request and maps it with
`statusFromPrinterMib` from core: `ready` is idle/printing with no
error bits, the RFC 2790 error bits become the usual `errors` codes
(`no_media`, `cover_open`, `cutter_jam`, `not_ready`, `system_error`),
`detectedMedia` comes from the media name (`29mm x 90mm / …` → id 271,
`62mm / …` → id 259), and `rawBytes` is empty. When SNMP does not
answer, `getStatus()` rejects with a message that says so; pass
`media` to `print()` explicitly in that case.

**Two-colour rolls are invisible over the network.** DK-22251
(black + red) and DK-22205 both report `62mm / 2.4"`; the printer's
own status byte that tells them apart is USB/serial only. The driver
resolves the single-colour entry (259) and adds a `details` row
`{ label: 'Two-colour', value: 'not detectable over network',
severity: 'warn' }` whenever the detected width has a two-colour
sibling. A single-colour job on a DK-22251 roll is rejected by the
printer, silently on 9100, so on that roll pass `MEDIA[251]` yourself.

#### Print confirmation

Because 9100 never answers, `print()` on a `'tcp'` printer proves the
job ran: it reads `prtMarkerLifeCount` before sending and polls it
afterwards until it moves. If the counter has not moved after 10 s of
idle (up to 60 s while the agent still reports `printing`), `print()`
rejects with `… the printer did not print it`, plus the DK-22251 hint
when the roll width has a two-colour sibling. If SNMP stops answering
after the job was sent, the rejection says `sent but could not be
confirmed` instead, so the two cases are distinguishable. The counter
is read before anything is sent: when SNMP is unreachable nothing goes
out and the error tells you to pass `{ confirm: false }` (contracts
`PrintOptions.confirm`; the CLI does this itself when `--media` is
given and the status query failed), which sends the job blind:

```ts
await printer.print(image, MEDIA[259], { confirm: false });
```

Bench, QL-820NWBc, 2026-09-16: `prtMarkerLifeCount` answers (24 at the
time of reading) and a TCP print with confirmation on succeeded, so the
counter does move per job on that model. Other models are unverified;
`{ confirm: false }` is the escape hatch if one turns out not to carry
the object.

### Bluetooth (QL-820NWB / 820NWBc)

The 820 series uses classic Bluetooth (SPP), not BLE — so Web
Bluetooth is not an option. Pair the printer via the OS Bluetooth
settings, then open the RFCOMM serial port. Serial carries no model
signal and the registry has more than one serial-capable entry, so
name the model with `deviceKey` (without it `openPrinter` throws
`DeviceIdentificationRequiredError` with the serial candidates):

```ts
// Linux: /dev/rfcomm0 after `bluetoothctl pair` + `rfcomm bind`
// Windows: auto-assigned COM<n> after OS pairing
// macOS: not supported — no classic Bluetooth SPP in modern macOS
const printer = await discovery.openPrinter({
  serialPath: '/dev/rfcomm0',
  deviceKey: 'QL_820NWBc',
});

// Optional baud rate — default 9600 (ignored by RFCOMM)
const printer = await discovery.openPrinter({
  serialPath: 'COM3',
  baudRate: 115200,
  deviceKey: 'QL_820NWBc',
});
```

`path` is still accepted as an alias for `serialPath` in 0.6.x.

---

## Media

`MEDIA` keys are the numeric firmware IDs the printer reports in its
32-byte status response:

```ts
import { MEDIA, type BrotherQLMedia } from '@thermal-label/brother-ql-core';

MEDIA[259]; // 62mm continuous (DK-22205) — DEFAULT_MEDIA for previews
MEDIA[251]; // 62mm continuous two-colour (DK-22251)
MEDIA[274]; // 62×29mm die-cut (DK-11209)
// ...
```

On any QL series printer, `getStatus()` populates `detectedMedia`
from the roll in the printer (over USB/serial from the status bytes,
over TCP from SNMP). Subsequent `print()` calls can omit `media` and
the adapter reuses the detection automatically. `print()` throws
`MediaNotSpecifiedError` when neither an explicit media nor a
status-detected media is available.

---

## Printing

### Single-colour (most media)

```ts
await printer.print(image, MEDIA[259]);
```

### Two-colour (DK-22251)

Same call — the driver notices `media.palette !== undefined` and
runs `renderMultiPlaneImage()` from `@mbtech-nl/bitmap` on the RGBA
image with `MEDIA[251].palette` (black + red) to separate the two
planes before encoding. Each source pixel is classified to its
nearest palette entry (or to the implicit white background) by RGB
distance, so every dot lands in at most one plane.

```ts
await printer.print(image, MEDIA[251]);
```

Need a different colour threshold? Pre-split and pass separate
planes via the lower-level `encodeJob` in core.

---

## Status

```ts
const status = await printer.getStatus();

status.ready; // printer idle and error-free
status.mediaLoaded; // roll detected
status.detectedMedia; // BrotherQLMedia — always populated when media is loaded
status.errors; // PrinterError[] — structured codes + messages
status.editorLiteMode; // (driver extension) true when QL-820NWB is in Editor Lite
status.rawBytes; // 32-byte raw response for diagnostics (empty over TCP)
status.details; // rows such as { label: 'Model code', value: '4A' } and the network two-colour warning
```

Error codes:

| Code           | Meaning                                    |
| -------------- | ------------------------------------------ |
| `no_media`     | No roll installed                          |
| `cover_open`   | Cover is open                              |
| `cutter_jam`   | Cutter jammed                              |
| `media_end`    | End of roll                                |
| `wrong_media`  | Loaded media doesn't match specified media |
| `not_ready`    | Printer busy / pause                       |
| `system_error` | Internal error (see raw message)           |

---

## Multi-printer setups

```ts
import { discovery } from '@thermal-label/brother-ql-node';
import { MEDIA } from '@thermal-label/brother-ql-core';

for (const { serialNumber } of await discovery.listPrinters()) {
  if (!serialNumber) continue;
  const p = await discovery.openPrinter({ serialNumber });
  try {
    await p.print(image, MEDIA[259]);
  } finally {
    await p.close();
  }
}
```

---

## API summary

| Export                      | Description                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `discovery`                 | `PrinterDiscovery` singleton (network scan on)                                                                |
| `BrotherQLDiscovery`        | Class form; `{ network?: boolean; community?: string }`                                                       |
| `BrotherQLDiscoveryOptions` | Constructor options                                                                                           |
| `BrotherQLPrinter`          | Adapter class                                                                                                 |
| `BrotherQLOpenOptions`      | `OpenOptions` (`host`, `port`, `deviceKey`, `snmpCommunity`, `serialPath`, `baudRate`, …) + deprecated `path` |
| `BrotherQLNetworkOptions`   | `{ host, community? }` the adapter's SNMP side channel                                                        |
