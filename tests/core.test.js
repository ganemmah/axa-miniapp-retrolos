// Unit tests for retro-core.js (board, votes, sorting, numbers, restore). Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../retro-core.js');

const empty = () => core.createRetro('2026-11-10');

test('a new retro has a date, no title and no cards', () => {
  assert.deepEqual(empty(), { version: 3, title: '', date: '2026-11-10', cards: [], nextNr: 1 });
  assert.equal(core.createRetro('yesterday').date, '');
});

test('adding a card cleans the text and ignores empty text and unknown columns', () => {
  const r0 = empty();
  const r1 = core.addCard(r0, 'good', '  Gute   Aufgabenteilung  ');
  assert.deepEqual(r1.cards, [{ id: 'k1', column: 'good', text: 'Gute Aufgabenteilung', votes: 0 }]);
  assert.equal(r0.cards.length, 0, 'input stays unchanged');
  assert.equal(core.addCard(r1, 'good', '   '), r1);
  assert.equal(core.addCard(r1, 'unknown', 'Text'), r1);
  assert.equal(core.addCard(r0, 'good', 'x'.repeat(1000)).cards[0].text.length, core.LIMITS.card);
});

test('voting up and down never goes below zero; deleting removes the card', () => {
  let r = core.addCard(empty(), 'good', 'A');
  r = core.vote(core.vote(r, 'k1'), 'k1');
  assert.equal(r.cards[0].votes, 2);
  assert.equal(core.vote(r, 'k1', -1).cards[0].votes, 1);
  assert.equal(core.vote(core.vote(core.vote(r, 'k1', -1), 'k1', -1), 'k1', -1).cards[0].votes, 0);
  assert.equal(core.deleteCard(r, 'k1').cards.length, 0);
});

test('voting never reorders the board; «Nach Stimmen sortieren» sorts once and the order is kept', () => {
  let r = empty();
  for (const t of ['A', 'B', 'C', 'D']) r = core.addCard(r, 'bad', t);
  r = core.addCard(r, 'good', 'other column');
  r = core.vote(core.vote(r, 'k3'), 'k3');
  r = core.vote(r, 'k2');
  r = core.vote(r, 'k4');
  const texts = (retro) => core.cardsInColumn(retro, 'bad').map((c) => c.text);
  assert.deepEqual(texts(r), ['A', 'B', 'C', 'D'], 'voting moves nothing');
  r = core.sortBoardByVotes(r);
  assert.deepEqual(texts(r), ['C', 'B', 'D', 'A'], 'ties keep their order');
  assert.equal(core.sortBoardByVotes(r), r, 'already sorted: same object');
  r = core.vote(core.vote(core.vote(r, 'k1'), 'k1'), 'k1');
  r = core.addCard(r, 'bad', 'E');
  assert.deepEqual(texts(r), ['C', 'B', 'D', 'A', 'E'], 'stays put after sorting; new cards at the end');
  assert.deepEqual(core.restore(JSON.parse(JSON.stringify(r))).cards, r.cards, 'order survives saving');
});

test('top topic: most votes per column, all on a tie, none without votes', () => {
  let r = empty();
  for (const t of ['A', 'B', 'C']) r = core.addCard(r, 'bad', t);
  r = core.addCard(r, 'good', 'D');
  assert.deepEqual([...core.topCards(r, 'bad')], []);
  r = core.vote(core.vote(r, 'k2'), 'k2');
  r = core.vote(r, 'k3');
  assert.deepEqual([...core.topCards(r, 'bad')], ['k2']);
  r = core.vote(r, 'k3');
  assert.deepEqual([...core.topCards(r, 'bad')].sort(), ['k2', 'k3']);
  assert.deepEqual([...core.topCards(r, 'good')], []);
});

test('all cards in display order: column by column, as on the board', () => {
  let r = empty();
  r = core.addCard(r, 'change', 'Z');
  r = core.addCard(r, 'good', 'A');
  r = core.addCard(r, 'good', 'B');
  r = core.vote(r, 'k3');
  assert.deepEqual(core.allCards(r).map((c) => c.text), ['A', 'B', 'Z']);
  assert.deepEqual(core.allCards(core.sortBoardByVotes(r)).map((c) => c.text), ['B', 'A', 'Z']);
});

test('card numbers are fixed: independent of votes, with a gap after a delete', () => {
  let r = empty();
  for (const t of ['A', 'B', 'C']) r = core.addCard(r, 'good', t);
  r = core.vote(core.deleteCard(r, 'k2'), 'k3');
  assert.deepEqual(core.sortBoardByVotes(r).cards.map((c) => `#${core.cardNumber(c)} ${c.text}`), ['#3 C', '#1 A']);
  r = core.addCard(r, 'good', 'D');
  assert.equal(core.cardNumber(r.cards.at(-1)), 4, 'a deleted number is never reused');
});

test('title is cleaned and cut', () => {
  assert.equal(core.setTitle(empty(), '  Sprint   42 ').title, 'Sprint 42');
  assert.equal(core.setTitle(empty(), 'x'.repeat(500)).title.length, core.LIMITS.title);
});

test('restore: valid data survives a JSON round trip', () => {
  let r = core.addCard(core.setTitle(empty(), 'Sprint 42'), 'good', 'A');
  r = core.vote(core.addCard(r, 'change', 'B'), 'k2');
  assert.deepEqual(core.restore(JSON.parse(JSON.stringify(r))), r);
});

test('restore: wrong structure gives null, invalid cards are dropped, no id is reused', () => {
  for (const broken of [null, 42, 'text', [], {}, { version: 2 }]) assert.equal(core.restore(broken), null);
  const r = core.restore({
    version: 3,
    title: 'T',
    date: '2026-11-10',
    cards: [
      { id: 'k1', column: 'good', text: 'ok', votes: 2 },
      { id: 'k2', column: 'unknown', text: 'wrong column' },
      { id: 'k3', column: 'good', text: '   ' },
      { id: 'k9', column: 'change', text: 'negative votes', votes: -4 },
      { column: 'good', text: 'no id' },
      null,
    ],
    nextNr: 2,
  });
  assert.deepEqual(r.cards.map((c) => c.id), ['k1', 'k9']);
  assert.equal(r.cards[1].votes, 0);
  assert.equal(r.nextNr, 10);
});

test('exactly three columns with unique lowercase ids', () => {
  assert.equal(core.COLUMNS.length, 3);
  assert.equal(new Set(core.COLUMNS.map((c) => c.id)).size, 3);
  for (const c of core.COLUMNS) assert.match(c.id, /^[a-z]+$/);
});
