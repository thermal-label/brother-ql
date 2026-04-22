---
layout: home

hero:
  name: brother-ql
  text: TypeScript Label Printer Driver
  tagline: USB, TCP, and WebUSB support for Brother QL series printers. Zero-dependency protocol core. Two-color printing for QL-800 series.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Try the Demo
      link: /demo
    - theme: alt
      text: GitHub
      link: https://github.com/thermal-label/brother-ql

features:
  - title: Node.js (USB + TCP)
    details: Print via USB with libusb or over the network with raw TCP. Supports all QL models from QL-500 to QL-1115NWB.
    link: /node
    linkText: Node.js guide
  - title: Browser (WebUSB)
    details: Print directly from Chrome or Edge without any native drivers. Works in secure contexts.
    link: /web
    linkText: Web guide
  - title: CLI
    details: One-line label printing from the terminal. Global install, no configuration required.
    link: /cli
    linkText: CLI guide
  - title: Two-color printing
    details: Full black + red label support for QL-800, QL-810W, and QL-820NWB with DK-22251 labels.
    link: /hardware
    linkText: Hardware guide
  - title: Protocol reference
    details: Complete raster command documentation, status byte layout, and a porting checklist for other runtimes.
    link: /core
    linkText: Core guide
  - title: Live demo
    details: Type a label, see a live 1bpp bitmap preview. Connect a Brother QL via WebUSB to print it instantly.
    link: /demo
    linkText: Open demo
---

## Ecosystem

This project is part of the [thermal-label](https://github.com/thermal-label) ecosystem:

| Package                          | Description                           |
| -------------------------------- | ------------------------------------- |
| `@thermal-label/brother-ql-node` | Node.js USB and TCP driver            |
| `@thermal-label/brother-ql-web`  | Browser WebUSB driver                 |
| `@thermal-label/brother-ql-cli`  | CLI tool (`brother-ql`)               |
| `@thermal-label/brother-ql-core` | Protocol encoding and device registry |
