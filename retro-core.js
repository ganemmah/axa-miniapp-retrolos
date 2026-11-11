/* RetroBoard Lite – core logic, no DOM.
 *
 * Classic script (not an ES module) so index.html also works when opened directly from disk.
 * In the browser it defines a single global, `RetroCore`; in Node (tests) it is exported via module.exports.
 * Every function is pure: it returns a new object and never mutates its input. Invalid input returns
 * the very same object, so callers can detect "nothing changed" with `===`.
 * User-facing strings are Swiss German, like the rest of the UI.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetroCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Settings (change rules here, not in app.js) -------------------------

  const APP = Object.freeze({ name: 'RetroBoard Lite', storageKey: 'retroboard-lite/v3' });

  /** The three columns. Titles must match the headings in index.html (a test checks this). */
  const COLUMNS = Object.freeze([
    Object.freeze({ id: 'good', title: 'Was lief gut?' }),
    Object.freeze({ id: 'bad', title: 'Was lief schlecht?' }),
    Object.freeze({ id: 'change', title: 'Was machen wir anders?' }),
  ]);

  /** Maximum lengths in characters; longer input is cut off. */
  const LIMITS = Object.freeze({ card: 200, title: 60 });

  /** Timer: three fixed durations instead of an input field. */
  const TIMER = Object.freeze({ choices: Object.freeze([3, 5, 10]), defaultMinutes: 5, minMinutes: 1, maxMinutes: 60 });

  const VERSION = 3;
  const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id));
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  // --- Retro board -----------------------------------------------------------

  /** Collapse whitespace, trim, and cut to the maximum length. */
  function sanitize(text, max = LIMITS.card) {
    return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function createRetro(date = '') {
    return { version: VERSION, title: '', date: ISO_DATE.test(date) ? date : '', cards: [], nextNr: 1 };
  }

  function setTitle(retro, title) {
    return { ...retro, title: sanitize(title, LIMITS.title) };
  }

  function addCard(retro, columnId, text) {
    const clean = sanitize(text);
    if (!clean || !COLUMN_IDS.has(columnId)) return retro;
    const card = { id: `k${retro.nextNr}`, column: columnId, text: clean, votes: 0 };
    return { ...retro, nextNr: retro.nextNr + 1, cards: [...retro.cards, card] };
  }

  function deleteCard(retro, id) {
    return { ...retro, cards: retro.cards.filter((c) => c.id !== id) };
  }

  /** One vote up (delta > 0, default) or down (delta < 0). Never below 0. Does not reorder the board. */
  function vote(retro, id, delta = 1) {
    return {
      ...retro,
      cards: retro.cards.map((c) => (c.id === id ? { ...c, votes: Math.max(0, c.votes + Math.sign(delta)) } : c)),
    };
  }

  /** Cards of a column in board order (order of entry, or the last «Nach Stimmen sortieren»). */
  function cardsInColumn(retro, columnId) {
    return retro.cards.filter((c) => c.column === columnId);
  }

  /** Most votes first; ties keep their current order (Array.prototype.sort is stable). */
  function byVotes(cards) {
    return [...cards].sort((a, b) => b.votes - a.votes);
  }

  /**
   * Sort the board once by votes (button «Nach Stimmen sortieren»). The order then stays put while people keep
   * voting, so a card never jumps away from under the mouse. New cards are appended. Returns the same object
   * if the board is already sorted.
   */
  function sortBoardByVotes(retro) {
    const sorted = byVotes(retro.cards);
    return sorted.every((c, i) => c === retro.cards[i]) ? retro : { ...retro, cards: sorted };
  }

  /** Fixed card number for moderating («#7»): taken from the id, never reused after a delete. */
  function cardNumber(card) {
    return Number(card.id.slice(1)) || 0;
  }

  /** All cards in display order: column by column, as on the board. */
  function allCards(retro) {
    return COLUMNS.flatMap((c) => cardsInColumn(retro, c.id));
  }

  /** Top topic of a column: the card(s) with the most votes; all of them on a tie; none without votes. */
  function topCards(retro, columnId) {
    const cards = cardsInColumn(retro, columnId);
    const max = cards.reduce((m, c) => Math.max(m, c.votes), 0);
    return new Set(max > 0 ? cards.filter((c) => c.votes === max).map((c) => c.id) : []);
  }

  /**
   * Validate and clean stored data (e.g. from localStorage). Invalid cards are dropped.
   * Returns null if the structure does not match at all.
   */
  function restore(data) {
    if (!data || typeof data !== 'object' || data.version !== VERSION) return null;
    const cards = (Array.isArray(data.cards) ? data.cards : [])
      .filter((c) => c && typeof c === 'object' && typeof c.id === 'string' && COLUMN_IDS.has(c.column))
      .map((c) => ({
        id: c.id.slice(0, 20),
        column: c.column,
        text: sanitize(c.text),
        votes: Number.isInteger(c.votes) && c.votes > 0 ? c.votes : 0,
      }))
      .filter((c) => c.text);
    // Pick the next number so that no existing id is handed out twice
    const highest = cards.reduce((max, c) => Math.max(max, cardNumber(c)), 0);
    const stored = Number.isInteger(data.nextNr) ? data.nextNr : 1;
    return {
      ...createRetro(typeof data.date === 'string' ? data.date : ''),
      title: sanitize(typeof data.title === 'string' ? data.title : '', LIMITS.title),
      cards,
      nextNr: Math.max(stored, highest + 1),
    };
  }

  // --- Dates (stored as ISO, shown in Swiss format) ---------------------------

  function todayIso(now = new Date()) {
    const two = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  }

  /** «2026-11-10» → «10.11.2026»; invalid values give an empty string. */
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
    return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
  }

  // --- Summary for copying into Teams or an e-mail ---------------------------

  function votesText(n) {
    return n === 1 ? '1 Stimme' : `${n} Stimmen`;
  }

  /** Plain-text summary. Always sorted by votes so the most important points come first. */
  function summary(retro) {
    const date = formatDate(retro.date);
    const head = retro.title
      ? `Retro «${retro.title}»${date ? ` · ${date}` : ''}`
      : (date ? `Retro vom ${date}` : 'Retro');
    const lines = [head];
    for (const column of COLUMNS) {
      lines.push('', column.title);
      const cards = byVotes(cardsInColumn(retro, column.id));
      const top = topCards(retro, column.id);
      if (cards.length === 0) lines.push('- (nichts)');
      for (const c of cards) {
        lines.push(`- #${cardNumber(c)} ${c.text}${c.votes > 0 ? ` (${votesText(c.votes)})` : ''}${top.has(c.id) ? ' · Top-Thema' : ''}`);
      }
    }
    lines.push('', `Erstellt mit ${APP.name}`);
    return lines.join('\n');
  }

  // --- Timer (computed from an end time, so throttled background tabs stay accurate) ---

  function clampMinutes(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return TIMER.defaultMinutes;
    return Math.min(TIMER.maxMinutes, Math.max(TIMER.minMinutes, n));
  }

  /** 272 → «04:32» */
  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function remainingSeconds(endMs, nowMs) {
    return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
  }

  /** status: 'ready' | 'running' | 'paused' | 'expired' */
  function newTimer(minutes) {
    return { status: 'ready', remaining: clampMinutes(minutes) * 60, end: null };
  }

  function startTimer(timer, nowMs) {
    if (timer.status === 'running' || timer.remaining <= 0) return timer;
    return { status: 'running', remaining: timer.remaining, end: nowMs + timer.remaining * 1000 };
  }

  function pauseTimer(timer, nowMs) {
    if (timer.status !== 'running') return timer;
    return { status: 'paused', remaining: remainingSeconds(timer.end, nowMs), end: null };
  }

  function tickTimer(timer, nowMs) {
    if (timer.status !== 'running') return timer;
    const remaining = remainingSeconds(timer.end, nowMs);
    return remaining === 0 ? { status: 'expired', remaining: 0, end: null } : { ...timer, remaining };
  }

  return Object.freeze({
    APP, COLUMNS, LIMITS, TIMER, VERSION,
    sanitize, createRetro, setTitle, addCard, deleteCard, vote, cardsInColumn, byVotes, sortBoardByVotes,
    cardNumber, allCards, topCards, restore,
    todayIso, formatDate, votesText, summary,
    clampMinutes, formatTime, remainingSeconds, newTimer, startTimer, pauseTimer, tickTimer,
  });
});
