// ═══════════════════════════════════════════════════════════════
//  joystick-auth.js — One-time Joystick.tv OAuth setup
//
//  Run this ONCE to install BorgaliciousDivaBot on your channel
//  and get your access_token + refresh_token.
//
//  Usage:
//    node src/joystick-auth.js
//
//  What it does:
//    1. Starts a local HTTP server on port 8888
//    2. Opens the Joystick.tv authorization URL in your browser
//    3. You click "Authorize" on Joystick.tv
//    4. Joystick redirects back to localhost:8888/callback
//    5. Script exchanges the auth code for tokens
//    6. Prints the tokens — paste them into your .env file
//    7. Shuts itself down
//
//  After this you never need to run it again unless your
//  refresh token expires (which shouldn't happen if the bot
//  runs regularly — it auto-refreshes on each connect).
// ═══════════════════════════════════════════════════════════════
import 'dotenv/config';
import http          from 'http';
import fetch         from 'node-fetch';
import { exec }      from 'child_process';

const CLIENT_ID     = process.env.JOYSTICKTV_CLIENT_ID;
const CLIENT_SECRET = process.env.JOYSTICKTV_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8888/callback';
const PORT          = 8888;

// ── Validate env ──────────────────────────────────────────────
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Missing credentials in .env');
  console.error('    Set JOYSTICKTV_CLIENT_ID and JOYSTICKTV_CLIENT_SECRET first.\n');
  process.exit(1);
}

// ── Basic auth key = base64(clientId:clientSecret) ───────────
const basicKey = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

// ── State token for MITM protection ──────────────────────────
const STATE = `techbear-${Date.now()}`;

// ── Authorization URL ─────────────────────────────────────────
const AUTH_URL =
  `https://joystick.tv/api/oauth/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&scope=bot` +
  `&state=${encodeURIComponent(STATE)}`;

// ── Local callback server ─────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404); res.end('Not found'); return;
  }

  const code          = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error         = url.searchParams.get('error');

  if (error) {
    console.error('\n❌  Authorization denied:', error);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization denied: ${error}</h2><p>You can close this tab.</p>`);
    server.close();
    return;
  }

  if (returnedState !== STATE) {
    console.error('\n❌  State mismatch — possible MITM attack. Aborting.');
    res.writeHead(400); res.end('State mismatch');
    server.close();
    return;
  }

  if (!code) {
    console.error('\n❌  No authorization code received.');
    res.writeHead(400); res.end('No code');
    server.close();
    return;
  }

  console.log('\n✓  Authorization code received. Exchanging for tokens...');

  try {
    const tokenRes = await fetch(
      `https://joystick.tv/api/oauth/token` +
      `?redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Basic ${basicKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
          'Accept':        'application/json',
        },
      }
    );

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} — ${txt}`);
    }

    const tokens = await tokenRes.json();

    console.log('\n✅  SUCCESS! Paste these into your .env file:\n');
    console.log('─────────────────────────────────────────────────────');
    console.log(`JOYSTICKTV_ACCESS_TOKEN="${tokens.access_token}"`);
    console.log(`JOYSTICKTV_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log('─────────────────────────────────────────────────────');
    console.log('\nBorgaliciousDivaBot is authorized. Resistance was futile. 🐻\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#0ff;">
        <h2>✅ BorgaliciousDivaBot Authorized!</h2>
        <p>Resistance was futile, sugar.</p>
        <p>Check your terminal — copy the tokens into your <code>.env</code> file.</p>
        <p>You can close this tab.</p>
      </body></html>
    `);

  } catch (err) {
    console.error('\n❌  Token exchange error:', err.message);
    res.writeHead(500); res.end('Token exchange failed — check terminal');
  }

  server.close();
});

server.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  BorgaliciousDivaBot — Joystick.tv Auth Setup');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n  Opening Joystick.tv authorization page...');
  console.log('  If it doesn\'t open, paste this URL into your browser:\n');
  console.log(`  ${AUTH_URL}\n`);

  const opener =
    process.platform === 'darwin' ? `open "${AUTH_URL}"` :
    process.platform === 'win32'  ? `start "${AUTH_URL}"` :
                                    `xdg-open "${AUTH_URL}"`;
  exec(opener, (err) => {
    if (err) console.log('  (Could not auto-open browser — paste URL above manually)');
  });

  console.log('  Waiting for authorization...');
  console.log('  (Ctrl+C to cancel)\n');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error('    Stop whatever is using it and try again.\n');
  } else {
    console.error('\n❌  Server error:', e);
  }
  process.exit(1);
});