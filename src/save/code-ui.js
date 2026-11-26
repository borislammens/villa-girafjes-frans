/**
 * Simple HTML windows on top of the game for the bewaarcode (big, readable, works with mouse and keyboard).
 */

const STYLE_ID = 'giraf-code-style';

function addStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // same look as the menus in the game: dark panel, thick light border, square corners, Kenney font
  style.textContent = `
    .giraf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50; font-family: Verdana, Arial, sans-serif; }
    .giraf-box { background: rgba(50,69,76,0.97); border: 8px solid #6d9aa8; outline: 3px solid #1b1b1b; box-shadow: inset 0 4px 0 rgba(255,255,255,0.12), 0 8px 0 rgba(0,0,0,0.35);
      padding: 22px 28px; max-width: 640px; width: calc(100% - 64px); box-sizing: border-box; text-align: center; color: #ffffff; image-rendering: pixelated; }
    .giraf-box h2 { margin: 0 0 10px; color: #ffd34d; font-family: Kenney-Future-Narrow, Verdana, sans-serif; font-weight: normal; font-size: 30px; letter-spacing: 1px; text-shadow: 3px 3px 0 #1b1b1b; }
    .giraf-box p { margin: 8px 0; font-size: 17px; line-height: 1.45; text-shadow: 2px 2px 0 #1b1b1b; }
    .giraf-box b { color: #ffd34d; }
    .giraf-code { font-family: Consolas, 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 1px; color: #ffffff; background: #1f2d32; border: 4px dashed #ffd34d; padding: 12px; margin: 14px 0; word-break: break-all; user-select: all; }
    .giraf-input { font-family: Consolas, 'Courier New', monospace; font-size: 24px; text-transform: uppercase; width: 100%; box-sizing: border-box; padding: 10px; color: #ffffff; background: #1f2d32; border: 4px solid #6d9aa8; border-radius: 0; margin: 12px 0 6px; outline: none; }
    .giraf-input:focus { border-color: #ffd34d; }
    .giraf-error { color: #ff8a80; min-height: 1.4em; text-shadow: 2px 2px 0 #1b1b1b; }
    .giraf-buttons { display: flex; gap: 14px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
    .giraf-btn { font-family: Verdana, Arial, sans-serif; font-weight: bold; font-size: 18px; padding: 10px 22px; border-radius: 0; color: #ffffff; background: #32454c; border: 5px solid #6d9aa8; outline: 2px solid #1b1b1b; cursor: pointer; text-shadow: 2px 2px 0 #1b1b1b; }
    .giraf-btn:hover, .giraf-btn:focus { border-color: #ffd34d; }
    .giraf-btn.main { border-color: #ffd34d; background: #3d5a64; }
    .giraf-title-btn { position: fixed; left: 16px; bottom: 16px; z-index: 40; font-family: Verdana, Arial, sans-serif; font-weight: bold; font-size: 17px; padding: 10px 16px; border-radius: 0; color: #ffffff; background: rgba(50,69,76,0.95); border: 5px solid #6d9aa8; outline: 2px solid #1b1b1b; cursor: pointer; text-shadow: 2px 2px 0 #1b1b1b; }
    .giraf-title-btn:hover { border-color: #ffd34d; }
  `;
  document.head.appendChild(style);
}

/**
 * @param {string} html
 * @returns {HTMLDivElement}
 */
function makeOverlay(html) {
  addStyle();
  const overlay = document.createElement('div');
  overlay.className = 'giraf-overlay';
  overlay.innerHTML = `<div class="giraf-box">${html}</div>`;
  // keys typed here must not move the player in the game
  overlay.addEventListener('keydown', (e) => e.stopPropagation());
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Shows the bewaarcode of the game.
 * @param {string} code
 * @param {() => void} onClose
 */
export function showCodeOverlay(code, onClose) {
  const overlay = makeOverlay(`
    <h2>🔑 Jouw bewaarcode</h2>
    <p>Schrijf deze code op (of maak een foto). Op een andere computer kies je in het beginscherm <b>"Ik heb een bewaarcode"</b> en typ je hem over.</p>
    <div class="giraf-code">${code}</div>
    <p style="font-size:14px;color:#c8d8de">Hoofdletters of kleine letters maakt niet uit. Na het laden sta je weer voor je huis.</p>
    <div class="giraf-buttons">
      <button class="giraf-btn" data-act="copy">Kopiëren</button>
      <button class="giraf-btn main" data-act="close">Oké!</button>
    </div>`);
  const close = () => {
    overlay.remove();
    window.removeEventListener('keydown', onKey, true);
    onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  // wait a moment so the key press that opened this window does not close it
  setTimeout(() => window.addEventListener('keydown', onKey, true), 300);
  overlay.querySelector('[data-act="close"]').addEventListener('click', close);
  overlay.querySelector('[data-act="copy"]').addEventListener('click', (e) => {
    navigator.clipboard?.writeText(code).then(
      () => {
        /** @type {HTMLButtonElement} */ (e.target).textContent = 'Gekopieerd!';
      },
      () => {}
    );
  });
}

/**
 * Asks for a bewaarcode.
 * @param {(code: string) => boolean} tryLoad returns false when the code is wrong
 * @param {() => void} onCancel
 */
export function askCodeOverlay(tryLoad, onCancel) {
  const overlay = makeOverlay(`
    <h2>🔑 Bewaarcode invoeren</h2>
    <p>Typ de code die je opschreef, bijvoorbeeld <b>GIRAF-6P01H-...</b></p>
    <input class="giraf-input" type="text" autocomplete="off" spellcheck="false" placeholder="GIRAF-" />
    <div class="giraf-error"></div>
    <div class="giraf-buttons">
      <button class="giraf-btn" data-act="cancel">Terug</button>
      <button class="giraf-btn main" data-act="ok">Laden</button>
    </div>`);
  const input = /** @type {HTMLInputElement} */ (overlay.querySelector('input'));
  const error = /** @type {HTMLDivElement} */ (overlay.querySelector('.giraf-error'));
  const submit = () => {
    if (tryLoad(input.value)) {
      overlay.remove();
      return;
    }
    error.textContent = 'Hmm, die code klopt niet. Kijk elke letter nog eens na!';
    input.focus();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') {
      overlay.remove();
      onCancel();
    }
  });
  overlay.querySelector('[data-act="ok"]').addEventListener('click', submit);
  overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => {
    overlay.remove();
    onCancel();
  });
  setTimeout(() => input.focus(), 50);
}

/**
 * A button on the title screen.
 * @param {() => void} onClick
 * @returns {HTMLButtonElement}
 */
export function addTitleCodeButton(onClick) {
  addStyle();
  const btn = document.createElement('button');
  btn.className = 'giraf-title-btn';
  btn.textContent = '🔑 Ik heb een bewaarcode';
  btn.addEventListener('click', onClick);
  document.body.appendChild(btn);
  return btn;
}
