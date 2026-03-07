// ticker.js
// Creates the scrolling ticker items and provides a way to prepend new
// messages.

const TICKS = [
  'GYMNARCTOS STUDIOS LLC',
  'TECH SUPPORT · WEB DEVELOPMENT · DIGITAL SERVICES',
  'TWIN CITIES · MINNESOTA',
  'FOLLOW AND SUBSCRIBE',
  'TIPS APPRECIATED',
  'JOYSTICK.TV/TECHBEAR',
];

let tickerEl;
export function initTicker() {
  tickerEl = document.getElementById('tickerTrack');
  if (!tickerEl) return;
  [...TICKS, ...TICKS].forEach(t => {
    const s = document.createElement('span');
    s.className  = 'ticker-item';
    s.textContent = t;
    tickerEl.appendChild(s);
  });
}

export function pushTicker(text) {
  if (!tickerEl) return;
  const s = document.createElement('span');
  s.className  = 'ticker-item';
  s.textContent = text;
  tickerEl.prepend(s.cloneNode(true));
}
