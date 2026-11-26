import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { DIRECTION } from '../common/direction.js';
import { TITLE_ASSET_KEYS } from '../assets/asset-keys.js';
import { CONTACT_TITLES, WORDS } from '../vocab/words.js';
import { getSelectedContacts, setSelectedContacts } from '../vocab/quiz.js';

const FONT = KENNEY_FUTURE_NARROW_FONT_NAME;

/** Lets the player choose which Contact chapters the battles ask about. */
export class ContactSelectScene extends BaseScene {
  /** @type {Set<number>} */
  #chosen;
  /** @type {number} 0-3 = contact rows, 4 = start button */
  #cursor;
  /** @type {{bg: Phaser.GameObjects.Rectangle, check: Phaser.GameObjects.Text}[]} */
  #rows;
  /** @type {Phaser.GameObjects.Rectangle} */
  #startBg;
  /** @type {Phaser.GameObjects.Text} */
  #hint;
  /** @type {boolean} */
  #leaving;

  constructor() {
    super({ key: SCENE_KEYS.CONTACT_SELECT_SCENE });
  }

  init() {
    super.init();
    this.#chosen = new Set(getSelectedContacts());
    this.#cursor = 4;
    this.#rows = [];
    this.#leaving = false;
  }

  create() {
    super.create();
    const { width } = this.scale;
    this.add.image(0, 0, TITLE_ASSET_KEYS.BACKGROUND).setOrigin(0).setScale(0.58);
    this.add.rectangle(width / 2, 288, 760, 540, 0xfdf6e3, 0.95).setStrokeStyle(6, 0x4d4a49);
    this.add
      .text(width / 2, 50, 'Welke woordjes wil je oefenen?', { fontFamily: FONT, fontSize: '36px', color: '#4D4A49' })
      .setOrigin(0.5);

    [1, 2, 3, 4].forEach((n, i) => {
      const y = 110 + i * 82;
      const bg = this.add
        .rectangle(width / 2, y + 30, 640, 68, 0xffffff)
        .setStrokeStyle(4, 0x6d9aa8)
        .setInteractive({ useHandCursor: true });
      const check = this.add.text(width / 2 - 300, y + 30, '', { fontFamily: FONT, fontSize: '40px', color: '#2e7d32' }).setOrigin(0, 0.5);
      const count = WORDS.filter((w) => w.contact === n).length;
      this.add
        .text(width / 2 - 240, y + 30, `Contact ${n}: ${CONTACT_TITLES[n]}`, { fontFamily: FONT, fontSize: '26px', color: '#222' })
        .setOrigin(0, 0.5);
      this.add
        .text(width / 2 + 305, y + 30, `${count} woorden`, { fontFamily: FONT, fontSize: '16px', color: '#888' })
        .setOrigin(1, 0.5);
      bg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.#cursor = i;
        this.#toggle(n);
      });
      this.#rows.push({ bg, check });
    });

    this.#startBg = this.add
      .rectangle(width / 2, 470, 300, 70, 0x8fdc8f)
      .setStrokeStyle(4, 0x2e7d32)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 470, 'Start!', { fontFamily: FONT, fontSize: '36px', color: '#1b5e20' }).setOrigin(0.5);
    this.#startBg.on(Phaser.Input.Events.POINTER_DOWN, () => this.#start());

    this.#hint = this.add
      .text(width / 2, 532, 'Klik op een Contact, of gebruik de pijltjes en spatie.', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#7a6f6a',
      })
      .setOrigin(0.5);

    this.#refresh();
  }

  update() {
    super.update();
    if (this._controls.isInputLocked || this.#leaving) return;
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      if (this.#cursor === 4) this.#start();
      else this.#toggle(this.#cursor + 1);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    if (dir === DIRECTION.UP) this.#cursor = Math.max(0, this.#cursor - 1);
    if (dir === DIRECTION.DOWN) this.#cursor = Math.min(4, this.#cursor + 1);
    if (dir !== DIRECTION.NONE) this.#refresh();
  }

  /** @param {number} n */
  #toggle(n) {
    if (this.#chosen.has(n)) this.#chosen.delete(n);
    else this.#chosen.add(n);
    this.#refresh();
  }

  #refresh() {
    this.#rows.forEach((row, i) => {
      const on = this.#chosen.has(i + 1);
      row.check.setText(on ? '✔' : '');
      row.bg.setFillStyle(on ? 0xe3f4e3 : 0xffffff);
      row.bg.setStrokeStyle(this.#cursor === i ? 6 : 4, this.#cursor === i ? 0xe0a800 : 0x6d9aa8);
    });
    this.#startBg.setStrokeStyle(this.#cursor === 4 ? 6 : 4, this.#cursor === 4 ? 0xe0a800 : 0x2e7d32);
  }

  #start() {
    if (this.#chosen.size === 0) {
      this.#hint.setText('Kies minstens één Contact!').setColor('#c62828');
      return;
    }
    this.#leaving = true;
    setSelectedContacts([...this.#chosen].sort());
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.WORLD_SCENE);
    });
  }
}
