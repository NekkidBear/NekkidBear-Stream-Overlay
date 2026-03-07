import { CONFIG } from './config.js';
import { setColor } from './color.js';
import { addChat } from './chat.js';
import { speak } from './tts.js';

const ALERT_DEFS = {
  follow:    { label: 'NEW FOLLOWER',   color: '#00f5ff' },
  subscribe: { label: 'NEW SUBSCRIBER', color: '#ff00ff' },
  tip:       { label: 'TIP RECEIVED',   color: '#39ff14' },
  shoutout:  { label: 'SHOUTOUT',       color: '#ff6a00' },
};

let alertTimer   = null;
let alertVisible = false;
const alertQueue = [];

export function showAlert(type, name, detail = '') {
  alertQueue.push({ type, name, detail });
  if (!alertVisible) drainAlertQueue();
}

function drainAlertQueue() {
  if (!alertQueue.length) return;
  const { type, name, detail } = alertQueue.shift();
  const def = ALERT_DEFS[type] || { label: type.toUpperCase(), color: '#00f5ff' };

  setColor(def.color);

  document.getElementById('alert-type').textContent   = def.label;
  document.getElementById('alert-name').textContent   = name;
  document.getElementById('alert-detail').textContent = detail;

  const icons = { follow:'⭐', subscribe:'💎', tip:'💰', shoutout:'📡' };
  const icon  = icons[type] || '🔔';
  const chatMsg = detail
    ? `${icon} ${def.label}: ${name} — ${detail}`
    : `${icon} ${def.label}: ${name}`;
  addChat('◈ SYSTEM', chatMsg, true);

  const overlay = document.getElementById('alert-overlay');
  overlay.classList.add('active');
  alertVisible = true;

  clearTimeout(alertTimer);
  alertTimer = setTimeout(() => {
    overlay.classList.remove('active');
    alertVisible = false;
    setTimeout(drainAlertQueue, 500);
  }, CONFIG.eventDuration);
}
