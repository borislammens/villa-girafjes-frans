import { WORDS } from './words.js';
import { DIALOGUES } from './dialogues.js';
import { canSpeakFrench } from './speech.js';

const SELECTION_KEY = 'franse-woordjes-contacts';
const STATS_KEY = 'franse-woordjes-stats';

/**
 * @typedef Question
 * @type {object}
 * @property {string} prompt instruction shown above the word
 * @property {string} word the word to translate
 * @property {string[]} options four answer options
 * @property {number} correctIndex index of the right option
 * @property {string} key id used for statistics
 * @property {string} [hint] smaller help text under the word
 * @property {string} [speaker] name of who is talking (chats)
 * @property {string} [reply] what the speaker says after a right answer
 * @property {string} [speak] French text read aloud when the question appears
 * @property {string} [speakAfter] French text read aloud after answering
 * @property {boolean} [listening] true for "what do you hear?" questions (word is hidden)
 */

function safeGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore, game keeps working without saving
  }
}

/** @returns {number[]} */
export function getSelectedContacts() {
  const saved = safeGet(SELECTION_KEY);
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.filter((n) => [1, 2, 3, 4].includes(n));
  }
  return [1, 2, 3, 4];
}

/** highest Contact the story has reached (chapter 1 = Contact 1, ...); 4 when the story is finished */
let storyMaxContact = 4;

/** @param {number} n */
export function setStoryMaxContact(n) {
  storyMaxContact = Math.max(1, Math.min(4, n));
}

/**
 * The Contacts used for questions now: every Contact up to the chapter of the story.
 * (The Contact choice at the start is gone: the chapters decide. An old saved choice is ignored.)
 * @returns {number[]}
 */
export function getActiveContacts() {
  return [1, 2, 3, 4].filter((c) => c <= storyMaxContact);
}

/** @param {number[]} contacts */
export function setSelectedContacts(contacts) {
  safeSet(SELECTION_KEY, contacts);
}

/** @returns {Record<string, {right: number, wrong: number}>} */
function getStats() {
  return safeGet(STATS_KEY) || {};
}

/**
 * @param {string} key
 * @param {boolean} correct
 */
export function recordAnswer(key, correct) {
  const stats = getStats();
  const s = stats[key] || { right: 0, wrong: 0 };
  if (correct) s.right += 1;
  else s.wrong += 1;
  stats[key] = s;
  safeSet(STATS_KEY, stats);
}

const wordKey = (w) => `${w.contact}|${w.fr}|${w.nl}`;
const isNoun = (w) => /^(un|une|le|la|l')\s/i.test(w.fr) || /^(een|de|het)\s/i.test(w.nl);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Words that were answered wrong more often get picked more often. */
function pickWeighted(words) {
  const stats = getStats();
  const weights = words.map((w) => {
    const s = stats[wordKey(w)] || { right: 0, wrong: 0 };
    return Math.max(1, 3 + s.wrong * 3 - s.right);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < words.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words[words.length - 1];
}

let lastKey = '';

/**
 * Makes a vocabulary multiple choice question from the selected contacts.
 * @param {boolean} [forceToFrench] always ask Dutch -> French
 * @returns {Question}
 */
export function makeVocabQuestion(forceToFrench = false) {
  const contacts = getActiveContacts();
  let pool = WORDS.filter((w) => contacts.includes(w.contact));
  if (pool.length < 4) pool = WORDS;

  let target = pickWeighted(pool);
  if (wordKey(target) === lastKey && pool.length > 1) target = pickWeighted(pool);
  lastKey = wordKey(target);

  const toFrench = forceToFrench || Math.random() < 0.5;
  const ask = toFrench ? target.nl : target.fr;
  const answer = toFrench ? target.fr : target.nl;
  const answerField = toFrench ? 'fr' : 'nl';

  // distractors may never mean the same thing as the right answer
  const valid = (w) =>
    w.fr !== target.fr && w.nl !== target.nl && w[answerField] !== answer;
  const seen = new Set([answer]);
  const pickFrom = (list) => {
    const out = [];
    for (const w of shuffle(list)) {
      if (out.length + seen.size - 1 >= 3) break;
      if (!valid(w) || seen.has(w[answerField])) continue;
      seen.add(w[answerField]);
      out.push(w[answerField]);
    }
    return out;
  };
  // prefer the same kind of word (noun vs other) from the chosen contacts, then anything
  const sameKind = (w) => isNoun(w) === isNoun(target);
  const distractors = [
    ...pickFrom(pool.filter(sameKind)),
  ];
  distractors.push(...pickFrom(pool));
  distractors.push(...pickFrom(WORDS.filter(sameKind)));
  distractors.push(...pickFrom(WORDS));

  const options = shuffle([answer, ...distractors.slice(0, 3)]);
  return {
    prompt: toFrench ? 'Hoe zeg je dit in het Frans?' : 'Wat betekent dit in het Nederlands?',
    word: ask,
    options,
    correctIndex: options.indexOf(answer),
    key: wordKey(target),
    speak: toFrench ? undefined : target.fr,
    speakAfter: target.fr,
  };
}

// ---------- grammar: aller (C2), être (C3), avoir (C4) ----------

const PRONOUNS = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'];
const VERBS = {
  aller: { contact: 2, forms: ['vais', 'vas', 'va', 'va', 'allons', 'allez', 'vont', 'vont'] },
  être: { contact: 3, forms: ['suis', 'es', 'est', 'est', 'sommes', 'êtes', 'sont', 'sont'] },
  avoir: { contact: 4, forms: ['ai', 'as', 'a', 'a', 'avons', 'avez', 'ont', 'ont'] },
};

/** @returns {Question | undefined} */
function makeVerbQuestion() {
  const contacts = getActiveContacts();
  const verbs = Object.keys(VERBS).filter((v) => contacts.includes(VERBS[v].contact));
  if (verbs.length === 0) return undefined;
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const { forms } = VERBS[verb];
  const p = Math.floor(Math.random() * PRONOUNS.length);
  const answer = forms[p];
  const pronoun = PRONOUNS[p] === 'je' && verb === 'avoir' ? "j'" : PRONOUNS[p];
  const others = shuffle([...new Set(forms.filter((f) => f !== answer))]).slice(0, 3);
  const options = shuffle([answer, ...others]);
  return {
    prompt: `Vervoeg het werkwoord "${verb}".`,
    word: `${pronoun}${pronoun.endsWith("'") ? '' : ' '}___`,
    options,
    correctIndex: options.indexOf(answer),
    key: `verb|${verb}|${p}`,
    speakAfter: `${pronoun}${pronoun.endsWith("'") ? '' : ' '}${answer}`,
  };
}

// ---------- grammar: le / la / l' / un / une (C3) ----------

/**
 * nouns from the list with their gender
 * @param {number[]} [contacts] only these contacts (all when left out)
 */
export function nouns(contacts) {
  return WORDS.filter((w) => !contacts || contacts.includes(w.contact)).map((w) => {
    const m = /^(un|une|le|la)\s+(.+)$/i.exec(w.fr);
    if (!m) return undefined;
    const feminine = m[1] === 'une' || m[1] === 'la';
    const noun = m[2].replace(' (vidéo)', '');
    return { noun, feminine, vowel: /^[aeiouéèêh]/i.test(noun), nl: w.nl };
  }).filter(Boolean);
}

/**
 * @param {boolean} [anyContact] also when Contact 3 is not chosen (kermis), with nouns of the chosen contacts
 * @returns {Question | undefined}
 */
export function makeArticleQuestion(anyContact = false) {
  if (!anyContact && !getActiveContacts().includes(3)) return undefined;
  let list = anyContact ? nouns(getActiveContacts()) : nouns();
  if (list.length < 3) list = nouns();
  const n = list[Math.floor(Math.random() * list.length)];
  const definite = Math.random() < 0.5;
  let options;
  let answer;
  if (definite) {
    options = ['le', 'la', "l'"];
    answer = n.vowel ? "l'" : n.feminine ? 'la' : 'le';
  } else {
    options = ['un', 'une'];
    answer = n.feminine ? 'une' : 'un';
  }
  return {
    prompt: definite ? 'Welk lidwoord past: le, la of l\'?' : 'Welk lidwoord past: un of une?',
    word: `___ ${n.noun}`,
    hint: `(${n.nl.replace(/^(een|de|het) /, '')})`,
    options,
    correctIndex: options.indexOf(answer),
    key: `art|${definite ? 'def' : 'indef'}|${n.noun}`,
    speakAfter: `${answer}${answer.endsWith("'") ? '' : ' '}${n.noun}`,
  };
}

/**
 * "Wat hoor je?": the French word is read aloud, the child picks the written French word.
 * @returns {Question | undefined}
 */
export function makeListenQuestion() {
  if (!canSpeakFrench()) return undefined;
  let q;
  // a Dutch-to-French question has French options; keep trying until we get one
  for (let i = 0; i < 10; i += 1) {
    q = makeVocabQuestion();
    if (q.speak === undefined) break;
  }
  if (!q || q.speak !== undefined) return undefined;
  const answer = q.options[q.correctIndex];
  return {
    ...q,
    prompt: 'Wat hoor je?',
    word: '🔊 ?',
    hint: '',
    listening: true,
    speak: answer,
    speakAfter: undefined,
    key: `listen|${q.key}`,
  };
}

/**
 * Battle question: mostly vocabulary, sometimes grammar from the chosen contacts.
 * @returns {Question}
 */
export function makeQuestion() {
  const r = Math.random();
  if (r < 0.15) return makeListenQuestion() || makeVocabQuestion();
  if (r < 0.3) return makeVerbQuestion() || makeVocabQuestion();
  if (r < 0.4) return makeArticleQuestion() || makeVocabQuestion();
  return makeVocabQuestion();
}

let lastChat = -1;

/**
 * A conversation for an NPC, from the chosen contacts.
 * @param {string} speaker
 * @param {{dialogueId?: string, contact?: number}} [opts] a fixed story dialogue, or a random one of a contact
 * @returns {Question}
 */
export function makeChatQuestion(speaker, opts = {}) {
  const all = DIALOGUES.map((d, i) => ({ d, i }));
  let pool;
  if (opts.dialogueId) {
    pool = all.filter(({ d }) => d.id === opts.dialogueId);
  } else {
    const contacts = opts.contact ? [opts.contact] : getActiveContacts();
    pool = all.filter(({ d }) => !d.storyOnly && contacts.includes(d.contact));
    if (pool.length === 0) pool = all.filter(({ d }) => !d.storyOnly);
    if (pool.length > 1) pool = pool.filter(({ i }) => i !== lastChat);
  }
  const { d, i } = pool[Math.floor(Math.random() * pool.length)];
  lastChat = i;
  const options = shuffle(d.options);
  return {
    prompt: d.question,
    word: `"${d.says}"`,
    hint: d.hint,
    speaker,
    reply: d.reply,
    options,
    correctIndex: options.indexOf(d.options[0]),
    key: `chat|${i}`,
    speak: d.says,
    speakAfter: `${d.options[0]} ... ${d.reply}`,
  };
}
