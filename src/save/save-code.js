/**
 * Bewaarcode: the whole game progress in a short code like GIRAF-1A2B3-...
 * Nothing goes online: the child writes the code down and types it on another computer.
 * Keep the lists below in this order forever, otherwise old codes stop working (add new things at the end).
 */
import { STORY_FLAGS } from '../story/story.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U
const VERSION = 1;
const PREFIX = 'GIRAF';

/** story flags, in a fixed order */
export const CODE_FLAGS = Object.freeze([
  STORY_FLAGS.CH1,
  STORY_FLAGS.MET_HELENA,
  STORY_FLAGS.MET_ADAM,
  STORY_FLAGS.MET_SEVERINE,
  STORY_FLAGS.CH2,
  STORY_FLAGS.GOT_MONSTER,
  STORY_FLAGS.THIEF1,
  STORY_FLAGS.MET_NABIL,
  STORY_FLAGS.CH3,
  STORY_FLAGS.MET_PAPA,
  STORY_FLAGS.FOUND_SACHA,
  STORY_FLAGS.THIEF2,
  STORY_FLAGS.CH4,
  STORY_FLAGS.HAS_GIFT,
  STORY_FLAGS.GAVE_GIFT,
  STORY_FLAGS.THIEF3,
]);
/** item ids that are saved with their count (the school key comes back from the earned stars) */
const CODE_ITEMS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const CODE_DEFEATED = Object.freeze([4, 5, 9]);
const CODE_PICKED_ITEMS = Object.freeze([1, 2, 3, 4, 5, 6]);
const CODE_EVENTS = Object.freeze([1, 2]);

/**
 * @typedef SaveCodeData
 * @type {object}
 * @property {string[]} flags
 * @property {number[]} contacts
 * @property {{monsterId: number, level: number}[]} party
 * @property {{[id: number]: number}} items counts
 * @property {number} stars star balance
 * @property {number} earned stars ever earned
 * @property {number} chapterStars stars earned in the current chapter
 * @property {number[]} defeated
 * @property {number[]} picked
 * @property {number[]} viewed
 */

class BitWriter {
  constructor() {
    /** @type {number[]} */
    this.bits = [];
  }

  /**
   * @param {number} value
   * @param {number} n number of bits
   */
  write(value, n) {
    const v = Math.max(0, Math.min(Math.floor(value), 2 ** n - 1));
    for (let i = n - 1; i >= 0; i -= 1) this.bits.push(Math.floor(v / 2 ** i) % 2);
  }
}

class BitReader {
  /** @param {number[]} bits */
  constructor(bits) {
    this.bits = bits;
    this.pos = 0;
  }

  /** @param {number} n */
  read(n) {
    if (this.pos + n > this.bits.length) throw new Error('te kort');
    let v = 0;
    for (let i = 0; i < n; i += 1) v = v * 2 + this.bits[this.pos + i];
    this.pos += n;
    return v;
  }
}

/**
 * @param {number[]} bits
 * @returns {number} 10-bit checksum
 */
function checksum(bits) {
  let h = 0x2b7;
  for (let i = 0; i < bits.length; i += 1) {
    h = (h * 31 + bits[i] * 7 + i) % 1021;
  }
  return h;
}

/**
 * @param {SaveCodeData} d
 * @returns {string}
 */
export function encodeSaveCode(d) {
  const w = new BitWriter();
  w.write(VERSION, 3);
  CODE_FLAGS.forEach((f) => w.write(d.flags.includes(f) ? 1 : 0, 1));
  [1, 2, 3, 4].forEach((c) => w.write(d.contacts.includes(c) ? 1 : 0, 1));
  const party = d.party.slice(0, 6);
  w.write(party.length, 3);
  party.forEach((m) => {
    w.write(m.monsterId, 4);
    w.write(m.level, 7);
  });
  CODE_ITEMS.forEach((id) => {
    const n = d.items[id] || 0;
    w.write(n > 0 ? 1 : 0, 1);
    if (n > 0) w.write(n, 5);
  });
  w.write(d.stars, 12);
  w.write(d.earned, 13);
  w.write(d.chapterStars, 5);
  CODE_DEFEATED.forEach((id) => w.write(d.defeated.includes(id) ? 1 : 0, 1));
  CODE_PICKED_ITEMS.forEach((id) => w.write(d.picked.includes(id) ? 1 : 0, 1));
  CODE_EVENTS.forEach((id) => w.write(d.viewed.includes(id) ? 1 : 0, 1));
  const sum = checksum(w.bits);
  w.write(sum, 10);
  while (w.bits.length % 5 !== 0) w.bits.push(0);
  let chars = '';
  for (let i = 0; i < w.bits.length; i += 5) {
    let v = 0;
    for (let j = 0; j < 5; j += 1) v = v * 2 + w.bits[i + j];
    chars += ALPHABET[v];
  }
  const groups = chars.match(/.{1,5}/g) || [];
  return [PREFIX, ...groups].join('-');
}

/**
 * @param {string} code
 * @returns {SaveCodeData | undefined} undefined when the code is not right (typo)
 */
export function decodeSaveCode(code) {
  let s = String(code || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length < 5) return undefined;
  const bits = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return undefined;
    for (let j = 4; j >= 0; j -= 1) bits.push(Math.floor(v / 2 ** j) % 2);
  }
  try {
    const r = new BitReader(bits);
    if (r.read(3) !== VERSION) return undefined;
    const flags = CODE_FLAGS.filter(() => r.read(1) === 1);
    const contacts = [1, 2, 3, 4].filter(() => r.read(1) === 1);
    const n = r.read(3);
    const party = [];
    for (let i = 0; i < n; i += 1) party.push({ monsterId: r.read(4), level: r.read(7) });
    /** @type {{[id: number]: number}} */
    const items = {};
    CODE_ITEMS.forEach((id) => {
      if (r.read(1) === 1) items[id] = r.read(5);
    });
    const stars = r.read(12);
    const earned = r.read(13);
    const chapterStars = r.read(5);
    const defeated = CODE_DEFEATED.filter(() => r.read(1) === 1);
    const picked = CODE_PICKED_ITEMS.filter(() => r.read(1) === 1);
    const viewed = CODE_EVENTS.filter(() => r.read(1) === 1);
    const dataBits = bits.slice(0, r.pos);
    const sum = r.read(10);
    if (sum !== checksum(dataBits)) return undefined;
    // what is left may only be padding zeros
    if (bits.length - r.pos >= 5 || bits.slice(r.pos).some((b) => b !== 0)) return undefined;
    return {
      flags,
      contacts: contacts.length ? contacts : [1],
      party,
      items,
      stars,
      earned,
      chapterStars,
      defeated,
      picked,
      viewed,
    };
  } catch {
    return undefined;
  }
}
