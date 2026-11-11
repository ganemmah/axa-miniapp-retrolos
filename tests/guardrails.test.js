// Guardrail tests: the AGENTS.md conventions and the security rules, checked on every push before deploying.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../retro-core.js');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const siteScripts = fs.readdirSync(root).filter((f) => f.endsWith('.js'));

test('CSP meta tag with default-src \'self\' and without unsafe-inline/eval', () => {
  const m = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(m, 'CSP meta tag missing');
  assert.match(m[1], /default-src 'self'/);
  assert.match(m[1], /object-src 'none'/);
  assert.doesNotMatch(m[1], /unsafe-inline|unsafe-eval|\*/);
});

test('scripts are classic and deferred, never type="module", never inline', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.deepEqual(scripts.map(([, attrs]) => attrs.match(/src="([^"]+)"/)?.[1]), ['retro-core.js', 'app.js']);
  for (const [, attrs, body] of scripts) {
    assert.match(attrs, /\bdefer\b/, 'script without defer');
    assert.doesNotMatch(attrs, /type="module"/);
    assert.equal(body.trim(), '', 'inline script');
  }
});

test('no <style> block, no style attribute, no inline event handler', () => {
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test('relative paths only (GitHub Pages serves the site from /<repo-name>/)', () => {
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(!ref.startsWith('/'), `leading slash: ${ref}`);
    assert.ok(!/^[a-z]+:\/\//i.test(ref), `external URL: ${ref}`);
  }
});

test('HTML carries the page: headings, inputs and buttons exist without JavaScript', () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'exactly one h1');
  for (const column of core.COLUMNS) {
    assert.ok(html.includes(`id="heading-${column.id}" class="column-title">${column.title}</h2>`), `heading for ${column.id}`);
    assert.ok(html.includes(`id="new-${column.id}"`), `input for ${column.id}`);
    assert.ok(html.includes(`id="cards-${column.id}"`), `list for ${column.id}`);
  }
  for (const id of ['title', 'timer-start', 'timer-reset', 'sound', 'sort', 'copy', 'new-retro', 'zoom']) {
    assert.ok(html.includes(`id="${id}"`), `element #${id}`);
  }
  assert.match(html, /<noscript>/);
  assert.match(html, /Hackathon-Prototyp – keine offizielle AXA-Anwendung/);
});

test('timer markup in HTML matches the settings in retro-core.js', () => {
  for (const minutes of core.TIMER.choices) {
    const pressed = minutes === core.TIMER.defaultMinutes;
    assert.ok(html.includes(`data-minutes="${minutes}" aria-pressed="${pressed}"`), `chip ${minutes}`);
  }
  assert.ok(html.includes(`>${core.formatTime(core.TIMER.defaultMinutes * 60)}</span>`));
});

test('every form control has a label', () => {
  for (const [, id] of html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)) {
    assert.ok(html.includes(`<label for="${id}"`), `label for #${id}`);
  }
});

test('site scripts: no external URL, no network access, no HTML strings, no eval, no ES module syntax', () => {
  assert.deepEqual(siteScripts.sort(), ['app.js', 'retro-core.js']);
  for (const file of siteScripts) {
    const code = read(file);
    assert.doesNotMatch(code, /https?:\/\//, `external URL in ${file}`);
    assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/, `network access in ${file}`);
    assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, `HTML injection risk in ${file}`);
    assert.doesNotMatch(code, /\beval\s*\(|new Function\s*\(/, `eval in ${file}`);
    assert.doesNotMatch(code, /^\s*(import|export)\s/m, `ES module syntax in ${file}`);
  }
});

test('CSS: tokens on :root, dark mode, reduced motion, nothing loaded from elsewhere', () => {
  const css = read('styles.css');
  assert.match(css, /^:root \{/m);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /@import|url\(/i);
  // Outside the token blocks, colours come from tokens only
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root \{[\s\S]*?\n\}/g, '').replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\n\}/, '');
  assert.doesNotMatch(rules, /#[0-9a-f]{3,6}\b/i, 'raw hex colour outside the token block');
});

test('no package.json, node_modules or lockfile (AGENTS.md stack exclusions)', () => {
  for (const f of ['package.json', 'package-lock.json', 'node_modules', 'yarn.lock', 'pnpm-lock.yaml']) {
    assert.ok(!fs.existsSync(path.join(root, f)), `${f} must not exist`);
  }
});

test('mini-app profile miniapp.json is complete', () => {
  const p = JSON.parse(read('miniapp.json'));
  for (const field of ['id', 'name', 'version', 'purpose', 'audience', 'owner', 'status', 'riskLevel', 'lifecycle', 'data', 'networkAccess', 'ai', 'hosting']) {
    assert.ok(p[field] != null, `missing field: ${field}`);
  }
  assert.ok(p.owner.role && p.owner.deputy, 'owner needs a role and a deputy');
  assert.match(p.lifecycle.nextReview, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(p.data.personalData, false);
  assert.equal(p.data.customerData, false);
  assert.equal(p.data.serverSideStorage, false);
  assert.deepEqual(p.dependencies, []);
});
