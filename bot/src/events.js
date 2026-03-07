// ═══════════════════════════════════════════════════════════════
//  events.js — TechBear Event Handler
//  Receives platform events, applies TechBear personality,
//  and forwards formatted payloads to the relay (→ overlay).
// ═══════════════════════════════════════════════════════════════
import fetch from 'node-fetch';

const BOT_NAME = process.env.BOT_NAME || 'BorgaliciousDivaBot';

// ── Dad joke cooldown (prevents spam) ──────────────────────────
const DADJOKE_COOLDOWN_MS = 30 * 1000;
let lastDadJoke = 0;

export class EventHandler {
  constructor(relay, { dev = false } = {}) {
    this.relay         = relay;
    this.dev           = dev;
    this.lovense       = null;      // injected by index.js
    this._currentTrack = null;      // updated by SpotifyModule
    this._joystickSend = null;      // injected after Joystick connects
  }

  setCurrentTrack(track) { this._currentTrack = track; }

  // Called by index.js once Joystick is connected.
  // Gives BDB the ability to post to actual Joystick chat,
  // not just the local overlay.
  setJoystickSend(fn) { this._joystickSend = fn; }

  // ── Chat ───────────────────────────────────────────────────────
  onChat({ username, message, color }) {
    const text = (message || '').trim();
    this.relay.send('chat', { username, message: text, color });
    this._handleCommands(username, text);
  }

  async _handleCommands(username, text) {
    const lower = text.toLowerCase().trim();
    const cmd   = lower.split(' ')[0];

    switch (cmd) {

      case '!dadjoke': {
        const now = Date.now();
        if (now - lastDadJoke < DADJOKE_COOLDOWN_MS) {
          const secs = Math.ceil((DADJOKE_COOLDOWN_MS - (now - lastDadJoke)) / 1000);
          this._botSay(`Honey, I just told one. Give me ${secs} more seconds to recover my dignity.`);
          return;
        }
        let joke;
        try {
          const res = await fetch('https://icanhazdadjoke.com/', {
            headers: {
              'Accept':     'application/json',
              'User-Agent': 'TechBearBot/1.0 (gymnarctosstudiosllc.com)',
            },
          });
          const data = await res.json();
          joke = data.joke;
          lastDadJoke = Date.now();
        } catch {
          joke = `${username} asked for a dad joke but the API is on hold. (Hold music plays.)`;
        }
        this._botSay(joke);
        // Fire dedicated overlay event for the pop-up widget
        const { setup, punchline } = splitJoke(joke);
        this.relay.send('dadjoke', { username, joke, setup, punchline });
        break;
      }

      case '!song': {
        const t = this._currentTrack;
        this._botSay(
          t ? `🎵 Now playing: ${t.artist} — ${t.title}`
            : `Nothing on Spotify right now, sugar. Ask TechBear to put something on!`
        );
        break;
      }

      case '!discord':
        this._botSay(`Join the Gymnarctos Studios Discord — link in Our profile, sugar! We're here, We're fabulous, and We have a server.`);
        break;
      case '!socials':
        this._botSay(`Find TechBear at gymnarctosstudiosllc.com and on Joystick.tv — sassy drag IT diva by day, nudist and raunchy by night, sexy all the time. Give Us a follow, Karen.`);
        break;
      case '!business':
        this._botSay(`Need tech support or a website? Gymnarctos Studios LLC has you covered, darling. We fix printers, build websites, and We look fabulous doing it. gymnarctosstudiosllc.com`);
        break;
      case '!specs':
        this._botSay(`Custom rig, OBS, VTube Studio, and seventeen years of IT experience, sugar. We are TechBear. We contain multitudes. Ask Us anything.`);
        break;
      case '!lurk':
        this._botSay(`${username} has entered lurk mode. We see you, darling, and We appreciate you. Lurk in fabulous peace. 🐻`);
        break;
      case '!unlurk':
        this._botSay(`${username} is BACK! We missed you, gorgeous. Pull up a chair. Karen's printer is broken again.`);
        break;
      case '!hug':
        this._botSay(`${username} gets a big ol' TechBear hug! We are fabulous AND warm. 🐻💕`);
        break;

      case '!borg':
        this._botSay(`We are TechBear. Your biological and technological distinctiveness will be added to Our own. Resistance is futile, sugar. You will be made over and become fabulous. We're here, We're fabulous, Why do We have to fix your printer again, Karen?!`);
        break;

      case '!google': {
        const query = text.slice('!google'.length).trim();
        if (!query) {
          this._botSay(`Here ya go, sugar! Try: !google [your question] and We'll point you in the right direction.`);
          break;
        }
        const encoded = encodeURIComponent(query);
        this._botSay(`Here ya go, sugar! We looked that up for you: https://lmgtfy.app/?q=${encoded}`);
        break;
      }

      case '!commands':
        this._botSay(`BorgaliciousDivaBot commands: !dadjoke · !song · !borg · !google [query] · !discord · !socials · !business · !specs · !lurk · !unlurk · !hug — We're here, We're fabulous, We have commands.`);
        break;
    }
  }

  _botSay(message) {
    // Send to overlay (shows in OBS chat widget + triggers TTS)
    this.relay.send('chat', { username: BOT_NAME, message, isBotReply: true });
    // Send to actual Joystick.tv chat so viewers see it
    if (this._joystickSend) {
      this._joystickSend(message);
    }
  }

  // ── Follow ─────────────────────────────────────────────────────
  onFollow({ username }) {
    this._log('FOLLOW:', username);
    this.relay.send('follow', { username });
    this.relay.send('color', { hex: '#ff00ff' });
  }

  // ── Subscribe ──────────────────────────────────────────────────
  onSubscribe({ username, tier }) {
    this._log('SUBSCRIBE:', username, tier);
    this.relay.send('subscribe', { username, tier: tier || '1' });
    this.relay.send('color', { hex: '#bf00ff' });
  }

  // ── Tip ────────────────────────────────────────────────────────
  onTip({ username, amount }) {
    this._log('TIP:', username, amount);
    this.relay.send('tip', { username, amount });
    this.relay.send('color', { hex: '#39ff14' });
    this.relay.send('ticker_update', { text: `💰 ${username} just tipped $${amount}! THANK YOU!` });
    this.lovense?.onTip(amount);   // ← Lovense fires here when active
  }

  // ── Wheel spin ─────────────────────────────────────────────────
  onWheelspin({ username, prize, amount }) {
    this._log('WHEELSPIN:', username, prize);
    this.relay.send('wheelspin', { username, prize, amount });
    this.relay.send('color', { hex: '#ff6a00' });
    this.relay.send('ticker_update', { text: `🎡 ${username} won ${prize} on the wheel! Lucky!` });
  }

  // ── Stream start ───────────────────────────────────────────────
  onStreamStart() {
    this._log('STREAM START');
    this.relay.send('ticker_update', { text: `◈ WE ARE LIVE ◈ RESISTANCE IS FUTILE, SUGAR ◈ YOU WILL BE MADE OVER AND BECOME FABULOUS ◈` });
  }

  // ── Stream end ─────────────────────────────────────────────────
  onStreamEnd() {
    this._log('STREAM END');
    this.relay.send('ticker_update', { text: `◈ STREAM ENDING ◈ THANK YOU ALL ◈ CLOSE SOME OF YOUR TABS ◈` });
  }

  // ── User enter/leave ────────────────────────────────────────────
  onUserEnter({ username }) {
    this._log('USER ENTER:', username);
    this.relay.send('user_enter', { username });
  }

  onUserLeave({ username }) {
    this._log('USER LEAVE:', username);
    this.relay.send('user_leave', { username });
  }

  _log(...args) { if (this.dev) console.log('[EventHandler]', ...args); }
}

// ── Split joke into setup / punchline for overlay reveal ────────
function splitJoke(joke) {
  const patterns = [/\?\s+/, /\.\.\.\s+/, /:\s+(?=[A-Z])/, /!\s+(?=[A-Z])/];
  for (const pat of patterns) {
    const idx = joke.search(pat);
    if (idx > 10 && idx < joke.length - 10) {
      const match = joke.match(pat);
      const at    = idx + match[0].length;
      return { setup: joke.slice(0, at).trim(), punchline: joke.slice(at).trim() };
    }
  }
  return { setup: null, punchline: joke };
}