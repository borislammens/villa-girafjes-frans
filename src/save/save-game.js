import { DATA_MANAGER_STORE_KEYS, dataManager } from '../utils/data-manager.js';
import { DataUtils } from '../utils/data-utils.js';
import { generateUuid } from '../utils/random.js';
import { totalExpNeededForLevel } from '../utils/leveling-utils.js';
import { getSelectedContacts, setSelectedContacts } from '../vocab/quiz.js';
import { getChapterStars, getStarCounters, setStarCounters } from '../carnival/carnival-ui.js';
import { decodeSaveCode, encodeSaveCode } from './save-code.js';

/** where the player starts after loading a code: in front of the house in the village */
const HOME = Object.freeze({ area: 'main_1', x: 14, y: 74 });

/** @returns {string} the bewaarcode for the game as it is now */
export function makeSaveCodeNow() {
  /** @type {import('../types/typedef.js').Monster[]} */
  const party = dataManager.store.get(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY) || [];
  /** @type {{item: {id: number}, quantity: number}[]} */
  const inventory = dataManager.store.get(DATA_MANAGER_STORE_KEYS.INVENTORY) || [];
  /** @type {{[id: number]: number}} */
  const items = {};
  inventory.forEach((i) => {
    items[i.item.id] = (items[i.item.id] || 0) + i.quantity;
  });
  const counters = getStarCounters();
  return encodeSaveCode({
    flags: [...dataManager.getFlags()],
    contacts: getSelectedContacts(),
    party: party.map((m) => ({ monsterId: m.monsterId, level: m.currentLevel })),
    items,
    stars: counters.stars,
    earned: counters.earned,
    chapterStars: getChapterStars(),
    defeated: [...dataManager.getDefeatedNpcs()],
    picked: dataManager.store.get(DATA_MANAGER_STORE_KEYS.ITEMS_PICKED_UP) || [],
    viewed: dataManager.store.get(DATA_MANAGER_STORE_KEYS.VIEWED_EVENTS) || [],
  });
}

/**
 * Loads a bewaarcode into the game. The player starts in front of the house in the village.
 * @param {Phaser.Scene} scene any scene (to read the game data)
 * @param {string} code
 * @returns {boolean} false when the code has a typo
 */
export function loadSaveCode(scene, code) {
  const d = decodeSaveCode(code);
  if (!d) return false;

  dataManager.startNewGame();
  d.flags.forEach((f) => dataManager.addFlag(f));
  d.defeated.forEach((id) => dataManager.addDefeatedNpc(id));
  d.picked.forEach((id) => dataManager.addItemPickedUp(id));
  d.viewed.forEach((id) => dataManager.viewedEvent(id));

  const party = d.party
    .map((p) => {
      const base = DataUtils.getMonsterById(scene, p.monsterId);
      if (!base) return undefined;
      const levels = Math.max(0, p.level - base.currentLevel);
      const maxHp = base.maxHp + Math.round(levels * 6.5);
      return {
        ...base,
        id: generateUuid(),
        currentLevel: Math.max(base.currentLevel, p.level),
        maxHp,
        currentHp: maxHp,
        currentAttack: base.currentAttack + Math.round(levels * 1.5),
        currentExp: totalExpNeededForLevel(Math.max(base.currentLevel, p.level)),
      };
    })
    .filter(Boolean);
  dataManager.store.set(DATA_MANAGER_STORE_KEYS.MONSTERS_IN_PARTY, party);

  dataManager.store.set(
    DATA_MANAGER_STORE_KEYS.INVENTORY,
    Object.entries(d.items).map(([id, quantity]) => ({ item: { id: Number(id) }, quantity }))
  );

  setStarCounters({ stars: d.stars, earned: d.earned, chapterStart: Math.max(0, d.earned - d.chapterStars) });
  setSelectedContacts(d.contacts);

  dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_LOCATION, { area: HOME.area, isInterior: false });
  dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, { x: HOME.x * 64, y: HOME.y * 64 });
  dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, 'DOWN');
  dataManager.store.set(DATA_MANAGER_STORE_KEYS.GAME_STARTED, true);
  dataManager.saveData();
  return true;
}
