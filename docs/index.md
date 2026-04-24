---
layout: home

hero:
  name: '@thermal-label/brother-ql'
  text: Brother QL label printing without the bloat
  tagline: No vendor software. No proprietary drivers. Just USB, TCP, Bluetooth-SPP, TypeScript, and a clean API — from Node.js or the browser.
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
    title: Node.js
    details: USB via libusb, TCP for network-connected QL printers, or Bluetooth-SPP via the OS serial port (QL-820NWB). All models from QL-500 to QL-1115NWB.
    link: /node
    linkText: Node.js guide
  - icon: 🌐
    title: Browser
    details: WebUSB in Chrome/Edge, plus Web Serial for OS-paired QL-820NWB Bluetooth. Secure context required.
    link: /web
    linkText: Web guide
  - icon: 🔴
    title: Two-color printing
    details: Black + red support for QL-800, QL-810W, and QL-820NWB with DK-22251 labels — driven by a single print() call, colour split in core.
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
