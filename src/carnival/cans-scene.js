import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { HIGHLIGHT_COLOR, addPanel, drawCarnivalBackground, drawPanel, drawPlank, panelTextStyle, showEndPanel } from './carnival-ui.js';
import { BATTLE_ASSET_KEYS, VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
import { makeVocabQuestion, recordAnswer } from '../vocab/quiz.js';
import { speakFrench } from '../vocab/speech.js';

const ROUNDS = 6;

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
    // the shelf with the cans and the counter in front
    drawPlank(this, width / 2, 330, 880, 20);
    drawPlank(this, width / 2, 522, 940, 40);

    addPanel(this, width / 2, 116, 760, 92);
    this.#promptText = this.add.text(width / 2, 94, 'Gooi naar het Franse woord voor:', panelTextStyle(18)).setOrigin(0.5);
    this.#wordText = this.add
      .text(width / 2, 132, '', { ...panelTextStyle(36), color: '#ffd34d', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.#scoreText = this.add.text(width / 2 + 366, 94, '', { ...panelTextStyle(15), align: 'right' }).setOrigin(1, 0.5);
    this.#infoText = this.add.text(width / 2, 452, '', { ...panelTextStyle(26), fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 562, 'Klik op een blik, of kies met de pijltjes / cijfers 1-4 en spatie.', panelTextStyle(15)).setOrigin(0.5);

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
      const x = width / 2 + (i - 1.5) * 220;
      const can = this.add.container(x, 264);
      const cans = this.add.image(0, 0, VILLA_ASSET_KEYS.CANS, i);
      const plate = this.add.graphics();
      drawPanel(plate, -98, 82, 196, 56, { borderWidth: 4 });
      const label = this.add
        .text(0, 110, option, { ...panelTextStyle(option.length > 14 ? 16 : 21), fontStyle: 'bold', wordWrap: { width: 176 } })
        .setOrigin(0.5);
      const num = this.add.text(-88, 88, `${i + 1}`, { ...panelTextStyle(12), color: '#ffd34d' });
      can.add([cans, plate, label, num]);
      can.setSize(200, 260);
      // the hit area covers the cans and the word plate (local y -60 to 140)
      can.setInteractive(new Phaser.Geom.Rectangle(0, 70, 200, 200), Phaser.Geom.Rectangle.Contains);
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
    this.#cans.forEach((c, idx) => {
      c.setScale(idx === i ? 1.08 : 1);
      const plate = /** @type {Phaser.GameObjects.Graphics} */ (c.list[1]);
      plate.clear();
      drawPanel(plate, -98, 82, 196, 56, { borderWidth: idx === i ? 6 : 4, border: idx === i ? HIGHLIGHT_COLOR : undefined });
    });
  }

  /** @param {number} i */
  #throw(i) {
    this.#busy = true;
    const target = this.#cans[i];
    const correct = i === this.#question.correctIndex;
    recordAnswer(this.#question.key, correct);
    const ball = this.add.image(this.scale.width / 2, 520, BATTLE_ASSET_KEYS.BALL_THUMBNAIL).setScale(1.5);
    this.tweens.add({ targets: ball, angle: 540, duration: 450 });
    this.tweens.add({
      targets: ball,
      x: target.x,
      y: target.y - 10,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const answer = this.#question.options[this.#question.correctIndex];
        if (correct) {
          this.#hits += 1;
          ball.destroy();
          const tins = /** @type {Phaser.GameObjects.Image} */ (target.list[0]);
          this.tweens.add({ targets: tins, y: 140, x: 60, angle: 100, alpha: 0, duration: 650, ease: 'Quad.easeIn' });
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
