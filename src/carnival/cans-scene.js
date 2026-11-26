import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { WORD_FONT, drawCarnivalBackground, showEndPanel } from './carnival-ui.js';
import { makeVocabQuestion, recordAnswer } from '../vocab/quiz.js';
import { speakFrench } from '../vocab/speech.js';

const ROUNDS = 6;
const CAN_COLORS = [0xe94b5a, 0x4da3ff, 0x6ad66a, 0xffb300];

/** Blikken gooien: a Dutch word is shown, throw the ball at the can with the right French word. */
export class CansScene extends BaseScene {
  /** @type {{previousSceneName: string}} */
  #sceneData;
  /** @type {number} */
  #round;
  /** @type {number} */
  #hits;
  /** @type {number} */
  #cursor;
  /** @type {boolean} */
  #busy;
  /** @type {boolean} */
  #finished;
  /** @type {import('../vocab/quiz.js').Question} */
  #question;
  /** @type {Phaser.GameObjects.Container[]} */
  #cans;
  /** @type {Phaser.GameObjects.Text} */
  #promptText;
  /** @type {Phaser.GameObjects.Text} */
  #wordText;
  /** @type {Phaser.GameObjects.Text} */
  #infoText;
  /** @type {Phaser.GameObjects.Text} */
  #scoreText;
  /** @type {Phaser.Input.Keyboard.Key[]} */
  #numberKeys;
  /** @type {ReturnType<typeof showEndPanel> | undefined} */
  #endButton;

  constructor() {
    super({ key: SCENE_KEYS.CARNIVAL_CANS_SCENE });
  }

  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#round = 0;
    this.#hits = 0;
    this.#cursor = 0;
    this.#busy = false;
    this.#finished = false;
    this.#cans = [];
    this.#endButton = undefined;
  }

  create() {
    super.create();
    const { width } = this.scale;
    drawCarnivalBackground(this);
    // the stall counter / shelf
    this.add.rectangle(width / 2, 330, 860, 22, 0x8d5524).setStrokeStyle(3, 0x5b3412);
    this.add.rectangle(width / 2, 520, 900, 40, 0xb5651d).setStrokeStyle(3, 0x5b3412);

    this.#promptText = this.add
      .text(width / 2, 108, 'Gooi naar het Franse woord voor:', { fontFamily: WORD_FONT, fontSize: '22px', color: '#1d3557' })
      .setOrigin(0.5);
    this.#wordText = this.add
      .text(width / 2, 150, '', { fontFamily: WORD_FONT, fontSize: '40px', fontStyle: 'bold', color: '#1d3557', stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.#scoreText = this.add
      .text(width - 20, 108, '', { fontFamily: WORD_FONT, fontSize: '20px', color: '#1d3557' })
      .setOrigin(1, 0.5);
    this.#infoText = this.add
      .text(width / 2, 400, '', { fontFamily: WORD_FONT, fontSize: '26px', fontStyle: 'bold', color: '#1d3557', stroke: '#ffffff', strokeThickness: 5, align: 'center' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 562, 'Klik op een blik, of kies met de pijltjes / cijfers 1-4 en spatie.', { fontFamily: WORD_FONT, fontSize: '16px', color: '#1d3557' })
      .setOrigin(0.5);

    const kc = Phaser.Input.Keyboard.KeyCodes;
    this.#numberKeys = [kc.ONE, kc.TWO, kc.THREE, kc.FOUR].map((k) => this.input.keyboard.addKey(k));
    this.#nextRound();
  }

  update() {
    super.update();
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
      if (Phaser.Input.Keyboard.JustDown(this.#numberKeys[i]) && i < this.#cans.length) {
        this.#throw(i);
        return;
      }
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      this.#throw(this.#cursor);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    if (dir === DIRECTION.LEFT) this.#select(Math.max(0, this.#cursor - 1));
    if (dir === DIRECTION.RIGHT) this.#select(Math.min(this.#cans.length - 1, this.#cursor + 1));
  }

  #nextRound() {
    this.#cans.forEach((c) => c.destroy());
    this.#cans = [];
    if (this.#round >= ROUNDS) {
      this.#finish();
      return;
    }
    this.#round += 1;
    this.#busy = false;
    this.#question = makeVocabQuestion(true);
    this.#wordText.setText(this.#question.word);
    this.#infoText.setText('');
    this.#scoreText.setText(`Worp ${this.#round} van ${ROUNDS}   🎯 ${this.#hits}`);

    const { width } = this.scale;
    this.#question.options.forEach((option, i) => {
      const x = width / 2 + (i - 1.5) * 210;
      const can = this.add.container(x, 260);
      const body = this.add.rectangle(0, 0, 170, 110, CAN_COLORS[i]).setStrokeStyle(4, 0x333333);
      const rim = this.add.rectangle(0, -55, 170, 12, 0xcccccc).setStrokeStyle(2, 0x333333);
      const label = this.add
        .text(0, 0, option, { fontFamily: WORD_FONT, fontSize: option.length > 14 ? '17px' : '22px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 150 }, stroke: '#333333', strokeThickness: 3 })
        .setOrigin(0.5);
      const num = this.add.text(-75, 40, `${i + 1}`, { fontFamily: WORD_FONT, fontSize: '14px', color: '#ffffff' });
      can.add([body, rim, label, num]);
      can.setSize(170, 120);
      can.setInteractive({ useHandCursor: true });
      can.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (!this.#busy && !this.#finished) this.#throw(i);
      });
      can.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (!this.#busy) this.#select(i);
      });
      this.#cans.push(can);
    });
    this.#select(Math.min(this.#cursor, this.#cans.length - 1));
  }

  /** @param {number} i */
  #select(i) {
    this.#cursor = i;
    this.#cans.forEach((c, idx) => c.setScale(idx === i ? 1.08 : 1));
  }

  /** @param {number} i */
  #throw(i) {
    this.#busy = true;
    const target = this.#cans[i];
    const correct = i === this.#question.correctIndex;
    recordAnswer(this.#question.key, correct);
    const ball = this.add.circle(this.scale.width / 2, 520, 18, 0xffffff).setStrokeStyle(3, 0x333333);
    this.tweens.add({
      targets: ball,
      x: target.x,
      y: target.y,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const answer = this.#question.options[this.#question.correctIndex];
        if (correct) {
          this.#hits += 1;
          ball.destroy();
          this.tweens.add({ targets: target, y: target.y + 220, angle: 80, alpha: 0, duration: 600, ease: 'Quad.easeIn' });
          this.#infoText.setColor('#2e7d32').setText(`Raak! 🎉 ${answer}`);
        } else {
          this.tweens.add({ targets: ball, y: 560, x: ball.x + 80, duration: 500, onComplete: () => ball.destroy() });
          this.tweens.add({ targets: target, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => target.setAngle(0) });
          const right = this.#cans[this.#question.correctIndex];
          this.tweens.add({ targets: right, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
          this.#infoText.setColor('#c62828').setText(`Mis! Het juiste woord is: ${answer}`);
        }
        this.#scoreText.setText(`Worp ${this.#round} van ${ROUNDS}   🎯 ${this.#hits}`);
        speakFrench(answer);
        this.time.delayedCall(correct ? 1500 : 2300, () => this.#nextRound());
      },
    });
  }

  #finish() {
    this.#finished = true;
    this.#wordText.setText('');
    this.#promptText.setText('');
    // never zero: trying is worth a star
    const stars = Math.max(1, this.#hits);
    this.#endButton = showEndPanel(this, stars, `${this.#hits} van ${ROUNDS} raak!`, () => this.#back());
  }

  #back() {
    this._controls.lockInput = true;
    this.scene.start(SCENE_KEYS.CARNIVAL_SCENE, { previousSceneName: this.#sceneData.previousSceneName });
  }
}
