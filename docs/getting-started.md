# Getting Started

## Node.js

Install the Node.js package:

```bash
pnpm add @thermal-label/brother-ql-node
```

Print your first label:

```ts
import { openPrinter, findMedia } from '@thermal-label/brother-ql-node';

const media = findMedia(259)!; // 62mm continuous tape
const printer = await openPrinter();
await printer.printText('Hello QL!', media);
await printer.close();
```

Optional: install `@napi-rs/canvas` for PNG/JPEG image printing:

```bash
pnpm add @napi-rs/canvas
```

## CLI

Install globally:

```bash
npm install -g @thermal-label/brother-ql-cli
```

Print a label:

```bash
brother-ql list
brother-ql print text "Hello" --media 259
```

## Browser (WebUSB)

Install the web package:

```bash
pnpm add @thermal-label/brother-ql-web
```

Print from a button click:

```ts
import { requestPrinter, findMedia } from '@thermal-label/brother-ql-web';

const media = findMedia(259)!;
const printer = await requestPrinter();
await printer.printText('Hello WebUSB', media);
```

## Platform Notes

### Linux — udev rules

Raw USB access on Linux requires a udev rule. Create `/etc/udev/rules.d/99-brother-ql.rules`:

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="04f9", MODE="0666", TAG+="uaccess"
```

`TAG+="uaccess"` is required for WebUSB (Chrome/Edge) to claim the interface. Without it the browser cannot detach the `usblp` kernel driver and `claimInterface` fails.

Then reload and re-plug the printer:

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

### Linux — ipp-usb conflict

Modern Linux systems run `ipp-usb`, a daemon that exposes USB printers over IPP. It auto-claims any USB printer-class interface (class `7/1/4`), which includes Brother QL printers — even though they don't speak IPP. When `ipp-usb` holds the interface, libusb fails with `LIBUSB_ERROR_BUSY` and WebUSB fails with `claimInterface`.

Fix: tell `ipp-usb` to ignore Brother QL printers:

```bash
sudo mkdir -p /etc/ipp-usb/quirks
sudo tee /etc/ipp-usb/quirks/brother-ql.conf << 'EOF'
# Brother QL label printers use a raw raster protocol, not IPP.
[Brother QL-*]
  blacklist = true
EOF
sudo systemctl restart ipp-usb
```

Unplug and replug the printer after restarting `ipp-usb`. You can verify it worked with:

```bash
ipp-usb check   # should show no QL device (or say "no IPP over USB devices")
```

### Windows

**Node.js only:** If `brother-ql list` finds no printers, the official Brother driver may be blocking raw USB access. Use [Zadig](https://zadig.akeo.ie/) to replace the printer driver with WinUSB and try again.

WebUSB (browser) does not require Zadig — Chrome and Edge manage USB access through their own driver stack.

### Editor Lite Mode

Models QL-700 and later have an **Editor Lite** mode. When the green LED is lit, the printer is in Editor Lite mode and operates as a mass storage device — it will not respond to raster print commands.

**To disable Editor Lite mode:** hold the Editor Lite button until the LED turns off. The printer will reconnect as a printer class device.

This is a hardware toggle that cannot be changed by software. The driver will warn you if it detects a printer in Editor Lite mode via `listPrinters()`.

### Bluetooth

Bluetooth is explicitly **out of scope**. The QL-810W and QL-820NWB support Bluetooth connectivity, but it requires platform-specific pairing, a different protocol stack (SPP/RFCOMM), and significantly more complexity for uncertain benefit. Use USB or TCP (via WiFi/LAN) instead.

---

## Looking for a Python alternative?

[brother_ql](https://github.com/pklaus/brother_ql) is a mature open-source Python tool for the same Brother QL printer family. If your stack is Python-based, it may be a better fit.
