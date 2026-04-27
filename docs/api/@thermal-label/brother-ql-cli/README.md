[**Documentation**](../../README.md)

***

[Documentation](../../packages.md) / @thermal-label/brother-ql-cli

# @thermal-label/brother-ql-cli

CLI for Brother QL label printers.

## Install

```bash
# Global
npm install -g @thermal-label/brother-ql-cli

# Or as a dev dependency
pnpm add -D @thermal-label/brother-ql-cli
```

## Commands

### List printers

```bash
brother-ql list
```

### Show printer status

```bash
brother-ql status
brother-ql status --host 192.168.1.100
```

### Print text

```bash
brother-ql print text "Hello World" --media 259
brother-ql print text "Inverted" --media 259 --invert
brother-ql print text "Big" --media 259 --scale-x 2 --scale-y 2
brother-ql print text "No cut" --media 259 --no-cut
```

### Print image

```bash
brother-ql print image label.png --media 259
brother-ql print image label.png --media 259 --threshold 128 --dither
brother-ql print image label.png --media 259 --rotate 90
```

### Print two-color (QL-800 series)

```bash
brother-ql print two-color black.png red.png --media 259
```

## Requirements

- Node.js `>=24.0.0`

## License

MIT © Mannes Brak

## Functions

- [run](functions/run.md)
