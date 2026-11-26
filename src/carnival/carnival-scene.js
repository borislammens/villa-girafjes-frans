import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { WORD_FONT, drawCarnivalBackground, getStars, makeButton } from './carnival-ui.js';
import { speakFrench } from '../vocab/speech.js';

/**
 * @typedef CarnivalSceneData
 * @type {object}
 * @property {string} previousSceneName the world scene, which is paused while the kermis is open
 */

const STALLS = [
  { key: 'CARNIVAL_CANS_SCENE', emoji: '🥫', title: 'Blikken gooien', text: 'Gooi naar het juiste Franse woord', color: 0xe94b5a },
  { key: 'CARNIVAL_MEMORY_SCENE', emoji: '🃏', title: 'Memory', text: 'Zoek Frans en Nederlands bij elkaar', color: 0x4da3ff },
  { key: 'CARNIVAL_DUCKS_SCENE', emoji: '🦆', title: 'Eendjes vissen', text: 'Vis het juiste lidwoord: le, la, un...', color: 0xffb300 },
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
      .text(width / 2, 125, 'Welkom op de kermis!', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#e94b5a',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 172, `⭐ ${getStars()} sterren   ·   elke 10 sterren = een prijs voor je tas`, {
        fontFamily: WORD_FONT,
        fontSize: '20px',
        color: '#1d3557',
      })
      .setOrigin(0.5);

    STALLS.forEach((stall, i) => {
      const x = width / 2 + (i - 1) * 300;
      const y = 330;
      // stall roof
      const g = this.add.graphics();
      g.fillStyle(stall.color, 1);
      g.fillTriangle(x - 135, y - 95, x + 135, y - 95, x, y - 150);
      this.add.text(x, y - 60, stall.emoji, { fontSize: '56px' }).setOrigin(0.5);
      const btn = makeButton(this, {
        x,
        y: y + 50,
        w: 260,
        h: 150,
        label: `${stall.title}\n\n${stall.text}`,
        fontSize: '20px',
        fill: 0xfdf6e3,
        stroke: stall.color,
        onClick: () => this.#play(i),
      });
      btn.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(i));
      this.#buttons.push(btn);
    });

    const back = makeButton(this, {
      x: width / 2,
      y: 530,
      w: 300,
      h: 54,
      label: '🏡 Terug naar het dorp',
      fontSize: '20px',
      fill: 0xdbe9f6,
      stroke: 0x2b5d9b,
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
