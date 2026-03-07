import { CONFIG } from './config.js';
import { speak, sanitizeForTTS } from './tts.js';
import { esc } from './utils.js';
import { CHAT_COLORS } from './color.js';

let chatColorMap = {}, chatColorIdx = 0;

function userColor(u) {
  if (!chatColorMap[u]) chatColorMap[u] = CHAT_COLORS[chatColorIdx++ % CHAT_COLORS.length];
  return chatColorMap[u];
}

export function addChat(username, message, isBotReply = false) {
  const container  = document.getElementById('chat-messages');
  // system messages are only explicit '◈ SYSTEM' entries or
  // bot replies that look like errors (e.g. start with "error"/"warning").
  const isSystem   = username === '◈ SYSTEM' ||
                     (isBotReply && /^(error|warning)/i.test(message));
  const color      = isBotReply && !isSystem ? '#ff6a00' : userColor(username);
  const el         = document.createElement('div');
  el.className     = 'chat-msg'
    + (isBotReply  ? ' bot-reply'    : '')
    + (isSystem    ? ' system-entry' : '');
  el.innerHTML     = `<span class="chatter" style="color:${isSystem ? 'rgba(0,245,255,0.5)' : color}">${esc(username)}</span><span class="msg-text">${esc(message)}</span>`;
  container.appendChild(el);
  console.log('[overlay] chat added', username, message, isBotReply);
  while (container.children.length > CONFIG.chatMax) container.removeChild(container.firstChild);

  if (CONFIG.readChat && !isSystem) {
    const clean = sanitizeForTTS(message);
    if (clean && clean.length <= CONFIG.chatTtsMaxLen) {
      speak(`${username} says: ${clean}`);
    }
  }
}

export function setChatStatus(connected) {
  const el = document.getElementById('chat-status');
  if (!el) return;
  if (connected) {
    el.textContent  = '● LIVE';
    el.className    = 'connected';
  } else {
    el.textContent  = '● CONNECTING…';
    el.className    = 'disconnected';
  }
}

