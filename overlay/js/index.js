// entry point for overlay modules
console.log('overlay: starting module initialization');

// display a temporary full–screen modal so that testers know when the page
// has finished loading and the modules are wired up.  it disappears after a
// couple seconds or when the relay connection opens.
function showInitModal() {
  const style = document.createElement('style');
  style.id = 'init-modal-style';
  style.textContent = `
#init-modal {
  position:fixed; inset:0; z-index:60;
  display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,0.85);
  color:#fff; font-size:2.4rem; font-family:var(--font-mono);
  text-shadow:0 0 8px #000;
}
`;
  document.head.appendChild(style);

  const m = document.createElement('div');
  m.id = 'init-modal';
  m.textContent = 'Modules loaded – waiting for events...';
  document.body.appendChild(m);
}
function hideInitModal() {
  const m = document.getElementById('init-modal');
  if (m) m.remove();
  const s = document.getElementById('init-modal-style');
  if (s) s.remove();
}
showInitModal();

import { startColorCycle } from './color.js';
import { connectOBS } from './obs.js';
import { connectRelay } from './relay.js';
import { initMilestone } from './milestone.js';
import { initTicker } from './ticker.js';
import { initBackground } from './background.js';

// hide once relay actually connects (over in relay.js we call this)
export { hideInitModal };

// initialize background first so it sits under everything else
// allow disabling via ?nobg=1 on the URL (useful when running chrome.html as a
// standalone OBS browser source that already has a separate background)
if (!new URL(window.location.href).searchParams.has('nobg')) {
  initBackground();
} else {
  console.log('overlay: background init skipped (nobg flag)');
}

// kick off the routines that previously executed in the inline script
startColorCycle();
connectOBS();
connectRelay();
// hide the init modal as soon as relay opens
window.addEventListener('relay-open', hideInitModal);
initMilestone();
initTicker();
