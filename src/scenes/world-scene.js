import Phaser from '../lib/phaser.js';
import { AUDIO_ASSET_KEYS, WORLD_ASSET_KEYS } from '../assets/asset-keys.js';
import { SCENE_KEYS } from './scene-keys.js';
import { Player } from '../world/characters/player.js';
import { DIRECTION } from '../common/direction.js';
import { ENABLE_ZONE_DEBUGGING, TILED_COLLISION_LAYER_ALPHA, TILE_SIZE } from '../config.js';
import { DATA_MANAGER_STORE_KEYS, dataManager } from '../utils/data-manager.js';
import {
  getTargetDirectionFromGameObjectPosition,
  getTargetPathToGameObject,
  getTargetPositionFromGameObjectPositionAndDirection,
} from '../utils/grid-utils.js';
import { CANNOT_READ_SIGN_TEXT, SAMPLE_TEXT } from '../utils/text-utils.js';
import { NPC, NPC_MOVEMENT_PATTERN } from '../world/characters/npc.js';
import { WorldMenu } from '../world/world-menu.js';
import { BaseScene } from './base-scene.js';
import { makeChatQuestion, setStoryMaxContact } from '../vocab/quiz.js';
import {
  CHAPTERS,
  ENDING_MESSAGES,
  EXTRA_NPCS,
  SECRET_HOUSE,
  STORY_FLAGS,
  STORY_GATES,
  THIEF_FLAGS,
  STARS_PER_CHAPTER,
  chapterTasksDone,
  currentChapterIndex,
  nextChapterToOpen,
  nextGoalText,
  questText,
} from '../story/story.js';
import { getChapterStars, getStarsEarned, startChapterStars } from '../carnival/carnival-ui.js';
import { itemBoosts } from '../items/item-effects.js';
import { makeSaveCodeNow } from '../save/save-game.js';
import { showCodeOverlay } from '../save/code-ui.js';
import { ITEM_EFFECT } from '../types/typedef.js';
import { DataUtils } from '../utils/data-utils.js';
import { playBackgroundMusic, playSoundFx } from '../utils/audio-utils.js';
import { weightedRandom } from '../utils/random.js';
import { Item } from '../world/item.js';
import { BATTLE_FLAG, ENCOUNTER_TILE_TYPE, GAME_EVENT_TYPE, ITEM_CATEGORY, NPC_EVENT_TYPE } from '../types/typedef.js';
import { exhaustiveGuard } from '../utils/guard.js';
import { sleep } from '../utils/time-utils.js';
import { CutsceneScene } from './cutscene-scene.js';
import { DialogScene } from './dialog-scene.js';
import * as TiledUtils from '../utils/tiled-utils.js';
import * as CameraUtils from '../utils/camera-utils.js';
import {
  CUSTOM_TILED_TYPES,
  OBJECT_LAYER_NAMES,
  TILED_AREA_METADATA_PROPERTY,
  TILED_ENCOUNTER_PROPERTY,
  TILED_EVENT_PROPERTY,
  TILED_ITEM_PROPERTY,
  TILED_NPC_PROPERTY,
  TILED_SIGN_PROPERTY,
} from '../assets/tiled-keys.js';

/**
 * @typedef WorldSceneData
 * @type {object}
 * @property {boolean} [isPlayerKnockedOut]
 * @property {string} [area]
 * @property {boolean} [isInterior]
 */

export class WorldScene extends BaseScene {
  /** @type {Player} */
  #player;
  /** @type {Phaser.Tilemaps.TilemapLayer[]} */
  #encounterLayers;
  /** @type {boolean} */
  #wildMonsterEncountered;
  /** @type {Phaser.Tilemaps.ObjectLayer | undefined} */
  #signLayer;
  /** @type {DialogScene} */
  #dialogUi;
  /** @type {NPC[]} */
  #npcs;
  /** @type {NPC | undefined} */
  #npcPlayerIsInteractingWith;
  /** @type {WorldMenu} */
  #menu;
  /** @type {WorldSceneData} */
  #sceneData;
  /** @type {Item[]} */
  #items;
  /** @type {Phaser.Tilemaps.ObjectLayer | undefined} */
  #entranceLayer;
  /** @type {number} */
  #lastNpcEventHandledIndex;
  /** @type {boolean} */
  #isProcessingNpcEvent;
  /** @type {boolean} */
  #isInFrenchChat = false;
  /** @type {Set<string> | undefined} flags when the conversation started, so a flag won in a chat does not open the next lines at once */
  #npcFlagsAtStart;
  /** @type {any} the FRENCH_CHAT event that is running now */
  #currentChatEvent;
  /** @type {number} */
  #nextStoryCheck = 0;
  /** @type {boolean} */
  #storyEndPending = false;
  /** @type {number} chapter for which the "earn stars" tip was shown */
  static starTipShownForChapter = -1;
  /** @type {Phaser.Tilemaps.TilemapLayer | undefined} */
  #collisionLayer;
  /** @type {{[key: string]: Phaser.GameObjects.Zone}} */
  #eventZones;
  /** @type {{[key: string]: Phaser.GameObjects.Rectangle}} */
  #debugEventZoneObjects;
  /** @type {Phaser.Geom.Rectangle} */
  #rectangleForOverlapCheck1;
  /** @type {Phaser.Geom.Rectangle} */
  #rectangleForOverlapCheck2;
  /** @type {Phaser.Geom.Rectangle} */
  #rectangleOverlapResult;
  /** @type {Phaser.GameObjects.Graphics} */
  #gfx;
  /** @type {number | undefined} */
  #currentCutSceneId;
  /** @type {boolean} */
  #isProcessingCutSceneEvent;
  /** @type {number} */
  #lastCutSceneEventHandledIndex;
  /** @type {Phaser.GameObjects.Group} */
  #specialEncounterTileImageGameObjectGroup;
  /** @type {Phaser.Tilemaps.TilemapLayer | undefined} */
  #encounterZonePlayerIsEntering;
  /** @type {import('../types/typedef.js').CameraRegion[]} */
  #cameraRegions;
  /** @type {{ [key: string]: Phaser.Tilemaps.Tilemap}} */
  #tiledLevelMaps;

  constructor() {
    super({
      key: SCENE_KEYS.WORLD_SCENE,
    });
  }

  /**
   * @param {WorldSceneData} data
   * @returns {void}
   */
  init(data) {
    super.init(data);
    this.#sceneData = data;
    this.#tiledLevelMaps = {};

    // handle when some of the fields for scene data are not populated, default to values provided, otherwise use safe defaults
    /** @type {string} */
    const area = this.#sceneData?.area || dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_LOCATION).area;
    let isInterior = this.#sceneData?.isInterior;
    if (isInterior === undefined) {
      isInterior = dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_LOCATION).isInterior;
    }
    const isPlayerKnockedOut = this.#sceneData?.isPlayerKnockedOut || false;

    this.#sceneData = {
      area,
      isInterior,
      isPlayerKnockedOut,
    };

    // update player location, and map data if the player was knocked out in a battle
    if (this.#sceneData.isPlayerKnockedOut) {
      // get the nearest knocked out spawn location from the map meta data
      let map = this.#getLevelTileMap(`${this.#sceneData.area.toUpperCase()}_LEVEL`);
      const areaMetaDataProperties = map.getObjectLayer(OBJECT_LAYER_NAMES.AREA_METADATA).objects[0].properties;
      const knockOutSpawnLocation = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (
        areaMetaDataProperties
      ).find((property) => property.name === TILED_AREA_METADATA_PROPERTY.FAINT_LOCATION)?.value;

      // check to see if the level data we need to load is different and load that map to get player spawn data
      if (knockOutSpawnLocation !== this.#sceneData.area) {
        this.#sceneData.area = knockOutSpawnLocation;
        map = this.#getLevelTileMap(`${this.#sceneData.area.toUpperCase()}_LEVEL`);
      }

      // set players spawn location to that map and finds the revive location based on that object
      const reviveLocation = map.getObjectLayer(OBJECT_LAYER_NAMES.REVIVE_LOCATION).objects[0];
      dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
        x: reviveLocation.x,
        y: reviveLocation.y - TILE_SIZE,
      });
      dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, DIRECTION.UP);
    }

    // During a new game flow, find the players starting location from the map data, and update
    // the data manager. Originally, this was a hard coded value, and was updated to be dynamic
    // based on our level data in Tiled.
    let isNewGame = !(dataManager.store.get(DATA_MANAGER_STORE_KEYS.GAME_STARTED) || false);
    if (isNewGame) {
      // find player spawn location and update the data manager
      const map = this.#getLevelTileMap(WORLD_ASSET_KEYS.MAIN_1_LEVEL);
      const playerSpawnLocationObject = map.getObjectLayer(OBJECT_LAYER_NAMES.PLAYER_SPAWN_LOCATION).objects[0];
      dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
        x: playerSpawnLocationObject.x,
        y: playerSpawnLocationObject.y - TILE_SIZE,
      });
    }

    dataManager.store.set(
      DATA_MANAGER_STORE_KEYS.PLAYER_LOCATION,
      /** @type {import('../utils/data-manager.js').PlayerLocation} */ ({
        area: this.#sceneData.area,
        isInterior: this.#sceneData.isInterior,
      })
    );

    this.#wildMonsterEncountered = false;
    this.#npcPlayerIsInteractingWith = undefined;
    this.#items = [];
    this.#lastNpcEventHandledIndex = -1;
    this.#isProcessingNpcEvent = false;
    this.#encounterLayers = [];
    this.#signLayer = undefined;
    this.#entranceLayer = undefined;
    this.#eventZones = {};
    this.#debugEventZoneObjects = {};
    this.#rectangleForOverlapCheck1 = undefined;
    this.#rectangleForOverlapCheck2 = undefined;
    this.#rectangleOverlapResult = undefined;
    this.#gfx = undefined;
    this.#currentCutSceneId = undefined;
    this.#isProcessingCutSceneEvent = false;
    this.#lastCutSceneEventHandledIndex = -1;
    this.#specialEncounterTileImageGameObjectGroup = undefined;
    this.#encounterZonePlayerIsEntering = undefined;
    this.#cameraRegions = [];
  }

  /**
   * @returns {void}
   */
  create() {
    super.create();

    // create rectangles for checking for overlaps between game objects, added so we can recycle game objects
    this.#rectangleForOverlapCheck1 = new Phaser.Geom.Rectangle();
    this.#rectangleForOverlapCheck2 = new Phaser.Geom.Rectangle();
    this.#rectangleOverlapResult = new Phaser.Geom.Rectangle();

    // create map and collision layer
    const map = this.#getLevelTileMap(`${this.#sceneData.area.toUpperCase()}_LEVEL`);
    // The first parameter is the name of the tileset in Tiled and the second parameter is the key
    // of the tileset image used when loading the file in preload.
    const collisionTiles = map.addTilesetImage('collision', WORLD_ASSET_KEYS.WORLD_COLLISION);
    if (!collisionTiles) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision tiles from tiled`);
      return;
    }
    const collisionLayer = map.createLayer('Collision', collisionTiles, 0, 0);
    if (!collisionLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision layer using data from tiled`);
      return;
    }
    collisionLayer.setAlpha(TILED_COLLISION_LAYER_ALPHA).setDepth(2);
    this.#collisionLayer = collisionLayer;

    // create interactive layer
    const hasSignLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.SIGN) !== null;
    if (hasSignLayer) {
      this.#signLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.SIGN);
    }

    // create layer for scene transitions entrances
    const hasSceneTransitionLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.SCENE_TRANSITIONS) !== null;
    if (hasSceneTransitionLayer) {
      this.#entranceLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.SCENE_TRANSITIONS);
    }

    // create collision layers for encounters
    this.#createEncounterAreas(map);

    if (!this.#sceneData.isInterior) {
      this.cameras.main.setBounds(0, 0, 2560, 5184);
    }
    this.cameras.main.setZoom(0.8);
    this.add.image(0, 0, `${this.#sceneData.area.toUpperCase()}_BACKGROUND`, 0).setOrigin(0);

    // the secret little house (only the "sleutel tot de school" opens it)
    this.#createSecretHouse();

    // create items and collisions
    this.#createItems(map);

    // create npcs
    this.#createNPCs(map);

    // create player and have camera focus on the player
    this.#player = new Player({
      scene: this,
      position: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION),
      direction: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION),
      collisionLayer: collisionLayer,
      spriteGridMovementFinishedCallback: () => {
        this.#handlePlayerMovementUpdate();
      },
      spriteChangedDirectionCallback: () => {
        this.#handlePlayerDirectionUpdate();
      },
      otherCharactersToCheckForCollisionsWith: this.#npcs,
      objectsToCheckForCollisionsWith: this.#items,
      entranceLayer: this.#entranceLayer,
      enterEntranceCallback: (entranceName, entranceId, isBuildingEntrance) => {
        this.#handleEntranceEnteredCallback(entranceName, entranceId, isBuildingEntrance);
      },
      spriteGridMovementStartedCallback: (position) => {
        this.#handlePlayerMovementStarted(position);
      },
    });
    this.cameras.main.startFollow(this.#player.sprite);

    // update camera bounds for the given level
    this.#cameraRegions = TiledUtils.createCameraRegions(map);
    CameraUtils.updateMainCameraBounds(this, this.#player.sprite, this.#cameraRegions);

    // update our collisions with npcs
    this.#npcs.forEach((npc) => {
      npc.addCharacterToCheckForCollisionsWith(this.#player);
    });

    // create foreground for depth
    this.add.image(0, 0, `${this.#sceneData.area.toUpperCase()}_FOREGROUND`, 0).setOrigin(0);

    // create menu
    this.#menu = new WorldMenu(this);

    // create event zones
    this.#createEventEncounterZones(map);

    if (ENABLE_ZONE_DEBUGGING) {
      // used for debugging the overlaps for event zones
      this.#gfx = this.add.graphics({ lineStyle: { width: 4, color: 0x00ffff } });
    }

    this.cameras.main.fadeIn(1000, 0, 0, 0, (camera, progress) => {
      if (progress === 1) {
        // if the player was knocked out, we want to lock input, heal player, and then have npc show message
        if (this.#sceneData.isPlayerKnockedOut) {
          this.#healPlayerParty();
          this.#dialogUi.showDialogModal([
            'Je monsters hebben hard gevochten...',
            'Ik heb ze voor je verzorgd. Ze zijn weer fit!',
          ]);
        }
      }
    });
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.GAME_STARTED, true);
    this.#migrateOldSave();
    // save automatically, so closing the window never loses progress
    dataManager.saveData();
    this.time.addEvent({ delay: 15000, loop: true, callback: () => dataManager.saveData() });

    // add audio
    playBackgroundMusic(this, AUDIO_ASSET_KEYS.MAIN);
    // add UI scene for cutscene and dialog
    this.scene.launch(SCENE_KEYS.CUTSCENE_SCENE);
    this.scene.launch(SCENE_KEYS.DIALOG_SCENE);
    this.#dialogUi = /** @type {DialogScene} */ (this.scene.get(SCENE_KEYS.DIALOG_SCENE));
    this.scene.launch(SCENE_KEYS.STORY_HUD_SCENE);
    this.scene.moveAbove(SCENE_KEYS.WORLD_SCENE, SCENE_KEYS.STORY_HUD_SCENE);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENE_KEYS.STORY_HUD_SCENE));
    this.#nextStoryCheck = 0;
    this.#specialEncounterTileImageGameObjectGroup = this.add.group({ classType: Phaser.GameObjects.Image });
  }

  /**
   * @param {DOMHighResTimeStamp} time
   * @returns {void}
   */
  update(time) {
    super.update(time);

    if (this.#wildMonsterEncountered) {
      this.#player.update(time);
      return;
    }

    // a click or tap moves dialogs forward, so the game never looks stuck for mouse players
    const wasClicked = this._controls.wasClicked();
    const wasSpaceKeyPressed =
      this._controls.wasSpaceKeyPressed() ||
      (wasClicked && (this.#dialogUi.isVisible || (this.#isProcessingCutSceneEvent && !!this.#npcPlayerIsInteractingWith)));
    const selectedDirectionHeldDown = this._controls.getDirectionKeyPressedDown();
    const selectedDirectionPressedOnce = this._controls.getDirectionKeyJustPressed();
    const isShiftKeyDown = this._controls.isShiftKeyDown();

    if (this.#isProcessingCutSceneEvent) {
      this.#player.update(time);
      this.#npcs.forEach((npc) => {
        npc.update(time);
      });
      if (wasSpaceKeyPressed && this.#npcPlayerIsInteractingWith) {
        this.#handlePlayerInteraction();
      }
      return;
    }

    if (time > this.#nextStoryCheck) {
      this.#nextStoryCheck = time + 400;
      this.#checkStory();
    }

    if (selectedDirectionHeldDown !== DIRECTION.NONE && !this.#isPlayerInputLocked()) {
      if (this.#player.isMoving || !this.#isBlockedByStory(selectedDirectionHeldDown)) {
        this.#player.moveCharacter(selectedDirectionHeldDown, isShiftKeyDown);
      }
    }

    if (wasSpaceKeyPressed && !this.#player.isMoving && !this.#menu.isVisible) {
      this.#handlePlayerInteraction();
    }

    if (this._controls.wasEnterKeyPressed() && !this.#player.isMoving) {
      if (this.#dialogUi.isVisible || this.#isProcessingNpcEvent) {
        return;
      }

      if (this.#menu.isVisible) {
        this.#menu.hide();
        return;
      }

      this.#menu.show();
    }

    if (this.#menu.isVisible) {
      if (selectedDirectionPressedOnce !== DIRECTION.NONE) {
        this.#menu.handlePlayerInput(selectedDirectionPressedOnce);
      }

      if (wasSpaceKeyPressed) {
        this.#menu.handlePlayerInput('OK');

        if (this.#menu.selectedMenuOption === 'SAVE') {
          this.#menu.hide();
          dataManager.saveData();
          this.#dialogUi.showDialogModal(['Je spel is bewaard!']);
        }

        if (this.#menu.selectedMenuOption === 'CODE') {
          this.#menu.hide();
          dataManager.saveData();
          this._controls.lockInput = true;
          this.input.keyboard.enabled = false;
          showCodeOverlay(makeSaveCodeNow(), () => {
            this.input.keyboard.enabled = true;
            this.time.delayedCall(200, () => {
              this._controls.lockInput = false;
            });
          });
          return;
        }

        if (this.#menu.selectedMenuOption === 'MONSTERS') {
          // at start of the game, handle when we have no monsters in our party
          if (dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY).length === 0) {
            this.#dialogUi.showDialogModal(['Je hebt nog geen monsters.']);
            this.#menu.hide();
            return;
          }

          // pause this scene and launch the monster party scene
          /** @type {import('./monster-party-scene.js').MonsterPartySceneData} */
          const sceneDataToPass = {
            previousSceneName: SCENE_KEYS.WORLD_SCENE,
          };
          this.scene.launch(SCENE_KEYS.MONSTER_PARTY_SCENE, sceneDataToPass);
          this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        }

        if (this.#menu.selectedMenuOption === 'KERMIS') {
          this.#menu.hide();
          this._controls.lockInput = true;
          this.scene.launch(SCENE_KEYS.CARNIVAL_SCENE, { previousSceneName: SCENE_KEYS.WORLD_SCENE });
          this.scene.pause(SCENE_KEYS.WORLD_SCENE);
          return;
        }

        if (this.#menu.selectedMenuOption === 'BAG') {
          // pause this scene and launch the inventory scene
          /** @type {import('./inventory-scene.js').InventorySceneData} */
          const sceneDataToPass = {
            previousSceneName: SCENE_KEYS.WORLD_SCENE,
            itemCategoriesThatCannotBeUsed: [ITEM_CATEGORY.CAPTURE, ITEM_CATEGORY.BATTLE_HELP],
          };
          this.scene.launch(SCENE_KEYS.INVENTORY_SCENE, sceneDataToPass);
          this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        }

        if (this.#menu.selectedMenuOption === 'EXIT') {
          this.#menu.hide();
        }
      }

      if (this._controls.wasBackKeyPressed()) {
        this.#menu.hide();
      }
    }

    this.#player.update(time);

    this.#npcs.forEach((npc) => {
      npc.update(time);
    });
  }

  /**
   * @returns {void}
   */
  #handlePlayerInteraction() {
    if (this.#dialogUi.isAnimationPlaying) {
      return;
    }

    if (this.#dialogUi.isVisible && !this.#dialogUi.moreMessagesToShow) {
      this.#dialogUi.hideDialogModal();
      if (this.#currentCutSceneId !== undefined) {
        this.#isProcessingCutSceneEvent = false;
        this.#handleCutSceneInteraction();
      }
      if (this.#npcPlayerIsInteractingWith) {
        this.#handleNpcInteraction();
      }
      return;
    }

    if (this.#dialogUi.isVisible && this.#dialogUi.moreMessagesToShow) {
      this.#dialogUi.showNextMessage();
      return;
    }

    // get players current direction and check 1 tile over in that direction to see if there is an object that can be interacted with
    const { x, y } = this.#player.sprite;
    const targetPosition = getTargetPositionFromGameObjectPositionAndDirection({ x, y }, this.#player.direction);

    // check for sign, and display appropriate message if player is not facing up
    const nearbySign = this.#signLayer?.objects.find((object) => {
      if (!object.x || !object.y) {
        return false;
      }

      // In Tiled, the x value is how far the object starts from the left, and the y is the bottom of tiled object that is being added
      return object.x === targetPosition.x && object.y - TILE_SIZE === targetPosition.y;
    });

    if (nearbySign) {
      /** @type {import('../types/typedef.js').TiledObjectProperty[]} */
      const props = nearbySign.properties;
      /** @type {number} */
      const signId = props.find((prop) => prop.name === TILED_SIGN_PROPERTY.ID)?.value;
      const sign = DataUtils.getSignData(this, signId);

      const usePlaceholderText = this.#player.direction !== DIRECTION.UP;
      let textToShow = CANNOT_READ_SIGN_TEXT;
      if (!usePlaceholderText) {
        textToShow = sign?.message || SAMPLE_TEXT;
      }
      this.#dialogUi.showDialogModal([textToShow]);
      return;
    }

    if (
      this.#sceneData.area === SECRET_HOUSE.area &&
      targetPosition.x === SECRET_HOUSE.doorX * TILE_SIZE &&
      targetPosition.y === SECRET_HOUSE.doorY * TILE_SIZE
    ) {
      this.#tryOpenSecretHouse();
      return;
    }

    const nearbyNpc = this.#npcs.find((npc) => {
      return npc.sprite.x === targetPosition.x && npc.sprite.y === targetPosition.y;
    });
    if (nearbyNpc) {
      nearbyNpc.facePlayer(this.#player.direction);
      nearbyNpc.isTalkingToPlayer = true;
      this.#npcPlayerIsInteractingWith = nearbyNpc;
      this.#handleNpcInteraction();
      return;
    }

    // check for a nearby item and display message about player finding the item
    let nearbyItemIndex;
    const nearbyItem = this.#items.find((item, index) => {
      if (item.position.x === targetPosition.x && item.position.y === targetPosition.y) {
        nearbyItemIndex = index;
        return true;
      }
      return false;
    });
    if (nearbyItem) {
      // add item to inventory and display message to player
      const item = DataUtils.getItem(this, nearbyItem.itemId);
      dataManager.addItem(item, 1);
      nearbyItem.gameObject.destroy();
      this.#items.splice(nearbyItemIndex, 1);
      dataManager.addItemPickedUp(nearbyItem.id);
      this.#dialogUi.showDialogModal([`Je vond: ${item.name}`]);
    }
  }

  /**
   * @returns {void}
   */
  #handlePlayerMovementUpdate() {
    // update player position on global data store
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
      x: this.#player.sprite.x,
      y: this.#player.sprite.y,
    });

    // update camera bounds for given level after player moves
    CameraUtils.updateMainCameraBounds(this, this.#player.sprite, this.#cameraRegions);

    // check to see if the player encountered cut scene zone
    this.#player.sprite.getBounds(this.#rectangleForOverlapCheck1);
    for (const zone of Object.values(this.#eventZones)) {
      // get the bounds of the player and zone for checking for overlap
      zone.getBounds(this.#rectangleForOverlapCheck2);

      // reset rectangle overlap size, needed since method below will
      // return the original rectangle unmodified if a previous match
      // was found.
      this.#rectangleOverlapResult.setSize(0, 0);
      Phaser.Geom.Intersects.GetRectangleIntersection(
        this.#rectangleForOverlapCheck1,
        this.#rectangleForOverlapCheck2,
        this.#rectangleOverlapResult
      );

      if (ENABLE_ZONE_DEBUGGING) {
        // for debugging the overlap checks for the events
        this.#gfx.clear();
        this.#gfx.strokeRectShape(this.#rectangleOverlapResult);
      }

      const isOverlapping =
        this.#rectangleOverlapResult.width >= TILE_SIZE - 10 && this.#rectangleOverlapResult.height >= TILE_SIZE - 10;

      if (isOverlapping) {
        const eventId = parseInt(zone.name, 10);
        const eventData = DataUtils.getEventData(this, eventId);
        const eventRequirementsMet = this.#requirementsMet(eventData.requires);
        if (eventRequirementsMet) {
          this.#currentCutSceneId = parseInt(zone.name, 10);
          this.#startCutScene();
          break;
        }
      }
    }
    if (this.#currentCutSceneId !== undefined) {
      return;
    }
    if (this.#encounterLayers.length === 0) {
      return;
    }
    this.#handlePlayerMovementInEncounterZone();
  }

  /**
   * @returns {void}
   */
  #handlePlayerMovementInEncounterZone() {
    // cleanup any special tiles that are not at the players current position
    this.#specialEncounterTileImageGameObjectGroup
      .getChildren()
      .forEach((/** @type {Phaser.GameObjects.Image} */ child) => {
        if (!child.active) {
          return;
        }
        if (child.x === this.#player.sprite.x && child.y === this.#player.sprite.y) {
          child.visible = true;
          return;
        }
        child.active = false;
        child.visible = false;
      });
    if (this.#encounterZonePlayerIsEntering === undefined) {
      return;
    }
    if (itemBoosts.repelSteps > 0) {
      itemBoosts.repelSteps -= 1;
      if (itemBoosts.repelSteps === 0) {
        this.#dialogUi.showDialogModal(['Het fluitje is uitgewerkt. Pas op voor wilde woordjesdieven!']);
      }
      return;
    }

    this.#wildMonsterEncountered = Math.random() < 0.2;
    if (this.#wildMonsterEncountered) {
      const encounterAreaId = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (
        this.#encounterZonePlayerIsEntering.layer.properties
      ).find((property) => property.name === TILED_ENCOUNTER_PROPERTY.AREA).value;
      const possibleMonsters = DataUtils.getEncounterAreaDetails(this, encounterAreaId);
      const randomMonsterId = weightedRandom(possibleMonsters);

      console.log(
        `[${WorldScene.name}:handlePlayerMovementUpdate] player encountered a wild monster in area ${encounterAreaId} and monster id has been picked randomly ${randomMonsterId}`
      );
      /** @type {import('./battle-scene.js').BattleSceneData} */
      const dataToPass = {
        enemyMonsters: [DataUtils.getMonsterById(this, randomMonsterId)],
        playerMonsters: dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY),
      };
      this.#startBattleScene(dataToPass);
    }
  }

  /**
   * @returns {boolean}
   */
  #isPlayerInputLocked() {
    return (
      this._controls.isInputLocked ||
      this.#dialogUi.isVisible ||
      this.#menu.isVisible ||
      this.#isProcessingNpcEvent ||
      this.#currentCutSceneId !== undefined
    );
  }

  /**
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {void}
   */
  #createNPCs(map) {
    this.#npcs = [];

    const npcLayers = map.getObjectLayerNames().filter((layerName) => layerName.includes('NPC'));
    npcLayers.forEach((layerName) => {
      const layer = map.getObjectLayer(layerName);
      const npcObject = layer.objects.find((obj) => {
        return obj.type === CUSTOM_TILED_TYPES.NPC;
      });
      if (!npcObject || npcObject.x === undefined || npcObject.y === undefined) {
        return;
      }

      // get the path objects for this npc
      const pathObjects = layer.objects.filter((obj) => {
        return obj.type === CUSTOM_TILED_TYPES.NPC_PATH;
      });
      /** @type {import('../world/characters/npc.js').NPCPath} */
      const npcPath = {
        0: { x: npcObject.x, y: npcObject.y - TILE_SIZE },
      };
      pathObjects.forEach((obj) => {
        if (obj.x === undefined || obj.y === undefined) {
          return;
        }
        npcPath[parseInt(obj.name, 10)] = { x: obj.x, y: obj.y - TILE_SIZE };
      });

      /** @type {import('../world/characters/npc.js').NpcMovementPattern} */
      const npcMovement =
        /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (npcObject.properties).find(
          (property) => property.name === TILED_NPC_PROPERTY.MOVEMENT_PATTERN
        )?.value || 'IDLE';

      /** @type {number} */
      const npcId = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (npcObject.properties).find(
        (property) => property.name === TILED_NPC_PROPERTY.ID
      )?.value;
      const npcDetails = DataUtils.getNpcData(this, npcId);

      // In Tiled, the x value is how far the object starts from the left, and the y is the bottom of tiled object that is being added
      const npc = new NPC({
        scene: this,
        position: { x: npcObject.x, y: npcObject.y - TILE_SIZE },
        direction: DIRECTION.DOWN,
        frame: npcDetails.frame,
        npcPath,
        movementPattern: npcMovement,
        events: npcDetails.events,
        animationKeyPrefix: npcDetails.animationKeyPrefix,
        id: npcId,
      });
      this.#npcs.push(npc);
    });

    // story characters that are not in the Tiled map
    EXTRA_NPCS.filter((n) => n.area === this.#sceneData.area).forEach((n) => {
      const npcDetails = DataUtils.getNpcData(this, n.id);
      if (!npcDetails) return;
      const position = { x: n.x * TILE_SIZE, y: n.y * TILE_SIZE };
      this.#npcs.push(
        new NPC({
          scene: this,
          position,
          direction: DIRECTION.DOWN,
          frame: npcDetails.frame,
          npcPath: { 0: position },
          movementPattern: NPC_MOVEMENT_PATTERN.IDLE,
          events: npcDetails.events,
          animationKeyPrefix: npcDetails.animationKeyPrefix,
          id: n.id,
        })
      );
    });
  }

  /**
   * @returns {void}
   */
  #handlePlayerDirectionUpdate() {
    // update player direction on global data store
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, this.#player.direction);
  }

  /**
   * @returns {void}
   */
  #healPlayerParty() {
    // heal all monsters in party
    /** @type {import('../types/typedef.js').Monster[]} */
    const monsters = dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY);
    monsters.forEach((monster) => {
      monster.currentHp = monster.maxHp;
    });
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY, monsters);
  }

  /**
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {void}
   */
  #createItems(map) {
    const itemObjectLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.ITEM);
    if (!itemObjectLayer) {
      return;
    }
    const items = itemObjectLayer.objects;
    const validItems = items.filter((item) => {
      return item.x !== undefined && item.y !== undefined;
    });

    /** @type {number[]} */
    const itemsPickedUp = dataManager.store.get(DATA_MANAGER_STORE_KEYS.ITEMS_PICKED_UP) || [];

    for (const tiledItem of validItems) {
      /** @type {number} */
      const itemId = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (tiledItem.properties).find(
        (property) => property.name === TILED_ITEM_PROPERTY.ITEM_ID
      )?.value;

      /** @type {number} */
      const id = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (tiledItem.properties).find(
        (property) => property.name === TILED_ITEM_PROPERTY.ID
      )?.value;

      if (itemsPickedUp.includes(id)) {
        continue;
      }

      // create object
      const item = new Item({
        scene: this,
        position: {
          x: tiledItem.x,
          y: tiledItem.y - TILE_SIZE,
        },
        itemId,
        id,
      });
      this.#items.push(item);
    }
  }

  /**
   * @param {string} entranceName
   * @param {string} entranceId
   * @param {boolean} isBuildingEntrance
   * @returns {void}
   */
  #handleEntranceEnteredCallback(entranceName, entranceId, isBuildingEntrance) {
    this._controls.lockInput = true;

    // update player position to match the new entrance data
    // create tilemap using the provided entrance data
    const map = this.#getLevelTileMap(`${entranceName.toUpperCase()}_LEVEL`);
    // get the position of the entrance object using the entrance id
    const entranceObjectLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.SCENE_TRANSITIONS);
    const entranceObject = entranceObjectLayer.objects.find((object) => {
      const tempEntranceName = object.properties.find((property) => property.name === 'connects_to').value;
      const tempEntranceId = object.properties.find((property) => property.name === 'entrance_id').value;

      return tempEntranceName === this.#sceneData.area && tempEntranceId === entranceId;
    });
    // create position player will be placed at and update based on players facing direction
    let x = entranceObject.x;
    let y = entranceObject.y - TILE_SIZE;
    if (this.#player.direction === DIRECTION.UP) {
      y -= TILE_SIZE;
    }
    if (this.#player.direction === DIRECTION.DOWN) {
      y += TILE_SIZE;
    }

    this.cameras.main.fadeOut(1000, 0, 0, 0, (camera, progress) => {
      if (progress === 1) {
        dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
          x,
          y,
        });

        /** @type {WorldSceneData} */
        const dataToPass = {
          area: entranceName,
          isInterior: isBuildingEntrance,
        };
        this.scene.start(SCENE_KEYS.WORLD_SCENE, dataToPass);
      }
    });
  }

  /**
   * @returns {void}
   */
  /**
   * @param {Phaser.Scenes.Systems} sys
   * @param {any} [data]
   * @returns {void}
   */
  handleSceneResume(sys, data) {
    super.handleSceneResume(sys, data);
    if (data && data.wasItemUsed && data.item) {
      this._controls.lockInput = true;
      this.time.delayedCall(250, () => {
        this._controls.lockInput = false;
        this.#useWorldItem(data.item);
      });
      return;
    }
    if (data && data.secretDone) {
      this._controls.lockInput = true;
      this.cameras.main.fadeIn(500);
      this.time.delayedCall(300, () => {
        this._controls.lockInput = false;
      });
      return;
    }
    if (data && (data.quizAnswered || data.repeatDone || data.carnivalDone || data.shopDone) && this.#isInFrenchChat) {
      this.#isInFrenchChat = false;
      this.#isProcessingNpcEvent = false;
      const chat = this.#currentChatEvent;
      this.#currentChatEvent = undefined;
      if (data.quizAnswered && chat && chat.data) {
        if (data.correct && chat.data.flag) {
          dataManager.addFlag(chat.data.flag);
          if (chat.data.ending) this.#storyEndPending = true;
        }
        if (!data.correct && (chat.data.flag || chat.data.mustBeRight)) {
          // story chats need the right answer: stop the conversation, the child can simply try again
          this.#lastNpcEventHandledIndex = this.#npcPlayerIsInteractingWith.events.length - 1;
          this._controls.lockInput = true;
          this.time.delayedCall(250, () => {
            this._controls.lockInput = false;
            this.#dialogUi.showDialogModal([
              `${chat.data.name}: "Hmm, probeer nog eens!"`,
              `(Praat nog eens met ${chat.data.name} om het opnieuw te proberen.)`,
            ]);
          });
          return;
        }
      }
      // small pause so the key press that closed the chat does not open a new one
      this._controls.lockInput = true;
      this.time.delayedCall(250, () => {
        this._controls.lockInput = false;
        this.#handleNpcInteraction();
      });
    }
  }

  #handleNpcInteraction() {
    if (this.#isProcessingNpcEvent) {
      return;
    }

    // check to see if the npc has any events associated with them
    const isMoreEventsToProcess = this.#npcPlayerIsInteractingWith.events.length - 1 !== this.#lastNpcEventHandledIndex;

    if (!isMoreEventsToProcess) {
      this.#npcPlayerIsInteractingWith.isTalkingToPlayer = false;
      this.#npcPlayerIsInteractingWith = undefined;
      this.#lastNpcEventHandledIndex = -1;
      this.#isProcessingNpcEvent = false;
      if (this.#storyEndPending) {
        this.#storyEndPending = false;
        this.#playStoryEnding();
      }
      return;
    }

    // get the next event from the queue and process for this npc
    if (this.#lastNpcEventHandledIndex === -1) {
      this.#npcFlagsAtStart = dataManager.getFlags();
    }
    this.#lastNpcEventHandledIndex += 1;
    const eventToHandle = this.#npcPlayerIsInteractingWith.events[this.#lastNpcEventHandledIndex];
    const eventType = eventToHandle.type;

    // check to see if this event should be handled based on story flags
    const eventRequirementsMet = this.#requirementsMet(
      eventToHandle.requires,
      this.#npcPlayerIsInteractingWith.id,
      this.#npcFlagsAtStart
    );
    if (!eventRequirementsMet) {
      // jump to next event
      this.#handleNpcInteraction();
      return;
    }

    switch (eventType) {
      case NPC_EVENT_TYPE.MESSAGE:
        this.#dialogUi.showDialogModal(eventToHandle.data.messages);
        break;
      case NPC_EVENT_TYPE.HEAL:
        this.#isProcessingNpcEvent = true;
        this.#healPlayerParty();
        this.#isProcessingNpcEvent = false;
        this.#handleNpcInteraction();
        break;
      case NPC_EVENT_TYPE.SCENE_FADE_IN_AND_OUT:
        this.#isProcessingNpcEvent = true;
        // lock input, and wait for scene to fade in and out
        this.cameras.main.fadeOut(eventToHandle.data.fadeOutDuration, 0, 0, 0, (fadeOutCamera, fadeOutProgress) => {
          if (fadeOutProgress !== 1) {
            return;
          }
          this.time.delayedCall(eventToHandle.data.waitDuration, () => {
            this.cameras.main.fadeIn(eventToHandle.data.fadeInDuration, 0, 0, 0, (fadeInCamera, fadeInProgress) => {
              if (fadeInProgress !== 1) {
                return;
              }
              this.#isProcessingNpcEvent = false;
              this.#handleNpcInteraction();
            });
          });
        });
        // TODO:future play audio cue
        break;
      case NPC_EVENT_TYPE.BATTLE:
        this.#isProcessingNpcEvent = true;

        // Get monster data from the event
        const npcMonsters = eventToHandle.data.monsters.map((monsterId) => {
          return DataUtils.getMonsterById(this, monsterId);
        });
        /** @type {import('./battle-scene.js').BattleSceneData} */
        const dataToPass = {
          enemyMonsters: npcMonsters,
          playerMonsters: dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY),
          isTrainerBattle: true,
          npc: {
            id: this.#npcPlayerIsInteractingWith.id,
            assetKey: eventToHandle.data.assetKey,
            name: eventToHandle.data.trainerName,
            trainerLostMessages: eventToHandle.data.trainerLostMessages,
          },
        };
        this.#startBattleScene(dataToPass);
        break;
      case NPC_EVENT_TYPE.CARNIVAL:
        this.#isProcessingNpcEvent = true;
        this.#isInFrenchChat = true;
        this._controls.lockInput = true;
        this.scene.launch(SCENE_KEYS.CARNIVAL_SCENE, { previousSceneName: SCENE_KEYS.WORLD_SCENE });
        this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        break;
      case NPC_EVENT_TYPE.REPEAT_GAME:
        this.#isProcessingNpcEvent = true;
        this.#isInFrenchChat = true;
        this._controls.lockInput = true;
        this.scene.launch(SCENE_KEYS.REPEAT_SCENE, {
          previousSceneName: SCENE_KEYS.WORLD_SCENE,
          resumePrevious: true,
          speaker: eventToHandle.data?.name,
        });
        this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        break;
      case NPC_EVENT_TYPE.FRENCH_CHAT:
        this.#isProcessingNpcEvent = true;
        this.#isInFrenchChat = true;
        this._controls.lockInput = true;
        this.#currentChatEvent = eventToHandle;
        this.scene.launch(SCENE_KEYS.QUIZ_SCENE, {
          previousSceneName: SCENE_KEYS.WORLD_SCENE,
          question: makeChatQuestion(eventToHandle.data?.name || 'De buur', {
            dialogueId: eventToHandle.data?.dialogueId,
            contact: eventToHandle.data?.contact,
          }),
        });
        this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        break;
      case NPC_EVENT_TYPE.SHOP:
        this.#isProcessingNpcEvent = true;
        this.#isInFrenchChat = true;
        this._controls.lockInput = true;
        this.scene.launch(SCENE_KEYS.SHOP_SCENE, { previousSceneName: SCENE_KEYS.WORLD_SCENE });
        this.scene.pause(SCENE_KEYS.WORLD_SCENE);
        break;
      case NPC_EVENT_TYPE.STORY_END:
        this.#storyEndPending = true;
        this.#handleNpcInteraction();
        break;
      default:
        exhaustiveGuard(eventType);
    }
  }

  /**
   * Creates the Phaser Zone game objects based on the `Events` tilemap data from the Tiled Map.
   * These game objects are used for creating the various in game events and cut scenes for the game.
   * The Zone game objects allow for us to check for overlaps between the player and the area that
   * is defined in the map data.
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {void}
   */
  #createEventEncounterZones(map) {
    const eventObjectLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.EVENTS);
    if (!eventObjectLayer) {
      return;
    }
    const events = eventObjectLayer.objects;
    const validEvents = events.filter((event) => {
      return event.x !== undefined && event.y !== undefined;
    });

    /** @type {string[]} */
    const viewedEvents = dataManager.store.get(DATA_MANAGER_STORE_KEYS.VIEWED_EVENTS);

    for (const tiledEvent of validEvents) {
      /** @type {string} */
      const eventId = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (tiledEvent.properties).find(
        (property) => property.name === TILED_EVENT_PROPERTY.ID
      )?.value;

      if (viewedEvents.includes(eventId)) {
        continue;
      }

      const eventZone = this.add
        .zone(tiledEvent.x, tiledEvent.y - TILE_SIZE * 2, tiledEvent.width, tiledEvent.height)
        .setOrigin(0)
        .setName(eventId);
      this.#eventZones[eventId] = eventZone;

      if (ENABLE_ZONE_DEBUGGING) {
        const debugZoneRectangle = this.add
          .rectangle(eventZone.x, eventZone.y, eventZone.width, eventZone.height, 0xff0000, 0.5)
          .setOrigin(0);
        this.#debugEventZoneObjects[eventId] = debugZoneRectangle;
      }
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async #startCutScene() {
    this.#isProcessingCutSceneEvent = true;
    await /** @type {CutsceneScene} */ (this.scene.get(SCENE_KEYS.CUTSCENE_SCENE)).startCutScene();
    await sleep(500, this);
    this.#isProcessingCutSceneEvent = false;
    this.#handleCutSceneInteraction();
  }

  /**
   * @returns {Promise<void>}
   */
  async #handleCutSceneInteraction() {
    if (this.#isProcessingCutSceneEvent) {
      return;
    }
    if (this.#currentCutSceneId === undefined) {
      return;
    }

    const eventsToProcess = DataUtils.getEventData(this, this.#currentCutSceneId);

    // check to see if the cut scene has any more events to be processed
    const isMoreEventsToProcess = eventsToProcess.events.length - 1 !== this.#lastCutSceneEventHandledIndex;
    if (!isMoreEventsToProcess) {
      // once we are done processing the events for the cutscene, we need to do the following:
      //   1. update our data manager to show we watched the event
      //   2. cleanup zone game object used for the event and overlap detection
      //   3. reset our current cut scene property
      //   4. remove the cut scene bars from the scene
      this.#lastCutSceneEventHandledIndex = -1;
      this.#isProcessingCutSceneEvent = false;
      dataManager.viewedEvent(this.#currentCutSceneId);
      this.#eventZones[this.#currentCutSceneId].destroy();
      delete this.#eventZones[this.#currentCutSceneId];
      if (ENABLE_ZONE_DEBUGGING) {
        this.#gfx.clear();
        this.#debugEventZoneObjects[this.#currentCutSceneId].destroy();
        delete this.#debugEventZoneObjects[this.#currentCutSceneId];
      }
      this.#currentCutSceneId = undefined;

      await /** @type {CutsceneScene} */ (this.scene.get(SCENE_KEYS.CUTSCENE_SCENE)).endCutScene();
      await sleep(500, this);
      return;
    }

    // get the next event from the queue and process for this npc
    this.#lastCutSceneEventHandledIndex += 1;
    const eventToHandle = eventsToProcess.events[this.#lastCutSceneEventHandledIndex];
    const eventType = eventToHandle.type;

    this.#isProcessingCutSceneEvent = true;
    switch (eventType) {
      case GAME_EVENT_TYPE.ADD_NPC:
        this.#createNpcForCutScene(eventToHandle);
        break;
      case GAME_EVENT_TYPE.MOVE_TO_PLAYER:
        this.#moveNpcToPlayer(eventToHandle);
        break;
      case GAME_EVENT_TYPE.RETRACE_PATH:
        this.#haveNpcRetracePath(eventToHandle);
        break;
      case GAME_EVENT_TYPE.REMOVE_NPC:
        this.#removeNpcForCutScene(eventToHandle);
        break;
      case GAME_EVENT_TYPE.TALK_TO_PLAYER:
        this.#haveNpcTalkToPlayer(eventToHandle);
        break;
      case GAME_EVENT_TYPE.GIVE_MONSTER:
        this.#addMonsterFromNpc(eventToHandle);
        break;
      case GAME_EVENT_TYPE.ADD_FLAG:
        this.#addGameFlag(eventToHandle);
        break;
      case GAME_EVENT_TYPE.REMOVE_FLAG:
        this.#removeGameFlag(eventToHandle);
        break;
      default:
        exhaustiveGuard(eventType);
    }
  }

  /**
   * @param {import('../types/typedef.js').GameEventAddNpc} gameEvent
   * @returns {void}
   */
  #createNpcForCutScene(gameEvent) {
    const npc = new NPC({
      scene: this,
      position: { x: gameEvent.data.x * TILE_SIZE, y: gameEvent.data.y * TILE_SIZE },
      direction: gameEvent.data.direction,
      frame: gameEvent.data.frame,
      npcPath: {
        0: { x: gameEvent.data.x * TILE_SIZE, y: gameEvent.data.y * TILE_SIZE },
      },
      movementPattern: NPC_MOVEMENT_PATTERN.IDLE,
      events: [],
      animationKeyPrefix: gameEvent.data.animationKeyPrefix,
      id: gameEvent.data.id,
    });
    this.#npcs.push(npc);
    npc.addCharacterToCheckForCollisionsWith(this.#player);

    this.#isProcessingCutSceneEvent = false;
    this.#handleCutSceneInteraction();
  }

  /**
   * @param {import('../types/typedef.js').GameEventMoveToPlayer} gameEvent
   * @returns {void}
   */
  #moveNpcToPlayer(gameEvent) {
    const targetNpc = this.#npcs.find((npc) => npc.id === gameEvent.data.id);
    if (targetNpc === undefined) {
      this.#isProcessingCutSceneEvent = false;
      this.#handleCutSceneInteraction();
      return;
    }

    // determine direction to move based on distance from player
    const targetPath = getTargetPathToGameObject(targetNpc.sprite, this.#player.sprite);
    const pathToFollow = targetPath.pathToFollow.splice(0, targetPath.pathToFollow.length - 1);

    // if npc is already next to player, just update directions
    if (pathToFollow.length === 0) {
      this.#player.moveCharacter(getTargetDirectionFromGameObjectPosition(this.#player.sprite, targetNpc.sprite));
      targetNpc.facePlayer(this.#player.direction);
      this.#isProcessingCutSceneEvent = false;
      this.#handleCutSceneInteraction();
      return;
    }

    // move npc according to the path
    /** @type {import('../world/characters/npc.js').NPCPath} */
    const npcPath = {
      0: { x: targetNpc.sprite.x, y: targetNpc.sprite.y },
    };
    pathToFollow.forEach((coordinate, index) => {
      npcPath[index + 1] = coordinate;
    });

    targetNpc.finishedMovementCallback = () => {
      if (
        pathToFollow[pathToFollow.length - 1].x === targetNpc.sprite.x &&
        pathToFollow[pathToFollow.length - 1].y === targetNpc.sprite.y
      ) {
        this.#player.moveCharacter(getTargetDirectionFromGameObjectPosition(this.#player.sprite, targetNpc.sprite));
        targetNpc.facePlayer(this.#player.direction);
        this.time.delayedCall(500, () => {
          this.#isProcessingCutSceneEvent = false;
          this.#handleCutSceneInteraction();
        });
      }
    };
    targetNpc.npcMovementPattern = NPC_MOVEMENT_PATTERN.SET_PATH;
    targetNpc.npcPath = npcPath;
    targetNpc.resetMovementTime();
  }

  /**
   * @param {import('../types/typedef.js').GameEventRetracePath} gameEvent
   * @returns {void}
   */
  #haveNpcRetracePath(gameEvent) {
    const targetNpc = this.#npcs.find((npc) => npc.id === gameEvent.data.id);
    if (targetNpc === undefined) {
      this.#isProcessingCutSceneEvent = false;
      this.#handleCutSceneInteraction();
      return;
    }

    // have npc retrace their steps by reversing the existing npc path
    /** @type {import('../world/characters/npc.js').NPCPath} */
    const updatedPath = {};
    const pathKeys = Object.keys(targetNpc.npcPath).reverse();

    pathKeys.forEach((pathKey, index) => {
      updatedPath[index] = targetNpc.npcPath[pathKey];
    });

    // if npc is already next to player, there will be only 1 position in the npc path
    // when this happens, we need to just updates the npcs direction
    if (pathKeys.length === 1) {
      targetNpc.facePlayer(gameEvent.data.direction);
      this.time.delayedCall(500, () => {
        this.#isProcessingCutSceneEvent = false;
        this.#handleCutSceneInteraction();
      });
      return;
    }

    targetNpc.finishedMovementCallback = () => {
      if (
        updatedPath[pathKeys.length - 1].x === targetNpc.sprite.x &&
        updatedPath[pathKeys.length - 1].y === targetNpc.sprite.y
      ) {
        this.time.delayedCall(500, () => {
          this.#isProcessingCutSceneEvent = false;
          this.#handleCutSceneInteraction();
        });
      }
    };

    targetNpc.npcMovementPattern = NPC_MOVEMENT_PATTERN.SET_PATH;
    targetNpc.npcPath = updatedPath;
    targetNpc.resetMovementTime();
  }

  /**
   * @param {import('../types/typedef.js').GameEventRemoveNpc} gameEvent
   * @returns {void}
   */
  #removeNpcForCutScene(gameEvent) {
    // once we are done with an npc for a cutscene, we can remove that npc
    // from our npc array and then start the cleanup process of destroying the game object
    const npcToRemoveIndex = this.#npcs.findIndex((npc) => npc.id === gameEvent.data.id);
    /** @type {NPC | undefined} */
    let npcToRemove;
    if (npcToRemoveIndex !== -1) {
      npcToRemove = this.#npcs.splice(npcToRemoveIndex)[0];
    }
    this.time.delayedCall(100, () => {
      if (npcToRemove !== undefined) {
        npcToRemove.sprite.destroy();
      }
      this.#isProcessingCutSceneEvent = false;
      this.#handleCutSceneInteraction();
    });
  }

  /**
   * @param {import('../types/typedef.js').GameEventTalkToPlayer} gameEvent
   * @returns {void}
   */
  #haveNpcTalkToPlayer(gameEvent) {
    const targetNpc = this.#npcs.find((npc) => npc.id === gameEvent.data.id);
    if (targetNpc === undefined) {
      this.#isProcessingCutSceneEvent = false;
      this.#handleCutSceneInteraction();
      return;
    }

    targetNpc.isTalkingToPlayer = true;
    this.#npcPlayerIsInteractingWith = targetNpc;
    this.#dialogUi.showDialogModal(gameEvent.data.messages);
  }

  /**
   * @param {import('../types/typedef.js').GameEventGiveMonster} gameEvent
   * @returns {void}
   */
  #addMonsterFromNpc(gameEvent) {
    // TODO: add check to see if party is full and do something with 7th monster that is being added
    /** @type {import('../types/typedef.js').Monster[]} */
    const monstersInParty = dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY);
    const newMonster = DataUtils.getMonsterById(this, gameEvent.data.id);
    monstersInParty.push(newMonster);
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY, monstersInParty);
    this.#isProcessingCutSceneEvent = false;
    this.#handleCutSceneInteraction();
  }

  /**
   * @param {import('../types/typedef.js').GameEventAddFlag} gameEvent
   * @returns {void}
   */
  #addGameFlag(gameEvent) {
    dataManager.addFlag(gameEvent.data.flag);
    if (CHAPTERS.some((c) => c.flag === gameEvent.data.flag)) {
      startChapterStars();
    }
    this.#isProcessingCutSceneEvent = false;
    this.#handleCutSceneInteraction();
  }

  /**
   * @param {import('../types/typedef.js').GameEventRemoveFlag} gameEvent
   * @returns {void}
   */
  #removeGameFlag(gameEvent) {
    dataManager.removeFlag(gameEvent.data.flag);
    this.#isProcessingCutSceneEvent = false;
    this.#handleCutSceneInteraction();
  }

  /**
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {void}
   */
  #createEncounterAreas(map) {
    const encounterLayers = map.getTileLayerNames().filter((layerName) => layerName.includes('Encounter'));
    if (encounterLayers.length > 0) {
      const encounterTiles = map.addTilesetImage('encounter', WORLD_ASSET_KEYS.WORLD_ENCOUNTER_ZONE);
      if (!encounterTiles) {
        console.log(
          `[${WorldScene.name}:createEncounterAreas] encountered error while creating encounter tiles from tiled`
        );
        return;
      }

      encounterLayers.forEach((layerName) => {
        const layer = map.createLayer(layerName, encounterTiles, 0, 0);
        layer.setAlpha(TILED_COLLISION_LAYER_ALPHA).setDepth(2);
        this.#encounterLayers.push(layer);
      });
    }
  }

  /**
   * This method is invoked any time the player is about to start moving between grid spaces.
   * Before the player moves, check to see they will be moving into an encounter zone, and store the result.
   * We will use this result after the player finishes moving to see if there should be an encounter.
   * @param {import('../types/typedef.js').Coordinate} position
   * @returns {void}
   */
  #handlePlayerMovementStarted(position) {
    this.#encounterZonePlayerIsEntering = undefined;

    /** @type {Phaser.Tilemaps.Tile} */
    let encounterTile;
    this.#encounterLayers.some((encounterLayer) => {
      encounterTile = encounterLayer.getTileAtWorldXY(position.x, position.y, true);
      if (encounterTile === null || encounterTile.index === -1) {
        return false;
      }
      this.#encounterZonePlayerIsEntering = encounterLayer;
      return true;
    });

    if (this.#encounterZonePlayerIsEntering === undefined) {
      if (this.#player.direction === DIRECTION.DOWN) {
        // if player is moving in the down direction, hide current tile so player does not move under it
        this.#hideSpecialEncounterTiles();
      }
      return;
    }

    console.log(`[${WorldScene.name}:handlePlayerMovementStarted] player is moving to an encounter zone`);
    // check the tile type for the encounter layer the player is moving through and play related effects
    this.#handleEncounterTileTypeEffects(this.#encounterZonePlayerIsEntering, encounterTile, this.#player.direction);
  }

  /**
   * Plays the associated special effects when player is about to move through a particular tile type.
   * Example, when moving through the grass, we play a sound effect and show an additional
   * game object to make it look like the player is moving through the grass.
   *
   * @param {Phaser.Tilemaps.TilemapLayer} encounterLayer
   * @param {Phaser.Tilemaps.Tile} encounterTile
   * @param {import('../common/direction.js').Direction} playerDirection
   * @returns {void}
   */
  #handleEncounterTileTypeEffects(encounterLayer, encounterTile, playerDirection) {
    // check the tile type for the encounter layer the player is moving through and play related effects
    /** @type {import('../types/typedef.js').EncounterTileType} */
    const encounterTileType = /** @type {import('../types/typedef.js').TiledObjectProperty[]} */ (
      encounterLayer.layer.properties
    ).find((property) => property.name === TILED_ENCOUNTER_PROPERTY.TILE_TYPE).value;

    switch (encounterTileType) {
      case ENCOUNTER_TILE_TYPE.GRASS:
        // create grass sprite for when player moves through grass
        /** @type {Phaser.GameObjects.Image} */
        const object = this.#specialEncounterTileImageGameObjectGroup
          .getFirstDead(true, encounterTile.pixelX, encounterTile.pixelY, WORLD_ASSET_KEYS.GRASS, 1, true)
          .setOrigin(0)
          .setVisible(true)
          .setActive(true);
        // if player is moving up or down, don't show grass so they don't appear to be moving under it, will show after they reach the destination
        if (playerDirection === DIRECTION.DOWN || playerDirection === DIRECTION.UP) {
          object.visible = false;
        }
        playSoundFx(this, AUDIO_ASSET_KEYS.GRASS);
        break;
      case ENCOUNTER_TILE_TYPE.NONE:
        break;
      default:
        exhaustiveGuard(encounterTileType);
    }

    if (playerDirection !== DIRECTION.DOWN) {
      return;
    }

    // if player is moving in the down direction, hide current tile so player does not move under it
    this.#hideSpecialEncounterTiles();
  }

  /**
   * @returns {void}
   */
  #hideSpecialEncounterTiles() {
    this.#specialEncounterTileImageGameObjectGroup
      .getChildren()
      .some((/** @type {Phaser.GameObjects.Image} */ child) => {
        if (!child.active) {
          return false;
        }
        if (child.x === this.#player.sprite.x && child.y === this.#player.sprite.y) {
          child.active = false;
          child.visible = false;
          return true;
        }
        return false;
      });
  }

  /**
   * @param {string} key
   * @returns {Phaser.Tilemaps.Tilemap}
   */
  #getLevelTileMap(key) {
    if (this.#tiledLevelMaps[key]) {
      return this.#tiledLevelMaps[key];
    }
    this.#tiledLevelMaps[key] = this.make.tilemap({ key });
    return this.#tiledLevelMaps[key];
  }

  /**
   * @param {string[]} requires flags; "!FLAG" means the flag must be missing
   * @param {number} [npcId]
   * @param {Set<string>} [flagsToUse] defaults to the flags of now
   * @returns {boolean}
   */
  #requirementsMet(requires, npcId, flagsToUse) {
    const flags = flagsToUse || dataManager.getFlags();
    return (requires || []).every((flag) => {
      if (flag === BATTLE_FLAG.TRAINER_DEFEATED) {
        return dataManager.getDefeatedNpcs().has(npcId);
      }
      if (flag === BATTLE_FLAG.TRAINER_NOT_DEFEATED) {
        return !dataManager.getDefeatedNpcs().has(npcId);
      }
      if (flag.startsWith('!')) {
        return !flags.has(flag.slice(1));
      }
      return flags.has(flag);
    });
  }

  /**
   * Saves from before the story get the first chapter, so they can continue.
   * @returns {void}
   */
  #migrateOldSave() {
    const flags = dataManager.getFlags();
    const viewed = dataManager.store.get(DATA_MANAGER_STORE_KEYS.VIEWED_EVENTS) || [];
    if (!flags.has(STORY_FLAGS.CH1) && (viewed.includes(1) || flags.has('LOOKING_FOR_PROFESSOR'))) {
      dataManager.addFlag(STORY_FLAGS.CH1);
      startChapterStars();
    }
    if (flags.has('LOOKING_FOR_PROFESSOR')) {
      dataManager.removeFlag('LOOKING_FOR_PROFESSOR');
    }
  }

  /**
   * Updates the task list, gives flags for beaten woordjesdieven and opens the next chapter when it is time.
   * @returns {void}
   */
  #checkStory() {
    const defeated = dataManager.getDefeatedNpcs();
    Object.entries(THIEF_FLAGS).forEach(([id, flag]) => {
      if (defeated.has(Number(id)) && !dataManager.getFlags().has(flag)) dataManager.addFlag(flag);
    });
    const flags = dataManager.getFlags();
    // questions follow the story: chapter 1 only asks Contact 1, and so on
    const chapter = currentChapterIndex(flags);
    setStoryMaxContact(chapter < 0 ? 1 : chapter + 1);
    const chapterStars = getChapterStars();
    const hud = /** @type {any} */ (this.scene.get(SCENE_KEYS.STORY_HUD_SCENE));
    if (hud && hud.setText) hud.setText(questText(flags, chapterStars));

    if (this.#isPlayerInputLocked() || this.#player.isMoving || this.#npcPlayerIsInteractingWith || this.#isProcessingCutSceneEvent) {
      return;
    }
    // 500 stars ever earned (spending does not count against it): the key to the school
    if (getStarsEarned() >= 500 && !this.#hasItem(13)) {
      dataManager.addItem(DataUtils.getItem(this, 13), 1);
      dataManager.saveData();
      this.#dialogUi.showDialogModal([
        '⭐ WAUW! Je hebt al 500 sterren verdiend! ⭐',
        'Je krijgt de sleutel tot de school! Hij zit in je tas.',
        'Er staat een geheim huisje in het dorp... Zou hij daar passen?',
      ]);
      return;
    }
    const done = chapterTasksDone(flags);
    if (done >= 0 && chapterStars < STARS_PER_CHAPTER && WorldScene.starTipShownForChapter !== done) {
      WorldScene.starTipShownForChapter = done;
      this.#dialogUi.showDialogModal([
        'Super, alle taken van dit hoofdstuk zijn klaar!',
        `Verdien nu nog ${STARS_PER_CHAPTER - chapterStars} sterren om verder te gaan.`,
        'Druk op ENTER (of MENU) en kies KERMIS. Of speel Zeg me na!',
      ]);
      return;
    }
    const next = nextChapterToOpen(flags, chapterStars);
    if (!next) return;
    dataManager.addFlag(next.flag);
    startChapterStars();
    dataManager.saveData();
    if (hud && hud.setText) hud.setText(questText(dataManager.getFlags(), 0));
    this.#dialogUi.showDialogModal(['🎉 Hoofdstuk klaar! Bravo!', ...next.intro]);
  }

  /**
   * @param {import('../common/direction.js').Direction} direction
   * @returns {boolean} true when the story does not allow this step yet (shows a message)
   */
  #isBlockedByStory(direction) {
    const x = Math.round(this.#player.sprite.x / TILE_SIZE);
    const y = Math.round(this.#player.sprite.y / TILE_SIZE);
    let ty = y;
    if (direction === DIRECTION.UP) ty -= 1;
    if (direction === DIRECTION.DOWN) ty += 1;
    const flags = dataManager.getFlags();
    const gate = STORY_GATES.find(
      (g) => g.area === this.#sceneData.area && y >= g.row && ty < g.row && !flags.has(g.flag)
    );
    if (!gate) return false;
    this.#dialogUi.showDialogModal(gate.message);
    return true;
  }

  /** @returns {void} */
  #createSecretHouse() {
    if (this.#sceneData.area !== SECRET_HOUSE.area || !this.#collisionLayer) return;
    const { x, y, w, h, doorX, doorY } = SECRET_HOUSE;
    // block the tiles of the house
    const blockTile = this.#collisionLayer.layer.data.flat().find((t) => t.index > 0);
    if (blockTile) {
      for (let tx = x; tx < x + w; tx += 1) {
        for (let ty = y; ty < y + h; ty += 1) {
          const tile = this.#collisionLayer.getTileAt(tx, ty, true);
          if (tile) tile.index = blockTile.index;
        }
      }
    }
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const g = this.add.graphics().setDepth(1);
    // walls
    g.fillStyle(0xf3d9a4, 1).fillRect(px + 6, py + 20, w * TILE_SIZE - 12, h * TILE_SIZE - 20);
    g.lineStyle(4, 0x6b4f2a, 1).strokeRect(px + 6, py + 20, w * TILE_SIZE - 12, h * TILE_SIZE - 20);
    // roof
    g.fillStyle(0xc0392b, 1).fillTriangle(px - 10, py + 26, px + w * TILE_SIZE + 10, py + 26, px + (w * TILE_SIZE) / 2, py - 60);
    g.lineStyle(4, 0x7b241c, 1).strokeTriangle(px - 10, py + 26, px + w * TILE_SIZE + 10, py + 26, px + (w * TILE_SIZE) / 2, py - 60);
    // door
    const dx = doorX * TILE_SIZE;
    const dy = doorY * TILE_SIZE;
    g.fillStyle(0x8b5a2b, 1).fillRect(dx + 12, dy - 14, TILE_SIZE - 24, TILE_SIZE + 14);
    g.fillStyle(0xffd700, 1).fillCircle(dx + TILE_SIZE - 20, dy + 26, 5);
    // windows
    g.fillStyle(0x9fd3f2, 1).fillRect(px + 22, py + 52, 36, 30).fillRect(px + w * TILE_SIZE - 58, py + 52, 36, 30);
    this.add
      .text(px + (w * TILE_SIZE) / 2, py - 14, '🔒 ?', { fontFamily: 'Verdana, Arial, sans-serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(1);
  }

  /**
   * @param {number} itemId
   * @returns {boolean}
   */
  #hasItem(itemId) {
    const inv = dataManager.store.get(DATA_MANAGER_STORE_KEYS.INVENTORY) || [];
    return inv.some((i) => i.item.id === itemId && i.quantity > 0);
  }

  /** @returns {void} */
  #tryOpenSecretHouse() {
    if (!this.#hasItem(13)) {
      this.#dialogUi.showDialogModal([
        'Een geheim huisje! De deur zit op slot.',
        'Op het slot staat: "Alleen voor wie de sleutel tot de school heeft."',
      ]);
      return;
    }
    this._controls.lockInput = true;
    this.cameras.main.fadeOut(500, 0, 0, 0, (_c, progress) => {
      if (progress !== 1) return;
      this.scene.launch(SCENE_KEYS.SECRET_ROOM_SCENE, { previousSceneName: SCENE_KEYS.WORLD_SCENE });
      this.scene.pause(SCENE_KEYS.WORLD_SCENE);
    });
  }

  /**
   * Items from the bag that do something in the world.
   * @param {import('../types/typedef.js').Item} item
   * @returns {void}
   */
  #useWorldItem(item) {
    if (this.#menu.isVisible) this.#menu.hide();
    switch (item.effect) {
      case ITEM_EFFECT.REPEL_100:
        itemBoosts.repelSteps = 100;
        this.#dialogUi.showDialogModal(['Fuuuuut! 🎵 De wilde woordjesdieven schrikken.', '100 stappen lang laten ze je met rust.']);
        break;
      case ITEM_EFFECT.COMPASS:
        this.#dialogUi.showDialogModal(['🧭 Het kompas wijst de weg:', nextGoalText(dataManager.getFlags(), getChapterStars())]);
        break;
      case ITEM_EFFECT.SCHOOL_KEY:
        this.#dialogUi.showDialogModal([
          '🔑 De sleutel tot de school! Hij glimt helemaal.',
          'Er staat een geheim huisje in het dorp, rechts van de huizen. Zou hij daar passen...?',
        ]);
        break;
      default:
        break;
    }
  }

  /** @returns {void} */
  #playStoryEnding() {
    const cam = this.cameras.main;
    const colors = [0xe94b5a, 0x4da3ff, 0xffb300, 0x8fdc8f, 0xc77dff];
    for (let i = 0; i < 80; i += 1) {
      const c = this.add
        .rectangle(cam.worldView.x + Phaser.Math.Between(0, cam.worldView.width), cam.worldView.y - Phaser.Math.Between(10, 400), 12, 18, colors[i % colors.length])
        .setDepth(10);
      this.tweens.add({
        targets: c,
        y: cam.worldView.bottom + 40,
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(2500, 4500),
        delay: Phaser.Math.Between(0, 1500),
        onComplete: () => c.destroy(),
      });
    }
    playSoundFx(this, AUDIO_ASSET_KEYS.FLEE);
    dataManager.saveData();
    this.#dialogUi.showDialogModal([...ENDING_MESSAGES]);
  }

  /**
   * Transitions to the BattleScene and passes along the provided data.
   * @param {import('./battle-scene.js').BattleSceneData} battleSceneData
   */
  #startBattleScene(battleSceneData) {
    this.cameras.main.fadeOut(2000);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.BATTLE_SCENE, battleSceneData);
    });
  }
}
