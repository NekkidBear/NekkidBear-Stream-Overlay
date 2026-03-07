// entry point for overlay modules
console.log('overlay: starting module initialization');
import { startColorCycle } from './color.js';
import { connectOBS } from './obs.js';
import { connectRelay } from './relay.js';
import { initMilestone } from './milestone.js';
import { initTicker } from './ticker.js';
import { initBackground } from './background.js';

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
initMilestone();
initTicker();
