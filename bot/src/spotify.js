// ═══════════════════════════════════════════════════════════════
//  spotify.js — Spotify Now Playing module
//
//  SETUP (one-time):
//  1. Go to https://developer.spotify.com/dashboard
//  2. Create an app — set Redirect URI to http://localhost:8888/callback
//  3. Copy Client ID + Secret into .env
//  4. Run: node src/spotify-auth.js   ← generates your refresh token
//  5. Paste the refresh token into .env
//  6. Done — bot will auto-refresh access tokens from then on.
// ═══════════════════════════════════════════════════════════════
import fetch from 'node-fetch';

const POLL_INTERVAL = 8000; // ms between now-playing checks

export class SpotifyModule {
  constructor(relay, { dev = false } = {}) {
    this.relay        = relay;
    this.dev          = dev;
    this.clientId     = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    this.accessToken  = null;
    this.tokenExpiry  = 0;
    this.lastTrackId  = null;
    this._timer       = null;
  }

  start() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.log('[Spotify] Credentials not set — module disabled. See spotify-auth.js to set up.');
      return;
    }
    console.log('[Spotify] Starting now-playing poller...');
    this._poll();
    this._timer = setInterval(() => this._poll(), POLL_INTERVAL);
  }

  stop() { clearInterval(this._timer); }

  // ── Token management ──────────────────────────────────────────
  async _ensureToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry - 30000) return;
    this._log('Refreshing access token...');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: this.refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    this._log('Token refreshed, expires in', data.expires_in, 's');
  }

  // ── Now playing poll ──────────────────────────────────────────
  async _poll() {
    try {
      await this._ensureToken();
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      // 204 = nothing playing
      if (res.status === 204) {
        this.relay.send('spotify', { playing: false });
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      if (!data?.item || !data.is_playing) {
        this.relay.send('spotify', { playing: false });
        return;
      }

      const track = {
        id:       data.item.id,
        title:    data.item.name,
        artist:   data.item.artists.map(a => a.name).join(', '),
        album:    data.item.album.name,
        art:      data.item.album.images?.[1]?.url || null, // ~300px image
        progress: data.progress_ms,
        duration: data.item.duration_ms,
        playing:  true,
      };

      // Only push a "new track" event when the track actually changes
      if (track.id !== this.lastTrackId) {
        this.lastTrackId = track.id;
        this._log('Now playing:', track.artist, '—', track.title);
        this.relay.send('spotify_track', track);
        // Push to ticker
        this.relay.send('ticker_update', {
          text: `🎵 NOW PLAYING: ${track.artist} — ${track.title}`,
        });
      }

      // Always push progress for the widget
      this.relay.send('spotify', track);

    } catch (e) {
      this._log('Poll error:', e.message);
    }
  }

  _log(...args) { if (this.dev) console.log('[Spotify]', ...args); }
}