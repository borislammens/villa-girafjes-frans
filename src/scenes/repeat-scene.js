import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { WORDS } from '../vocab/words.js';
import { addStars } from '../carnival/carnival-ui.js';
import { getSelectedContacts } from '../vocab/quiz.js';
import { canListen, canSpeakFrench, cleanForSpeech, listenFrench, soundsAlike, speakFrench, stopSpeaking } from '../vocab/speech.js';

const FONT = KENNEY_FUTURE_NARROW_FONT_NAME;
const WORD_FONT = 'Verdana, "Trebuchet MS", Arial, sans-serif';
const ROUND_LENGTH = 5;

/**
 * @typedef RepeatSceneData
 * @type {object}
 * @property {string} previousSceneName scene to go back to
 * @property {boolean} [resumePrevious] true when the previous scene is paused (world), false to start it again
 * @property {string} [speaker]
 */

/**
 * "Zeg me na": the game says a French word, the child repeats it out loud.
 * There is no wrong answer here: every try earns stars.
 */
export class RepeatScene extends BaseScene {
  /** @type {RepeatSceneData} */
  #sceneData;
  /** @type {import('../vocab/words.js').WORDS} */
  #words;
  /** @type {number} */
  #index;
  /** @type {number} */
  #stars;
  /** @type {'READY' | 'LISTENING' | 'DONE' | 'FINISHED'} */
  #state;
  /** @type {Phaser.GameObjects.Text} */
  #progressText;
  /** @type {Phaser.GameObjects.Text} */
  #wordText;
  /** @type {Phaser.GameObjects.Text} */
  #dutchText;
  /** @type {Phaser.GameObjects.Text} */
  #feedbackText;
  /** @type {Phaser.GameObjects.Text} */
  #mainButtonText;
  /** @type {Phaser.GameObjects.Rectangle} */
  #mainButton;
  /** @type {() => void} */
  #stopListening;
  /** @type {Phaser.Input.Keyboard.Key} */
  #listenKey;
  /** @type {Phaser.Input.Keyboard.Key} */
  #escKey;

  constructor() {
    super({ key: SCENE_KEYS.REPEAT_SCENE });
  }

  /** @param {RepeatSceneData} data */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    const contacts = getSelectedContacts();
    const pool = WORDS.filter((w) => contacts.includes(w.contact) && w.fr.length <= 22);
    this.#words = Phaser.Utils.Array.Shuffle([...pool]).slice(0, ROUND_LENGTH);
    this.#index = 0;
    this.#stars = 0;
    this.#state = 'READY';
    this.#stopListening = () => {};
  }

  create() {
    super.create();
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);
    this.add.rectangle(width / 2, height / 2, 900, 520, 0xfdf6e3).setStrokeStyle(6, 0x4d4a49);

    const who = this.#sceneData.speaker ? `${this.#sceneData.speaker}: ` : '';
    this.add
      .text(width / 2, 50, `${who}Zeg me na!`, { fontFamily: FONT, fontSize: '34px', color: '#4D4A49' })
      .setOrigin(0.5);
    this.#progressText = this.add
      .text(width / 2, 90, '', { fontFamily: WORD_FONT, fontSize: '18px', color: '#7a6f6a' })
      .setOrigin(0.5);
    this.#wordText = this.add
      .text(width / 2, 170, '', { fontFamily: WORD_FONT, fontSize: '52px', fontStyle: 'bold', color: '#2b5d9b' })
      .setOrigin(0.5);
    this.#dutchText = this.add
      .text(width / 2, 225, '', { fontFamily: WORD_FONT, fontSize: '22px', color: '#7a6f6a' })
      .setOrigin(0.5);

    // listen button
    if (canSpeakFrench()) {
      const lb = this.add
        .rectangle(width / 2 - 170, 310, 220, 70, 0xdbe9f6)
        .setStrokeStyle(4, 0x2b5d9b)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2 - 170, 310, '🔊 Luister', { fontFamily: WORD_FONT, fontSize: '26px', color: '#2b5d9b' }).setOrigin(0.5);
      lb.on(Phaser.Input.Events.POINTER_DOWN, () => this.#say());
    }
    const mainX = canSpeakFrench() ? width / 2 + 130 : width / 2;
    this.#mainButton = this.add
      .rectangle(mainX, 310, 320, 70, 0x8fdc8f)
      .setStrokeStyle(4, 0x2e7d32)
      .setInteractive({ useHandCursor: true });
    this.#mainButtonText = this.add
      .text(mainX, 310, '', { fontFamily: WORD_FONT, fontSize: '26px', color: '#1b5e20' })
      .setOrigin(0.5);
    this.#mainButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.#mainAction());

    this.#feedbackText = this.add
      .text(width / 2, 410, '', {
        fontFamily: WORD_FONT,
        fontSize: '26px',
        color: '#2e7d32',
        align: 'center',
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5);
    const help = canListen()
      ? 'Spatie = zeg het / volgende. L = luister. Esc = stoppen.'
      : 'Zeg het woord luidop en druk dan op spatie. L = luister. Esc = stoppen.';
    this.add.text(width / 2, 520, help, { fontFamily: WORD_FONT, fontSize: '18px', color: '#7a6f6a' }).setOrigin(0.5);

    this.#listenKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.#escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopSpeaking();
      this.#stopListening();
    });

    this.#showWord();
  }

  update() {
    super.update();
    if (this._controls.isInputLocked) return;
    if (Phaser.Input.Keyboard.JustDown(this.#listenKey)) this.#say();
    if (Phaser.Input.Keyboard.JustDown(this.#escKey) || this._controls.wasBackKeyPressed()) {
      this.#close();
      return;
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) this.#mainAction();
  }

  #current() {
    return this.#words[this.#index];
  }

  #say() {
    const w = this.#current();
    if (w) speakFrench(w.fr, { rate: 0.75 });
  }

  #showWord() {
    const w = this.#current();
    this.#state = 'READY';
    this.#progressText.setText(`Woord ${this.#index + 1} van ${this.#words.length}   ⭐ ${this.#stars}`);
    this.#wordText.setText(w.fr);
    this.#dutchText.setText(`(${w.nl})`);
    this.#feedbackText.setText('');
    this.#mainButtonText.setText(canListen() ? '🎤 Zeg het!' : '✔ Ik heb het gezegd!');
    this.time.delayedCall(300, () => this.#say());
  }

  #mainAction() {
    if (this.#state === 'READY') {
      if (!canListen()) {
        this.#reward('');
        return;
      }
      this.#state = 'LISTENING';
      stopSpeaking();
      this.#mainButtonText.setText('👂 Ik luister...');
      this.#feedbackText.setColor('#7a6f6a').setText('Zeg het woord nu luidop!');
      this.#stopListening = listenFrench((heard) => {
        if (this.sys.isActive()) this.#reward(heard);
      });
      return;
    }
    if (this.#state === 'LISTENING') {
      // stop early: the callback rewards whatever was heard
      this.#stopListening();
      return;
    }
    if (this.#state === 'DONE') {
      this.#index += 1;
      if (this.#index >= this.#words.length) {
        this.#finish();
        return;
      }
      this.#showWord();
      return;
    }
    if (this.#state === 'FINISHED') this.#close();
  }

  /** Every try is good: only the number of stars and the message differ. @param {string} heard */
  #reward(heard) {
    if (this.#state === 'DONE') return;
    this.#state = 'DONE';
    const w = this.#current();
    let stars = 2;
    let text = '⭐⭐ Goed gedaan!';
    if (heard && soundsAlike(heard, w.fr)) {
      stars = 3;
      text = '⭐⭐⭐ Parfait! Dat klonk echt Frans!';
    } else if (heard) {
      text = `⭐⭐ Goed geprobeerd! Ik hoorde: "${heard.split('|')[0].trim()}". Luister nog eens: "${cleanForSpeech(w.fr)}".`;
    } else if (canListen()) {
      text = '⭐⭐ Super dat je het probeerde!';
    }
    this.#stars += stars;
    this.#progressText.setText(`Woord ${this.#index + 1} van ${this.#words.length}   ⭐ ${this.#stars}`);
    this.#feedbackText.setColor('#2e7d32').setText(text);
    this.#mainButtonText.setText(this.#index + 1 >= this.#words.length ? 'Klaar!' : 'Volgende ▶');
  }

  #finish() {
    this.#state = 'FINISHED';
    // same star counter as the kermis: every 10 stars gives a prize in your bag
    const { total, prizes } = addStars(this, this.#stars);
    this.#wordText.setText('Bravo! 🎉');
    this.#dutchText.setText('');
    this.#progressText.setText('');
    const prizeText = prizes.length > 0 ? ` 🎁 Prijs: ${prizes.join(', ')}!` : '';
    this.#feedbackText.setText(`Je verdiende ${this.#stars} sterren! In totaal heb je er al ${total}.${prizeText}`);
    this.#mainButtonText.setText('Terug');
    speakFrench('Bravo! Très bien!');
  }

  #close() {
    stopSpeaking();
    this.#stopListening();
    const { previousSceneName, resumePrevious } = this.#sceneData;
    if (resumePrevious) {
      this.scene.stop(SCENE_KEYS.REPEAT_SCENE);
      this.scene.resume(previousSceneName, { repeatDone: true });
      return;
    }
    this.scene.start(previousSceneName);
  }
}
