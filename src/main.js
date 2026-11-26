import Phaser from './lib/phaser.js';
import { SCENE_KEYS } from './scenes/scene-keys.js';
import { PreloadScene } from './scenes/preload-scene.js';
import { BattleScene } from './scenes/battle-scene.js';
import { WorldScene } from './scenes/world-scene.js';
import { TitleScene } from './scenes/title-scene.js';
import { OptionsScene } from './scenes/options-scene.js';
import { MonsterPartyScene } from './scenes/monster-party-scene.js';
import { MonsterDetailsScene } from './scenes/monster-details-scene.js';
import { InventoryScene } from './scenes/inventory-scene.js';
import { CutsceneScene } from './scenes/cutscene-scene.js';
import { DialogScene } from './scenes/dialog-scene.js';
import { QuizScene } from './scenes/quiz-scene.js';
import { RepeatScene } from './scenes/repeat-scene.js';
import { CarnivalScene } from './carnival/carnival-scene.js';
import { CansScene } from './carnival/cans-scene.js';
import { MemoryScene } from './carnival/memory-scene.js';
import { DucksScene } from './carnival/ducks-scene.js';
import { ContactSelectScene } from './scenes/contact-select-scene.js';
import { ShopScene } from './scenes/shop-scene.js';
import { SecretRoomScene } from './scenes/secret-room-scene.js';
import { StoryHudScene } from './scenes/story-hud-scene.js';

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  pixelArt: false,
  scale: {
    parent: 'game-container',
    width: 1024,
    height: 576,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#000000',
});

game.scene.add(SCENE_KEYS.PRELOAD_SCENE, PreloadScene);
game.scene.add(SCENE_KEYS.WORLD_SCENE, WorldScene);
game.scene.add(SCENE_KEYS.STORY_HUD_SCENE, StoryHudScene);
game.scene.add(SCENE_KEYS.BATTLE_SCENE, BattleScene);
game.scene.add(SCENE_KEYS.TITLE_SCENE, TitleScene);
game.scene.add(SCENE_KEYS.OPTIONS_SCENE, OptionsScene);
game.scene.add(SCENE_KEYS.MONSTER_PARTY_SCENE, MonsterPartyScene);
game.scene.add(SCENE_KEYS.MONSTER_DETAILS_SCENE, MonsterDetailsScene);
game.scene.add(SCENE_KEYS.INVENTORY_SCENE, InventoryScene);
game.scene.add(SCENE_KEYS.CUTSCENE_SCENE, CutsceneScene);
game.scene.add(SCENE_KEYS.DIALOG_SCENE, DialogScene);
game.scene.add(SCENE_KEYS.QUIZ_SCENE, QuizScene);
game.scene.add(SCENE_KEYS.REPEAT_SCENE, RepeatScene);
game.scene.add(SCENE_KEYS.CARNIVAL_SCENE, CarnivalScene);
game.scene.add(SCENE_KEYS.CARNIVAL_CANS_SCENE, CansScene);
game.scene.add(SCENE_KEYS.CARNIVAL_MEMORY_SCENE, MemoryScene);
game.scene.add(SCENE_KEYS.CARNIVAL_DUCKS_SCENE, DucksScene);
game.scene.add(SCENE_KEYS.CONTACT_SELECT_SCENE, ContactSelectScene);
game.scene.add(SCENE_KEYS.SHOP_SCENE, ShopScene);
game.scene.add(SCENE_KEYS.SECRET_ROOM_SCENE, SecretRoomScene);
game.scene.start(SCENE_KEYS.PRELOAD_SCENE);
window.__game = game;

// save when the window is closed or hidden (tab switch, closing a laptop, ...)
import('./utils/data-manager.js').then(({ dataManager, DATA_MANAGER_STORE_KEYS }) => {
  const saveIfPlaying = () => {
    if (dataManager.store.get(DATA_MANAGER_STORE_KEYS.GAME_STARTED)) dataManager.saveData();
  };
  window.addEventListener('pagehide', saveIfPlaying);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveIfPlaying();
  });
});
