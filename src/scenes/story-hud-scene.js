import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';

/** The task list in the top left corner of the world. */
export class StoryHudScene extends Phaser.Scene {
  /** @type {Phaser.GameObjects.Text | undefined} */
  #text;
  /** @type {Phaser.GameObjects.Rectangle | undefined} */
  #bg;

  constructor() {
    super({ key: SCENE_KEYS.STORY_HUD_SCENE });
  }

  create() {
    this.#bg = this.add.rectangle(6, 6, 10, 10, 0xfdf6e3, 0.88).setOrigin(0).setStrokeStyle(3, 0x4d4a49);
    this.#text = this.add.text(16, 12, '', {
      fontFamily: 'Verdana, "Trebuchet MS", Arial, sans-serif',
      fontSize: '15px',
      color: '#2b2b2b',
      lineSpacing: 3,
    });
    this.setText('');
  }

  /** @param {string} text */
  setText(text) {
    if (!this.#text || !this.#bg) return;
    if (this.#text.text === text && this.#bg.visible === Boolean(text)) return;
    this.#text.setText(text);
    this.#bg.setVisible(Boolean(text));
    this.#text.setVisible(Boolean(text));
    this.#bg.setSize(this.#text.width + 22, this.#text.height + 14);
  }

  /** @param {boolean} visible */
  show(visible) {
    this.cameras.main.setVisible(visible);
  }
}
