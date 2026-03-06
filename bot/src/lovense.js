// ═══════════════════════════════════════════════════════════════
//  lovense.js — Lovense Connect integration stub
//
//  STATUS: Ready to activate when you have a compatible toy.
//
//  HOW IT WORKS:
//  Lovense Connect app runs on your phone on the same Wi-Fi.
//  It exposes a local HTTP server. We send commands to it.
//  No cloud dependency, no latency issues.
//
//  SETUP (when ready):
//  1. Install Lovense Connect on your phone
//  2. Enable "Game Mode" in the app
//  3. Find your local API URL in app settings (looks like
//     http://192.168.x.x:30010/lovense) or use the
//     Lovense Developer Toy API to discover it.
//  4. Set LOVENSE_API_URL=http://192.168.x.x:30010 in .env
//  5. Set LOVENSE_ENABLED=true in .env
//  6. lovense.start() is already called in index.js
// ═══════════════════════════════════════════════════════════════
import fetch from 'node-fetch';

// Tip → vibration intensity mapping
// Customize these thresholds to taste
const TIP_RULES = [
  { minAmount: 1,   intensity: 5,  duration: 3,  pattern: 'pulse'  },
  { minAmount: 5,   intensity: 10, duration: 5,  pattern: 'pulse'  },
  { minAmount: 10,  intensity: 14, duration: 8,  pattern: 'wave'   },
  { minAmount: 25,  intensity: 17, duration: 12, pattern: 'fireworks' },
  { minAmount: 50,  intensity: 20, duration: 20, pattern: 'earthquake' },
  { minAmount: 100, intensity: 20, duration: 30, pattern: 'random' },
];

// Named patterns (maps to Lovense preset patterns 1-5)
const PATTERN_MAP = {
  'pulse':       1,
  'wave':        2,
  'fireworks':   3,
  'earthquake':  4,
  'random':      5,
};

export class LovenseModule {
  constructor(relay, { dev = false } = {}) {
    this.relay   = relay;
    this.dev     = dev;
    this.enabled = process.env.LOVENSE_ENABLED === 'true';
    this.apiUrl  = process.env.LOVENSE_API_URL; // e.g. http://192.168.1.x:30010
    this._busy   = false;
  }

  start() {
    if (!this.enabled) {
      console.log('[Lovense] Module disabled. Set LOVENSE_ENABLED=true in .env when ready.');
      return;
    }
    if (!this.apiUrl) {
      console.log('[Lovense] LOVENSE_API_URL not set. Module disabled.');
      return;
    }
    console.log('[Lovense] Module active —', this.apiUrl);
    this._ping();
  }

  // ── Called on tip events ──────────────────────────────────────
  async onTip(amount) {
    if (!this.enabled || this._busy) return;
    const amountNum = parseFloat(String(amount).replace('$','')) || 0;
    // Find the highest matching rule
    const rule = [...TIP_RULES]
      .filter(r => amountNum >= r.minAmount)
      .pop();
    if (!rule) return;
    this._log(`Tip $${amountNum} → intensity ${rule.intensity}, ${rule.duration}s, ${rule.pattern}`);
    await this._vibrate(rule.intensity, rule.duration, rule.pattern);
  }

  // ── Raw vibrate command ───────────────────────────────────────
  async _vibrate(intensity, duration, pattern = 'pulse') {
    if (!this.enabled) return;
    this._busy = true;
    try {
      const patternNum = PATTERN_MAP[pattern] || 1;
      // Lovense Connect local API v2 command format
      await fetch(`${this.apiUrl}/lovense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command:   'Function',
          action:    `Vibrate:${intensity}`,
          timeSec:   duration,
          loopRunningSec: 0,
          loopPauseSec:   0,
          toy:       '',          // empty = all connected toys
          apiVer:    1,
        }),
      });
      // Auto-stop after duration (belt + suspenders)
      setTimeout(() => {
        this._stop();
        this._busy = false;
      }, duration * 1000 + 500);
    } catch (e) {
      this._log('Command error:', e.message);
      this._busy = false;
    }
  }

  async _stop() {
    try {
      await fetch(`${this.apiUrl}/lovense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'Function', action: 'Vibrate:0', timeSec: 0, apiVer: 1 }),
      });
    } catch {}
  }

  async _ping() {
    try {
      const res = await fetch(`${this.apiUrl}/GetToys`);
      const data = await res.json();
      console.log('[Lovense] Connected toys:', JSON.stringify(data));
    } catch (e) {
      console.warn('[Lovense] Could not reach Lovense Connect app:', e.message);
      console.warn('[Lovense] Is the app open and on the same network?');
    }
  }

  _log(...args) { if (this.dev) console.log('[Lovense]', ...args); }
}