import Phaser from '../lib/phaser.js';
import { DataUtils } from '../utils/data-utils.js';
import { dataManager } from '../utils/data-manager.js';

export const WORD_FONT = 'Verdana, "Trebuchet MS", Arial, sans-serif';
export const STARS_KEY = 'franse-woordjes-sterren';
const PRIZE_EVERY = 10;

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
  const total = before + amount;
  try {
    localStorage.setItem(STARS_KEY, String(total));
  } catch {
    // ignore
  }
  const prizes = [];
  for (let n = Math.floor(before / PRIZE_EVERY) + 1; n <= Math.floor(total / PRIZE_EVERY); n += 1) {
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

/**
 * A simple rounded button that works with mouse and touch.
 * @param {Phaser.Scene} scene
 * @param {{x: number, y: number, w: number, h: number, label: string, fill?: number, stroke?: number, color?: string, fontSize?: string, onClick: () => void}} cfg
 */
export function makeButton(scene, cfg) {
  const g = scene.add.graphics();
  const draw = (fill, strokeW, stroke) => {
    g.clear();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h, 14);
    g.lineStyle(strokeW, stroke, 1);
    g.strokeRoundedRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h, 14);
  };
  const fill = cfg.fill ?? 0xffffff;
  const stroke = cfg.stroke ?? 0x6d9aa8;
  draw(fill, 4, stroke);
  const text = scene.add
    .text(cfg.x, cfg.y, cfg.label, {
      fontFamily: WORD_FONT,
      fontSize: cfg.fontSize ?? '24px',
      color: cfg.color ?? '#222222',
      align: 'center',
      wordWrap: { width: cfg.w - 20 },
    })
    .setOrigin(0.5);
  const zone = scene.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setInteractive({ useHandCursor: true });
  zone.on(Phaser.Input.Events.POINTER_DOWN, cfg.onClick);
  return {
    text,
    zone,
    graphics: g,
    /** @param {boolean} on */
    highlight(on) {
      draw(fill, on ? 7 : 4, on ? 0xe0a800 : stroke);
    },
    /** @param {number} color */
    setFill(color) {
      g.clear();
      g.fillStyle(color, 1);
      g.fillRoundedRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h, 14);
      g.lineStyle(4, stroke, 1);
      g.strokeRoundedRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h, 14);
    },
    destroy() {
      g.destroy();
      text.destroy();
      zone.destroy();
    },
  };
}

/**
 * Colorful striped carnival background.
 * @param {Phaser.Scene} scene
 */
export function drawCarnivalBackground(scene) {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, 0x8fd3ff).setOrigin(0);
  const g = scene.add.graphics();
  // tent stripes at the top
  const colors = [0xe94b5a, 0xfdf6e3];
  for (let i = 0; i < 16; i += 1) {
    g.fillStyle(colors[i % 2], 1);
    g.fillTriangle(i * 64, 0, i * 64 + 64, 0, i * 64 + 32, 60);
  }
  // grass
  g.fillStyle(0x7cc66a, 1);
  g.fillRect(0, height - 70, width, 70);
  // little flags
  for (let i = 0; i < 20; i += 1) {
    g.fillStyle([0xffd34d, 0x4da3ff, 0xe94b5a, 0x6ad66a][i % 4], 1);
    g.fillTriangle(i * 54 + 10, 70, i * 54 + 40, 70, i * 54 + 25, 92);
  }
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
  scene.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
  scene.add.rectangle(width / 2, height / 2, 640, 360, 0xfdf6e3).setStrokeStyle(6, 0x4d4a49);
  scene.add.text(width / 2, height / 2 - 130, title, { fontFamily: WORD_FONT, fontSize: '36px', fontStyle: 'bold', color: '#2b5d9b' }).setOrigin(0.5);
  scene.add
    .text(width / 2, height / 2 - 70, `${'⭐'.repeat(Math.min(stars, 10))}  +${stars}`, { fontFamily: WORD_FONT, fontSize: '32px', color: '#4D4A49' })
    .setOrigin(0.5);
  const lines = [`Je hebt nu ${total} sterren.`];
  if (prizes.length > 0) lines.push(`🎁 Prijs! Je krijgt: ${prizes.join(', ')} (in je tas).`);
  else lines.push(`Nog ${10 - (total % 10)} sterren tot je volgende prijs.`);
  scene.add
    .text(width / 2, height / 2, lines.join('\n'), { fontFamily: WORD_FONT, fontSize: '22px', color: '#4D4A49', align: 'center', wordWrap: { width: 580 } })
    .setOrigin(0.5);
  const btn = makeButton(scene, { x: width / 2, y: height / 2 + 120, w: 300, h: 64, label: 'Terug naar de kermis', fill: 0x8fdc8f, stroke: 0x2e7d32, onClick: onBack });
  btn.zone.setDepth(100);
  btn.highlight(true);
  return btn;
}
