/**
 * On-screen buttons for tablets and phones: a cross to walk, A (= space), B (= shift, back) and MENU (= enter).
 * The buttons send the same key events as a real keyboard, so the game itself does not need to change.
 * They are shown on touch screens, and can be switched on or off with the small 🎮 button.
 */

const KEYS = Object.freeze({
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  a: { key: ' ', code: 'Space', keyCode: 32 },
  b: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  menu: { key: 'Enter', code: 'Enter', keyCode: 13 },
});

const STORAGE_KEY = 'villa-girafjes-touch';

/**
 * @param {'keydown' | 'keyup'} type
 * @param {{key: string, code: string, keyCode: number}} k
 */
function sendKey(type, k) {
  const event = new KeyboardEvent(type, { key: k.key, code: k.code, bubbles: true, cancelable: true });
  // Phaser reads keyCode, which a new KeyboardEvent does not fill in
  Object.defineProperty(event, 'keyCode', { get: () => k.keyCode });
  Object.defineProperty(event, 'which', { get: () => k.keyCode });
  window.dispatchEvent(event);
}

function addStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .touch-pad { position: fixed; inset: auto 0 0 0; height: 0; z-index: 30; pointer-events: none; font-family: Verdana, Arial, sans-serif; }
    .touch-pad.hidden .touch-btn { display: none; }
    .touch-btn { position: fixed; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
      background: rgba(253, 246, 227, 0.55); border: 3px solid rgba(77, 74, 73, 0.75); color: #2b2b2b;
      display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .touch-btn.down-state { background: rgba(255, 224, 138, 0.85); }
    .touch-dir { width: 62px; height: 62px; border-radius: 14px; font-size: 26px; }
    .touch-up { left: 82px; bottom: 150px; }
    .touch-down { left: 82px; bottom: 18px; }
    .touch-left { left: 16px; bottom: 84px; }
    .touch-right { left: 148px; bottom: 84px; }
    .touch-a { right: 24px; bottom: 60px; width: 84px; height: 84px; border-radius: 50%; font-size: 30px; }
    .touch-b { right: 124px; bottom: 24px; width: 60px; height: 60px; border-radius: 50%; font-size: 22px; }
    .touch-menu { right: 24px; bottom: 160px; width: 84px; height: 40px; border-radius: 12px; font-size: 14px; }
    .touch-toggle { position: fixed; right: 10px; top: 10px; z-index: 31; width: 44px; height: 44px; border-radius: 50%;
      border: 2px solid rgba(77, 74, 73, 0.6); background: rgba(253, 246, 227, 0.7); font-size: 22px; cursor: pointer; }
  `;
  document.head.appendChild(style);
}

/**
 * @param {HTMLElement} parent
 * @param {string} cls
 * @param {string} label
 * @param {{key: string, code: string, keyCode: number}} k
 */
function makeButton(parent, cls, label, k) {
  const btn = document.createElement('div');
  btn.className = `touch-btn ${cls}`;
  btn.textContent = label;
  let pressed = false;
  const press = (e) => {
    e.preventDefault();
    if (pressed) return;
    pressed = true;
    btn.classList.add('down-state');
    sendKey('keydown', k);
  };
  const release = (e) => {
    e.preventDefault();
    if (!pressed) return;
    pressed = false;
    btn.classList.remove('down-state');
    sendKey('keyup', k);
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  parent.appendChild(btn);
}

export function setupTouchControls() {
  addStyle();
  const pad = document.createElement('div');
  pad.className = 'touch-pad';
  makeButton(pad, 'touch-dir touch-up', '▲', KEYS.up);
  makeButton(pad, 'touch-dir touch-down', '▼', KEYS.down);
  makeButton(pad, 'touch-dir touch-left', '◀', KEYS.left);
  makeButton(pad, 'touch-dir touch-right', '▶', KEYS.right);
  makeButton(pad, 'touch-a', 'A', KEYS.a);
  makeButton(pad, 'touch-b', 'B', KEYS.b);
  makeButton(pad, 'touch-menu', 'MENU', KEYS.menu);
  document.body.appendChild(pad);

  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
  const show = saved === null ? isTouch : saved === 'on';
  pad.classList.toggle('hidden', !show);

  const toggle = document.createElement('button');
  toggle.className = 'touch-toggle';
  toggle.title = 'Knoppen op het scherm aan of uit';
  toggle.textContent = '🎮';
  toggle.addEventListener('click', () => {
    const nowHidden = pad.classList.toggle('hidden');
    try {
      localStorage.setItem(STORAGE_KEY, nowHidden ? 'off' : 'on');
    } catch {
      // ignore
    }
    toggle.blur();
  });
  document.body.appendChild(toggle);
}
