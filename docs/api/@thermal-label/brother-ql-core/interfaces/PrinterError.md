[**Documentation**](../../../README.md)

***

[Documentation](../../../packages.md) / [@thermal-label/brother-ql-core](../README.md) / PrinterError

# Interface: PrinterError

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:28

A single error reported by the printer.

Use `code` for programmatic branching (e.g. showing an "out of paper"
dialog) and `message` for display.

## Properties

### code

> **code**: `string`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:34

Machine-readable error code, e.g. `'no_media'`, `'cover_open'`,
`'cutter_jam'`. Driver-specific — document the full set in each
driver's README.

***

### message

> **message**: `string`

Defined in: node\_modules/.pnpm/@thermal-label+contracts@0.2.0/node\_modules/@thermal-label/contracts/dist/status.d.ts:36

Human-readable error description, safe to show to the end user.
