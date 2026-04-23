#!/usr/bin/env python3
# Usage: python3 scripts/capture-status.py <label>
# e.g.   python3 scripts/capture-status.py DK-22251
#        python3 scripts/capture-status.py DK-11201
import sys, time
import usb.core, usb.util

BROTHER_VID = 0x04f9
BROTHER_PID = 0x209d
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'unknown'

BYTE_NAMES = [
    'Print head mark','Size','Fixed B','Device dep','Device dep',
    'Fixed 0x30','Country?','Fixed 0x00',
    'Error info 1','Error info 2',
    'Media width mm','Media type',
    'byte12','byte13','byte14','Mode',
    'byte16','Media length mm','Status type','Phase type',
    'Phase no hi','Phase no lo','Notification','byte23','byte24',
    'byte25','byte26','byte27','byte28','byte29','byte30','byte31',
]

def dump(data, label):
    print(f"\n=== {label} ({len(data)} bytes) ===")
    for i, b in enumerate(data):
        name = BYTE_NAMES[i] if i < len(BYTE_NAMES) else f'byte{i}'
        print(f"  [{i:02d}] 0x{b:02X}  ({b:3d})  {name}")

def drain(ep_in):
    """Read and discard any bytes already sitting in the IN buffer."""
    while True:
        try:
            ep_in.read(64, timeout=100)
        except:
            break

dev = usb.core.find(idVendor=BROTHER_VID, idProduct=BROTHER_PID)
if dev is None:
    print("Device not found — unplug/replug and try again")
    sys.exit(1)

print(f"Found: VID=0x{BROTHER_VID:04x} PID=0x{BROTHER_PID:04x}  roll: {LABEL}")

if dev.is_kernel_driver_active(0):
    dev.detach_kernel_driver(0)

try:
    dev.set_configuration()
except usb.core.USBError as e:
    print(f"set_configuration skipped ({e}) — proceeding anyway")

intf = dev.get_active_configuration()[(0, 0)]
ep_out = usb.util.find_descriptor(intf, custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT)
ep_in  = usb.util.find_descriptor(intf, custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_IN)

# Preamble puts printer in raster mode (needed for status to respond)
ep_out.write(bytes([0x1b, 0x69, 0x61, 0x01]) + bytes(200) + bytes([0x1b, 0x40]) + bytes([0x1b, 0x69, 0x61, 0x01]))
time.sleep(0.5)
drain(ep_in)

# --- 32-byte status ---
ep_out.write(bytes([0x1b, 0x69, 0x53]))
time.sleep(0.8)
try:
    data = ep_in.read(64, timeout=3000)
    dump(data[:32], f"STATUS — {LABEL}")
except Exception as e:
    print(f"STATUS read failed: {e}")

drain(ep_in)

# --- amedia (should be 127 bytes if supported) ---
ep_out.write(bytes([0x1b, 0x69, 0x55, 0x77, 0x01]))
time.sleep(0.8)
try:
    data2 = ep_in.read(256, timeout=3000)
    dump(data2, f"AMEDIA — {LABEL}")
except Exception as e:
    print(f"AMEDIA: no response — {e}")

usb.util.release_interface(dev, 0)
print("\nDone.")
