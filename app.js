/* RetroBoard Lite – operations layered on index.html.
 *
 * The page structure (toolbar, three columns, buttons) is plain HTML; this script only adds behaviour:
 * cards in the three lists, voting, timer, gong, zoom dialog, copy, and saving in localStorage.
 * Classic deferred script inside an IIFE: no globals of its own. Depends on retro-core.js (window.RetroCore).
 * Text is always inserted as text nodes, never as HTML (no injection through card texts; the CSP forbids inline code).
 */
(function () {
  'use strict';

  const core = window.RetroCore;
  if (!core) return;

  // --- DOM helpers -----------------------------------------------------------

  /** h('button', { class: 'vote', 'data-id': 'k1' }, 'Text', childNode) – attributes and children, no HTML strings. */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs ?? {})) {
      if (value == null || value === false) continue;
      if (name === 'class') el.className = String(value);
      else if (value === true) el.setAttribute(name, '');
      else el.setAttribute(name, String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false || child === '') continue;
      el.append(child instanceof Node ? child : String(child));
    }
    return el;
  }

  const byId = (id) => document.getElementById(id);

  let toastTimer = 0;
  /** Short status message at the bottom (also announced by screen readers). */
  function toast(text) {
    const el = byId('toast');
    el.textContent = text;
    el.classList.add('toast-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('toast-visible'), 3200);
  }

  /** Copy to the clipboard, with a fallback where the Clipboard API is missing or not allowed (e.g. file://). */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const before = document.activeElement;
      const area = h('textarea', { class: 'visually-hidden', 'aria-hidden': 'true', readonly: true });
      area.value = text;
      document.body.append(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      if (before instanceof HTMLElement) before.focus();
      return ok;
    }
  }

  // --- Storage: every access in try/catch; the app also works without it ----

  function openStorage() {
    try {
      const s = window.localStorage;
      const probe = '__retroboard-probe__';
      s.setItem(probe, probe);
      s.removeItem(probe);
      return s;
    } catch {
      return null;
    }
  }

  const storage = openStorage();
  let saveWarned = false;

  function load() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(core.APP.storageKey);
      return raw ? core.restore(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function save() {
    if (!storage) return;
    try {
      storage.setItem(core.APP.storageKey, JSON.stringify(retro));
    } catch {
      if (!saveWarned) {
        saveWarned = true;
        toast('Speichern im Browser ist fehlgeschlagen. Bitte am Schluss das Ergebnis kopieren.');
      }
    }
  }

  function clearSaved() {
    if (!storage) return;
    try { storage.removeItem(core.APP.storageKey); } catch { /* nothing to do */ }
  }

  // --- Gong: generated with the Web Audio API, no audio file -----------------
  // Browsers only allow sound after a user action, so the context is prepared on a click
  // («Start» or 🔔) and played later when the timer expires.

  let audio = null;

  function prepareSound() {
    try {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtx) return;
      audio ??= new AudioCtx();
      if (audio.state === 'suspended') audio.resume();
    } catch {
      audio = null;
    }
  }

  /** Soft two-tone gong (E5, then C5) with a quiet overtone, fading out over about 2 seconds. */
  function gong() {
    if (!audio) return;
    try {
      const t0 = audio.currentTime;
      for (const [frequency, start] of [[659.25, 0], [523.25, 0.5]]) {
        for (const [factor, volume] of [[1, 0.3], [2.76, 0.06]]) {
          const osc = audio.createOscillator();
          const envelope = audio.createGain();
          osc.type = 'sine';
          osc.frequency.value = frequency * factor;
          envelope.gain.setValueAtTime(0.0001, t0 + start);
          envelope.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.02);
          envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 2.2);
          osc.connect(envelope).connect(audio.destination);
          osc.start(t0 + start);
          osc.stop(t0 + start + 2.3);
        }
      }
    } catch {
      // Without sound it still works: the display blinks and a message appears.
    }
  }

  // --- State -----------------------------------------------------------------

  let retro = load() ?? core.createRetro(core.todayIso());
  /** Id of the card just added, so only that one plays the "stick on" animation. */
  let newCardId = null;
  let timerMinutes = core.TIMER.defaultMinutes;
  let timer = core.newTimer(timerMinutes);
  let timerInterval = 0;
  let soundOn = true;
  let zoomId = null;

  const els = {
    title: byId('title'),
    timer: byId('timer'),
    timerDisplay: byId('timer-display'),
    timerStart: byId('timer-start'),
    timerChoices: [...document.querySelectorAll('#timer [data-minutes]')],
    sound: byId('sound'),
    board: document.querySelector('.board'),
    notice: byId('notice'),
    zoom: byId('zoom'),
    lists: new Map(core.COLUMNS.map((c) => [c.id, byId(`cards-${c.id}`)])),
  };

  function change(next, focusId) {
    retro = next;
    save();
    renderCards(focusId);
  }

  // --- Rendering: only the card lists and the timer change -------------------

  function renderCards(focusId) {
    const activeId = focusId ?? document.activeElement?.id;
    for (const column of core.COLUMNS) {
      const top = core.topCards(retro, column.id);
      const items = core.cardsInColumn(retro, column.id).map((card) => cardItem(card, top.has(card.id)));
      els.lists.get(column.id).replaceChildren(...items);
    }
    const target = activeId ? byId(activeId) : null;
    if (target) target.focus({ preventScroll: true });
  }

  function cardItem(card, isTop) {
    const nr = core.cardNumber(card);
    const classes = ['card', card.id === newCardId && 'card-new', isTop && 'card-top'].filter(Boolean).join(' ');
    return h('li', { class: classes, title: isTop ? 'Top-Thema: meiste Stimmen in dieser Spalte' : null },
      isTop && h('span', { class: 'visually-hidden' }, 'Top-Thema'),
      h('button', {
        type: 'button', class: 'card-delete', id: `delete-${card.id}`, 'data-action': 'delete', 'data-id': card.id,
        title: 'Zettel löschen', 'aria-label': `«${card.text}» löschen`,
      }, '×'),
      h('button', {
        type: 'button', class: 'card-text', id: `open-${card.id}`, 'data-action': 'open', 'data-id': card.id,
        title: 'Gross anzeigen', 'aria-label': `Zettel ${nr}: ${card.text}, gross anzeigen`,
      }, card.text),
      h('div', { class: 'card-votes' },
        h('button', {
          type: 'button', class: 'vote', id: `vote-${card.id}`, 'data-action': 'vote', 'data-id': card.id,
          'aria-label': `Stimme geben (bisher ${core.votesText(card.votes)})`,
        }, '👍 ', String(card.votes)),
        card.votes > 0 && h('button', {
          type: 'button', class: 'unvote', id: `unvote-${card.id}`, 'data-action': 'unvote', 'data-id': card.id,
          title: 'Stimme zurücknehmen', 'aria-label': 'Eine Stimme zurücknehmen',
        }, '−'),
        h('span', { class: 'card-number', title: `Zettel Nummer ${nr}` }, `#${nr}`)));
  }

  function renderTimer() {
    els.timer.className = `timer timer-${timer.status}`;
    els.timerDisplay.textContent = core.formatTime(timer.remaining);
    els.timerStart.textContent = { running: '⏸ Pause', paused: '▶ Weiter', ready: '▶ Start', expired: '▶ Neu' }[timer.status];
    els.timerStart.classList.toggle('button-primary', timer.status !== 'running');
    for (const button of els.timerChoices) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.minutes) === timerMinutes));
    }
    els.sound.textContent = soundOn ? '🔔' : '🔕';
    els.sound.setAttribute('aria-pressed', String(soundOn));
    els.sound.title = soundOn ? 'Gong am Timer-Ende ist an' : 'Gong am Timer-Ende ist aus';
  }

  // --- Cards: one listener for the whole board -------------------------------

  for (const form of document.querySelectorAll('.card-form')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.elements.namedItem('text');
      const next = core.addCard(retro, form.dataset.column, input.value);
      if (next === retro) return;
      input.value = '';
      newCardId = next.cards.at(-1).id;
      change(next, input.id);
      newCardId = null; // animate only on first appearance, not on every re-render
    });
  }

  els.board.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    const card = retro.cards.find((c) => c.id === id);
    if (!card) return;
    if (action === 'vote') change(core.vote(retro, id, +1));
    if (action === 'unvote') change(core.vote(retro, id, -1), card.votes > 1 ? `unvote-${id}` : `vote-${id}`);
    if (action === 'delete') change(core.deleteCard(retro, id), `new-${card.column}`);
    if (action === 'open') openZoom(id);
  });

  // --- Toolbar ---------------------------------------------------------------

  els.title.value = retro.title;
  els.title.addEventListener('input', () => {
    retro = core.setTitle(retro, els.title.value);
    save();
  });

  for (const button of els.timerChoices) {
    button.addEventListener('click', () => {
      stopInterval();
      timerMinutes = Number(button.dataset.minutes);
      timer = core.newTimer(timerMinutes);
      renderTimer();
    });
  }

  els.timerStart.addEventListener('click', () => {
    const now = Date.now();
    if (timer.status === 'running') {
      timer = core.pauseTimer(timer, now);
      stopInterval();
    } else {
      if (soundOn) prepareSound(); // now, during the click, so the browser allows the gong later
      if (timer.status === 'expired') timer = core.newTimer(timerMinutes);
      timer = core.startTimer(timer, now);
      stopInterval();
      timerInterval = window.setInterval(tick, 250);
    }
    renderTimer();
  });

  byId('timer-reset').addEventListener('click', resetTimer);

  els.sound.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn) { prepareSound(); gong(); } // short preview when switching on
    renderTimer();
  });

  function tick() {
    const before = timer.status;
    timer = core.tickTimer(timer, Date.now());
    els.timerDisplay.textContent = core.formatTime(timer.remaining);
    if (timer.status !== before) {
      stopInterval();
      if (soundOn) gong();
      toast('⏱ Die Zeit ist abgelaufen.');
      renderTimer();
    }
  }

  function stopInterval() {
    clearInterval(timerInterval);
    timerInterval = 0;
  }

  function resetTimer() {
    stopInterval();
    timer = core.newTimer(timerMinutes);
    renderTimer();
  }

  // --- Actions below the board ------------------------------------------------

  byId('sort').addEventListener('click', () => {
    const next = core.sortBoardByVotes(retro);
    if (next === retro) {
      toast(retro.cards.length ? 'Die Zettel sind schon nach Stimmen sortiert.' : 'Noch keine Zettel zum Sortieren.');
      return;
    }
    change(next);
    toast('Nach Stimmen sortiert: die wichtigsten stehen oben.');
  });

  byId('copy').addEventListener('click', async () => {
    const ok = await copyText(core.summary(retro));
    toast(ok ? 'Kopiert. Jetzt in Teams oder in eine Mail einfügen.' : 'Kopieren hat nicht geklappt.');
  });

  byId('new-retro').addEventListener('click', () => {
    if (retro.cards.length > 0 && !window.confirm('Neue Retro starten? Alle Karten werden gelöscht.\n\nTipp: Vorher «Ergebnis kopieren».')) return;
    clearSaved();
    resetTimer();
    els.title.value = '';
    change(core.createRetro(core.todayIso()), 'title');
  });

  // --- Zoom dialog: one card large, for discussing on the projector ----------

  function openZoom(id) {
    zoomId = id;
    renderZoom();
    if (!els.zoom.open) els.zoom.showModal();
    byId('zoom-close')?.focus(); // showModal would otherwise focus the first button
  }

  function renderZoom(focusId) {
    const cards = core.allCards(retro);
    const index = cards.findIndex((c) => c.id === zoomId);
    if (index < 0) { els.zoom.close(); return; }
    const card = cards[index];
    const column = core.COLUMNS.find((c) => c.id === card.column);
    const isTop = core.topCards(retro, card.column).has(card.id);
    els.zoom.replaceChildren(
      h('div', { class: `zoom-note note-${column.id}${isTop ? ' zoom-note-top' : ''}` },
        h('p', { class: 'zoom-header' }, h('span', {}, column.title), h('span', { class: 'zoom-number' }, `#${core.cardNumber(card)}`)),
        h('p', { id: 'zoom-text', class: 'zoom-text' }, card.text),
        h('p', { class: 'zoom-votes' }, `👍 ${core.votesText(card.votes)}`, isTop && h('span', { class: 'zoom-top' }, '· Top-Thema'))),
      h('div', { class: 'zoom-controls' },
        h('button', { type: 'button', class: 'button', id: 'zoom-prev', disabled: index === 0 }, '‹ Zurück'),
        h('span', { class: 'zoom-position', 'aria-live': 'polite' }, `${index + 1} von ${cards.length}`),
        h('button', { type: 'button', class: 'button', id: 'zoom-next', disabled: index === cards.length - 1 }, 'Weiter ›'),
        h('button', { type: 'button', class: 'button button-primary', id: 'zoom-close' }, 'Schliessen')));
    let target = focusId ? byId(focusId) : null;
    // If «Weiter» is disabled at the end, fall back to «Schliessen» so focus stays inside the dialog
    if (!target || target.disabled) target = byId('zoom-close');
    target?.focus();
  }

  function browse(step) {
    const cards = core.allCards(retro);
    const next = cards[cards.findIndex((c) => c.id === zoomId) + step];
    if (!next) return;
    zoomId = next.id;
    renderZoom(step > 0 ? 'zoom-next' : 'zoom-prev');
  }

  els.zoom.addEventListener('click', (event) => {
    if (event.target === els.zoom) { els.zoom.close(); return; } // click next to the note closes
    const button = event.target.closest('button');
    if (button?.id === 'zoom-prev') browse(-1);
    if (button?.id === 'zoom-next') browse(+1);
    if (button?.id === 'zoom-close') els.zoom.close();
  });
  els.zoom.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') browse(+1);
    if (event.key === 'ArrowLeft') browse(-1);
  });
  els.zoom.addEventListener('close', () => {
    const id = zoomId;
    zoomId = null;
    els.zoom.replaceChildren();
    byId(`open-${id}`)?.focus(); // back to the card that was shown last
  });

  // --- Start -----------------------------------------------------------------

  if (!storage) {
    els.notice.textContent = 'Bitte keine Kunden- oder Personendaten eintragen. Dieser Browser speichert nichts: Kopieren Sie am Schluss das Ergebnis.';
  }
  renderCards();
  renderTimer();
})();
