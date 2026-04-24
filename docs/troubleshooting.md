# Troubleshooting

Things often work on the first try, but the setup can be finicky. This page covers the most common problems in one place.

## All platforms

### Editor Lite mode

**Symptom:** `brother-ql list` finds no printers, or the printer shows up as a USB mass storage device instead of a printer.

Models QL-700 and later have an **Editor Lite** mode. When the **green LED is lit**, the printer acts as a USB flash drive and ignores all raster print commands.

**Fix:** hold the Editor Lite button (labeled with a P-touch icon) until the green LED turns off. The printer disconnects and reconnects as a printer class device.

This is a hardware toggle — the driver cannot change it programmatically. Once the LED is off, run `brother-ql list` again.

---

### Wrong roll type error

**Symptom:** The printer returns a "wrong roll type" error, or the job is rejected silently and nothing prints.

The most common cause is using the **DK-22251** (62mm black+red two-color tape) with the wrong media ID.

The roll is marked **"251"** on the label. Use `--media 251` (or `findMedia(251)` in code), **not** `--media 259`. The DK-22251 requires two-color mode even for black-only jobs — the driver enables this automatically when you use media ID `251`.

```bash
# Correct:
brother-ql print text "Hello" --media 251

# Wrong — returns "wrong roll type" when DK-22251 is loaded:
brother-ql print text "Hello" --media 259
```

::: info Roll markings vs media IDs
The number printed on the roll is the last three digits of the DK product code (DK-22**251** → "251"). This does **not** always map directly to the media ID — see the [hardware reference](hardware.md) for the full table.
:::

---

### No printers found

**Symptom:** `discovery.listPrinters()` returns an empty list, or `discovery.openPrinter()` throws "No compatible Brother QL printer found."

1. Check Editor Lite mode first (green LED must be off).
2. Unplug and replug the USB cable.
3. Try a different USB port or cable.
4. On Linux: check [udev rules](#linux-udev-rules-no-access) below.
5. On Windows: check the [WinUSB driver](#windows-official-driver-blocks-usb-access) section below.

---

## Linux

### udev rules — no access

**Symptom:** `discovery.listPrinters()` finds the printer but `discovery.openPrinter()` throws `LIBUSB_ERROR_ACCESS`, or nothing happens at all.

Raw USB access on Linux requires a udev rule. Create `/etc/udev/rules.d/99-brother-ql.rules`:

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="04f9", MODE="0666", TAG+="uaccess"
```

`TAG+="uaccess"` is required for **WebUSB** (Chrome/Edge) to claim the interface. Without it, the browser cannot detach the `usblp` kernel driver.

Reload and re-plug:

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

---

### ipp-usb conflict

**Symptom:** `discovery.openPrinter()` throws `LIBUSB_ERROR_BUSY`, or WebUSB throws `claimInterface failed`.

Modern Linux desktops run **ipp-usb**, a daemon that auto-claims any USB printer-class interface — including Brother QL printers, even though they don't speak IPP.

**Fix:** blacklist the Brother QL in ipp-usb:

```bash
sudo mkdir -p /etc/ipp-usb/quirks
sudo tee /etc/ipp-usb/quirks/brother-ql.conf << 'EOF'
# Brother QL label printers use a raw raster protocol, not IPP.
[Brother QL-*]
  blacklist = true
EOF
sudo systemctl restart ipp-usb
```

Unplug and replug the printer after restarting ipp-usb. Verify with:

```bash
ipp-usb check   # should not list your QL printer
```

---

### usblp kernel module

**Symptom:** `LIBUSB_ERROR_BUSY` persists even after fixing ipp-usb.

The `usblp` kernel module can also claim the printer interface. Unload it:

```bash
sudo rmmod usblp
```

To prevent it from loading on boot:

```bash
echo "blacklist usblp" | sudo tee /etc/modprobe.d/usblp-blacklist.conf
```

---

## Windows

### Official driver blocks USB access

**Symptom (Node.js):** `brother-ql list` finds no printers. Device Manager shows the printer with the official Brother driver.

The official Brother driver takes exclusive control of the USB interface and blocks libusb from claiming it.

**Fix:** use [Zadig](https://zadig.akeo.ie/) to replace the printer driver with **WinUSB**:

1. Download and run Zadig.
2. Select the Brother QL printer from the list (you may need to enable "List all devices" in the Options menu).
3. Select **WinUSB** as the target driver and click "Replace Driver".
4. Run `brother-ql list` again.

::: tip WebUSB
Replacing the driver with Zadig is only needed for Node.js. Chrome and Edge manage WebUSB access through their own driver stack and do not need Zadig.
:::

---

## macOS

### Printer not found

macOS generally works without any extra setup. If the printer is not found:

1. Check Editor Lite mode (green LED must be off).
2. Try a different USB port.
3. Open **System Settings → Printers & Scanners** and remove any existing Brother QL entry, then replug. The macOS printer driver can hold the interface.

---

## Browser / WebUSB

### claimInterface fails

**Symptom:** `requestPrinter()` opens the device selection dialog but immediately throws after selection.

Common causes:

- **Linux:** missing udev rule or ipp-usb conflict — see the Linux sections above.
- **macOS:** a system printer driver is holding the interface. Remove the printer from System Settings → Printers & Scanners and replug.
- **Windows:** Zadig is not needed for WebUSB — the browser manages driver access itself.

---

### Device not in selection dialog

WebUSB filters by vendor ID (`0x04f9`). If the printer does not appear in the dialog:

1. The printer may be in Editor Lite mode — check the LED.
2. The browser may need a page reload after the printer is plugged in.
3. On Linux, confirm `TAG+="uaccess"` is in the udev rule (not just `MODE="0666"`).

---

### Bluetooth

Bluetooth is **out of scope**. The QL-810W and QL-820NWB support Bluetooth, but it requires platform-specific pairing, RFCOMM/SPP stack, and considerably more complexity for uncertain benefit. Use USB or TCP (WiFi/LAN) instead.
