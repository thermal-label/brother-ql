<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { renderText, findMedia, MEDIA, rotateBitmap } from '@thermal-label/brother-ql-web';

const TARGET_H = 48; // target preview canvas height in pixels before CSS scaling

const mediaOptions = Object.values(MEDIA).filter(m => m.type === 'continuous');
const selectedMediaId = ref<number>(259);
const media = computed(() => findMedia(selectedMediaId.value) ?? mediaOptions[0]!);

type Tab = 'single' | 'two-color';
const activeTab = ref<Tab>('single');

const singleText = ref('Hello QL');
const singleInvert = ref(false);
const blackText = ref('Black layer');
const redText = ref('Red layer');

const singleCanvas = ref<HTMLCanvasElement | null>(null);
const blackCanvas = ref<HTMLCanvasElement | null>(null);
const redCanvas = ref<HTMLCanvasElement | null>(null);
const compositeCanvas = ref<HTMLCanvasElement | null>(null);

const printer = ref<import('@thermal-label/brother-ql-web').WebBrotherQLPrinter | null>(null);
const printerName = ref('');
const isConnecting = ref(false);
const isPrinting = ref(false);
const statusMessage = ref('');
const statusType = ref<'idle' | 'ok' | 'error'>('idle');

const isWebUSBAvailable = ref(false);
onMounted(() => {
  isWebUSBAvailable.value = typeof navigator !== 'undefined' && 'usb' in navigator;
});

const stateClass = computed(() => {
  if (printer.value) return 'dot-connected';
  if (isConnecting.value) return 'dot-connecting';
  return 'dot-idle';
});
const stateLabel = computed(() => {
  if (isConnecting.value) return 'Connecting…';
  if (printer.value) return printerName.value || 'Connected';
  return 'No printer connected';
});
const statusClass = computed(() => ({
  'status-ok': statusType.value === 'ok',
  'status-error': statusType.value === 'error',
}));

function drawBitmap(
  canvas: HTMLCanvasElement,
  bitmap: ReturnType<typeof renderText>,
  fg = '#111',
  bg = '#fff',
  scale?: number,
): void {
  const { widthPx, heightPx, data } = bitmap;
  const s = scale ?? Math.max(1, Math.round(TARGET_H / heightPx));
  canvas.width = widthPx * s;
  canvas.height = heightPx * s;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const i = y * widthPx + x;
      const bit = (data[Math.floor(i / 8)]! >> (7 - (i % 8))) & 1;
      if (bit) ctx.fillRect(x * s, y * s, s, s);
    }
  }
}

function updateSinglePreview(): void {
  if (!singleCanvas.value) return;
  const bitmap = renderText(singleText.value || ' ', {
    invert: singleInvert.value,
    scaleX: 1,
    scaleY: 1,
  });
  drawBitmap(singleCanvas.value, bitmap, singleInvert.value ? '#fff' : '#111', singleInvert.value ? '#111' : '#fff');
}

function updateTwoColorPreview(): void {
  if (!blackCanvas.value || !redCanvas.value || !compositeCanvas.value) return;
  const bk = renderText(blackText.value || ' ', { scaleX: 1, scaleY: 1 });
  const rd = renderText(redText.value || ' ', { scaleX: 1, scaleY: 1 });
  const maxH = Math.max(bk.heightPx, rd.heightPx);
  const scale = Math.max(1, Math.round(TARGET_H / maxH));
  drawBitmap(blackCanvas.value, bk, '#111', '#fff', scale);
  drawBitmap(redCanvas.value, rd, '#cc0000', '#fff', scale);

  const cw = Math.max(bk.widthPx, rd.widthPx) * scale;
  const ch = maxH * scale;
  const cctx = compositeCanvas.value.getContext('2d')!;
  compositeCanvas.value.width = cw;
  compositeCanvas.value.height = ch;
  cctx.fillStyle = '#fff';
  cctx.fillRect(0, 0, cw, ch);
  cctx.drawImage(blackCanvas.value, 0, 0);
  cctx.globalCompositeOperation = 'multiply';
  cctx.drawImage(redCanvas.value, 0, 0);
  cctx.globalCompositeOperation = 'source-over';
}

watch([singleText, singleInvert, selectedMediaId], updateSinglePreview);
watch([blackText, redText, selectedMediaId], updateTwoColorPreview);
watch(activeTab, tab => {
  if (tab === 'single') setTimeout(updateSinglePreview, 0);
  else setTimeout(updateTwoColorPreview, 0);
});
onMounted(updateSinglePreview);

async function connect(): Promise<void> {
  isConnecting.value = true;
  statusMessage.value = '';
  statusType.value = 'idle';
  try {
    const { requestPrinter } = await import('@thermal-label/brother-ql-web');
    printer.value = await requestPrinter();
    printerName.value = printer.value.descriptor.name;
    statusType.value = 'ok';
    statusMessage.value = 'Ready to print.';
  } catch (err) {
    statusType.value = 'error';
    statusMessage.value = err instanceof Error ? err.message : 'Connection failed.';
  } finally {
    isConnecting.value = false;
  }
}

async function disconnect(): Promise<void> {
  if (!printer.value) return;
  try {
    await printer.value.disconnect();
  } catch {
    // ignore
  }
  printer.value = null;
  printerName.value = '';
  statusMessage.value = '';
  statusType.value = 'idle';
}

async function printLabel(): Promise<void> {
  if (!printer.value) return;
  isPrinting.value = true;
  statusMessage.value = 'Sending to printer…';
  statusType.value = 'idle';
  try {
    if (activeTab.value === 'single') {
      await printer.value.printText(singleText.value, media.value, {
        invert: singleInvert.value,
      });
    } else {
      if (!printer.value.descriptor.twoColor) {
        statusType.value = 'error';
        statusMessage.value = 'Two-color printing requires a QL-800, QL-810W, or QL-820NWB.';
        return;
      }
      const toImageData = (text: string): ImageData => {
        const bmp = rotateBitmap(renderText(text, { scaleX: 1, scaleY: 1 }), 90);
        const arr = new Uint8ClampedArray(bmp.widthPx * bmp.heightPx * 4);
        for (let i = 0; i < bmp.widthPx * bmp.heightPx; i++) {
          const bit = (bmp.data[Math.floor(i / 8)]! >> (7 - (i % 8))) & 1;
          const v = bit ? 0 : 255;
          arr[i * 4] = v;
          arr[i * 4 + 1] = v;
          arr[i * 4 + 2] = v;
          arr[i * 4 + 3] = 255;
        }
        return new ImageData(arr, bmp.widthPx, bmp.heightPx);
      };
      await printer.value.printTwoColor(
        toImageData(blackText.value),
        toImageData(redText.value),
        media.value,
      );
    }
    statusType.value = 'ok';
    statusMessage.value = 'Label sent ✓';
  } catch (err) {
    statusType.value = 'error';
    statusMessage.value = err instanceof Error ? err.message : 'Print failed.';
  } finally {
    isPrinting.value = false;
  }
}
</script>

<template>
  <section class="live-demo">
    <!-- Preview -->
    <div class="preview-wrap">
      <div v-if="activeTab === 'single'" class="tape-label" :class="{ inverted: singleInvert }">
        <canvas ref="singleCanvas" class="preview-canvas" />
      </div>
      <template v-else>
        <div class="tape-label">
          <canvas ref="blackCanvas" class="preview-canvas" />
        </div>
        <div class="tape-label tape-label--red">
          <canvas ref="redCanvas" class="preview-canvas" />
        </div>
        <div class="tape-label">
          <canvas ref="compositeCanvas" class="preview-canvas" />
        </div>
      </template>
      <p class="preview-hint">Live preview · updates as you type</p>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="control-row">
        <label class="control">
          <span class="control-label">Media</span>
          <select v-model="selectedMediaId" class="select-input">
            <option v-for="m in mediaOptions" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.widthMm }}mm)
            </option>
          </select>
        </label>

        <div class="demo-tabs">
          <button
            :class="['demo-tab', { active: activeTab === 'single' }]"
            @click="activeTab = 'single'"
          >
            Single color
          </button>
          <button
            :class="['demo-tab', { active: activeTab === 'two-color' }]"
            @click="activeTab = 'two-color'"
          >
            Two-color
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'single'" class="control-row">
        <label class="control control-text">
          <span class="control-label">Label text</span>
          <input
            v-model="singleText"
            type="text"
            class="text-input"
            placeholder="Type your label…"
            @input="updateSinglePreview"
          />
        </label>
        <label class="control control-checkbox">
          <input v-model="singleInvert" type="checkbox" @change="updateSinglePreview" />
          <span class="control-label">Invert</span>
        </label>
      </div>
      <div v-else class="control-row">
        <label class="control control-text">
          <span class="control-label">Black layer</span>
          <input
            v-model="blackText"
            type="text"
            class="text-input"
            placeholder="Black layer text…"
            @input="updateTwoColorPreview"
          />
        </label>
        <label class="control control-text">
          <span class="control-label">Red layer</span>
          <input
            v-model="redText"
            type="text"
            class="text-input text-input--red"
            placeholder="Red layer text…"
            @input="updateTwoColorPreview"
          />
        </label>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <div class="printer-state">
        <span class="state-dot" :class="stateClass" />
        <span class="state-label">{{ stateLabel }}</span>
        <button v-if="printer" class="btn-disconnect" @click="disconnect">Disconnect</button>
      </div>

      <div class="action-buttons">
        <template v-if="isWebUSBAvailable">
          <button
            v-if="!printer"
            class="btn btn-connect"
            :disabled="isConnecting"
            @click="connect"
          >
            {{ isConnecting ? 'Waiting for browser…' : '🔌 Connect printer' }}
          </button>
          <button
            class="btn btn-print"
            :disabled="!printer || isPrinting"
            @click="printLabel"
          >
            {{ isPrinting ? 'Printing…' : '▶ Print label' }}
          </button>
        </template>
        <template v-else>
          <p class="webusb-note">
            Printing requires <strong>Chrome</strong> or <strong>Edge</strong> with WebUSB. The
            preview works in any browser.
          </p>
        </template>
      </div>

      <p v-if="statusMessage" class="status-msg" :class="statusClass">{{ statusMessage }}</p>
      <p v-if="isWebUSBAvailable && !printer" class="editor-lite-note">
        If your printer is not detected, check that
        <a href="/brother-ql/hardware#editor-lite-mode">Editor Lite mode is disabled</a>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.live-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  margin: 1.5rem 0;
}

/* ── Preview ── */
.preview-wrap {
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 1.25rem 1.25rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.tape-label {
  background: #fff;
  border: 1px solid #d0ccc0;
  border-radius: 4px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  display: inline-block;
  max-width: 100%;
  overflow-x: auto;
  padding: 6px 10px;
}

.tape-label.inverted {
  background: #111;
  border-color: #444;
}

.tape-label--red {
  border-color: #fca5a5;
}

.preview-canvas {
  display: block;
  image-rendering: pixelated;
}

.preview-hint {
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
  margin: 0.2rem 0 0;
  text-align: center;
}

/* ── Controls ── */
.controls {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.control-text {
  flex: 1;
  min-width: 160px;
}

.control-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.15rem;
}

.control-label {
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 500;
}

.text-input,
.select-input {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  padding: 0.45rem 0.6rem;
  transition: border-color 0.15s;
}

.text-input {
  width: 100%;
}

.text-input--red:focus {
  border-color: #e53e3e;
}

.text-input:focus,
.select-input:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.demo-tabs {
  display: flex;
  gap: 0.4rem;
  padding-bottom: 0.15rem;
}

.demo-tab {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.demo-tab.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

/* ── Actions ── */
.actions {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.printer-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.4rem;
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}

.dot-idle {
  background: var(--vp-c-text-3);
}

.dot-connecting {
  background: #f0a500;
  animation: pulse 1s infinite;
}

.dot-connected {
  background: #4caf50;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.state-label {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  flex: 1;
}

.btn-disconnect {
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0;
  text-decoration: underline;
}

.btn-disconnect:hover {
  color: var(--vp-c-text-1);
}

.action-buttons {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.55rem 1.2rem;
  transition:
    opacity 0.15s,
    transform 0.1s;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.btn:not(:disabled):active {
  transform: scale(0.97);
}

.btn-connect {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.btn-connect:not(:disabled):hover {
  opacity: 0.88;
}

.btn-print {
  background: #4caf50;
  color: #fff;
}

.btn-print:not(:disabled):hover {
  opacity: 0.88;
}

.status-msg {
  font-size: 0.85rem;
  margin: 0;
  padding: 0.4rem 0.7rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}

.status-ok {
  color: #4caf50;
}

.status-error {
  color: var(--vp-c-danger-1, #f44336);
}

.webusb-note,
.editor-lite-note {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  margin: 0;
}
</style>
