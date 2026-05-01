# Verification checklist — Brother QL

This is the family-specific checklist. Follow [the verification
guide](https://github.com/thermal-label/.github/blob/main/CONTRIBUTING/verifying-hardware.md)
for context — that doc explains _why_ and _what to do with the output_.

Capture the terminal output and a photo of the printed label, then
file your report on the
[Hardware verification issue template](https://github.com/thermal-label/brother-ql/issues/new?template=hardware_verification.yml).

> **Media id 259 = `52×29mm die-cut (DK-11209)`** — the default for
> these examples. Substitute your actual installed media id (run
> `thermal-label status` to see what's detected).

## Setup

```bash
npm install -g thermal-label-cli @thermal-label/brother-ql-node
```

Linux only — install a udev rule for VID `0x04f9`. A generic rule
that works:

```
# /etc/udev/rules.d/99-brother-ql.rules
SUBSYSTEMS=="usb", ATTR{idVendor}=="04f9", MODE="0666"
```

After saving, run `sudo udevadm control --reload-rules && sudo
udevadm trigger`.

## 1. Device is detected

```bash
thermal-label list
```

**Expected:** your printer appears with the correct model name and
PID, e.g. `QL-820NWBc (0x209d) — usb`.

If multiple printers are connected, all of them should appear.

## 2. Status is readable

```bash
thermal-label status
```

**Expected:** `ready: true`, `mediaLoaded: true`, `errors: []`,
`detectedMedia` populated with your installed media id and dimensions.

## 3. Print a text label

```bash
thermal-label print text "verify $(date +%Y-%m-%d)" --media 259
```

**Expected:** a sharp, readable label exits the printer with the
current date.

If your printer has auto-cut, the label is cut after printing.

## 4. Print an image

```bash
# any small PNG or JPEG works; anything ≤ the head width prints fine
thermal-label print image small.png --media 259
```

**Expected:** the image renders crisply, no banding, no streaks.

## 5. (TCP-capable models) Print over network

QL-720NW, QL-810W, QL-820NWB / QL-820NWBc, QL-1110NWB, QL-1115NWB,
QL-580N, QL-1060N — these support TCP. Find the printer's IP from its
front panel or your router.

```bash
thermal-label list --host 192.0.2.42
thermal-label status --host 192.0.2.42
thermal-label print text "tcp test" --media 259 --host 192.0.2.42
```

**Expected:** equivalent results to the USB run.

## 6. (QL-800 / 810W / 820NWB / 820NWBc) Two-colour printing

Requires DK-22251 (62 mm continuous black + red) loaded and the
right media id (`251`). Use any two-colour bitmap or the bundled
test asset:

```bash
thermal-label print image color-label.png --media 251
```

**Expected:** black + red render correctly, no plane misalignment.

## 7. (QL-1100 / QL-1110NWB) Mass-storage mode check

These models boot into mass-storage mode by default on Windows /
macOS. On Linux, the driver detects this and surfaces a clear error:

```bash
# With the printer in mass-storage mode (LED indicates):
thermal-label status
# Expected: an error message stating the printer is in mass-storage
# mode and cannot accept jobs. Apply the usb_modeswitch rule (shipped
# in this repo's udev/ folder, when published) to switch to label
# mode.
```

If your QL-1100/1110NWB never boots into mass-storage mode (some
Linux distros have the right rules pre-installed), skip this step.

## 8. (Browser) WebUSB live demo

Open [https://thermal-label.github.io/demo/brother-ql](https://thermal-label.github.io/demo/brother-ql)
in a Chromium-class browser, click Pair, select your printer, and
print the demo label.

**Expected:** the same label content as step 3.

If pairing fails on Linux, your browser likely lacks USB access —
the same udev rule from setup is required for WebUSB too.

## What to capture for the report

- The full terminal output of steps 1–4 (and 5–8 if applicable).
- A clear photo of one printed label (a phone snap is fine).
- The exact `@thermal-label/brother-ql-node` version printed by
  `thermal-label --version`.
- Your OS and Node version.
- Anything weird — even if it didn't break the test.
