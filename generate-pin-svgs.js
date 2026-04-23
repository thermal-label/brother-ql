#!/usr/bin/env node
/**
 * generate-pin-svgs.js
 *
 * Generates 64 tiny SVG files (sw-00.svg through sw-63.svg) representing
 * the Brother QL spool switch (CAS) pin patterns, plus pin-layout.svg
 * showing the physical pin arrangement.
 *
 * Physical layout (bottom view of spool foot):
 *
 *   [4]  [3]     ← pin 4 offset left, pin 3 top of column
 *        [2]
 *        [1]
 *        [0]
 *        [5]     ← pin 5 bottom of column
 *
 * Filled circle  = 1 (projection present, switch pressed)
 * Hollow circle  = 0 (no projection)
 *
 * SW number = binary [SW5][SW4][SW3][SW2][SW1][SW0]
 *
 * Usage:
 *   node generate-pin-svgs.js [output-dir]
 *   Default output dir: ./docs/pins
 */

import fs from 'fs';
import path from 'path';

const outDir = process.argv[2] || './docs/public/pins';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Pin positions (cx, cy) in 11×29 viewBox
const pins = [
  // [index, cx, cy]  — render top to bottom, left to right
  [4, 2.5,  2.5],   // pin 4, offset left
  [3, 8.5,  2.5],   // pin 3, top of column
  [2, 8.5,  8.5],   // pin 2
  [1, 8.5, 14.5],   // pin 1
  [0, 8.5, 20.5],   // pin 0
  [5, 8.5, 26.5],   // pin 5, bottom of column
];

const R = 2.2; // circle radius

// Generate 64 switch-pattern SVGs
for (let sw = 0; sw < 64; sw++) {
  const bits = [
    (sw >> 0) & 1, // SW0
    (sw >> 1) & 1, // SW1
    (sw >> 2) & 1, // SW2
    (sw >> 3) & 1, // SW3
    (sw >> 4) & 1, // SW4
    (sw >> 5) & 1, // SW5
  ];

  const circles = pins
    .map(([pinIndex, cx, cy]) => {
      const val = bits[pinIndex];
      return val === 1
        ? `  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#444" stroke="#444" stroke-width="0.5"/>`
        : `  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#999" stroke-width="0.7"/>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="58" viewBox="0 0 11 29" role="img">
  <title>SW ${sw} pin pattern</title>
${circles}
</svg>
`;

  fs.writeFileSync(path.join(outDir, `sw-${String(sw).padStart(2, '0')}.svg`), svg);
}

// Generate the pin-layout reference diagram
const layoutSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="120" viewBox="0 0 48 120" role="img">
  <title>Brother QL spool pin layout</title>
  <desc>Pin 4 offset left, pins 3 2 1 0 5 in vertical column</desc>
  <style>
    circle { fill: none; stroke: #666; stroke-width: 1.2; }
    text { font-family: sans-serif; font-size: 10px; fill: #666; text-anchor: middle; dominant-baseline: central; }
  </style>
  <!-- Pin 4 (offset left) -->
  <circle cx="12" cy="12" r="10"/>
  <text x="12" y="12">4</text>
  <!-- Pin 3 -->
  <circle cx="36" cy="12" r="10"/>
  <text x="36" y="12">3</text>
  <!-- Pin 2 -->
  <circle cx="36" cy="36" r="10"/>
  <text x="36" y="36">2</text>
  <!-- Pin 1 -->
  <circle cx="36" cy="60" r="10"/>
  <text x="36" y="60">1</text>
  <!-- Pin 0 -->
  <circle cx="36" cy="84" r="10"/>
  <text x="36" y="84">0</text>
  <!-- Pin 5 -->
  <circle cx="36" cy="108" r="10"/>
  <text x="36" y="108">5</text>
</svg>
`;

fs.writeFileSync(path.join(outDir, 'pin-layout.svg'), layoutSvg);

console.log(`Generated 64 switch SVGs + pin-layout.svg in ${outDir}/`);
