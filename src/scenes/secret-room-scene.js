import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { BaseScene } from './base-scene.js';
import { KENNEY_FUTURE_NARROW_FONT_NAME } from '../assets/font-keys.js';
import { WORD_FONT } from '../carnival/carnival-ui.js';
import { CHARACTER_ASSET_KEYS } from '../assets/asset-keys.js';
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
    this.add.rectangle(0, 0, width, height, 0xfff3d6).setOrigin(0).setDepth(-2);
    // blackboard
    this.add.rectangle(width / 2, 120, 640, 150, 0x2f5d3a).setStrokeStyle(10, 0x8b5a2b);
    this.add
      .text(width / 2, 120, 'Bravo!\nJe suis très fière de toi!', {
        fontFamily: WORD_FONT,
        fontSize: '34px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const juf = this.add.sprite(width / 2 - 120, 330, CHARACTER_ASSET_KEYS.NPC, 40).setScale(9);
    juf.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const hand = this.add.text(width / 2 + 60, 330, '🙌', { fontSize: '120px' }).setOrigin(0.5).setScale(0.2);
    this.tweens.add({ targets: hand, scale: 1, angle: 360, duration: 700, ease: 'Back.Out' });
    this.tweens.add({ targets: juf, y: 310, yoyo: true, repeat: 3, duration: 220 });

    this.add
      .text(width / 2, 455, 'Juf Annelies: "HIGH FIVE!! 500 sterren, wat knap!\nIk ben heel erg trots op jou!"', {
        fontFamily: WORD_FONT,
        fontSize: '24px',
        color: '#4d4a49',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 535, 'Druk op spatie of klik om terug te gaan.', {
        fontFamily: KENNEY_FUTURE_NARROW_FONT_NAME,
        fontSize: '22px',
        color: '#7a6f6a',
      })
      .setOrigin(0.5);

    // confetti
    const colors = [0xe94b5a, 0x4da3ff, 0xffb300, 0x8fdc8f, 0xc77dff];
    for (let i = 0; i < 70; i += 1) {
      const c = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-300, -10),
        10,
        16,
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
