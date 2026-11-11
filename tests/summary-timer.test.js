// Unit tests for the copy summary, dates and the timer in retro-core.js. Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../retro-core.js');

test('summary: date, sorted by votes, numbers, top topic, empty column', () => {
  let r = core.createRetro('2026-11-10');
  r = core.addCard(r, 'good', 'Gute Aufgabenteilung');
  r = core.addCard(r, 'bad', 'Testserver oft down');
  r = core.addCard(r, 'bad', 'Zu viele Meetings');
  for (let i = 0; i < 4; i++) r = core.vote(r, 'k3');
  r = core.vote(r, 'k2');
  assert.equal(core.summary(r), [
    'Retro vom 10.11.2026',
    '',
    'Was lief gut?',
    '- #1 Gute Aufgabenteilung',
    '',
    'Was lief schlecht?',
    '- #3 Zu viele Meetings (4 Stimmen) · Top-Thema',
    '- #2 Testserver oft down (1 Stimme)',
    '',
    'Was machen wir anders?',
    '- (nichts)',
    '',
    'Erstellt mit RetroBoard Lite',
  ].join('\n'));
});

test('summary header with title, without title and without date', () => {
  assert.match(core.summary(core.setTitle(core.createRetro('2026-11-10'), 'Sprint 42')), /^Retro «Sprint 42» · 10\.11\.2026\n/);
  assert.match(core.summary(core.setTitle(core.createRetro(), 'Sprint 42')), /^Retro «Sprint 42»\n/);
  assert.match(core.summary(core.createRetro()), /^Retro\n/);
});

test('date and vote helpers', () => {
  assert.equal(core.formatDate('2026-11-10'), '10.11.2026');
  assert.equal(core.formatDate('broken'), '');
  assert.equal(core.todayIso(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(core.votesText(0), '0 Stimmen');
  assert.equal(core.votesText(1), '1 Stimme');
});

test('time is shown as MM:SS', () => {
  assert.equal(core.formatTime(272), '04:32');
  assert.equal(core.formatTime(0), '00:00');
  assert.equal(core.formatTime(-5), '00:00');
  assert.equal(core.formatTime(59.2), '01:00', 'partial seconds round up');
  assert.equal(core.formatTime(3600), '60:00');
});

test('minutes are clamped to 1–60', () => {
  assert.equal(core.clampMinutes('5'), 5);
  assert.equal(core.clampMinutes(0), 1);
  assert.equal(core.clampMinutes(999), 60);
  assert.equal(core.clampMinutes('abc'), 5);
  assert.equal(core.clampMinutes(2.6), 3);
});

test('timer: start, pause, resume and expire', () => {
  let t = core.newTimer(1);
  assert.deepEqual(t, { status: 'ready', remaining: 60, end: null });
  t = core.startTimer(t, 0);
  assert.equal(t.status, 'running');
  t = core.tickTimer(t, 20_000);
  assert.equal(t.remaining, 40);
  t = core.pauseTimer(t, 25_000);
  assert.deepEqual(t, { status: 'paused', remaining: 35, end: null });
  assert.equal(core.tickTimer(t, 99_000), t, 'paused does not run');
  t = core.startTimer(t, 100_000);
  t = core.tickTimer(t, 134_500);
  assert.equal(t.remaining, 1);
  t = core.tickTimer(t, 135_000);
  assert.deepEqual(t, { status: 'expired', remaining: 0, end: null });
  assert.equal(core.startTimer(t, 0), t, 'an expired timer only restarts after a reset');
});

test('timer choices contain the default duration', () => {
  assert.ok(core.TIMER.choices.includes(core.TIMER.defaultMinutes));
});
