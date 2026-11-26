/**
 * French text to speech and (optional) speech recognition, using only browser features.
 * Everything here fails silently: the game must keep working without sound or microphone.
 */

/** @type {SpeechSynthesisVoice | undefined} */
let frenchVoice;

function pickVoice() {
  if (!('speechSynthesis' in globalThis)) return;
  const voices = globalThis.speechSynthesis.getVoices();
  const fr = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
  // prefer France French, and "natural"/"enhanced"/Google voices which sound better
  const score = (v) =>
    (v.lang.toLowerCase() === 'fr-fr' ? 2 : 0) + (/natural|enhanced|premium|google|amélie|thomas/i.test(v.name) ? 1 : 0);
  frenchVoice = fr.sort((a, b) => score(b) - score(a))[0];
}

if ('speechSynthesis' in globalThis) {
  pickVoice();
  globalThis.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/** @returns {boolean} true when the browser can read French aloud */
export function canSpeakFrench() {
  if (!('speechSynthesis' in globalThis)) return false;
  if (!frenchVoice) pickVoice();
  return Boolean(frenchVoice);
}

/**
 * Makes textbook notation speakable: "à (l'école)" -> "à l'école", "voilà ..." -> "voilà".
 * @param {string} text
 */
export function cleanForSpeech(text) {
  return text
    .replace(/\(([^)]*)\)/g, (_m, inner) => (/^(e|s|j'|l')$/.test(inner) ? '' : inner))
    .replace(/\.\.\.|…/g, '')
    .replace(/["«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} text French text
 * @param {{rate?: number, onEnd?: () => void}} [options]
 */
export function speakFrench(text, options = {}) {
  try {
    if (!canSpeakFrench()) {
      options.onEnd?.();
      return;
    }
    globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    u.lang = frenchVoice?.lang || 'fr-FR';
    if (frenchVoice) u.voice = frenchVoice;
    u.rate = options.rate ?? 0.85;
    if (options.onEnd) {
      u.onend = () => options.onEnd?.();
      u.onerror = () => options.onEnd?.();
    }
    globalThis.speechSynthesis.speak(u);
  } catch {
    options.onEnd?.();
  }
}

export function stopSpeaking() {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

/** @returns {boolean} */
export function canListen() {
  return Boolean(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
}

/**
 * Listens once in French. Calls back with what was heard ('' when nothing / not supported / error).
 * @param {(heard: string) => void} callback
 * @returns {() => void} function to stop listening early
 */
export function listenFrench(callback) {
  const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!Rec) {
    callback('');
    return () => {};
  }
  let done = false;
  const finish = (heard) => {
    if (done) return;
    done = true;
    callback(heard);
  };
  try {
    const rec = new Rec();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0] || []).map((a) => a.transcript);
      finish(alts.join(' | '));
    };
    rec.onerror = () => finish('');
    rec.onend = () => finish('');
    rec.start();
    const timer = setTimeout(() => {
      try {
        rec.stop();
      } catch {
        finish('');
      }
    }, 5000);
    return () => {
      clearTimeout(timer);
      try {
        rec.stop();
      } catch {
        finish('');
      }
    };
  } catch {
    finish('');
    return () => {};
  }
}

/**
 * Loose comparison: ignores accents, case, punctuation and articles.
 * @param {string} heard possibly several alternatives separated by |
 * @param {string} target
 */
export function soundsAlike(heard, target) {
  const norm = (s) =>
    cleanForSpeech(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z ]/g, ' ')
      .replace(/\b(un|une|le|la|les|l)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const t = norm(target);
  return heard.split('|').some((h) => {
    const n = norm(h);
    return n.length > 0 && (n === t || n.includes(t) || t.includes(n));
  });
}
