import { CONFIG } from './config.js';

// Palette and colour‑cycle helpers.
export const PALETTE     = ['#00f5ff','#ff00ff','#bf00ff','#39ff14','#ff6a00','#ff1493','#00ffbf'];
export const CHAT_COLORS = ['#00f5ff','#ff00ff','#39ff14','#ff6a00','#ff1493','#bf00ff','#ffff00'];
let palIdx = 0;

// convert a #rrggbb hex string into an H (0‑360) value
export function hexToHue(hex) {
  hex = hex.replace(/^#/,'');
  const r = parseInt(hex.slice(0,2),16)/255;
  const g = parseInt(hex.slice(2,4),16)/255;
  const b = parseInt(hex.slice(4,6),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h;
  if (max === min) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / (max - min)) % 6;
  } else if (max === g) {
    h = ((b - r) / (max - min)) + 2;
  } else {
    h = ((r - g) / (max - min)) + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

export function setColor(hex) {
  document.documentElement.style.setProperty('--cur', hex);

  // recolor the pawprint icon by rotating the original cyan hue
  const paw = document.getElementById('alert-pawprint');
  if (paw) {
    const targetHue = hexToHue(hex);
    const rotate = targetHue - 180; // original paw is cyan (~180deg)
    paw.style.filter = `hue-rotate(${rotate}deg) drop-shadow(0 0 14px ${hex}) drop-shadow(0 0 5px ${hex})`;
  }
}

export function startColorCycle() {
  setInterval(() => { palIdx = (palIdx+1) % PALETTE.length; setColor(PALETTE[palIdx]); }, CONFIG.colorCycleMs);
  setColor(PALETTE[0]);
}
