import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { addPanel, panelTextStyle } from '../carnival/carnival-ui.js';
import { CHARACTER_ASSET_KEYS, VILLA_ASSET_KEYS } from '../assets/asset-keys.js';
import { speakFrench } from '../vocab/speech.js';

/** Inside the secret little house: juf Annelies gives a big high five. */
export class SecretRoomScene extends BaseScene {
  /** @type {{previousSceneName: string}} */
  #sceneData;
  /** @type {boolean} */
  #canLeave;

  constructor() {
    super({ key: SCENE_KEYS.SECRET_ROOM_SCENE });
  }

  /** @param {{previousSceneName: string}} data */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#canLeave = false;
  }

  create() {
    super.create();
    const { width, height } = this.scale;
    // a classroom in pixel art, with the message on the blackboard
    this.add.image(0, 0, VILLA_ASSET_KEYS.CLASSROOM).setOrigin(0).setDepth(-2);
    this.add
      .text(width / 2, 112, 'Bravo!\nJe suis très fière de toi!', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '36px',
        color: '#f4f4f4',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    const juf = this.add.sprite(width / 2 - 120, 340, CHARACTER_ASSET_KEYS.NPC, 40).setScale(9);
    juf.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const hand = this.add.text(width / 2 + 60, 330, '🙌', { fontSize: '120px' }).setOrigin(0.5).setScale(0.2);
    this.tweens.add({ targets: hand, scale: 1, angle: 360, duration: 700, ease: 'Back.Out' });
    this.tweens.add({ targets: juf, y: 310, yoyo: true, repeat: 3, duration: 220 });

    addPanel(this, width / 2, 494, 900, 124);
    this.add
      .text(width / 2, 478, 'Juf Annelies: "HIGH FIVE!! 500 sterren, wat knap!\nIk ben heel erg trots op jou!"', { ...panelTextStyle(23), lineSpacing: 6 })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 534, 'Druk op spatie of klik om terug te gaan.', { ...panelTextStyle(16), color: '#ffd34d' })
      .setOrigin(0.5);

    // confetti
    const colors = [0xd84840, 0x60a0d8, 0xf8d860, 0x78b858, 0x9868c8];
    for (let i = 0; i < 70; i += 1) {
      const c = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-300, -10),
        12,
        12,
        colors[i % colors.length]
      ).setDepth(-1);
      this.tweens.add({
        targets: c,
        y: height + 20,
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        repeat: -1,
      });
    }
    speakFrench('Bravo! Je suis très fière de toi!');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.#leave());
    this.time.delayedCall(800, () => {
      this.#canLeave = true;
    });
  }

  update() {
    super.update();
    if (this._controls.isInputLocked) return;
    if (this._controls.wasSpaceKeyPressed() || this._controls.wasEnterKeyPressed() || this._controls.wasBackKeyPressed()) {
      this.#leave();
    }
  }

  #leave() {
    if (!this.#canLeave) return;
    this.#canLeave = false;
    this._controls.lockInput = true;
    this.scene.stop(SCENE_KEYS.SECRET_ROOM_SCENE);
    this.scene.resume(this.#sceneData.previousSceneName, { secretDone: true });
  }
}
