[**brother-ql**](../../../README.md)

***

[brother-ql](../../../README.md) / [node/src](../README.md) / BrotherQLDiscoveryOptions

# Interface: BrotherQLDiscoveryOptions

## Properties

### community?

> `optional` **community?**: `string`

SNMP community for every SNMP use this discovery makes: the scan,
identification on `openPrinter({ host })`, and the printer's status
side channel. `OpenOptions.snmpCommunity` wins per call. Default
`'public'`.

***

### network?

> `optional` **network?**: `boolean`

Scan the LAN (SNMP broadcast) in `listPrinters()` and fall back to
it in `openPrinter({ serialNumber })`. Default `true`; set `false`
for tests, air-gapped hosts, or callers that only want USB.
