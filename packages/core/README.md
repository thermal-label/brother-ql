# @thermal-label/brother-ql-core

Protocol encoding, device registry, and media registry for Brother QL label printers.

> Consumers rarely import this package directly — use `@thermal-label/brother-ql-node` (Node.js) or `@thermal-label/brother-ql-web` (browser) instead. This package is for porting or advanced use cases.

## Key Exports

- `encodeJob(pages, options?)` — encode a complete print job to a `Uint8Array` byte stream
- `DEVICES` — registry of all supported Brother QL devices
- `MEDIA` — registry of all supported label media
- `findDevice(vid, pid)` — look up a device descriptor by USB VID+PID
- `findMedia(id)` — look up a media descriptor by ID
- `renderText`, `renderImage` — re-exported from `@mbtech-nl/bitmap`

## Requirements

- Node.js `>=24.0.0`
- Runs in browser and Node.js — no Node.js built-ins used

## License

MIT © Mannes Brak
