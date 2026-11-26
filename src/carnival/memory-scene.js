import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../scenes/scene-keys.js';
import { BaseScene } from '../scenes/base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { WORD_FONT, drawCarnivalBackground, showEndPanel } from './carnival-ui.js';
import { WORDS } from '../vocab/words.js';
import { getActiveContacts } from '../vocab/quiz.js';
import { speakFrench } from '../vocab/speech.js';

const PAIRS = 6;
const COLS = 4;

/**
 * @typedef Card
 * @type {object}
 * @property {number} pair
 * @property {string} text
 * @property {boolean} french
 * @property {Phaser.GameObjects.Container} view
 * @property {Phaser.GameObjects.Rectangle} back
 * @property {Phaser.GameObjects.Text} label
 * @property {boolean} open
 * @property {boolean} matched
 */

/** Memory: turn cards to find a French word and its Dutch meaning. */
export class MemoryScene extends BaseScene {
  /** @type {{previousSceneName: string}} */
  #sceneData;
  /** @type {Card[]} */
  #cards;
  /** @type {Card[]} */
  #openCards;
  /** @type {number} */
  #tries;
  /** @type {number} */
  #found;
  /** @type {number} */
  #cursor;
  /** @type {boolean} */
  #busy;
  /** @type {boolean} */
  #finished;
  /** @type {Phaser.GameObjects.Text} */
  #scoreText;

  constructor() {
    super({ key: SCENE_KEYS.CARNIVAL_MEMORY_SCENE });
  }

  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#cards = [];
    this.#openCards = [];
    this.#tries = 0;
    this.#found = 0;
    this.#cursor = 0;
    this.#busy = false;
    this.#finished = false;
  }

  create() {
    super.create();
    const { width } = this.scale;
    drawCarnivalBackground(this);
    this.add
      .text(width / 2, 112, 'Zoek de Franse en Nederlandse kaart die bij elkaar horen!', { fontFamily: WORD_FONT, fontSize: '22px', color: '#1d3557' })
      .setOrigin(0.5);
    this.#scoreText = this.add.text(width / 2, 142, '', { fontFamily: WORD_FONT, fontSize: '18px', color: '#1d3557' }).setOrigin(0.5);
    this.add
      .text(width / 2, 562, 'Klik op twee kaarten, of gebruik de pijltjes en spatie.', { fontFamily: WORD_FONT, fontSize: '16px', color: '#1d3557' })
      .setOrigin(0.5);

    // pick pairs with a unique French and Dutch side
    const contacts = getActiveContacts();
    let pool = WORDS.filter((w) => contacts.includes(w.contact));
    if (pool.length < PAIRS) pool = WORDS;
    const usedFr = new Set();
    const usedNl = new Set();
    const chosen = [];
    for (const w of Phaser.Utils.Array.Shuffle([...pool])) {
      if (usedFr.has(w.fr) || usedNl.has(w.nl)) continue;
      usedFr.add(w.fr);
      usedNl.add(w.nl);
      chosen.push(w);
      if (chosen.length === PAIRS) break;
    }
    const deck = Phaser.Utils.Array.Shuffle(
      chosen.flatMap((w, pair) => [
        { pair, text: w.fr, french: true },
        { pair, text: w.nl, french: false },
      ])
    );

    const cardW = 200;
    const cardH = 110;
    const startX = width / 2 - ((COLS - 1) * (cardW + 18)) / 2;
    deck.forEach((c, i) => {
      const x = startX + (i % COLS) * (cardW + 18);
      const y = 230 + Math.floor(i / COLS) * (cardH + 16);
      const front = this.add.rectangle(0, 0, cardW, cardH, c.french ? 0xdbe9f6 : 0xfff3c4).setStrokeStyle(4, 0x4d4a49);
      const label = this.add
        .text(0, 0, `${c.french ? '🇫🇷' : '🇳🇱'} ${c.text}`, { fontFamily: WORD_FONT, fontSize: c.text.length > 16 ? '16px' : '20px', color: '#222', align: 'center', wordWrap: { width: cardW - 16 } })
        .setOrigin(0.5);
      const back = this.add.rectangle(0, 0, cardW, cardH, 0xe94b5a).setStrokeStyle(4, 0x4d4a49);
      const q = this.add.text(0, 0, '?', { fontFamily: WORD_FONT, fontSize: '44px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      const view = this.add.container(x, y, [front, label, back, q]);
      view.setSize(cardW, cardH).setInteractive({ useHandCursor: true });
      /** @type {Card} */
      const card = { ...c, view, back, label, open: false, matched: false };
      // the back rectangle and "?" hide the front
      card.cover = [back, q];
      view.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.#cursor = i;
        this.#flip(card);
      });
      this.#cards.push(card);
    });
    this.#updateScore();
    this.#select(0);
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
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      this.#flip(this.#cards[this.#cursor]);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    const n = this.#cards.length;
    if (dir === DIRECTION.LEFT) this.#select((this.#cursor - 1 + n) % n);
    if (dir === DIRECTION.RIGHT) this.#select((this.#cursor + 1) % n);
    if (dir === DIRECTION.UP) this.#select((this.#cursor - COLS + n) % n);
    if (dir === DIRECTION.DOWN) this.#select((this.#cursor + COLS) % n);
  }

  /** @param {number} i */
  #select(i) {
    this.#cursor = i;
    this.#cards.forEach((c, idx) => c.view.setScale(idx === i ? 1.06 : 1));
  }

  #updateScore() {
    this.#scoreText.setText(`Gevonden: ${this.#found} van ${PAIRS}   ·   Beurten: ${this.#tries}`);
  }

  /** @param {Card} card */
  #setOpen(card, open) {
    card.open = open;
    card.cover.forEach((o) => o.setVisible(!open));
  }

  /** @param {Card} card */
  #flip(card) {
    if (this.#busy || card.open || card.matched) return;
    this.#setOpen(card, true);
    if (card.french) speakFrench(card.text);
    this.#openCards.push(card);
    if (this.#openCards.length < 2) return;

    this.#tries += 1;
    const [a, b] = this.#openCards;
    this.#openCards = [];
    if (a.pair === b.pair && a.french !== b.french) {
      a.matched = true;
      b.matched = true;
      this.#found += 1;
      [a, b].forEach((c) => {
        c.view.list[0].setFillStyle(0x8fdc8f);
        this.tweens.add({ targets: c.view, scale: 1.15, duration: 150, yoyo: true });
      });
      this.#updateScore();
      if (this.#found === PAIRS) this.time.delayedCall(900, () => this.#finish());
      return;
    }
    this.#updateScore();
    this.#busy = true;
    this.time.delayedCall(1300, () => {
      this.#setOpen(a, false);
      this.#setOpen(b, false);
      this.#busy = false;
    });
  }

  #finish() {
    this.#finished = true;
    let stars = 2;
    if (this.#tries <= 16) stars = 4;
    if (this.#tries <= 10) stars = 6;
    showEndPanel(this, stars, `Alles gevonden in ${this.#tries} beurten!`, () => this.#back());
  }

  #back() {
    this._controls.lockInput = true;
    this.scene.start(SCENE_KEYS.CARNIVAL_SCENE, { previousSceneName: this.#sceneData.previousSceneName });
  }
}
