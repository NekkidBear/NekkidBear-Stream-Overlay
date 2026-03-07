import { CONFIG } from './config.js';
import { addChat, setChatStatus } from './chat.js';
import { showAlert } from './alert.js';
import { speak, SCRIPTS } from './tts.js';
import { setLayout } from './layout.js';
import { setColor } from './color.js';
import { pushTicker } from './ticker.js';
import { updateSpotify } from './spotify.js';
import { showDadJoke } from './dadjoke.js';

// connectRelay establishes the websocket to the bot relay and routes messages
// into the appropriate handlers from other modules.

let relayWs;
export function connectRelay() {
  relayWs = new WebSocket(CONFIG.relayUrl);

  relayWs.onopen = () => {
    setChatStatus(true);
    // notify the page that the relay is up so we can dismiss the init modal
    window.dispatchEvent(new Event('relay-open'));
  };

  relayWs.onmessage = (evt) => {
    let msg; try { msg = JSON.parse(evt.data); } catch { return; }
    handleEvent(msg);
  };

  relayWs.onclose = () => {
    setChatStatus(false);
    setTimeout(connectRelay, 3000);
  };

  relayWs.onerror = () => {}; // suppress console noise — onclose handles retry
}

function handleEvent(msg) {
  console.log('[overlay] event received', msg);
  switch (msg.type) {
    case 'chat':
      addChat(msg.username, msg.message, msg.isBotReply);
      break;
    case 'follow':
      showAlert('follow', msg.username);
      speak(SCRIPTS.follow(msg.username), true);
      break;
    case 'subscribe':
      showAlert('subscribe', msg.username, msg.tier ? `Tier ${msg.tier}` : '');
      speak(SCRIPTS.subscribe(msg.username), true);
      break;
    case 'tip':
      showAlert('tip', msg.username, msg.amount ? `$${msg.amount}` : '');
      speak(SCRIPTS.tip(msg.username, msg.amount ? `$${msg.amount}` : 'some tokens'), true);
      break;
    case 'shoutout':
      showAlert('shoutout', msg.username, msg.detail || '');
      speak(SCRIPTS.shoutout(msg.username), true);
      break;
    case 'dadjoke':
      showDadJoke(msg);
      break;
    case 'layout':
      setLayout(msg.name);
      break;
    case 'color':
      if (msg.hex) setColor(msg.hex);
      break;
    case 'ticker_update':
      if (msg.text) pushTicker(msg.text);
      break;
    case 'spotify':
    case 'spotify_track':
      updateSpotify(msg);
      break;
  }
}
