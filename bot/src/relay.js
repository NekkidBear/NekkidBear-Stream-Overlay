// ═══════════════════════════════════════════════════════════════
//  relay.js — Local WebSocket server
//  The OBS browser source (overlay.html) connects here.
//  The Joystick client pushes events here to be forwarded.
// ═══════════════════════════════════════════════════════════════
import { WebSocketServer } from 'ws';

export class RelayServer {
  constructor(port = 3333) {
    this.port = port;
    this.wss  = null;
    this.clients = new Set();
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port, host: '127.0.0.1' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[Relay] Overlay connected. Total: ${this.clients.size}`);

      ws.on('close',   () => { this.clients.delete(ws); });
      ws.on('error',   (e) => { console.error('[Relay] Client error:', e.message); });
    });

    this.wss.on('error', (e) => {
      console.error('[Relay] Server error:', e.message);
    });
  }

  /** Broadcast a typed event to all connected overlays */
  send(type, payload = {}) {
    const msg = JSON.stringify({ type, ...payload });
    for (const ws of this.clients) {
      try { if (ws.readyState === 1) ws.send(msg); }
      catch (e) { /* ignore dead sockets */ }
    }
    // Internal hook — allows index.js to observe relay events
    // e.g. spotify_track → handler.setCurrentTrack()
    if (typeof this.onEvent === 'function') {
      this.onEvent(type, payload);
    }
  }

  stop() {
    this.wss?.close();
  }
}