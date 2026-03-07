import { CONFIG } from './config.js';

// TTS engine helpers and queueing.  Exports a single `speak()` function;
// callers can optionally pass `priority=true` to push an utterance to the front
// of the queue (used for alert events).

const synth = window.speechSynthesis;
const ttsQ  = [];
let ttsBusy      = false;
let cachedVoices = [];

function loadVoices() {
  const v = synth.getVoices();
  if (v.length) cachedVoices = v;
}
synth.onvoiceschanged = loadVoices;
loadVoices(); // immediate attempt — works in Firefox and some CEF builds

// CEF heartbeat — prevents synthesis from going dormant
setInterval(() => {
  if (synth.speaking) { synth.pause(); synth.resume(); }
}, 5000);

function getVoice() {
  const voices = cachedVoices.length ? cachedVoices : synth.getVoices();
  if (!voices.length) return null;

  if (CONFIG.ttsVoiceName) {
    const match = voices.find(v =>
      v.name.toLowerCase().includes(CONFIG.ttsVoiceName.toLowerCase())
    );
    if (match) return match;
  }

  for (const name of ['Zoe','Ava','Nicky','Samantha','Victoria','Karen']) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices[0];
}

// speak(text, priority)
export function speak(text, priority = false) {
  if (!text || !text.trim()) return;
  const clean = sanitizeForTTS(text);
  if (!clean) return;
  if (priority) ttsQ.unshift(clean);
  else ttsQ.push(clean);
  drainTTS();
}

function drainTTS() {
  if (ttsBusy || !ttsQ.length) return;

  synth.cancel();
  ttsBusy = true;

  const text = ttsQ.shift();
  const u    = new SpeechSynthesisUtterance(text);
  u.rate   = CONFIG.ttsRate;
  u.pitch  = CONFIG.ttsPitch;
  u.volume = CONFIG.ttsVolume;

  const voice = getVoice();
  if (voice) u.voice = voice;

  const ind = document.getElementById('tts-indicator');
  const lbl = document.getElementById('tts-text');
  if (lbl) lbl.textContent = text;
  if (ind) ind.classList.add('speaking');

  u.onend = () => {
    ttsBusy = false;
    if (ind) ind.classList.remove('speaking');
    setTimeout(drainTTS, 150);
  };
  u.onerror = (e) => {
    if (e.error !== 'interrupted') {
      console.warn('[TTS] Error:', e.error, '|', text);
    }
    ttsBusy = false;
    if (ind) ind.classList.remove('speaking');
    setTimeout(drainTTS, 150);
  };

  synth.speak(u);
}

// helper used only by this module
function sanitizeForTTS(text) {
  return text
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[◈►▶◀★☆•]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

// exported scripts object for event handlers
export const SCRIPTS = {
  follow: n => pick([
    `${n} just followed! Welcome to the cave, sugar!`,
    `Oh honey, ${n} followed! You have excellent taste.`,
    `${n}, welcome to Gymnarctos Studios. Wi-Fi strong, opinions stronger.`,
    `Well look at that — ${n} decided to stick around. Smart choice, darling.`,
  ]),
  subscribe: n => pick([
    `${n} just subscribed! Oh, we are FANCY now. Thank you, gorgeous!`,
    `${n} subscribed! Honey, you didn't have to, but I am so glad you did.`,
    `${n} is now a subscriber. That is what I call a power move, darling.`,
    `Baby, ${n} subscribed! Mama appreciates you so much.`,
  ]),
  tip: (n, a) => pick([
    `${n} just tipped ${a}! Sugar, you are too kind. Mama's getting a latte!`,
    `Oh! ${n} sent ${a}! Bless your generous little heart!`,
    `${n} tipped ${a}! This goes straight into the server fund, darling.`,
    `${a} from ${n}! Honey, I could kiss you. Air kiss. From a distance. Fabulous.`,
  ]),
  shoutout: n => pick([
    `Go check out ${n}! They are absolutely fabulous and you will not regret it.`,
    `Shoutout to ${n}! Honey, go follow them right now. I mean it.`,
    `Hey y'all, go show some love to ${n}! That is an order from TechBear.`,
  ]),
};

// tiny util used by the scripts above
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// expose sanitizer for other modules that need it (chat, etc.)
export { sanitizeForTTS };
