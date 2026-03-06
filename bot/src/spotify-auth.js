#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  spotify-auth.js — Run ONCE to get your Spotify refresh token
//
//  Usage:
//    node src/spotify-auth.js
//
//  Then open http://localhost:8888 in your browser and authorize.
//  Your refresh token will be printed — paste it into .env as
//  SPOTIFY_REFRESH_TOKEN=...
// ═══════════════════════════════════════════════════════════════
import 'dotenv/config';
import http from 'http';
import { createHash, randomBytes } from 'crypto';
import fetch from 'node-fetch';

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8888/callback';
const PORT          = 8888;

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env first.');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');

const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  response_type: 'code',
  client_id:     CLIENT_ID,
  scope:         SCOPES,
  redirect_uri:  REDIRECT_URI,
  state,
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') return;

  const code  = url.searchParams.get('code');
  const rState = url.searchParams.get('state');

  if (rState !== state) {
    res.end('State mismatch — possible CSRF. Try again.');
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json();

  if (data.refresh_token) {
    console.log('\n✅ SUCCESS! Add this to your .env:\n');
    console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`);
    res.end('<h2>✅ Authorized! Check your terminal for the refresh token. You can close this tab.</h2>');
  } else {
    console.error('Failed:', data);
    res.end('<h2>❌ Authorization failed. Check terminal.</h2>');
  }
  server.close();
});

server.listen(PORT, () => {
  console.log(`\nOpen this URL in your browser to authorize Spotify:\n\n${authUrl}\n`);
});