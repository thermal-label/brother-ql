---
layout: home

hero:
  name: '@thermal-label/brother-ql'
  text: Brother QL label printing without the bloat
  tagline: No vendor software. No proprietary drivers. Just USB, TypeScript, and a clean API — from Node.js, the CLI, or the browser.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: brand
      text: Try it now →
      link: /demo
    - theme: alt
      text: GitHub
      link: https://github.com/thermal-label/brother-ql

features:
  - icon: 🟢
    title: Node.js (USB + TCP)
    details: Direct USB bulk-transfer printing via libusb, or raw TCP for network-connected QL printers. Supports all QL models from QL-500 to QL-1115NWB.
    link: /node
    linkText: Node.js guide
  - icon: 🌐
    title: Browser (WebUSB)
    details: Print directly from Chrome or Edge without any native drivers or installs. Works in any secure context.
    link: /web
    linkText: Web guide
  - icon: ⌨️
    title: CLI
    details: One-line label printing from the terminal. Global install, no configuration required. USB and TCP supported.
    link: /cli
    linkText: CLI guide
  - icon: 🔴
    title: Two-color printing
    details: Full black + red label support for QL-800, QL-810W, and QL-820NWB with DK-22251 labels.
    link: /hardware
    linkText: Hardware guide
  - icon: 📡
    title: Protocol reference
    details: Complete raster command documentation, USB endpoint topology, status byte layout, and a porting checklist.
    link: /protocol
    linkText: Protocol guide
  - icon: 🖨️
    title: Live demo
    details: Type a label, see a live 1bpp bitmap preview. Connect a Brother QL via WebUSB to print it instantly.
    link: /demo
    linkText: Open demo
---

<div class="home-extra">

<div class="ref-links">
  <a href="./hardware.html" class="ref-link">
    <span class="ref-icon">🖨️</span>
    <span class="ref-body">
      <strong>Supported hardware</strong>
      <span>Device list, USB PIDs, media types, two-color models</span>
    </span>
    <span class="ref-arrow">→</span>
  </a>
  <a href="./protocol.html" class="ref-link">
    <span class="ref-icon">📡</span>
    <span class="ref-body">
      <strong>Protocol reference</strong>
      <span>Raster commands, status bytes, USB topology, porting guide</span>
    </span>
    <span class="ref-arrow">→</span>
  </a>
</div>

<div class="ecosystem">
  <p class="ecosystem-label">Also in this ecosystem</p>
  <div class="ecosystem-links">
    <a href="https://thermal-label.github.io/labelmanager/" class="ecosystem-link" target="_blank" rel="noopener">
      <span class="eco-name">labelmanager</span>
      <span class="eco-desc">DYMO LabelManager PnP</span>
    </a>
    <a href="https://thermal-label.github.io/labelwriter/" class="ecosystem-link" target="_blank" rel="noopener">
      <span class="eco-name">labelwriter</span>
      <span class="eco-desc">DYMO LabelWriter series</span>
    </a>
  </div>
</div>

</div>
