import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { DIRECTION } from '../common/direction.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { addPanel, getStars, makeButton, panelTextStyle, spendStars } from '../carnival/carnival-ui.js';
import { BUILDING_ASSET_KEYS, DATA_ASSET_KEYS, VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
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
    // the inside of the shop from the village, a bit darker so the buttons stand out
    this.add.rectangle(0, 0, width, height, 0x1b1b1b).setOrigin(0);
    this.add.image(width / 2, height / 2, BUILDING_ASSET_KEYS.BUILDING_2_BACKGROUND);
    this.add.image(width / 2, height / 2, BUILDING_ASSET_KEYS.BUILDING_2_FOREGROUND);
    this.add.rectangle(0, 0, width, height, 0x1b1b1b, 0.45).setOrigin(0);
    // striped awning in pixel blocks
    for (let i = 0; i < 16; i += 1) {
      this.add.rectangle(i * 64, 0, 64, 28, i % 2 ? 0xffffff : 0x3060a0).setOrigin(0);
      this.add.rectangle(i * 64 + 8, 28, 48, 8, i % 2 ? 0xffffff : 0x3060a0).setOrigin(0);
    }
    this.add.rectangle(0, 0, width, 4, 0x2d2d2d).setOrigin(0);
    addPanel(this, width / 2, 82, 700, 76);
    this.add
      .text(width / 2, 68, 'Le magasin de Madame Dupont', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '32px',
        color: '#ffd34d',
        stroke: '#1b1b1b',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.#starsText = this.add.text(width / 2, 102, '', panelTextStyle(17)).setOrigin(0.5);

    /** @type {import('../types/typedef.js').Item[]} */
    const all = this.cache.json.get(DATA_ASSET_KEYS.ITEMS) || [];
    this.#items = all.filter((i) => i.price !== undefined);

    const bw = 188;
    const bh = 92;
    const startX = width / 2 - ((COLS - 1) * (bw + 10)) / 2;
    const startY = 184;
    this.#items.forEach((item, i) => {
      const x = startX + (i % COLS) * (bw + 10);
      const y = startY + Math.floor(i / COLS) * (bh + 10);
      const btn = makeButton(this, {
        x,
        y,
        w: bw,
        h: bh,
        label: '',
        onClick: () => {
          this.#select(i);
          this.#buy(i);
        },
      });
      this.add.image(x - 54, y, VILLA_ASSET_KEYS.ITEMS, item.id - 1);
      this.add
        .text(x + 30, y - 12, item.name, { ...panelTextStyle(item.name.length > 12 ? 14 : 16), wordWrap: { width: 96 } })
        .setOrigin(0.5);
      this.add.text(x + 30, y + 24, `⭐ ${item.price}`, { ...panelTextStyle(17), color: '#ffd34d' }).setOrigin(0.5);
      btn.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(i));
      this.#buttons.push(btn);
    });
    const backIndex = this.#items.length;
    const back = makeButton(this, {
      x: startX + (backIndex % COLS) * (bw + 10),
      y: startY + Math.floor(backIndex / COLS) * (bh + 10),
      w: bw,
      h: bh,
      label: 'Au revoir!\n(terug)',
      fontSize: '18px',
      onClick: () => this.#leave(),
    });
    back.zone.on(Phaser.Input.Events.POINTER_OVER, () => this.#select(backIndex));
    this.#buttons.push(back);

    addPanel(this, width / 2, 520, 900, 70);
    this.#infoText = this.add
      .text(width / 2, 520, '', { ...panelTextStyle(18), wordWrap: { width: 860 } })
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
    this.#infoText.setColor('#ffffff');
    this.#infoText.setText(item ? item.description : 'Terug naar het dorp.');
  }

  /** @param {number} i */
  #buy(i) {
    const item = this.#items[i];
    if (!item) return;
    const owned = dataManager.store.get('INVENTORY').find((inv) => inv.item.id === item.id);
    if (item.keep && owned && owned.quantity > 0) {
      this.#infoText.setColor('#dddddd').setText(`Je hebt al een ${item.name}. Die raakt nooit op!`);
      return;
    }
    if (!spendStars(item.price)) {
      this.#infoText
        .setColor('#ff8a80')
        .setText(`Je hebt nog ${item.price - getStars()} sterren te weinig. Verdien sterren op de kermis of met Zeg me na!`);
      return;
    }
    dataManager.addItem(item, 1);
    dataManager.saveData();
    this.#updateStars();
    this.#infoText.setColor('#a5e88f').setText(`Merci! Je kocht: ${item.name}. Hij zit in je tas.`);
    speakFrench('Merci!');
  }

  #leave() {
    this._controls.lockInput = true;
    this.scene.stop(SCENE_KEYS.SHOP_SCENE);
    this.scene.resume(this.#sceneData.previousSceneName, { shopDone: true });
  }
}
