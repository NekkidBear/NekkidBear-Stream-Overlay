import { CONFIG } from './config.js';

export function initMilestone() {
  const url = CONFIG.milestonesUrl;
  if (!url) return;
  const iframe = document.getElementById('milestone-iframe');
  if (iframe) iframe.src = url;
}
