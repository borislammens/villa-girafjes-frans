import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { drawPanel } from '../carnival/carnival-ui.js';

/** The task list in the top left corner of the world. */
export class StoryHudScene extends Phaser.Scene {
  /** @type {Phaser.GameObjects.Text | undefined} */
  #text;
  /** @type {Phaser.GameObjects.Graphics | undefined} */
  #bg;

  constructor() {
    super({ key: SCENE_KEYS.STORY_HUD_SCENE });
  }

  create() {
    this.#bg = this.add.graphics();
    this.#text = this.add.text(20, 17, '', {
      fontFamily: 'Verdana, "Trebuchet MS", Arial, sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      stroke: '#1b1b1b',
      strokeThickness: 3,
      lineSpacing: 4,
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
    this.#bg.clear();
    if (text) drawPanel(this.#bg, 6, 6, this.#text.width + 30, this.#text.height + 22, { borderWidth: 4, alpha: 0.85 });
  }

  /** @param {boolean} visible */
  show(visible) {
    this.cameras.main.setVisible(visible);
  }
}
