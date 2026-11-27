/**
 * The story of Villa De Girafjes: four chapters, one per Contact of the textbook.
 * Progress is kept as story flags in the data manager (so it is saved with the game).
 */

export const STORY_FLAGS = Object.freeze({
  CH1: 'CH1',
  MET_HELENA: 'MET_HELENA',
  MET_ADAM: 'MET_ADAM',
  MET_SEVERINE: 'MET_SEVERINE',
  CH2: 'CH2',
  GOT_MONSTER: 'FOUND_PROFESSOR',
  THIEF1: 'THIEF1',
  MET_NABIL: 'MET_NABIL',
  CH3: 'CH3',
  MET_PAPA: 'MET_PAPA',
  FOUND_SACHA: 'FOUND_SACHA',
  THIEF2: 'THIEF2',
  CH4: 'CH4',
  HAS_GIFT: 'HAS_GIFT',
  GAVE_GIFT: 'GAVE_GIFT',
  THIEF3: 'THIEF3',
});

/** stars a child must earn in a chapter before the next chapter opens */
export const STARS_PER_CHAPTER = 35;

/** NPC ids of the woordjesdieven (trainer battles) and the flag they set when beaten */
export const THIEF_FLAGS = Object.freeze({ 4: STORY_FLAGS.THIEF1, 5: STORY_FLAGS.THIEF2, 9: STORY_FLAGS.THIEF3 });

/**
 * @typedef Chapter
 * @type {object}
 * @property {string} flag flag that opens this chapter
 * @property {string} title
 * @property {{flag: string, text: string}[]} goals
 * @property {string[]} intro messages shown when the chapter opens
 */

/** @type {Chapter[]} */
export const CHAPTERS = [
  {
    flag: STORY_FLAGS.CH1,
    title: 'Hoofdstuk 1: Salut!',
    intro: [],
    goals: [
      { flag: STORY_FLAGS.MET_HELENA, text: 'Begroet Héléna (bij de huizen)' },
      { flag: STORY_FLAGS.MET_ADAM, text: 'Begroet Adam (onderaan het dorp)' },
      { flag: STORY_FLAGS.MET_SEVERINE, text: 'Begroet Séverine (links in het dorp)' },
    ],
  },
  {
    flag: STORY_FLAGS.CH2,
    title: 'Hoofdstuk 2: Ils vont où?',
    intro: [
      'Hoofdstuk 2: Ils vont où?',
      'Je vrienden vertrekken naar de stad. Nabil weet waar iedereen naartoe gaat!',
      'Ga naar het noorden, voorbij het hoge gras. Pas op voor woordjesdieven...',
    ],
    goals: [
      { flag: STORY_FLAGS.GOT_MONSTER, text: 'Loop naar het pad in het noorden' },
      { flag: STORY_FLAGS.THIEF1, text: 'Versla de woordjesdief bij het hek' },
      { flag: STORY_FLAGS.MET_NABIL, text: 'Vraag Nabil waar iedereen heen gaat (in de stad)' },
    ],
  },
  {
    flag: STORY_FLAGS.CH3,
    title: 'Hoofdstuk 3: Vous êtes là?',
    intro: [
      'Hoofdstuk 3: Vous êtes là?',
      'Le dîner est prêt! Papa zoekt iedereen voor het avondeten.',
      'Papa is in het grote huis links in de stad.',
    ],
    goals: [
      { flag: STORY_FLAGS.MET_PAPA, text: 'Praat met papa (huis links in de stad)' },
      { flag: STORY_FLAGS.FOUND_SACHA, text: 'Zoek Sacha (rechts in de stad)' },
      { flag: STORY_FLAGS.THIEF2, text: 'Versla de woordjesdief in het gras (zuid van de stad)' },
    ],
  },
  {
    flag: STORY_FLAGS.CH4,
    title: 'Hoofdstuk 4: Tu as de la chance',
    intro: [
      'Hoofdstuk 4: Tu as de la chance',
      'Morgen is juf Annelies jarig!',
      'Koop een cadeau in de winkel in het dorp (het huis naast het jouwe) en geef het haar op het feest bij de kermis.',
    ],
    goals: [
      { flag: STORY_FLAGS.HAS_GIFT, text: 'Koop een cadeau in de winkel (huis naast het jouwe)' },
      { flag: STORY_FLAGS.GAVE_GIFT, text: 'Geef het cadeau aan juf Annelies (bij de kermis in de stad)' },
    ],
  },
];

export const ENDING_MESSAGES = [
  '🎉 Joyeux anniversaire, juf Annelies! 🎉',
  'Juf Annelies is superblij met haar cadeau. Iedereen zingt "Bon anniversaire"!',
  'Bravo! Je hebt alle vier de hoofdstukken uitgespeeld.',
  'Je kan blijven spelen: kermis, Zeg me na, en in het noorden woont nog de grote woordjesdief...',
];

/**
 * @param {Set<string>} flags
 * @returns {number} index of the current chapter, CHAPTERS.length when the story is finished, -1 before it started
 */
export function currentChapterIndex(flags) {
  if (flags.has(STORY_FLAGS.GAVE_GIFT)) return CHAPTERS.length;
  let idx = -1;
  CHAPTERS.forEach((c, i) => {
    if (flags.has(c.flag)) idx = i;
  });
  return idx;
}

/** stars ever earned that give the key to the school */
export const KEY_STARS = 500;

/**
 * Text for the quest box on screen.
 * @param {Set<string>} flags
 * @param {number} [chapterStars]
 * @param {{earned: number, has: boolean}} [key]
 * @returns {string}
 */
export function questText(flags, chapterStars = 0, key = undefined) {
  const idx = currentChapterIndex(flags);
  if (idx < 0) return '';
  // the key to the school: a long-term goal for all stars ever earned
  const keyLine = key && !key.has ? `\n🔑 Gouden sleutel: ⭐ ${Math.min(key.earned, KEY_STARS)}/${KEY_STARS}` : '';
  if (idx >= CHAPTERS.length) return `🏆 Verhaal uitgespeeld!\nExtra: versla de grote woordjesdief in het noorden.${keyLine}`;
  const ch = CHAPTERS[idx];
  const lines = ch.goals.map((g) => `${flags.has(g.flag) ? '✔' : '○'} ${g.text}`);
  if (idx < CHAPTERS.length - 1) {
    const n = Math.min(chapterStars, STARS_PER_CHAPTER);
    lines.push(`${n >= STARS_PER_CHAPTER ? '✔' : '○'} Verdien ${STARS_PER_CHAPTER} sterren: ⭐ ${n}/${STARS_PER_CHAPTER} (menu > KERMIS)`);
  }
  return `📖 ${ch.title}\n${lines.join('\n')}${keyLine}`;
}

/**
 * The first goal that is not done yet, used by the kompas.
 * @param {Set<string>} flags
 * @param {number} chapterStars
 * @returns {string}
 */
export function nextGoalText(flags, chapterStars = 0) {
  const idx = currentChapterIndex(flags);
  if (idx < 0) return 'Loop eerst even rond in het dorp.';
  if (idx >= CHAPTERS.length) return 'Je hebt het verhaal uitgespeeld! In het noorden woont nog de grote woordjesdief...';
  const goal = CHAPTERS[idx].goals.find((g) => !flags.has(g.flag));
  if (goal) return goal.text;
  return `Verdien nog ${Math.max(0, STARS_PER_CHAPTER - chapterStars)} sterren op de kermis (menu > KERMIS) of met Zeg me na.`;
}

/**
 * When all goals of the current chapter are done, returns the next chapter to open.
 * @param {Set<string>} flags
 * @param {number} [chapterStars]
 * @returns {Chapter | undefined}
 */
export function nextChapterToOpen(flags, chapterStars = 0) {
  const idx = currentChapterIndex(flags);
  if (idx < 0 || idx >= CHAPTERS.length - 1) return undefined;
  const done = CHAPTERS[idx].goals.every((g) => flags.has(g.flag)) && chapterStars >= STARS_PER_CHAPTER;
  return done ? CHAPTERS[idx + 1] : undefined;
}

/**
 * @param {Set<string>} flags
 * @returns {number} index of the current chapter when all its tasks are done (stars not counted), else -1
 */
export function chapterTasksDone(flags) {
  const idx = currentChapterIndex(flags);
  if (idx < 0 || idx >= CHAPTERS.length - 1) return -1;
  return CHAPTERS[idx].goals.every((g) => flags.has(g.flag)) ? idx : -1;
}

/**
 * Places the player may not enter yet. y is a tile row in main_1: going north of it needs the flag.
 * @type {{area: string, row: number, flag: string, message: string[]}[]}
 */
export const STORY_GATES = [
  {
    area: 'main_1',
    row: 70,
    flag: STORY_FLAGS.CH2,
    message: ['Wacht even! Begroet eerst je nieuwe vrienden in het dorp.', '(Kijk linksboven wat je nog moet doen.)'],
  },
  {
    area: 'main_1',
    row: 48,
    flag: STORY_FLAGS.THIEF1,
    message: ['De woordjesdief laat je er niet door!', 'Praat met hem om hem te verslaan.'],
  },
];

/**
 * Extra NPCs for the story, placed from code (tile coordinates).
 * @type {{area: string, x: number, y: number, id: number}[]}
 */
export const EXTRA_NPCS = [
  { area: 'main_1', x: 12, y: 78, id: 11 }, // Séverine
  { area: 'building_2', x: 9, y: 3, id: 12 }, // Madame Dupont, de winkel
  { area: 'main_1', x: 21, y: 25, id: 13 }, // juf Annelies, bij de kermis
];

/** The secret little house in the village: only the "gouden sleutel" opens it. */
export const SECRET_HOUSE = Object.freeze({ area: 'main_1', x: 25, y: 78, w: 4, h: 2, doorX: 27, doorY: 79 });
/** the school in the town, drawn over the 24-hour shop of the original map (pixel position of school.png) */
export const TOWN_SCHOOL = Object.freeze({ area: 'main_1', x: 1492, y: 1652 });
/** the crate that stood where the secret house is now, moved a bit to the left */
export const MOVED_MAP_ITEMS = Object.freeze({ main_1: { 1: { x: 24, y: 80 } } });
