import { CONFIG } from './config.js';
import { setLayout } from './layout.js';

// OBS WebSocket v5 helper.  Automatically authenticates, subscribes to
// scene-change events, and calls setLayout() when the program scene name
// matches one of our known layout keys.

const SCENE_LAYOUT_MAP = {
  'Full Layout':    'full',
  'No Boss Cam':    'no-boss',
  'VTuber Focus':   'vtuber-focus',
  'Screen Share':   'screen-share',
  'Content Merged': 'merged',
};

let obsWs, obsReqId = 1, obsIdentified = false;

export function connectOBS() {
  obsWs = new WebSocket(CONFIG.obsWsUrl);
  obsWs.onopen = () => console.log('[OBS WS] Connected');
  obsWs.onmessage = async (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.op === 0) {
      const auth = msg.d.authentication;
      let authStr;
      if (auth && CONFIG.obsWsPassword) {
        authStr = await buildOBSAuth(CONFIG.obsWsPassword, auth.salt, auth.challenge);
      }
      obsWs.send(JSON.stringify({
        op: 1, d: {
          rpcVersion: 1,
          ...(authStr ? { authentication: authStr } : {}),
          eventSubscriptions: 4 | 64,
        }
      }));
    }
    if (msg.op === 2) {
      obsIdentified = true;
      obsReq('GetCurrentProgramScene');
    }
    if (msg.op === 5) {
      const { eventType, eventData } = msg.d;
      if (eventType === 'CurrentProgramSceneChanged') {
        const layout = SCENE_LAYOUT_MAP[eventData.sceneName];
        if (layout) setLayout(layout);
      }
    }
    if (msg.op === 7 && msg.d.requestType === 'GetCurrentProgramScene') {
      const layout = SCENE_LAYOUT_MAP[msg.d.responseData?.currentProgramSceneName];
      if (layout) setLayout(layout);
    }
  };
  obsWs.onclose = () => {
    obsIdentified = false;
    setTimeout(connectOBS, 5000);
  };
}

export function obsReq(type, data = {}) {
  if (!obsIdentified) return;
  obsWs.send(JSON.stringify({ op:6, d:{ requestType:type, requestId:String(obsReqId++), requestData:data } }));
}

async function buildOBSAuth(password, salt, challenge) {
  const enc   = new TextEncoder();
  const hash1 = await crypto.subtle.digest('SHA-256', enc.encode(password + salt));
  const b641  = btoa(String.fromCharCode(...new Uint8Array(hash1)));
  const hash2 = await crypto.subtle.digest('SHA-256', enc.encode(b641 + challenge));
  return btoa(String.fromCharCode(...new Uint8Array(hash2)));
}
