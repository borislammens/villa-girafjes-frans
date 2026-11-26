import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { WORD_FONT, getStars, makeButton, spendStars } from '../carnival/carnival-ui.js';
import { DATA_ASSET_KEYS } from '../assets/asset-keys.js';
import { dataManager } from '../utils/data-manager.js';
import { speakFrench } from '../vocab/speech.js';

const COLS = 5;

/** The shop of Madame Dupont: buy items for the bag with stars. */
export class ShopScene extends BaseScene {
  /** @type {{previousSceneName: string}} */
  #sceneData;
  /** @type {ReturnType<typeof makeButton>[]} */
  #buttons;
  /** @type {import('../types/typedef.js').Item[]} */
  #items;
  /** @type {number} */
  #cursor;
  /** @type {Phaser.GameObjects.Text} */
  #starsText;
  /** @type {Phaser.GameObjects.Text} */
  #infoText;
  /** @type {Phaser.Input.Keyboard.Key} */
  #escKey;

  constructor() {
    super({ key: SCENE_KEYS.SHOP_SCENE });
  }

  /** @param {{previousSceneName: string}} data */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#buttons = [];
    this.#cursor = 0;
  }

  create() {
    super.create();
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0xfdf6e3).setOrigin(0);
    // striped awning
    for (let i = 0; i < 16; i += 1) {
      this.add.rectangle(i * 64, 0, 64, 46, i % 2 ? 0xffffff : 0x2b5d9b).setOrigin(0);
    }
    this.add
      .text(width / 2, 74, 'Le magasin de Madame Dupont', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '34px',
        color: '#2b5d9b',
      })
      .setOrigin(0.5);
    this.#starsText = this.add
      .text(width / 2, 108, '', { fontFamily: WORD_FONT, fontSize: '20px', color: '#1d3557' })
      .setOrigin(0.5);

    /** @type {import('../types/typedef.js').Item[]} */
    const all = this.cache.json.get(DATA_ASSET_KEYS.ITEMS) || [];
    this.#items = all.filter((i) => i.price !== undefined);

    const bw = 186;
    const bh = 96;
    const startX = width / 2 - ((COLS - 1) * (bw + 12)) / 2;
    const startY = 182;
    this.#items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const btn = makeButton(this, {
        x: startX + col * (bw + 12),
        y: startY + row * (bh + 10),
        w: bw,
        h: bh,
        label: `${item.name}\n⭐ ${item.price}`,
        fontSize: item.name.length > 16 ? '16px' : '19px',
        fill: item.price >= 500 ? 0xffe9a8 : 0xffffff,
        onClick: () => {
          this.#select(i);
          this.#buy(i);
        },
      });
      btn.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(i));
      this.#buttons.push(btn);
    });
    const backIndex = this.#items.length;
    const lastRowY = startY + Math.floor((this.#items.length - 1) / COLS) * (bh + 10);
    const back = makeButton(this, {
      x: startX + (backIndex % COLS) * (bw + 12),
      y: lastRowY,
      w: bw,
      h: bh,
      label: 'Au revoir!\n(terug)',
      fontSize: '19px',
      fill: 0xdbe9f6,
      stroke: 0x2b5d9b,
      onClick: () => this.#leave(),
    });
    back.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(backIndex));
    this.#buttons.push(back);

    this.#infoText = this.add
      .text(width / 2, height - 52, '', {
        fontFamily: WORD_FONT,
        fontSize: '20px',
        color: '#4d4a49',
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);

    this.#escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.#updateStars();
    this.#select(0);
    speakFrench('Bonjour! Bienvenue au magasin.');
  }

  update() {
    super.update();
    if (this._controls.isInputLocked) return;
    if (Phaser.Input.Keyboard.JustDown(this.#escKey) || this._controls.wasBackKeyPressed()) {
      this.#leave();
      return;
    }
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed()) {
      if (this.#cursor === this.#items.length) this.#leave();
      else this.#buy(this.#cursor);
      return;
    }
    const dir = this._controls.getDirectionKeyJustPressed();
    const max = this.#items.length;
    if (dir === DIRECTION.LEFT) this.#select(Math.max(0, this.#cursor - 1));
    if (dir === DIRECTION.RIGHT) this.#select(Math.min(max, this.#cursor + 1));
    if (dir === DIRECTION.UP) this.#select(this.#cursor - COLS >= 0 ? this.#cursor - COLS : this.#cursor);
    if (dir === DIRECTION.DOWN) this.#select(Math.min(max, this.#cursor + COLS));
  }

  #updateStars() {
    this.#starsText.setText(`Jij hebt ⭐ ${getStars()} sterren. Kies met de pijltjes en spatie, of klik.`);
  }

  /** @param {number} i */
  #select(i) {
    this.#cursor = i;
    this.#buttons.forEach((b, idx) => b.highlight(idx === i));
    const item = this.#items[i];
    this.#infoText.setColor('#4d4a49');
    this.#infoText.setText(item ? item.description : 'Terug naar het dorp.');
  }

  /** @param {number} i */
  #buy(i) {
    const item = this.#items[i];
    if (!item) return;
    const owned = dataManager.store.get('INVENTORY').find((inv) => inv.item.id === item.id);
    if (item.keep && owned && owned.quantity > 0) {
      this.#infoText.setColor('#7a6f6a').setText(`Je hebt al een ${item.name}. Die raakt nooit op!`);
      return;
    }
    if (!spendStars(item.price)) {
      this.#infoText
        .setColor('#c62828')
        .setText(`Je hebt nog ${item.price - getStars()} sterren te weinig. Verdien sterren op de kermis of met Zeg me na!`);
      return;
    }
    dataManager.addItem(item, 1);
    dataManager.saveData();
    this.#updateStars();
    this.#infoText.setColor('#2e7d32').setText(`Merci! Je kocht: ${item.name}. Hij zit in je tas.`);
    speakFrench('Merci!');
  }

  #leave() {
    this._controls.lockInput = true;
    this.scene.stop(SCENE_KEYS.SHOP_SCENE);
    this.scene.resume(this.#sceneData.previousSceneName, { shopDone: true });
  }
}
