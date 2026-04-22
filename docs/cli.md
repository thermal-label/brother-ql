# CLI Guide

## Install

```bash
# Global install
npm install -g @thermal-label/brother-ql-cli

# Or as a dev dependency
pnpm add -D @thermal-label/brother-ql-cli
```

## List connected printers

```bash
brother-ql list
```

Outputs each connected Brother QL printer with its model name, serial number, and USB path.

## Show printer status

```bash
# USB (first connected printer)
brother-ql status

# TCP/network
brother-ql status --host 192.168.1.100
```

Displays: ready state, media width and type, any active error flags.

## Print text

```bash
brother-ql print text "Hello World" --media 259
brother-ql print text "Inverted" --media 259 --invert
brother-ql print text "Big" --media 259 --scale-x 2 --scale-y 2
brother-ql print text "No cut" --media 259 --no-cut
brother-ql print text "Network" --media 259 --host 192.168.1.100
```

### `print text` options

| Flag | Description |
|---|---|
| `-m, --media <id>` | Media ID (required, e.g. `259` for 62mm continuous) |
| `--invert` | White text on black background |
| `--scale-x <n>` | Horizontal pixel scale (default 1) |
| `--scale-y <n>` | Vertical pixel scale (default 1) |
| `--no-cut` | Disable auto-cut |
| `--host <ip>` | Use TCP transport instead of USB |
| `--serial <sn>` | Target printer by serial number |

## Print image

```bash
brother-ql print image label.png --media 259
brother-ql print image label.png --media 259 --threshold 128 --dither
brother-ql print image label.png --media 259 --rotate 90
brother-ql print image label.png --media 259 --invert
```

Requires `@napi-rs/canvas` for PNG/JPEG decoding (installed automatically with the CLI as an optional peer).

### `print image` options

| Flag | Description |
|---|---|
| `-m, --media <id>` | Media ID (required) |
| `--threshold <0-255>` | B&W threshold (default 128) |
| `--dither` | Floyd-Steinberg dithering |
| `--invert` | Invert black and white |
| `--rotate <0\|90\|180\|270>` | Rotate image before printing |
| `--no-cut` | Disable auto-cut |
| `--host <ip>` | Use TCP transport |
| `--serial <sn>` | Target printer by serial number |

## Print two-color label

```bash
brother-ql print two-color black.png red.png --media 259
brother-ql print two-color black.png red.png --media 259 --dither
```

Requires a QL-800, QL-810W, or QL-820NWB printer with DK-22251 labels (black + red on white).

Provide two separate image files: one for the black layer, one for the red layer.

### `print two-color` options

| Flag | Description |
|---|---|
| `-m, --media <id>` | Media ID (required) |
| `--threshold <0-255>` | B&W threshold applied to both layers |
| `--dither` | Floyd-Steinberg dithering on both layers |
| `--invert` | Invert both layers |
| `--no-cut` | Disable auto-cut |
| `--host <ip>` | Use TCP transport |
| `--serial <sn>` | Target printer by serial number |

## Common media IDs

| ID | Width | Type |
|---|---|---|
| 257 | 12mm | Continuous |
| 258 | 29mm | Continuous |
| 264 | 38mm | Continuous |
| 262 | 50mm | Continuous |
| 261 | 54mm | Continuous |
| 259 | 62mm | Continuous |
| 271 | 29×90mm | Die-cut |
| 275 | 62×100mm | Die-cut |

See the full list on the [Hardware page](/hardware).
