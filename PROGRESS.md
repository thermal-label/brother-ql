# Implementation Progress

> Check off each item as it is completed. Do not proceed to the next step until the gate checks pass.
> Plan references link to the relevant section in [PLAN.md](PLAN.md).

---

## Step 1 — Scaffold

- [x] `LICENSE` — [§4.2](PLAN.md#L382)
- [x] `.github/FUNDING.yml` — [§4.3](PLAN.md#L386)
- [x] `.github/ISSUE_TEMPLATE/hardware_verification.yml`
- [x] Root `package.json` — [§4.4](PLAN.md#L393)
- [x] `eslint.config.js` — [§4.5](PLAN.md#L431)
- [x] `tsconfig.base.json` — [§4.6](PLAN.md#L438)
- [x] `pnpm-workspace.yaml`
- [x] `.gitignore`
- [x] `.changeset/` directory
- [x] `.github/workflows/ci.yml` — [§10](PLAN.md#L1288)
- [x] `.github/workflows/release.yml` — [§10](PLAN.md#L1341)
- [x] `.github/workflows/docs.yml` — [§10](PLAN.md#L1405)
- [x] `HARDWARE.md`
- [x] Root `README.md` — [§11](PLAN.md#L1464)
- [x] `PROGRESS.md` (this file)

### Gate
- [x] `pnpm install` completes without errors
- [x] `git commit -m "chore: scaffold monorepo"`

---

## Step 2 — `@thermal-label/brother-ql-core`

> [§5](PLAN.md#L510) · [Devices §1](PLAN.md#L16) · [Protocol §2](PLAN.md#L59) · [Constraints §13](PLAN.md#L1631)

### Setup
- [x] `packages/core/package.json` — [§5.1](PLAN.md#L517)
- [x] `packages/core/README.md` — [§5.1](PLAN.md#L517)
- [x] `packages/core/tsconfig.json`
- [x] `packages/core/vitest.config.ts`

### Source
- [x] `src/types.ts` — all shared types and interfaces — [§5.2](PLAN.md#L552)
- [x] `src/devices.ts` — full device registry — [§5.3](PLAN.md#L636)
- [x] `src/media.ts` — full media registry (continuous + die-cut) — [§2.3](PLAN.md#L87)
- [x] `src/protocol.ts` — all encoder functions — [§5.4](PLAN.md#L754)
- [x] `src/index.ts` — public re-exports — [§5.2](PLAN.md#L552)

### Tests
- [x] `src/__tests__/protocol.test.ts` — [§5.5](PLAN.md#L784)
- [x] `src/__tests__/devices.test.ts` — [§5.5](PLAN.md#L784)
- [x] `src/__tests__/media.test.ts` — [§5.5](PLAN.md#L784)

### Gate
- [x] `pnpm format`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `git commit -m "feat(core): implement protocol encoder, device registry, and media registry"`

---

## Step 3 — `@thermal-label/brother-ql-node`

> [§6](PLAN.md#L814) · [Constraints §13](PLAN.md#L1631)

### Setup
- [x] `packages/node/package.json` — [§6.1](PLAN.md#L820)
- [x] `packages/node/README.md` — [§6.1](PLAN.md#L820)
- [x] `packages/node/tsconfig.json`
- [x] `packages/node/vitest.config.ts`

### Source
- [x] `UsbTransport` — [§6.2](PLAN.md#L853)
- [x] `TcpTransport` — [§6.2](PLAN.md#L853)
- [x] `BrotherQLPrinter` class — [§6.3](PLAN.md#L873)
- [x] `listPrinters`, `openPrinter`, `openPrinterTcp` — [§6.3](PLAN.md#L873)
- [x] Editor Lite detection in `listPrinters` — [§6.4](PLAN.md#L928)
- [x] `src/index.ts` — public exports

### Tests
- [x] `src/__tests__/usb-transport.test.ts` — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/tcp-transport.test.ts` — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/printer.test.ts` — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/discovery.test.ts` — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/integration/print-text.test.ts` (stub, `BROTHER_INTEGRATION=1`) — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/integration/print-image.test.ts` (stub) — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/integration/print-two-color.test.ts` (stub, QL-820NWB) — [§6.5](PLAN.md#L938)
- [x] `src/__tests__/integration/tcp.test.ts` (stub, `BROTHER_TCP_HOST`) — [§6.5](PLAN.md#L938)

### Gate
- [x] `pnpm format`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `git commit -m "feat(node): implement USB and TCP transports, BrotherQLPrinter, and discovery"`

---

## Step 4 — `@thermal-label/brother-ql-cli`

> [§7](PLAN.md#L958)

### Setup
- [x] `packages/cli/package.json` — [§7.1](PLAN.md#L964)
- [x] `packages/cli/README.md` — [§7.1](PLAN.md#L964)
- [x] `packages/cli/tsconfig.json`
- [x] `packages/cli/vitest.config.ts`
- [x] `bin/brother-ql.js` — ESM shim — [§7.3](PLAN.md#L1039)

### Source
- [x] Commander setup + `run()` entry point — [§7.2](PLAN.md#L995)
- [x] `brother-ql list` command — [§7.2](PLAN.md#L995)
- [x] `brother-ql status` command (`--host` flag) — [§7.2](PLAN.md#L995)
- [x] `brother-ql print text` command — [§7.2](PLAN.md#L995)
- [x] `brother-ql print image` command — [§7.2](PLAN.md#L995)
- [x] `brother-ql print two-color` command — [§7.2](PLAN.md#L995)
- [x] `src/index.ts` — public exports

### Tests
- [x] `src/__tests__/commands/list.test.ts` — [§7.4](PLAN.md#L1049)
- [x] `src/__tests__/commands/status.test.ts` — [§7.4](PLAN.md#L1049)
- [x] `src/__tests__/commands/print-text.test.ts` — [§7.4](PLAN.md#L1049)
- [x] `src/__tests__/commands/print-image.test.ts` — [§7.4](PLAN.md#L1049)
- [x] `src/__tests__/commands/print-two-color.test.ts` — [§7.4](PLAN.md#L1049)

### Gate
- [x] `pnpm format`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `git commit -m "feat(cli): implement brother-ql CLI with list, status, and print commands"`

---

## Step 5 — `@thermal-label/brother-ql-web`

> [§8](PLAN.md#L1060) · [Constraints §13](PLAN.md#L1631)

### Setup
- [ ] `packages/web/package.json` — [§8.1](PLAN.md#L1065)
- [ ] `packages/web/README.md` — [§8.1](PLAN.md#L1065)
- [ ] `packages/web/tsconfig.json` (extends `@mbtech-nl/tsconfig/browser`)
- [ ] `packages/web/vitest.config.ts`

### Source
- [ ] `requestPrinter`, `fromUSBDevice` — [§8.2](PLAN.md#L1095)
- [ ] `WebBrotherQLPrinter` class — [§8.2](PLAN.md#L1095)
- [ ] WebUSB type shims (`src/types/webusb.d.ts`) — [§8.3](PLAN.md#L1125)
- [ ] `src/index.ts` — public exports

### Tests
- [ ] `src/__tests__/webusb-mock.ts` — fake `USBDevice` with transfer spies — [§8.5](PLAN.md#L1138)
- [ ] `src/__tests__/printer.test.ts` — [§8.5](PLAN.md#L1138)
- [ ] `src/__tests__/request.test.ts` — [§8.5](PLAN.md#L1138)

### Gate
- [ ] `pnpm format`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `git commit -m "feat(web): implement WebBrotherQLPrinter with WebUSB and two-color support"`

---

## Step 6 — Docs

> [§9](PLAN.md#L1149) · [Site structure §9.1](PLAN.md#L1153) · [LiveDemo §9.2](PLAN.md#L1215) · [VitePress config §9.3](PLAN.md#L1237)

### VitePress setup
- [ ] `docs/.vitepress/config.ts` — [§9.3](PLAN.md#L1237)
- [ ] `docs/.vitepress/theme/index.ts` — registers `LiveDemo` globally
- [ ] `docs/.vitepress/components/LiveDemo.vue` — single + two-color tabs, media selector, live bitmap preview — [§9.2](PLAN.md#L1215)

### Pages
- [ ] `docs/index.md` — hero, features, ecosystem links, hardware + core refs — [§9.1](PLAN.md#L1153)
- [ ] `docs/getting-started.md` — Node.js, CLI, Web quickstarts; Linux udev; Editor Lite; Bluetooth out-of-scope — [§9.1](PLAN.md#L1153)
- [ ] `docs/node.md` — USB, TCP, text, images, two-color, multi-printer, status, API table — [§9.1](PLAN.md#L1153)
- [ ] `docs/cli.md` — all commands with examples and flags tables — [§9.1](PLAN.md#L1153)
- [ ] `docs/web.md` — browser support, quick start, React example, two-color, API table — [§9.1](PLAN.md#L1153)
- [ ] `docs/hardware.md` — device table with CTA, media reference, print head geometry, Editor Lite, mass storage PIDs — [§9.1](PLAN.md#L1153) · [§1](PLAN.md#L16) · [§2.3](PLAN.md#L87)
- [ ] `docs/core.md` — protocol reference, two-color encoding, status response, TIFF, porting checklist — [§9.1](PLAN.md#L1153) · [§2](PLAN.md#L59)
- [ ] `docs/demo.md` — renders `<LiveDemo />` — [§9.1](PLAN.md#L1153)

### API reference
- [ ] `pnpm docs:api` generates `docs/api/` without errors

### Gate
- [ ] `pnpm format`
- [ ] `pnpm lint`
- [ ] `pnpm docs:build` completes without errors
- [ ] `git commit -m "docs: write complete documentation site and LiveDemo"`

---

## Step 7 — Final

- [ ] All PROGRESS.md checkboxes ticked
- [ ] `pnpm format`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:coverage`
- [ ] `pnpm build`
- [ ] `pnpm docs:build`
