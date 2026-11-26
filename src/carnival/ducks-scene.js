import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { HIGHLIGHT_COLOR, addPanel, drawCarnivalBackground, drawPanel, panelTextStyle, showEndPanel } from './carnival-ui.js';
import { VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
import { makeArticleQuestion, recordAnswer } from '../vocab/quiz.js';
import { speakFrench } from '../vocab/speech.js';

const ROUNDS = 6;

/** Eendjes vissen: ducks carry articles; fish the duck with the right article for the noun. */
export class DucksScene extends BaseScene {
  /** @type {{previousSceneName: string}} */
  #sceneData;
  /** @type {number} */
  #round;
  /** @type {number} */
  #caught;
  /** @type {number} */
  #cursor;
  /** @type {boolean} */
  #busy;
  /** @type {boolean} */
  #finished;
  /** @type {import('../vocab/quiz.js').Question} */
  #question;
  /** @type {{container: Phaser.GameObjects.Container, speed: number}[]} */
  #ducks;
  /** @type {Phaser.GameObjects.Text} */
  #wordText;
  /** @type {Phaser.GameObjects.Text} */
  #hintText;
  /** @type {Phaser.GameObjects.Text} */
  #infoText;
  /** @type {Phaser.GameObjects.Text} */
  #scoreText;
  /** @type {Phaser.Input.Keyboard.Key[]} */
  #numberKeys;

  constructor() {
    super({ key: SCENE_KEYS.CARNIVAL_DUCKS_SCENE });
  }

  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#round = 0;
    this.#caught = 0;
    this.#cursor = 0;
    this.#busy = false;
    this.#finished = false;
    this.#ducks = [];
  }

  create() {
    super.create();
    const { width } = this.scale;
    drawCarnivalBackground(this);
    // the water basin: water from the village pond, with a wooden edge
    this.add.tileSprite(width / 2, 382, 920, 200, VILLA_ASSET_KEYS.WATER);
    const ripples = this.add.graphics();
    ripples.fillStyle(0xd8f4ff, 1);
    for (let i = 0; i < 26; i += 1) {
      const rx = width / 2 - 440 + ((i * 337) % 830);
      const ry = 296 + ((i * 53) % 176);
      ripples.fillRect(rx, ry, 24, 4).fillRect(rx + 24, ry - 4, 12, 4);
    }
    this.tweens.add({ targets: ripples, x: 12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const edge = this.add.graphics();
    edge.lineStyle(16, 0x2d2d2d, 1).strokeRect(width / 2 - 468, 274, 936, 216);
    edge.lineStyle(10, 0xe8c080, 1).strokeRect(width / 2 - 466, 276, 932, 212);
    edge.lineStyle(3, 0x986840, 1).strokeRect(width / 2 - 461, 281, 922, 202);

    addPanel(this, width / 2, 126, 720, 112);
    this.add.text(width / 2, 92, 'Vis het eendje met het juiste lidwoord!', panelTextStyle(18)).setOrigin(0.5);
    this.#wordText = this.add.text(width / 2, 128, '', { ...panelTextStyle(36), color: '#ffd34d', fontStyle: 'bold' }).setOrigin(0.5);
    this.#hintText = this.add.text(width / 2, 162, '', panelTextStyle(15)).setOrigin(0.5);
    this.#scoreText = this.add.text(width / 2 + 346, 92, '', { ...panelTextStyle(15), align: 'right' }).setOrigin(1, 0.5);
    this.#infoText = this.add.text(width / 2, 520, '', { ...panelTextStyle(24), fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 562, 'Klik op een eendje, of kies met de pijltjes / cijfers en spatie.', panelTextStyle(15)).setOrigin(0.5);

    const kc = Phaser.Input.Keyboard.KeyCodes;
    this.#numberKeys = [kc.ONE, kc.TWO, kc.THREE].map((k) => this.input.keyboard.addKey(k));
    this.#nextRound();
  }

  update(time, delta) {
    super.update(time);
    // ducks swim from left to right and come back on the left side
    const { width } = this.scale;
    this.#ducks.forEach((d) => {
      if (d.container.getData('caught')) return;
      d.container.x += (d.speed * (delta || 16)) / 1000;
      if (d.container.x > width - 60) d.container.x = 60;
      d.container.y = d.container.getData('baseY') + Math.sin(time / 300 + d.speed) * 6;
    });

    if (this._controls.isInputLocked) return;
    if (this.#finished) {
      if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) this.#back();
      return;
    }
    if (this._controls.wasBackKeyPressed()) {
      this.#back();
      return;
    }
    if (this.#busy) return;
    for (let i = 0; i < this.#numberKeys.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.#numberKeys[i]) && i < this.#ducks.length) {
        this.#fish(i);
        return;
      }
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      this.#fish(this.#cursor);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    if (dir === DIRECTION.LEFT || dir === DIRECTION.UP) this.#select(Math.max(0, this.#cursor - 1));
    if (dir === DIRECTION.RIGHT || dir === DIRECTION.DOWN) this.#select(Math.min(this.#ducks.length - 1, this.#cursor + 1));
  }

  #nextRound() {
    this.#ducks.forEach((d) => d.container.destroy());
    this.#ducks = [];
    if (this.#round >= ROUNDS) {
      this.#finish();
      return;
    }
    this.#round += 1;
    this.#busy = false;
    this.#question = makeArticleQuestion(true);
    this.#wordText.setText(this.#question.word);
    this.#hintText.setText(this.#question.hint || '');
    this.#infoText.setText('');
    this.#scoreText.setText(`Ronde ${this.#round} van ${ROUNDS}   🦆 ${this.#caught}`);

    const { width } = this.scale;
    const n = this.#question.options.length;
    this.#question.options.forEach((option, i) => {
      // spread ducks over the water, on two lanes
      const x = 120 + ((i * (width - 240)) / n + Phaser.Math.Between(0, 60));
      const baseY = i % 2 === 0 ? 372 : 442;
      const body = this.add.image(0, 8, VILLA_ASSET_KEYS.DUCK).setScale(1.25);
      const sign = this.add.graphics();
      drawPanel(sign, -44, -78, 88, 48, { borderWidth: 4 });
      const label = this.add.text(0, -54, option, { ...panelTextStyle(26), fontStyle: 'bold' }).setOrigin(0.5);
      const num = this.add.text(-38, -76, `${i + 1}`, { ...panelTextStyle(11), color: '#ffd34d' });
      const container = this.add.container(x, baseY, [body, sign, label, num]);
      container.setData('baseY', baseY);
      container.setSize(120, 150);
      // the hit area covers the sign and the duck (local y -80 to 50)
      container.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 60, 120, 130), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
      container.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (!this.#busy && !this.#finished) this.#fish(i);
      });
      container.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (!this.#busy) this.#select(i);
      });
      this.#ducks.push({ container, speed: Phaser.Math.Between(35, 70) });
    });
    this.#select(0);
  }

  /** @param {number} i */
  #select(i) {
    this.#cursor = i;
    this.#ducks.forEach((d, idx) => {
      d.container.setScale(idx === i ? 1.12 : 1);
      const sign = /** @type {Phaser.GameObjects.Graphics} */ (d.container.list[1]);
      sign.clear();
      drawPanel(sign, -44, -78, 88, 48, { borderWidth: idx === i ? 6 : 4, border: idx === i ? HIGHLIGHT_COLOR : undefined });
    });
  }

  /** @param {number} i */
  #fish(i) {
    this.#busy = true;
    const duck = this.#ducks[i].container;
    const correct = i === this.#question.correctIndex;
    recordAnswer(this.#question.key, correct);
    const full = this.#question.speakAfter || '';
    if (correct) {
      this.#caught += 1;
      duck.setData('caught', true);
      this.tweens.add({ targets: duck, y: 250, scale: 1.4, duration: 500, ease: 'Back.easeOut' });
      this.#infoText.setColor('#2e7d32').setText(`Gevangen! 🎉 ${full}`);
    } else {
      this.tweens.add({ targets: duck, angle: { from: -15, to: 15 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => duck.setAngle(0) });
      const right = this.#ducks[this.#question.correctIndex].container;
      this.tweens.add({ targets: right, scale: 1.3, duration: 200, yoyo: true, repeat: 2 });
      this.#infoText.setColor('#c62828').setText(`Oei! Het is: ${full}`);
    }
    this.#scoreText.setText(`Ronde ${this.#round} van ${ROUNDS}   🦆 ${this.#caught}`);
    speakFrench(full);
    this.time.delayedCall(correct ? 1600 : 2300, () => this.#nextRound());
  }

  #finish() {
    this.#finished = true;
    this.#wordText.setText('');
    this.#hintText.setText('');
    showEndPanel(this, Math.max(1, this.#caught), `${this.#caught} eendjes gevangen!`, () => this.#back());
  }

  #back() {
    this._controls.lockInput = true;
    this.scene.start(SCENE_KEYS.CARNIVAL_SCENE, { previousSceneName: this.#sceneData.previousSceneName });
  }
}
