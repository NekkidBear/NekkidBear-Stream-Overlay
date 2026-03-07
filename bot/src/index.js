// ═══════════════════════════════════════════════════════════════
//  TechBear Bot — index.js
// ═══════════════════════════════════════════════════════════════
import 'dotenv/config';
import { RelayServer }  from './relay.js';
import { JoystickClient } from './joystick.js';
import { EventHandler } from './events.js';
import { SpotifyModule } from './spotify.js';
import { LovenseModule } from './lovense.js';

const PORT = parseInt(process.env.RELAY_PORT || '3333');
const DEV  = process.env.NODE_ENV === 'development';
const info = (...a) => console.log('[TechBear Bot]', ...a);

// ── 1. Local WebSocket relay ─────────────────────────────────────
const relay = new RelayServer(PORT);
relay.start();
info(`Relay server live on ws://localhost:${PORT}`);

// BorgaliciousDivaBot intro — sent to overlay on startup
setTimeout(() => {
  relay.send('chat', {
    username:   process.env.BOT_NAME || 'BorgaliciousDivaBot',
    message:    "We are TechBear. Your biological and technological distinctiveness will be added to Our own. Resistance is futile, sugar. We're here, We're fabulous, why do We have to fix your printer again, Karen?! You will be made over and become fabulous.",
    isBotReply: true,
  });
  relay.send('ticker_update', {
    text: '◈ BORGALICIOUSDIVA BOT ONLINE ◈ RESISTANCE IS FUTILE, SUGAR ◈',
  });
}, 2000); // 2s delay so overlay has time to connect

// ── 2. Event handler ─────────────────────────────────────────────
const handler = new EventHandler(relay, { dev: DEV });

// ── 3. Spotify ───────────────────────────────────────────────────
const spotify = new SpotifyModule(relay, { dev: DEV });
// When track changes, tell the handler so !song works
relay.onEvent = (type, data) => {
  if (type === 'spotify_track') handler.setCurrentTrack(data);
};
spotify.start();

// ── 4. Lovense (stub — activates when LOVENSE_ENABLED=true) ──────
const lovense = new LovenseModule(relay, { dev: DEV });
handler.lovense = lovense;  // inject so tip events can reach it
lovense.start();

// ── 5. Joystick.tv ───────────────────────────────────────────────
// accessToken + refreshToken come from running joystick-auth.js once.
// After that they live in .env. The client auto-refreshes on connect.
const jt = new JoystickClient({
  clientId:     process.env.JOYSTICKTV_CLIENT_ID,
  clientSecret: process.env.JOYSTICKTV_CLIENT_SECRET,
  accessToken:  process.env.JOYSTICKTV_ACCESS_TOKEN,
  refreshToken: process.env.JOYSTICKTV_REFRESH_TOKEN,
  dev:          DEV,
});

jt.on('chat',         (d) => handler.onChat(d));
jt.on('follow',       (d) => handler.onFollow(d));
jt.on('subscribe',    (d) => handler.onSubscribe(d));
jt.on('tip',          (d) => handler.onTip(d));
jt.on('wheelspin',    (d) => handler.onWheelspin(d));
jt.on('stream_start', ()  => handler.onStreamStart());
jt.on('stream_end',   ()  => handler.onStreamEnd());
jt.on('user_enter',   (d) => handler.onUserEnter(d));
jt.on('user_leave',   (d) => handler.onUserLeave(d));
jt.on('connected',    ()  => {
  info('Connected to Joystick.tv ✓');
  // Inject send function now that channelId will be available
  // BDB uses this to post to actual Joystick chat (not just the overlay)
  handler.setJoystickSend((text) => jt.sendMessage(text));
});
jt.on('error',        (e) => console.error('[Joystick] Error:', e));

jt.connect();

// ── Graceful shutdown ─────────────────────────────────────────────
process.on('SIGINT', () => {
  info('Shutting down...');
  jt.disconnect();
  spotify.stop();
  relay.stop();
  process.exit(0);
});