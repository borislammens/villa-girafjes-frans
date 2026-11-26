import { ITEM_EFFECT } from '../types/typedef.js';

/**
 * Small shared state for items that help with the next quiz question in a battle,
 * and for the whistle that keeps wild woordjesdieven away.
 */
export const itemBoosts = {
  /** @type {Set<string>} effects waiting for the next battle question */
  nextQuestion: new Set(),
  /** forgive the next wrong answer in a battle */
  forgiveMistake: false,
  /** steps left without wild encounters */
  repelSteps: 0,
};

/**
 * @param {import('../types/typedef.js').Item} item
 * @returns {string[]} short messages for the player (the battle box is small)
 */
export function applyBattleHelpItem(item) {
  switch (item.effect) {
    case ITEM_EFFECT.REMOVE_TWO_WRONG:
      itemBoosts.nextQuestion.add(ITEM_EFFECT.REMOVE_TWO_WRONG);
      return ['Je kijkt door de verrekijker...', 'Bij de volgende vraag vallen', '2 foute antwoorden weg!'];
    case ITEM_EFFECT.SHOW_ANSWER:
      itemBoosts.nextQuestion.add(ITEM_EFFECT.SHOW_ANSWER);
      return ['Je leest het spiekbriefje...', 'Bij de volgende vraag is het', 'juiste antwoord groen omrand.'];
    case ITEM_EFFECT.SLOW_LISTEN:
      itemBoosts.nextQuestion.add(ITEM_EFFECT.SLOW_LISTEN);
      return ['Koptelefoon op!', 'De volgende vraag wordt', 'traag voorgelezen.'];
    case ITEM_EFFECT.FORGIVE_MISTAKE:
      itemBoosts.forgiveMistake = true;
      return ['Het toverkrijtje is klaar!', 'Je volgende fout wordt', 'weggetoverd.'];
    default:
      return [`Je gebruikte: ${item.name}`];
  }
}

/**
 * Applies waiting helpers to a quiz question (mutates a copy) and clears them.
 * @param {any} question
 * @returns {{question: any, showAnswer: boolean, slowListen: boolean}}
 */
export function applyNextQuestionHelpers(question) {
  const q = { ...question, options: [...question.options] };
  const helpers = itemBoosts.nextQuestion;
  const result = { question: q, showAnswer: helpers.has(ITEM_EFFECT.SHOW_ANSWER), slowListen: helpers.has(ITEM_EFFECT.SLOW_LISTEN) };
  if (helpers.has(ITEM_EFFECT.REMOVE_TWO_WRONG) && q.options.length > 2) {
    const right = q.options[q.correctIndex];
    const wrong = q.options.filter((_, i) => i !== q.correctIndex);
    const keepWrong = wrong[Math.floor(Math.random() * wrong.length)];
    q.options = Math.random() < 0.5 ? [right, keepWrong] : [keepWrong, right];
    q.correctIndex = q.options.indexOf(right);
  }
  helpers.clear();
  return result;
}
