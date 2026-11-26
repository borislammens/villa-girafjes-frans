import { Menu } from '../common/menu/menu.js';

/**
 * @typedef {keyof typeof MENU_OPTIONS} MenuOptions
 */

/** @enum {MenuOptions} */
export const MENU_OPTIONS = Object.freeze({
  MONSTERDEX: 'MONSTERDEX',
  MONSTERS: 'MONSTERS',
  BAG: 'BAG',
  KERMIS: 'KERMIS',
  SAVE: 'SAVE',
  CODE: 'CODE',
  OPTIONS: 'OPTIONS',
  EXIT: 'EXIT',
});

export class WorldMenu extends Menu {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    super(scene, [MENU_OPTIONS.MONSTERS, MENU_OPTIONS.BAG, MENU_OPTIONS.KERMIS, MENU_OPTIONS.SAVE, MENU_OPTIONS.CODE, MENU_OPTIONS.EXIT]);
  }
}
