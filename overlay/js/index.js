// entry point for overlay modules
import { startColorCycle } from './color.js';
import { connectOBS } from './obs.js';
import { connectRelay } from './relay.js';
import { initMilestone } from './milestone.js';
import { initTicker } from './ticker.js';

// kick off the routines that previously executed in the inline script
startColorCycle();
connectOBS();
connectRelay();
initMilestone();
initTicker();
