import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { addPanel, drawCarnivalBackground, getStars, makeButton, panelTextStyle } from './carnival-ui.js';
import { VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
import { speakFrench } from '../vocab/speech.js';

/**
 * @typedef CarnivalSceneData
 * @type {object}
 * @property {string} previousSceneName the world scene, which is paused while the kermis is open
 */

const STALLS = [
  { key: 'CARNIVAL_CANS_SCENE', title: 'Blikken gooien', text: 'Raak het juiste Franse woord', color: 0xd84840 },
  { key: 'CARNIVAL_MEMORY_SCENE', title: 'Memory', text: 'Frans en Nederlands bij elkaar', color: 0x60a0d8 },
  { key: 'CARNIVAL_DUCKS_SCENE', title: 'Eendjes vissen', text: 'Vis het juiste lidwoord: le, la, un...', color: 0xf0b030 },
];

/** The kermis square: pick a stall to play a mini-game with French words. */
export class CarnivalScene extends BaseScene {
  /** @type {CarnivalSceneData} */
  #sceneData;
  /** @type {ReturnType<typeof makeButton>[]} */
  #buttons;
  /** @type {number} */
  #cursor;
  /** @type {Phaser.Input.Keyboard.Key} */
  #escKey;
  /** @type {Phaser.GameObjects.Image[]} */
  #stallImages;

  constructor() {
    super({ key: SCENE_KEYS.CARNIVAL_SCENE });
  }

  /** @param {CarnivalSceneData} data */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#buttons = [];
    this.#cursor = 0;
  }

  create() {
    super.create();
    const { width } = this.scale;
    drawCarnivalBackground(this);
    this.add
      .text(width / 2, 84, 'Welkom op de kermis!', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '46px',
        color: '#ffd34d',
        stroke: '#1b1b1b',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    addPanel(this, width / 2, 136, 560, 40, { borderWidth: 4 });
    this.add.text(width / 2, 136, `⭐ ${getStars()} sterren   ·   elke 10 sterren = een prijs`, panelTextStyle(18)).setOrigin(0.5);

    this.#stallImages = [];
    STALLS.forEach((stall, i) => {
      const x = width / 2 + (i - 1) * 320;
      const img = this.add.image(x, 296, VILLA_ASSET_KEYS.STALLS, i).setInteractive({ useHandCursor: true });
      img.on(Phaser.Input.Events.POINTER_DOWN, () => this.#play(i));
      img.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(i));
      this.#stallImages.push(img);
      const btn = makeButton(this, {
        x,
        y: 452,
        w: 290,
        h: 74,
        label: `${stall.title}\n${stall.text}`,
        fontSize: '17px',
        onClick: () => this.#play(i),
      });
      btn.text.setLineSpacing(4);
      btn.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(i));
      this.#buttons.push(btn);
    });

    const back = makeButton(this, {
      x: width / 2,
      y: 537,
      w: 320,
      h: 50,
      label: 'Terug naar het dorp',
      fontSize: '19px',
      onClick: () => this.#leave(),
    });
    back.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(3));
    this.#buttons.push(back);

    this.#escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.#select(0);
    speakFrench('Bienvenue!');
  }

  update() {
    super.update();
    if (this._controls.isInputLocked) return;
    if (Phaser.Input.Keyboard.JustDown(this.#escKey) || this._controls.wasBackKeyPressed()) {
      this.#leave();
      return;
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      if (this.#cursor === 3) this.#leave();
      else this.#play(this.#cursor);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    if (dir === DIRECTION.LEFT && this.#cursor < 3) this.#select(Math.max(0, this.#cursor - 1));
    if (dir === DIRECTION.RIGHT && this.#cursor < 3) this.#select(Math.min(2, this.#cursor + 1));
    if (dir === DIRECTION.DOWN) this.#select(3);
    if (dir === DIRECTION.UP && this.#cursor === 3) this.#select(1);
  }

  /** @param {number} i */
  #select(i) {
    this.#cursor = i;
    this.#buttons.forEach((b, idx) => b.highlight(idx === i));
    this.#stallImages.forEach((img, idx) => {
      this.tweens.killTweensOf(img);
      img.setY(296);
      if (idx === i) this.tweens.add({ targets: img, y: 288, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  /** @param {number} i */
  #play(i) {
    this._controls.lockInput = true;
    this.scene.start(STALLS[i].key, { previousSceneName: this.#sceneData.previousSceneName });
  }

  #leave() {
    this._controls.lockInput = true;
    this.scene.stop(SCENE_KEYS.CARNIVAL_SCENE);
    this.scene.resume(this.#sceneData.previousSceneName, { carnivalDone: true });
  }
}
