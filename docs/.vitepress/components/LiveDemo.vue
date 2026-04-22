<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { renderText, renderImage, findMedia, MEDIA, rotateBitmap } from '@thermal-label/brother-ql-web';

// Media selector
const mediaOptions = Object.values(MEDIA).filter((m) => m.type === 'continuous');
const selectedMediaId = ref<number>(259);
const media = computed(() => findMedia(selectedMediaId.value) ?? mediaOptions[0]!);

// Tab: single vs two-color
type Tab = 'single' | 'two-color';
const activeTab = ref<Tab>('single');

// Single-color inputs
const singleText = ref('Hello QL');
const singleInvert = ref(false);

// Two-color inputs
const blackText = ref('Black layer');
const redText = ref('Red layer');

// Canvas previews
const singleCanvas = ref<HTMLCanvasElement | null>(null);
const blackCanvas = ref<HTMLCanvasElement | null>(null);
const redCanvas = ref<HTMLCanvasElement | null>(null);
const compositeCanvas = ref<HTMLCanvasElement | null>(null);

// WebUSB
const printer = ref<import('@thermal-label/brother-ql-web').WebBrotherQLPrinter | null>(null);
const isConnected = ref(false);
const statusMessage = ref('');

const isWebUSBAvailable = ref(false);
onMounted(() => {
  isWebUSBAvailable.value = typeof navigator !== 'undefined' && 'usb' in navigator;
});

function renderBitmapToCanvas(canvas: HTMLCanvasElement, bitmap: ReturnType<typeof renderText>): void {
  const scale = 2;
  const { widthPx, heightPx, data } = bitmap;
  canvas.width = widthPx * scale;
  canvas.height = heightPx * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const imageData = ctx.createImageData(widthPx * scale, heightPx * scale);
  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const byteIdx = Math.floor((y * widthPx + x) / 8);
      const bitIdx = 7 - ((y * widthPx + x) % 8);
      const bit = (data[byteIdx]! >> bitIdx) & 1;
      const color = bit === 1 ? 0 : 255; // 1bpp: 1 = black, 0 = white
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const idx = ((y * scale + sy) * widthPx * scale + (x * scale + sx)) * 4;
          imageData.data[idx] = color;
          imageData.data[idx + 1] = color;
          imageData.data[idx + 2] = color;
          imageData.data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function updateSinglePreview(): void {
  if (!singleCanvas.value) return;
  const bitmap = rotateBitmap(renderText(singleText.value, { invert: singleInvert.value, scaleX: 1, scaleY: 1 }), 90);
  renderBitmapToCanvas(singleCanvas.value, bitmap);
}

function updateTwoColorPreview(): void {
  if (!blackCanvas.value || !redCanvas.value || !compositeCanvas.value) return;
  const bk = rotateBitmap(renderText(blackText.value, { scaleX: 1, scaleY: 1 }), 90);
  const rd = rotateBitmap(renderText(redText.value, { scaleX: 1, scaleY: 1 }), 90);
  renderBitmapToCanvas(blackCanvas.value, bk);

  // Red layer: draw in red
  const scale = 2;
  redCanvas.value.width = rd.widthPx * scale;
  redCanvas.value.height = rd.heightPx * scale;
  const rctx = redCanvas.value.getContext('2d')!;
  rctx.clearRect(0, 0, redCanvas.value.width, redCanvas.value.height);
  const rimgData = rctx.createImageData(rd.widthPx * scale, rd.heightPx * scale);
  for (let y = 0; y < rd.heightPx; y++) {
    for (let x = 0; x < rd.widthPx; x++) {
      const byteIdx = Math.floor((y * rd.widthPx + x) / 8);
      const bitIdx = 7 - ((y * rd.widthPx + x) % 8);
      const bit = (rd.data[byteIdx]! >> bitIdx) & 1;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const idx = ((y * scale + sy) * rd.widthPx * scale + (x * scale + sx)) * 4;
          rimgData.data[idx] = bit === 1 ? 200 : 255;
          rimgData.data[idx + 1] = bit === 1 ? 0 : 255;
          rimgData.data[idx + 2] = bit === 1 ? 0 : 255;
          rimgData.data[idx + 3] = 255;
        }
      }
    }
  }
  rctx.putImageData(rimgData, 0, 0);

  // Composite: overlay both layers
  const cctx = compositeCanvas.value.getContext('2d')!;
  compositeCanvas.value.width = Math.max(bk.widthPx, rd.widthPx) * scale;
  compositeCanvas.value.height = Math.max(bk.heightPx, rd.heightPx) * scale;
  cctx.fillStyle = '#ffffff';
  cctx.fillRect(0, 0, compositeCanvas.value.width, compositeCanvas.value.height);
  cctx.drawImage(blackCanvas.value, 0, 0);
  cctx.globalCompositeOperation = 'multiply';
  cctx.drawImage(redCanvas.value, 0, 0);
  cctx.globalCompositeOperation = 'source-over';
}

watch([singleText, singleInvert, selectedMediaId], () => { updateSinglePreview(); }, { immediate: false });
watch([blackText, redText, selectedMediaId], () => { updateTwoColorPreview(); }, { immediate: false });
watch(activeTab, (tab) => {
  if (tab === 'single') setTimeout(updateSinglePreview, 0);
  else setTimeout(updateTwoColorPreview, 0);
});
onMounted(() => { updateSinglePreview(); });

async function connect(): Promise<void> {
  try {
    statusMessage.value = 'Connecting…';
    const { requestPrinter } = await import('@thermal-label/brother-ql-web');
    printer.value = await requestPrinter();
    isConnected.value = true;
    statusMessage.value = `Connected: ${printer.value.descriptor.name}`;
  } catch (err) {
    statusMessage.value = `Connection failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function printLabel(): Promise<void> {
  if (!printer.value) return;
  try {
    statusMessage.value = 'Printing…';
    if (activeTab.value === 'single') {
      await printer.value.printText(singleText.value, media.value, { invert: singleInvert.value });
    } else {
      if (!printer.value.descriptor.twoColor) {
        statusMessage.value = 'Two-color printing requires a QL-800, QL-810W, or QL-820NWB.';
        return;
      }
      const toImageData = (text: string): ImageData => {
        const bmp = rotateBitmap(renderText(text, { scaleX: 1, scaleY: 1 }), 90);
        const arr = new Uint8ClampedArray(bmp.widthPx * bmp.heightPx * 4);
        for (let i = 0; i < bmp.widthPx * bmp.heightPx; i++) {
          const byteIdx = Math.floor(i / 8);
          const bitIdx = 7 - (i % 8);
          const bit = (bmp.data[byteIdx]! >> bitIdx) & 1;
          const v = bit === 1 ? 0 : 255;
          arr[i * 4] = v; arr[i * 4 + 1] = v; arr[i * 4 + 2] = v; arr[i * 4 + 3] = 255;
        }
        return new ImageData(arr, bmp.widthPx, bmp.heightPx);
      };
      await printer.value.printTwoColor(toImageData(blackText.value), toImageData(redText.value), media.value);
    }
    statusMessage.value = 'Printed!';
  } catch (err) {
    statusMessage.value = `Print error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
</script>

<template>
  <div class="live-demo">
    <div class="demo-controls">
      <label>
        Media:
        <select v-model="selectedMediaId">
          <option v-for="m in mediaOptions" :key="m.id" :value="m.id">
            {{ m.name }} ({{ m.widthMm }}mm)
          </option>
        </select>
      </label>

      <div class="tabs">
        <button :class="{ active: activeTab === 'single' }" @click="activeTab = 'single'">Single color</button>
        <button :class="{ active: activeTab === 'two-color' }" @click="activeTab = 'two-color'">Two-color</button>
      </div>
    </div>

    <div v-if="activeTab === 'single'" class="tab-content">
      <label>
        Text:
        <input v-model="singleText" type="text" @input="updateSinglePreview" />
      </label>
      <label>
        <input v-model="singleInvert" type="checkbox" @change="updateSinglePreview" />
        Invert (white on black)
      </label>
      <div class="preview-label">Preview:</div>
      <canvas ref="singleCanvas" class="preview-canvas" />
    </div>

    <div v-else class="tab-content">
      <label>
        Black layer text:
        <input v-model="blackText" type="text" @input="updateTwoColorPreview" />
      </label>
      <label>
        Red layer text:
        <input v-model="redText" type="text" @input="updateTwoColorPreview" />
      </label>
      <div class="preview-label">Black layer:</div>
      <canvas ref="blackCanvas" class="preview-canvas" />
      <div class="preview-label">Red layer:</div>
      <canvas ref="redCanvas" class="preview-canvas" />
      <div class="preview-label">Composite preview:</div>
      <canvas ref="compositeCanvas" class="preview-canvas" />
    </div>

    <div class="demo-actions">
      <template v-if="isWebUSBAvailable">
        <button v-if="!isConnected" class="btn-primary" @click="connect">Connect printer</button>
        <button v-else class="btn-primary" @click="printLabel">Print label</button>
        <p v-if="statusMessage" class="status">{{ statusMessage }}</p>
      </template>
      <template v-else>
        <p class="browser-note">
          Live printing requires Chrome or Edge with WebUSB support.<br />
          Preview works in all browsers.
        </p>
      </template>
      <p class="editor-lite-note">
        If your printer is not detected, check that
        <a href="/brother-ql/hardware#editor-lite-mode">Editor Lite mode is disabled</a>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.live-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
}
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.tabs {
  display: flex;
  gap: 0.5rem;
}
.tabs button {
  padding: 0.25rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.tabs button.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tab-content label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.tab-content input[type='text'] {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  flex: 1;
}
.preview-label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
}
.preview-canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  max-width: 100%;
  background: #fff;
}
.demo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-primary {
  padding: 0.5rem 1.5rem;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;
}
.status {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
.browser-note, .editor-lite-note {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
</style>
