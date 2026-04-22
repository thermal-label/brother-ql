import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  title: '@thermal-label/brother-ql',
  description: 'TypeScript driver for Brother QL label printers — USB, TCP, WebUSB',
  base: '/brother-ql/',
  ignoreDeadLinks: [
    /^\.\/LICENSE$/,
    /^\.\/(cli|core|node|web)\/dist\/README$/,
    /^\.\/(cli|core|node|web)\/dist\/src\/README$/,
  ],
  themeConfig: {
    nav: [
      { text: 'Get started', link: '/getting-started' },
      { text: 'Node.js', link: '/node' },
      { text: 'CLI', link: '/cli' },
      { text: 'Web', link: '/web' },
      { text: 'Hardware', link: '/hardware' },
      { text: 'Core', link: '/core' },
      { text: 'Protocol', link: '/protocol' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
    ],
    sidebar: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Node.js', link: '/node' },
      { text: 'CLI', link: '/cli' },
      { text: 'Web', link: '/web' },
      { text: 'Hardware', link: '/hardware' },
      { text: 'Core', link: '/core' },
      { text: 'Protocol', link: '/protocol' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/thermal-label/brother-ql' }],
    search: { provider: 'local' },
  },
  vite: {
    resolve: {
      alias: {
        '@thermal-label/brother-ql-web': fileURLToPath(
          new URL('../../packages/web/src/index.ts', import.meta.url),
        ),
      },
    },
  },
});
