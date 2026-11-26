import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { WORD_FONT, drawCarnivalBackground, showEndPanel } from './carnival-ui.js';
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
    // the water basin
    this.add.rectangle(width / 2, 380, 940, 210, 0x2f80c8).setStrokeStyle(8, 0xb5651d);
    for (let i = 0; i < 12; i += 1) {
      this.add.text(70 + i * 78, 300 + (i % 2) * 140, '〰', { fontSize: '26px', color: '#9fd3ff' });
    }

    this.add
      .text(width / 2, 110, 'Vis het eendje met het juiste lidwoord!', { fontFamily: WORD_FONT, fontSize: '22px', color: '#1d3557' })
      .setOrigin(0.5);
    this.#wordText = this.add
      .text(width / 2, 160, '', { fontFamily: WORD_FONT, fontSize: '44px', fontStyle: 'bold', color: '#1d3557', stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.#hintText = this.add.text(width / 2, 205, '', { fontFamily: WORD_FONT, fontSize: '18px', color: '#1d3557' }).setOrigin(0.5);
    this.#scoreText = this.add.text(width - 20, 110, '', { fontFamily: WORD_FONT, fontSize: '20px', color: '#1d3557' }).setOrigin(1, 0.5);
    this.#infoText = this.add
      .text(width / 2, 515, '', { fontFamily: WORD_FONT, fontSize: '24px', fontStyle: 'bold', color: '#1d3557', stroke: '#ffffff', strokeThickness: 5 })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 562, 'Klik op een eendje, of kies met de pijltjes / cijfers en spatie.', { fontFamily: WORD_FONT, fontSize: '16px', color: '#1d3557' })
      .setOrigin(0.5);

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
      const baseY = i % 2 === 0 ? 345 : 420;
      const body = this.add.ellipse(0, 10, 120, 60, 0xffd34d).setStrokeStyle(3, 0x8a6d00);
      const head = this.add.circle(42, -22, 24, 0xffd34d).setStrokeStyle(3, 0x8a6d00);
      const beak = this.add.triangle(70, -20, 0, -6, 0, 6, 16, 0, 0xff8c1a);
      const eye = this.add.circle(48, -28, 4, 0x222222);
      const label = this.add.text(-8, 10, option, { fontFamily: WORD_FONT, fontSize: '28px', fontStyle: 'bold', color: '#1d3557' }).setOrigin(0.5);
      const num = this.add.text(-52, -14, `${i + 1}`, { fontFamily: WORD_FONT, fontSize: '14px', color: '#5b4500' });
      const container = this.add.container(x, baseY, [body, head, beak, eye, label, num]);
      container.setData('baseY', baseY);
      container.setSize(150, 90).setInteractive({ useHandCursor: true });
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
    this.#ducks.forEach((d, idx) => d.container.setScale(idx === i ? 1.12 : 1));
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
      this.tweens.add({ targets: duck, y: 200, scale: 1.4, duration: 500, ease: 'Back.easeOut' });
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
