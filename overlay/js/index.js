// entry point for overlay modules
console.log('overlay: starting module initialization');
import { startColorCycle } from './color.js';
import { connectOBS } from './obs.js';
import { connectRelay } from './relay.js';
import { initMilestone } from './milestone.js';
import { initTicker } from './ticker.js';
import { initBackground } from './background.js';

// initialize background first so it sits under everything else
initBackground();

// kick off the routines that previously executed in the inline script
startColorCycle();
connectOBS();
connectRelay();
initMilestone();
initTicker();
