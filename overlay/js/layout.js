// layout.js
// Controls the CSS classes that drive the six possible layouts.

export const LAYOUTS = {
  'full':         { label:'FULL LAYOUT',    cls:'layout-full' },
  'no-boss':      { label:'NO BOSS CAM',    cls:'layout-no-boss' },
  'vtuber-focus': { label:'VTUBER FOCUS',   cls:'layout-vtuber-focus' },
  'screen-share': { label:'SCREEN SHARE',   cls:'layout-screen-share' },
  'merged':       { label:'CONTENT MERGED', cls:'layout-merged' },
};

let currentLayout = 'full';

export function setLayout(name) {
  if (!LAYOUTS[name] || name === currentLayout) return;
  Object.values(LAYOUTS).forEach(l => document.body.classList.remove(l.cls));
  document.body.classList.add(LAYOUTS[name].cls);
  currentLayout = name;
  const ind = document.getElementById('layout-indicator');
  if (ind) {
    ind.textContent = '◈ ' + LAYOUTS[name].label;
    ind.classList.add('flash');
    setTimeout(() => ind.classList.remove('flash'), 1500);
  }
}
