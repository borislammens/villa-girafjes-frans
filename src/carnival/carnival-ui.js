import Phaser from '../lib/phaser.js';
import { DataUtils } from '../utils/data-utils.js';
import { DATA_MANAGER_STORE_KEYS, dataManager } from '../utils/data-manager.js';
import { MENU_COLOR } from '../common/menu/menu-config.js';
import { VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';

export const WORD_FONT = 'Verdana, "Trebuchet MS", Arial, sans-serif';
export const STARS_KEY = 'franse-woordjes-sterren';
/** all stars ever earned (spending in the shop does not lower this) */
export const STARS_EARNED_KEY = 'franse-woordjes-sterren-verdiend';
/** stars earned when the current chapter opened */
export const CHAPTER_STARS_KEY = 'franse-woordjes-sterren-hoofdstuk';
const PRIZE_EVERY = 10;

/**
 * @param {string} key
 * @param {number} [fallback]
 * @returns {number}
 */
function readNumber(key, fallback = 0) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : Number(v) || 0;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {number} value
 */
function writeNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

/** @returns {number} all stars ever earned */
export function getStarsEarned() {
  return Math.max(readNumber(STARS_EARNED_KEY, getStars()), getStars());
}

/** @returns {number} stars earned since the current chapter opened */
export function getChapterStars() {
  return Math.max(0, getStarsEarned() - readNumber(CHAPTER_STARS_KEY, 0));
}

/** Call when a new chapter opens: the chapter star count starts again at 0. */
export function startChapterStars() {
  writeNumber(CHAPTER_STARS_KEY, getStarsEarned());
}

/**
 * Spends stars in the shop.
 * @param {number} amount
 * @returns {boolean} false when there are not enough stars
 */
export function spendStars(amount) {
  const have = getStars();
  if (have < amount) return false;
  writeNumber(STARS_EARNED_KEY, getStarsEarned());
  writeNumber(STARS_KEY, have - amount);
  return true;
}

/**
 * Restores all star counters (used by the save code).
 * @param {{stars: number, earned: number, chapterStart: number}} s
 */
export function setStarCounters(s) {
  writeNumber(STARS_KEY, s.stars);
  writeNumber(STARS_EARNED_KEY, Math.max(s.earned, s.stars));
  writeNumber(CHAPTER_STARS_KEY, s.chapterStart);
}

/** @returns {{stars: number, earned: number, chapterStart: number}} */
export function getStarCounters() {
  return { stars: getStars(), earned: getStarsEarned(), chapterStart: readNumber(CHAPTER_STARS_KEY, 0) };
}

/** @returns {number} */
export function getStars() {
  try {
    return Number(localStorage.getItem(STARS_KEY) || 0);
  } catch {
    return 0;
  }
}

/**
 * Adds stars. Every 10 stars gives a prize in the main game (a potion or a ball, taking turns).
 * @param {Phaser.Scene} scene any scene, used to read the item data
 * @param {number} amount
 * @returns {{ total: number, prizes: string[] }}
 */
export function addStars(scene, amount) {
  const before = getStars();
  const earnedBefore = getStarsEarned();
  const total = before + amount;
  writeNumber(STARS_KEY, total);
  writeNumber(STARS_EARNED_KEY, earnedBefore + amount);
  const prizes = [];
  // prizes follow the stars ever earned, so spending stars never gives prizes twice
  for (let n = Math.floor(earnedBefore / PRIZE_EVERY) + 1; n <= Math.floor((earnedBefore + amount) / PRIZE_EVERY); n += 1) {
    const itemId = n % 2 === 1 ? 1 : 2; // 1 = drankje, 2 = oude bal
    const item = DataUtils.getItem(scene, itemId);
    if (item) {
      dataManager.addItem(item, 1);
      prizes.push(item.name);
    }
  }
  if (prizes.length > 0) dataManager.saveData();
  return { total, prizes };
}

/** gold border of the selected button, like the highlight in the rest of the game */
export const HIGHLIGHT_COLOR = 0xffd34d;

/**
 * The colours of the menus in the game (the player can change them in OPTIES).
 * @returns {{main: number, border: number}}
 */
export function menuColors() {
  const chosen = dataManager.store.get(DATA_MANAGER_STORE_KEYS.OPTIONS_MENU_COLOR);
  return MENU_COLOR[(chosen ?? 0) + 1] || MENU_COLOR[1];
}

/**
 * Draws a panel in the style of the game menus: dark fill, thick light border, square pixel corners.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} x left
 * @param {number} y top
 * @param {number} w
 * @param {number} h
 * @param {{fill?: number, border?: number, borderWidth?: number, alpha?: number}} [opts]
 */
export function drawPanel(g, x, y, w, h, opts = {}) {
  const colors = menuColors();
  const bw = opts.borderWidth ?? 6;
  g.fillStyle(0x1b1b1b, opts.alpha ?? 0.95);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(opts.border ?? colors.border, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(opts.fill ?? colors.main, opts.alpha ?? 0.95);
  g.fillRect(x + bw, y + bw, w - bw * 2, h - bw * 2);
  // a light line at the top inside, like the shine on the game panels
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x + bw, y + bw, w - bw * 2, 4);
}

/**
 * Adds a panel as a new game object.
 * @param {Phaser.Scene} scene
 * @param {number} cx centre x
 * @param {number} cy centre y
 * @param {number} w
 * @param {number} h
 * @param {{fill?: number, border?: number, borderWidth?: number, alpha?: number}} [opts]
 * @returns {Phaser.GameObjects.Graphics}
 */
export function addPanel(scene, cx, cy, w, h, opts) {
  const g = scene.add.graphics();
  drawPanel(g, cx - w / 2, cy - h / 2, w, h, opts);
  return g;
}

/** white text with a dark edge, used on panels and on the kermis */
export function panelTextStyle(size = 22, font = WORD_FONT) {
  return { fontFamily: font, fontSize: `${size}px`, color: '#ffffff', stroke: '#1b1b1b', strokeThickness: Math.max(3, Math.round(size / 6)), align: 'center' };
}

/**
 * A button in the style of the game menus. Works with mouse and touch.
 * @param {Phaser.Scene} scene
 * @param {{x: number, y: number, w: number, h: number, label: string, fill?: number, stroke?: number, color?: string, fontSize?: string, font?: string, onClick: () => void}} cfg
 *   stroke is the border colour, fill an optional fill colour (default: the menu colour)
 */
export function makeButton(scene, cfg) {
  const g = scene.add.graphics();
  let fill = cfg.fill;
  let on = false;
  const draw = () => {
    g.clear();
    drawPanel(g, cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h, {
      fill,
      border: on ? HIGHLIGHT_COLOR : cfg.stroke,
      borderWidth: on ? 7 : 5,
    });
  };
  draw();
  const size = parseInt(cfg.fontSize ?? '24px', 10);
  const text = scene.add
    .text(cfg.x, cfg.y, cfg.label, {
      ...panelTextStyle(size, cfg.font ?? WORD_FONT),
      color: cfg.color ?? '#ffffff',
      wordWrap: { width: cfg.w - 24 },
    })
    .setOrigin(0.5);
  const zone = scene.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setInteractive({ useHandCursor: true });
  zone.on(Phaser.Input.Events.POINTER_DOWN, cfg.onClick);
  return {
    text,
    zone,
    graphics: g,
    /** @param {boolean} value */
    highlight(value) {
      on = value;
      draw();
    },
    /** @param {number} color */
    setFill(color) {
      fill = color;
      draw();
    },
    destroy() {
      g.destroy();
      text.destroy();
      zone.destroy();
    },
  };
}

/**
 * A wooden plank in the pixel style of the village fences and signs.
 * @param {Phaser.Scene} scene
 * @param {number} cx
 * @param {number} cy
 * @param {number} w
 * @param {number} h
 */
export function drawPlank(scene, cx, cy, w, h) {
  const g = scene.add.graphics();
  const x = cx - w / 2;
  const y = cy - h / 2;
  g.fillStyle(0x2d2d2d, 1).fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle(0xe8c080, 1).fillRect(x, y, w, h);
  g.fillStyle(0xfff0c8, 1).fillRect(x, y, w, 4);
  g.fillStyle(0x986840, 1).fillRect(x, y + h - 8, w, 8);
  // plank joints
  for (let px = x + 96; px < x + w - 20; px += 128) g.fillStyle(0x986840, 1).fillRect(px, y + 4, 4, h - 12);
  return g;
}

/**
 * The kermis square in pixel art: sky, ferris wheel, circus tent, village trees, grass and flags.
 * @param {Phaser.Scene} scene
 */
export function drawCarnivalBackground(scene) {
  scene.add.image(0, 0, VILLA_ASSET_KEYS.KERMIS_BACKGROUND).setOrigin(0);
}

/**
 * Shows the end of a mini-game: stars earned, prizes, and a button back to the kermis square.
 * @param {Phaser.Scene} scene
 * @param {number} stars stars earned in this game
 * @param {string} title
 * @param {() => void} onBack
 */
export function showEndPanel(scene, stars, title, onBack) {
  const { width, height } = scene.scale;
  const { total, prizes } = addStars(scene, stars);
  scene.add.rectangle(0, 0, width, height, 0x000000, 0.45).setOrigin(0).setInteractive();
  addPanel(scene, width / 2, height / 2, 660, 380);
  scene.add
    .text(width / 2, height / 2 - 136, title, { fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME, fontSize: '36px', color: '#ffd34d', stroke: '#1b1b1b', strokeThickness: 6 })
    .setOrigin(0.5);
  // the stars as pixel stars (the star icon from the shop sign)
  const shown = Math.min(stars, 10);
  for (let i = 0; i < shown; i += 1) {
    const star = scene.add.text(width / 2 + (i - (shown - 1) / 2) * 40, height / 2 - 76, '⭐', { fontSize: '30px' }).setOrigin(0.5).setScale(0);
    scene.tweens.add({ targets: star, scale: 1, delay: 120 * i, duration: 250, ease: 'Back.easeOut' });
  }
  scene.add.text(width / 2 + (shown / 2) * 40 + 30, height / 2 - 76, `+${stars}`, panelTextStyle(28)).setOrigin(0, 0.5);
  const lines = [`Je hebt nu ${total} sterren.`];
  if (prizes.length > 0) lines.push(`🎁 Prijs! Je krijgt: ${prizes.join(', ')} (in je tas).`);
  else lines.push(`Nog ${10 - (total % 10)} sterren tot je volgende prijs.`);
  scene.add.text(width / 2, height / 2 + 4, lines.join('\n'), { ...panelTextStyle(22), wordWrap: { width: 580 }, lineSpacing: 6 }).setOrigin(0.5);
  const btn = makeButton(scene, { x: width / 2, y: height / 2 + 120, w: 320, h: 64, label: 'Terug naar de kermis', fontSize: '22px', onClick: onBack });
  btn.zone.setDepth(100);
  btn.highlight(true);
  return btn;
}
