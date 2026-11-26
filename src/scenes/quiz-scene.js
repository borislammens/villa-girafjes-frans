import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { DIRECTION } from '../common/direction.js';
import { makeListenQuestion, makeQuestion, recordAnswer } from '../vocab/quiz.js';
import { applyNextQuestionHelpers, itemBoosts } from '../items/item-effects.js';
import { ITEM_EFFECT } from '../types/typedef.js';
import { canSpeakFrench, speakFrench, stopSpeaking } from '../vocab/speech.js';

/**
 * @typedef QuizSceneData
 * @type {object}
 * @property {string} previousSceneName
 * @property {string} [attackName]
 * @property {import('../vocab/quiz.js').Question} [question] a ready question (used for NPC chats)
 */

/**
 * @typedef QuizResult
 * @type {object}
 * @property {boolean} quizAnswered
 * @property {boolean} correct
 * @property {string} correctAnswer
 */

const COLORS = Object.freeze({
  panel: 0xfdf6e3,
  panelBorder: 0x4d4a49,
  button: 0xffffff,
  buttonBorder: 0x6d9aa8,
  selected: 0xffe08a,
  right: 0x8fdc8f,
  wrong: 0xf29a9a,
});

const FONT = KENNEY_FUTURE_NARROW_FONT_NAME;
// easy to read font with lower case letters for the French words
const WORD_FONT = 'Verdana, "Trebuchet MS", Arial, sans-serif';

export class QuizScene extends BaseScene {
  /** @type {QuizSceneData} */
  #sceneData;
  /** @type {import('../vocab/quiz.js').Question} */
  #question;
  /** @type {{bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text}[]} */
  #buttons;
  /** @type {number} */
  #selected;
  /** @type {boolean} */
  #answered;
  /** @type {boolean} */
  #canContinue;
  /** @type {boolean} */
  #wasCorrect;
  /** @type {Phaser.GameObjects.Text} */
  #feedbackText;
  /** @type {Phaser.Input.Keyboard.Key[]} */
  #numberKeys;
  /** @type {Phaser.Input.Keyboard.Key} */
  #listenKey;
  /** @type {Phaser.GameObjects.Container | undefined} */
  #listenButton;
  /** @type {boolean} */
  #slowListen = false;
  /** @type {number} space/enter are ignored until this time, so a fast key press for the dialog does not pick an answer */
  #readyAt = 0;

  constructor() {
    super({ key: SCENE_KEYS.QUIZ_SCENE });
  }

  /** @param {QuizSceneData} data */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#buttons = [];
    this.#selected = 0;
    this.#answered = false;
    this.#canContinue = false;
    this.#wasCorrect = false;
  }

  create() {
    super.create();
    const { width, height } = this.scale;
    this.#slowListen = false;
    this.#readyAt = this.time.now + 600;
    let showAnswer = false;
    if (this.#sceneData.question) {
      this.#question = this.#sceneData.question;
    } else {
      // items from the bag (verrekijker, spiekbriefje, koptelefoon) help with this battle question
      const wantsListening = itemBoosts.nextQuestion.has(ITEM_EFFECT.SLOW_LISTEN);
      const helped = applyNextQuestionHelpers((wantsListening && makeListenQuestion()) || makeQuestion());
      this.#question = helped.question;
      showAnswer = helped.showAnswer;
      this.#slowListen = helped.slowListen;
    }

    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);
    const panelW = 900;
    const panelH = 520;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;
    this.add.rectangle(px, py, panelW, panelH, COLORS.panel).setOrigin(0).setStrokeStyle(6, COLORS.panelBorder);

    let intro = '';
    if (this.#sceneData.attackName) intro = `Antwoord juist om ${this.#sceneData.attackName} te gebruiken!`;
    if (this.#question.speaker) intro = `${this.#question.speaker} zegt:`;
    this.add
      .text(width / 2, py + 30, intro, { fontFamily: FONT, fontSize: '22px', color: '#7a6f6a' })
      .setOrigin(0.5, 0);
    const isChat = Boolean(this.#question.speaker);
    // chats: speaker line first, then the task. battles: task first, then the word.
    this.add
      .text(width / 2, py + (isChat ? 70 : 62), isChat ? this.#question.word : this.#question.prompt, {
        fontFamily: isChat ? WORD_FONT : FONT,
        fontSize: isChat ? '34px' : '28px',
        fontStyle: isChat ? 'bold' : 'normal',
        color: isChat ? '#2b5d9b' : '#4D4A49',
        align: 'center',
        wordWrap: { width: panelW - 60 },
      })
      .setOrigin(0.5, 0);
    if (isChat) {
      this.add
        .text(width / 2, py + 118, `(${this.#question.hint})`, { fontFamily: WORD_FONT, fontSize: '20px', color: '#7a6f6a' })
        .setOrigin(0.5, 0);
      this.add
        .text(width / 2, py + 160, this.#question.prompt, { fontFamily: FONT, fontSize: '26px', color: '#4D4A49' })
        .setOrigin(0.5, 0);
    } else {
      this.add
        .text(width / 2, py + 138, this.#question.word, {
          fontFamily: WORD_FONT,
          fontSize: '44px',
          fontStyle: 'bold',
          color: '#2b5d9b',
          align: 'center',
          wordWrap: { width: panelW - 60 },
        })
        .setOrigin(0.5);
      if (this.#question.hint) {
        this.add
          .text(width / 2, py + 180, this.#question.hint, { fontFamily: WORD_FONT, fontSize: '20px', color: '#7a6f6a' })
          .setOrigin(0.5, 0.5);
      }
    }

    const btnW = 400;
    const btnH = 90;
    const gapX = 30;
    const gapY = 22;
    const startX = width / 2 - btnW - gapX / 2;
    const startY = py + 210;
    this.#question.options.forEach((option, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      // a lonely last option is centered
      const alone = i === this.#question.options.length - 1 && i % 2 === 0;
      const x = alone ? width / 2 - btnW / 2 : startX + col * (btnW + gapX);
      const y = startY + row * (btnH + gapY);
      const bg = this.add
        .rectangle(x, y, btnW, btnH, COLORS.button)
        .setOrigin(0)
        .setStrokeStyle(4, COLORS.buttonBorder)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x + 18, y + btnH / 2, `${i + 1}`, { fontFamily: FONT, fontSize: '22px', color: '#9a9a9a' })
        .setOrigin(0, 0.5);
      const text = this.add
        .text(x + btnW / 2 + 10, y + btnH / 2, option, {
          fontFamily: WORD_FONT,
          fontSize: option.length > 24 ? '20px' : '26px',
          color: '#222222',
          align: 'center',
          wordWrap: { width: btnW - 60 },
        })
        .setOrigin(0.5);
      bg.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (!this.#answered) this.#select(i);
      });
      bg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.#answered) {
          this.#continue();
          return;
        }
        this.#select(i);
        this.#answer(i);
      });
      this.#buttons.push({ bg, text });
      if (showAnswer && i === this.#question.correctIndex) {
        this.add
          .text(x + btnW - 8, y + 6, '📝', { fontFamily: WORD_FONT, fontSize: '26px' })
          .setOrigin(1, 0);
        bg.setStrokeStyle(6, 0x2e7d32);
      }
    });

    this.#feedbackText = this.add
      .text(width / 2, py + panelH - 40, canSpeakFrench() ? 'Kies met de pijltjes en spatie, de cijfers, of klik. L = luisteren.' : 'Kies met de pijltjes en spatie, de cijfers, of klik.', {
        fontFamily: WORD_FONT,
        fontSize: '22px',
        color: '#7a6f6a',
        align: 'center',
        wordWrap: { width: panelW - 40 },
      })
      .setOrigin(0.5);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p, objects) => {
      if (this.#answered && objects.length === 0) this.#continue();
    });

    // listen button: replays the French text (only what may be heard at this moment)
    if (canSpeakFrench()) {
      const bx = px + panelW - 90;
      const by = py + 40;
      const bg = this.add
        .rectangle(0, 0, 130, 50, 0xdbe9f6)
        .setStrokeStyle(3, 0x2b5d9b)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, 0, '🔊 Luister', { fontFamily: WORD_FONT, fontSize: '18px', color: '#2b5d9b' })
        .setOrigin(0.5);
      this.#listenButton = this.add.container(bx, by, [bg, label]);
      bg.on(Phaser.Input.Events.POINTER_DOWN, () => this.#listen());
      this.#listenButton.setVisible(Boolean(this.#question.speak));
      if (this.#question.speak) {
        this.time.delayedCall(350, () => this.#listen());
      }
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopSpeaking());

    const kc = Phaser.Input.Keyboard.KeyCodes;
    this.#listenKey = this.input.keyboard.addKey(kc.L);
    this.#numberKeys = [kc.ONE, kc.TWO, kc.THREE, kc.FOUR].map((k) => this.input.keyboard.addKey(k));
    this.#select(0);
  }

  update() {
    super.update();
    if (this._controls.isInputLocked) return;
    if (Phaser.Input.Keyboard.JustDown(this.#listenKey)) this.#listen();

    if (this.#answered) {
      if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) this.#continue();
      return;
    }

    for (let i = 0; i < this.#numberKeys.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.#numberKeys[i]) && i < this.#buttons.length) {
        this.#select(i);
        this.#answer(i);
        return;
      }
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      if (this.time.now < this.#readyAt) return;
      this.#answer(this.#selected);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    if (dir === DIRECTION.NONE) return;
    let col = this.#selected % 2;
    let row = Math.floor(this.#selected / 2);
    if (dir === DIRECTION.LEFT) col = 0;
    if (dir === DIRECTION.RIGHT) col = 1;
    if (dir === DIRECTION.UP) row = 0;
    if (dir === DIRECTION.DOWN) row = 1;
    this.#select(Math.min(row * 2 + col, this.#buttons.length - 1));
  }

  /** @param {number} i */
  #select(i) {
    this.#selected = i;
    this.#buttons.forEach((b, idx) => {
      b.bg.setFillStyle(idx === i ? COLORS.selected : COLORS.button);
    });
  }

  /** @param {number} i */
  #answer(i) {
    if (this.#answered) return;
    this.#answered = true;
    const correctIndex = this.#question.correctIndex;
    this.#wasCorrect = i === correctIndex;
    recordAnswer(this.#question.key, this.#wasCorrect);

    this.#buttons.forEach((b, idx) => {
      if (idx === correctIndex) b.bg.setFillStyle(COLORS.right);
      else if (idx === i) b.bg.setFillStyle(COLORS.wrong);
      else b.bg.setFillStyle(COLORS.button).setAlpha(0.5);
    });

    const correctAnswer = this.#question.options[correctIndex];
    if (this.#wasCorrect) {
      const next = this.#question.speaker ? `${this.#question.speaker}: "${this.#question.reply}"` : 'Druk op spatie of klik om aan te vallen.';
      this.#feedbackText.setText(`${this.#praise()} ${next}`).setColor('#2e7d32');
    } else {
      this.#feedbackText
        .setText(`Oei! Het juiste antwoord is: ${correctAnswer}. Druk op spatie of klik.`)
        .setColor('#c62828');
    }
    if (this.#question.speakAfter) {
      this.#listenButton?.setVisible(true);
      this.time.delayedCall(200, () => this.#listen());
    } else if (this.#question.listening) {
      // let the child hear the word once more now the answer is shown
      this.time.delayedCall(200, () => this.#listen());
    }
    // short pause so a double press does not skip the feedback
    this.time.delayedCall(500, () => {
      this.#canContinue = true;
    });
  }

  #listen() {
    const text = this.#answered ? this.#question.speakAfter || this.#question.speak : this.#question.speak;
    if (text) speakFrench(text, this.#slowListen ? { rate: 0.55 } : undefined);
  }

  #praise() {
    const words = ['Goed zo!', 'Super!', 'Très bien!', 'Bravo!', 'Formidable!', 'Knap!'];
    return words[Math.floor(Math.random() * words.length)];
  }

  #continue() {
    if (!this.#canContinue) return;
    this.#canContinue = false;
    /** @type {QuizResult} */
    const result = {
      quizAnswered: true,
      correct: this.#wasCorrect,
      correctAnswer: this.#question.options[this.#question.correctIndex],
    };
    this.scene.stop(SCENE_KEYS.QUIZ_SCENE);
    this.scene.resume(this.#sceneData.previousSceneName, result);
  }
}
