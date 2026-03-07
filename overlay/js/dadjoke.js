import { speak } from './tts.js';

// dadjoke.js
// Controls the popup widget used for requested dad jokes.  Exports
// showDadJoke() which accepts the same payload the relay sends.

const DJ_DISPLAY_MS   = 12000;
const DJ_PUNCHLINE_MS = 2800;
let djTimer = null;

export function showDadJoke({ username, joke, setup, punchline }) {
  clearTimeout(djTimer);
  const widget      = document.getElementById('dadjoke-widget');
  const setupEl     = document.getElementById('dj-setup');
  const punchEl     = document.getElementById('dj-punchline');
  const requesterEl = document.getElementById('dj-requester');

  punchEl.classList.remove('revealed', 'no-setup');
  widget.classList.remove('visible');
  requesterEl.textContent = `requested by ${username}`;

  if (setup) {
    setupEl.textContent = setup;
    punchEl.textContent = punchline;
  } else {
    setupEl.textContent = '';
    punchEl.textContent = joke;
    punchEl.classList.add('no-setup');
  }

  requestAnimationFrame(() => {
    widget.classList.add('visible');
    setTimeout(() => punchEl.classList.add('revealed'), setup ? DJ_PUNCHLINE_MS : 300);
  });

  if (setup) {
    speak(setup);
    setTimeout(() => speak(punchline), DJ_PUNCHLINE_MS + 200);
  } else {
    speak(joke);
  }

  djTimer = setTimeout(() => widget.classList.remove('visible'), DJ_DISPLAY_MS);
}
