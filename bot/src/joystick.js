// ═══════════════════════════════════════════════════════════════
//  joystick.js — Joystick.tv ActionCable WebSocket client
//
//  Built against the official Joystick.tv developer docs:
//  https://support.joystick.tv/developer_support/
//
//  Auth flow:
//  1. Run joystick-auth.js ONCE to get your access_token
//     and refresh_token via the authorization_code OAuth flow.
//  2. Tokens are stored in .env. This client auto-refreshes.
//
//  WebSocket:
//  - URL: wss://joystick.tv/cable?token=BASIC_KEY
//  - Protocol: actioncable-v1-json
//  - BASIC_KEY = base64(clientId:clientSecret)
//  - Subscribe to GatewayChannel
// ═══════════════════════════════════════════════════════════════
import WebSocket from 'ws';
import fetch     from 'node-fetch';

const API_BASE = 'https://joystick.tv/api';
const WS_URL   = 'wss://joystick.tv/cable';

export class JoystickClient {
  constructor({ clientId, clientSecret, accessToken, refreshToken, dev = false }) {
    this.clientId     = clientId;
    this.clientSecret = clientSecret;
    this.accessToken  = accessToken;
    this.refreshToken = refreshToken;
    this.dev          = dev;

    // Basic key = base64(clientId:clientSecret) — used for WS connection
    this.basicKey = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    this._listeners        = {};
    this._ws               = null;
    this._reconnectDelay   = 3000;
    this._reconnectTimer   = null;
    this._intentionalClose = false;
    this._channelId        = null;
  }

  // ── Simple event emitter ──────────────────────────────────────
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  // ── Connect ───────────────────────────────────────────────────
  async connect() {
    try {
      await this._refreshAccessToken();
      this._openWS();
    } catch (e) {
      this._emit('error', e);
      this._scheduleReconnect();
    }
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    this._ws?.close();
  }

  // ── Token refresh ─────────────────────────────────────────────
  async _refreshAccessToken() {
    if (!this.refreshToken) {
      this._log('No refresh token — using existing access token');
      return;
    }
    this._log('Refreshing access token...');
    const res = await fetch(
      `${API_BASE}/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(this.refreshToken)}`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Basic ${this.basicKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
          'Accept':        'application/json',
        },
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token refresh failed: ${res.status} — ${txt}`);
    }
    const data = await res.json();
    this.accessToken  = data.access_token;
    this.refreshToken = data.refresh_token;
    this._log('Token refreshed successfully');
  }

  // ── WebSocket ─────────────────────────────────────────────────
  _openWS() {
    const url = `${WS_URL}?token=${encodeURIComponent(this.basicKey)}`;
    this._log('Connecting to', WS_URL);
    this._ws = new WebSocket(url, ['actioncable-v1-json']);

    this._ws.on('open',    ()    => this._onOpen());
    this._ws.on('message', (raw) => this._onMessage(raw));
    this._ws.on('close',   ()    => this._onClose());
    this._ws.on('error',   (e)   => this._emit('error', e));
  }

  // ── Subscribe to GatewayChannel on open ──────────────────────
  _onOpen() {
    this._log('WebSocket open — subscribing to GatewayChannel');
    this._send({
      command:    'subscribe',
      identifier: JSON.stringify({ channel: 'GatewayChannel' }),
    });
    this._emit('connected');
  }

  // ── Message routing ───────────────────────────────────────────
  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'welcome') { this._log('ActionCable welcome'); return; }
    if (msg.type === 'ping')    { return; }
    if (msg.type === 'confirm_subscription') { this._log('GatewayChannel confirmed'); return; }
    if (msg.type === 'reject_subscription')  {
      this._emit('error', new Error('Subscription rejected'));
      return;
    }

    const message = msg.message;
    if (!message) return;

    this._log('Raw event:', JSON.stringify(message));

    if (message.channelId && !this._channelId) {
      this._channelId = message.channelId;
      this._log('Channel ID:', this._channelId);
    }

    switch (message.event) {

      // ── Chat message ────────────────────────────────────────
      case 'ChatMessage': {
        if (message.type !== 'new_message') return;
        const author = message.author || {};
        this._emit('chat', {
          username:     author.username    || author.slug || 'unknown',
          message:      message.text       || '',
          color:        author.usernameColor || null,
          isStreamer:   author.isStreamer   || false,
          isModerator:  author.isModerator  || false,
          isSubscriber: author.isSubscriber || false,
          messageId:    message.messageId   || null,
          channelId:    message.channelId   || null,
          botCommand:   message.botCommand  || null,
          botCommandArg: message.botCommandArg || null,
        });
        break;
      }

      // ── Stream events ────────────────────────────────────────
      case 'StreamEvent': {
        let meta = {};
        try { meta = JSON.parse(message.metadata || '{}'); } catch {}

        switch (message.type) {
          case 'Followed':
            this._emit('follow', { username: meta.who || 'unknown' });
            break;
          case 'Tipped':
          case 'TipMenu':
            this._emit('tip', {
              username: meta.who           || 'unknown',
              amount:   meta.how_much      || '?',
              item:     meta.tip_menu_item || null,
            });
            break;
          case 'GiftedSubscriptions':
            this._emit('subscribe', {
              username: meta.who  || 'unknown',
              tier:     meta.tier || '',
              gifted:   true,
            });
            break;
          case 'WheelSpinClaimed':
            this._emit('wheelspin', {
              username: meta.who      || 'unknown',
              prize:    meta.prize    || '',
              amount:   meta.how_much || 0,
            });
            break;
          case 'Started':
            this._emit('stream_start', {});
            break;
          case 'StreamEnding':
            this._emit('stream_ending', {});
            break;
          case 'Ended':
            this._emit('stream_end', {});
            break;
          case 'StreamResuming':
            this._emit('stream_resuming', {});
            break;
          case 'DeviceConnected':
            this._emit('device_connected', {});
            break;
          case 'TipGoalMet':
            this._emit('tip_goal', { meta });
            break;
          default:
            this._log('Unhandled StreamEvent type:', message.type, meta);
        }
        break;
      }

      // ── User presence ─────────────────────────────────────────
      case 'UserPresence': {
        const evType = message.type === 'enter_stream' ? 'user_enter' : 'user_leave';
        this._emit(evType, { username: message.text || 'unknown' });
        break;
      }

      default:
        this._log('Unhandled event:', message.event, message.type);
    }
  }

  // ── Send chat message ─────────────────────────────────────────
  sendMessage(text, channelId) {
    const cid = channelId || this._channelId;
    if (!cid) { this._log('No channelId yet — cannot send'); return; }
    this._send({
      command:    'message',
      identifier: JSON.stringify({ channel: 'GatewayChannel' }),
      data:       JSON.stringify({ action: 'send_message', text, channelId: cid }),
    });
  }

  // ── Send whisper ──────────────────────────────────────────────
  sendWhisper(username, text, channelId) {
    const cid = channelId || this._channelId;
    if (!cid) return;
    this._send({
      command:    'message',
      identifier: JSON.stringify({ channel: 'GatewayChannel' }),
      data:       JSON.stringify({ action: 'send_whisper', username, text, channelId: cid }),
    });
  }

  // ── Delete message ────────────────────────────────────────────
  deleteMessage(messageId, channelId) {
    const cid = channelId || this._channelId;
    if (!cid) return;
    this._send({
      command:    'message',
      identifier: JSON.stringify({ channel: 'GatewayChannel' }),
      data:       JSON.stringify({ action: 'delete_message', messageId, channelId: cid }),
    });
  }

  // ── Mute user ─────────────────────────────────────────────────
  muteUser(messageId, channelId) {
    const cid = channelId || this._channelId;
    if (!cid) return;
    this._send({
      command:    'message',
      identifier: JSON.stringify({ channel: 'GatewayChannel' }),
      data:       JSON.stringify({ action: 'mute_user', messageId, channelId: cid }),
    });
  }

  // ── Internals ─────────────────────────────────────────────────
  _onClose() {
    if (!this._intentionalClose) {
      this._log('Disconnected — reconnecting in', this._reconnectDelay, 'ms');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connect(), this._reconnectDelay);
  }

  _send(obj) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  }

  _log(...args) { if (this.dev) console.log('[Joystick]', ...args); }
}