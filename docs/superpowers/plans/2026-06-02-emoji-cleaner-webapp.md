# emoji-cleaner web app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file HTML app that removes decorative emojis from pasted text and uploaded files, with configurable preset-based preserve lists and inline diff preview.

**Architecture:** Pure vanilla JS + CSS embedded in one `index.html`. Engine functions live in `src/engine.js` and `src/presets.js` during development (testable via Node.js), then get inlined into `index.html` in the final task. UI uses a simple state array + render pattern with no framework.

**Tech Stack:** HTML5, vanilla JS (ES2022, `u` flag regex), CSS custom properties, `localStorage`, `Blob` + `URL.createObjectURL` for downloads, inline zip writer for bulk export.

---

## File Structure

| File | Purpose |
|------|---------|
| `src/engine.js` | Pure functions: detectEmojis, cleanText, buildDiffSegments |
| `src/presets.js` | Pure functions: preset CRUD, preserveSet calculation, localStorage |
| `tests/engine.test.js` | Node.js tests for engine.js |
| `tests/presets.test.js` | Node.js tests for presets.js |
| `index.html` | Final deliverable — engine + presets + UI all inlined |

`src/` and `tests/` are development artifacts. The deliverable is `index.html` only.

---

### Task 0: Init repo

**Files:** none

- [ ] **Step 1: Initialize git repo**

```
git init
git commit --allow-empty -m "chore: init repo"
```

---

### Task 1: Emoji engine — detectEmojis

**Files:**
- Create: `src/engine.js`
- Create: `tests/engine.test.js`

- [ ] **Step 1: Create `src/engine.js` with the emoji regex and `detectEmojis`**

The character class is translated from `_EMOJIS` in `EMOJI/emoji_scan/icono.py` lines 76–104.

```js
// src/engine.js

// Full emoji regex, ported from icono.py _EMOJIS ranges (Unicode 17.0)
// Matches complete sequences: base emoji + optional skin tone + optional VS16
// + optional ZWJ chain
const _BASE_CLASS = (
  '\u{1F600}-\u{1F64F}' +  // Emoticons
  '\u{1F300}-\u{1F5FF}' +  // Symbols & pictograms
  '\u{1F680}-\u{1F6FF}' +  // Transport & maps
  '\u{1F700}-\u{1F77F}' +  // Alchemical
  '\u{1F780}-\u{1F7FF}' +  // Geometric extended
  '\u{1F800}-\u{1F8FF}' +  // Supplemental arrows
  '\u{1F900}-\u{1F9FF}' +  // Supplemental symbols
  '\u{1FA00}-\u{1FA6F}' +  // Chess extended
  '\u{1FA70}-\u{1FAFF}' +  // Pictograms extended-A
  '\u{1F004}-\u{1F1FF}' +  // Cards, games, regional indicators (flags)
  // BMP — confirmed in Unicode 17.0 (icono.py lines 88–103)
  // NOTE: characters below are literals. If any appear corrupted after copy-paste,
  // cross-reference with icono.py lines 88–103 and restore using \uXXXX escapes.
  '‼⁉ℹ⌨⏏Ⓜ⚧⛈' +
  '⌚-⌛⏩-⏳⏸-⏺' +
  '▪-▫▶◀◻-◾' +
  '☀-☄☎☑☔-☕☘☝' +
  '☠☢-☣☦☪☮-☯' +
  '☸-☺♀♂♈-♓' +
  '♟-♠♣♥-♦♨' +
  '♻♾-♿⚒-⚗⚙⚛-⚜' +
  '⚠-⚡⚪-⚫⚰-⚱' +
  '⚽-⚾⛄-⛅⛎-⛏' +
  '⛑⛓-⛔⛩-⛪⛰-⛵⛷-⛺⛽' +
  '✂✅✈-✍✏✒✔✖✝✡✨' +
  '✳-✴❄❇❌❎❓-❕❗❣-❤' +
  '➕-➗➡➰➿⤴-⤵' +
  '⬅-⬇⬛-⬜⭐⭕' +
  '〰〽㊗㊙'
);

const SKIN_TONE = '\u{1F3FB}-\u{1F3FF}';
const VS16      = '️';
const ZWJ       = '\u{200D}';

// Matches a full emoji sequence: base + optional skin tone + optional VS16
// + optional ZWJ chain of the same pattern
const EMOJI_RE = new RegExp(
  `(?:[${_BASE_CLASS}])` +
  `(?:[${SKIN_TONE}])?` +
  `(?:${VS16})?` +
  `(?:${ZWJ}(?:[${_BASE_CLASS}])(?:[${SKIN_TONE}])?(?:${VS16})?)*`,
  'gu'
);

/**
 * Finds all emoji positions in text.
 * @param {string} text
 * @param {Set<string>} preserveSet - emoji strings to preserve
 * @returns {{ start: number, end: number, emoji: string, preserved: boolean }[]}
 */
function detectEmojis(text, preserveSet = new Set()) {
  const results = [];
  EMOJI_RE.lastIndex = 0;
  let m;
  while ((m = EMOJI_RE.exec(text)) !== null) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      emoji: m[0],
      preserved: preserveSet.has(m[0]) || preserveSet.has(m[0].replace(/️$/, '')),
    });
  }
  return results;
}

if (typeof module !== 'undefined') module.exports = { detectEmojis, EMOJI_RE };
```

- [ ] **Step 2: Write failing tests**

```js
// tests/engine.test.js
const assert = require('assert');
const { detectEmojis } = require('../src/engine.js');

// Test 1: detects decorative emoji
{
  const result = detectEmojis('Hello 🚀 world');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '🚀');
  assert.strictEqual(result[0].preserved, false);
  console.log('PASS: detects decorative emoji');
}

// Test 2: marks preserved emoji
{
  const preserve = new Set(['✅']);
  const result = detectEmojis('✅ done 🎉', preserve);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].preserved, true);   // ✅
  assert.strictEqual(result[1].preserved, false);  // 🎉
  console.log('PASS: marks preserved emoji');
}

// Test 3: detects multiple in sequence
{
  const result = detectEmojis('🚀✨🎉');
  assert.strictEqual(result.length, 3);
  console.log('PASS: detects multiple in sequence');
}

// Test 4: empty string returns empty
{
  const result = detectEmojis('');
  assert.strictEqual(result.length, 0);
  console.log('PASS: empty string');
}

// Test 5: no emoji returns empty
{
  const result = detectEmojis('hello world');
  assert.strictEqual(result.length, 0);
  console.log('PASS: no emoji');
}

// Test 6: BMP emoji (✅ is U+2705)
{
  const result = detectEmojis('✅ ok');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '✅');
  console.log('PASS: BMP emoji detected');
}

// Test 7: skin tone sequence treated as one unit
{
  const result = detectEmojis('👋🏽 hi');
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].emoji.includes('👋'));
  console.log('PASS: skin tone sequence as one unit');
}

// Test 8: start/end positions are correct
{
  const text = 'ab🚀cd';
  const result = detectEmojis(text);
  assert.strictEqual(result[0].start, 2);
  assert.strictEqual(text.slice(result[0].start, result[0].end), '🚀');
  console.log('PASS: correct positions');
}

console.log('\nAll engine tests passed.');
```

- [ ] **Step 3: Run tests — expect failure**

```
node tests/engine.test.js
```

Expected: `Cannot find module '../src/engine.js'` or `ReferenceError`

- [ ] **Step 4: Run tests — expect pass**

```
node tests/engine.test.js
```

Expected:
```
PASS: detects decorative emoji
PASS: marks preserved emoji
PASS: detects multiple in sequence
PASS: empty string
PASS: no emoji
PASS: BMP emoji detected
PASS: skin tone sequence as one unit
PASS: correct positions

All engine tests passed.
```

- [ ] **Step 5: Commit**

```
git add src/engine.js tests/engine.test.js
git commit -m "feat: emoji detection engine with Unicode 17.0 ranges"
```

---

### Task 2: Emoji engine — cleanText + buildDiffSegments

**Files:**
- Modify: `src/engine.js`
- Modify: `tests/engine.test.js`

- [ ] **Step 1: Add `cleanText` and `buildDiffSegments` to `src/engine.js`**

Append to `src/engine.js` (before the `module.exports` line):

```js
/**
 * Returns text with non-preserved emojis removed.
 * @param {string} text
 * @param {Set<string>} preserveSet
 * @returns {string}
 */
function cleanText(text, preserveSet = new Set()) {
  const detections = detectEmojis(text, preserveSet);
  if (detections.length === 0) return text;
  let result = '';
  let cursor = 0;
  for (const d of detections) {
    result += text.slice(cursor, d.start);
    if (d.preserved) result += d.emoji;
    cursor = d.end;
  }
  result += text.slice(cursor);
  return result;
}

/**
 * Builds segments for diff rendering.
 * @param {string} text
 * @param {{ start: number, end: number, emoji: string, preserved: boolean }[]} detections
 * @returns {{ type: 'plain'|'keep'|'del', text: string }[]}
 */
function buildDiffSegments(text, detections) {
  const segments = [];
  let cursor = 0;
  for (const d of detections) {
    if (d.start > cursor) {
      segments.push({ type: 'plain', text: text.slice(cursor, d.start) });
    }
    segments.push({ type: d.preserved ? 'keep' : 'del', text: d.emoji });
    cursor = d.end;
  }
  if (cursor < text.length) {
    segments.push({ type: 'plain', text: text.slice(cursor) });
  }
  return segments;
}
```

Update `module.exports`:
```js
if (typeof module !== 'undefined') module.exports = { detectEmojis, cleanText, buildDiffSegments, EMOJI_RE };
```

- [ ] **Step 2: Add tests to `tests/engine.test.js`**

Append before the final `console.log`:

```js
// cleanText tests
{
  const preserve = new Set(['✅']);
  const result = cleanText('✅ deploy 🚀 done 🎉', preserve);
  assert.strictEqual(result, '✅ deploy  done ');
  console.log('PASS: cleanText removes non-preserved');
}

{
  const result = cleanText('no emojis here', new Set());
  assert.strictEqual(result, 'no emojis here');
  console.log('PASS: cleanText no-op on plain text');
}

{
  const preserve = new Set(['✅', '❌']);
  const result = cleanText('✅✅❌🚀', preserve);
  assert.strictEqual(result, '✅✅❌');
  console.log('PASS: cleanText multiple preserved');
}

// buildDiffSegments tests
{
  const preserve = new Set(['✅']);
  const text = '✅ done 🚀';
  const detections = detectEmojis(text, preserve);
  const segs = buildDiffSegments(text, detections);
  assert.strictEqual(segs[0].type, 'keep');
  assert.strictEqual(segs[0].text, '✅');
  assert.strictEqual(segs[1].type, 'plain');
  assert.strictEqual(segs[2].type, 'del');
  assert.strictEqual(segs[2].text, '🚀');
  console.log('PASS: buildDiffSegments types correct');
}

{
  const text = 'plain text';
  const segs = buildDiffSegments(text, []);
  assert.strictEqual(segs.length, 1);
  assert.strictEqual(segs[0].type, 'plain');
  assert.strictEqual(segs[0].text, 'plain text');
  console.log('PASS: buildDiffSegments plain-only');
}
```

- [ ] **Step 3: Run tests**

```
node tests/engine.test.js
```

Expected: all tests pass including new ones.

- [ ] **Step 4: Commit**

```
git add src/engine.js tests/engine.test.js
git commit -m "feat: cleanText and buildDiffSegments"
```

---

### Task 3: Preset model

**Files:**
- Create: `src/presets.js`
- Create: `tests/presets.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/presets.test.js
const assert = require('assert');

// Mock localStorage for Node.js
const _store = {};
global.localStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v; },
  removeItem: (k) => { delete _store[k]; },
};

const { DEFAULT_PRESETS, loadPresets, savePresets, buildPreserveSet } = require('../src/presets.js');

// Test 1: DEFAULT_PRESETS structure
{
  assert.ok(Array.isArray(DEFAULT_PRESETS));
  assert.ok(DEFAULT_PRESETS.length >= 4);
  assert.ok(DEFAULT_PRESETS[0].id);
  assert.ok(DEFAULT_PRESETS[0].name);
  assert.ok(Array.isArray(DEFAULT_PRESETS[0].emojis));
  assert.ok(typeof DEFAULT_PRESETS[0].enabled === 'boolean');
  console.log('PASS: DEFAULT_PRESETS structure');
}

// Test 2: loadPresets returns defaults when localStorage is empty
{
  const presets = loadPresets();
  assert.strictEqual(presets.length, DEFAULT_PRESETS.length);
  console.log('PASS: loadPresets returns defaults on first load');
}

// Test 3: savePresets + loadPresets roundtrip
{
  const custom = [{ id: 'test', name: 'Test', emojis: ['🔧'], enabled: true }];
  savePresets(custom);
  const loaded = loadPresets();
  assert.strictEqual(loaded[0].name, 'Test');
  assert.deepStrictEqual(loaded[0].emojis, ['🔧']);
  console.log('PASS: savePresets/loadPresets roundtrip');
}

// Test 4: buildPreserveSet — only enabled presets
{
  const presets = [
    { id: '1', name: 'A', emojis: ['✅', '❌'], enabled: true },
    { id: '2', name: 'B', emojis: ['🟢', '🔴'], enabled: false },
    { id: '3', name: 'C', emojis: ['⚠️'], enabled: true },
  ];
  const set = buildPreserveSet(presets);
  assert.ok(set.has('✅'));
  assert.ok(set.has('❌'));
  assert.ok(set.has('⚠️'));
  assert.ok(!set.has('🟢'));
  assert.ok(!set.has('🔴'));
  console.log('PASS: buildPreserveSet only enabled');
}

// Test 5: buildPreserveSet empty when all disabled
{
  const presets = [
    { id: '1', name: 'A', emojis: ['✅'], enabled: false },
  ];
  const set = buildPreserveSet(presets);
  assert.strictEqual(set.size, 0);
  console.log('PASS: buildPreserveSet all disabled');
}

console.log('\nAll preset tests passed.');
```

- [ ] **Step 2: Run tests — expect failure**

```
node tests/presets.test.js
```

Expected: `Cannot find module '../src/presets.js'`

- [ ] **Step 3: Create `src/presets.js`**

```js
// src/presets.js

const STORAGE_KEY = 'emoji-cleaner-presets';

const DEFAULT_PRESETS = [
  { id: 'estado',   name: 'Estado',   emojis: ['✅', '❌'],             enabled: true },
  { id: 'semaforo', name: 'Semáforo', emojis: ['🟢', '🔴', '🟡'],      enabled: true },
  { id: 'alertas',  name: 'Alertas',  emojis: ['ℹ️', '⚠️'],            enabled: true },
  { id: 'flechas',  name: 'Flechas',  emojis: ['➡️', '⬆️', '⬇️', '↩️'], enabled: false },
];

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] }));
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] }));
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Returns a Set of all emoji strings that should be preserved.
 * @param {{ emojis: string[], enabled: boolean }[]} presets
 * @returns {Set<string>}
 */
function buildPreserveSet(presets) {
  const set = new Set();
  for (const p of presets) {
    if (!p.enabled) continue;
    for (const e of p.emojis) set.add(e);
  }
  return set;
}

if (typeof module !== 'undefined') module.exports = { DEFAULT_PRESETS, loadPresets, savePresets, buildPreserveSet };
```

- [ ] **Step 4: Run tests — expect pass**

```
node tests/presets.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```
git add src/presets.js tests/presets.test.js
git commit -m "feat: preset model with localStorage persistence"
```

---

### Task 4: HTML skeleton + CSS

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html` with base structure and dark theme CSS**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>emoji-cleaner</title>
<style>
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Tokens ── */
:root {
  --bg:        #111;
  --bg-2:      #1a1a1a;
  --bg-3:      #151515;
  --bg-4:      #111;
  --border:    #252525;
  --border-2:  #1e1e1e;
  --text:      #ccc;
  --text-dim:  #666;
  --text-faint:#333;
  --green:     #4a8;
  --green-bg:  #0d1e0d;
  --green-border: #1a3a1a;
  --green-btn: #7cb87c;
  --green-btn-border: #3a5a3a;
  --green-btn-bg: #1a261a;
  --orange:    #cc6633;
  --orange-bg: #3a1200;
  --red-dim:   #633;
  --radius:    7px;
  --radius-sm: 4px;
}

/* ── Base ── */
body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 2rem 1rem;
}

/* ── Layout ── */
.app {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* ── App header ── */
.app-name {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 0.5rem 0;
}

/* ── Panels ── */
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.75rem;
  background: var(--bg-3);
  font-size: 0.7rem;
  color: var(--text-dim);
  cursor: pointer;
  user-select: none;
}
.panel-body {
  background: var(--bg-3);
  border-top: 1px solid var(--border-2);
  padding: 0.75rem;
}
.panel.collapsed .panel-body { display: none; }
.panel.collapsed .panel-header { border-bottom: none; }

/* ── Buttons ── */
.btn {
  padding: 0.28rem 0.7rem;
  border-radius: var(--radius-sm);
  font-size: 0.71rem;
  border: 1px solid var(--border);
  background: var(--bg-2);
  color: #888;
  cursor: pointer;
  font-family: inherit;
}
.btn:hover { color: var(--text); }
.btn.primary { border-color: var(--green-btn-border); background: var(--green-btn-bg); color: var(--green-btn); }
.btn.primary:hover { filter: brightness(1.1); }
.btn:disabled { opacity: 0.3; cursor: default; pointer-events: none; }

/* ── Btn row ── */
.btn-row { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }

/* ── Toggle (diff/resultado) ── */
.view-toggle {
  display: inline-flex;
  border: 1px solid var(--border-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  font-size: 0.66rem;
  margin-left: auto;
}
.view-toggle span {
  padding: 0.18rem 0.55rem;
  color: var(--text-faint);
  cursor: pointer;
}
.view-toggle span.active { background: var(--border-2); color: #999; }

/* ── Output area ── */
.output {
  background: var(--bg-4);
  border: 1px solid var(--border-2);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.7rem;
  font-size: 0.78rem;
  font-family: monospace;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 40px;
}

/* ── Diff spans ── */
.del { background: var(--orange-bg); color: var(--orange); border-radius: 3px; padding: 0 2px; text-decoration: line-through; text-decoration-color: #cc4400; }
.keep { background: var(--green-bg); color: var(--green); border-radius: 3px; padding: 0 2px; outline: 1px solid var(--green-border); }
</style>
</head>
<body>
<div class="app">
  <div class="app-name">emoji-cleaner</div>
  <!-- Config panel, input zone, card stack, bulk bar injected by JS -->
</div>
<script>
// JS goes here in final build
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify**

Open `index.html`. Expect: dark background, "emoji-cleaner" label, no errors in console.

- [ ] **Step 3: Commit**

```
git add index.html
git commit -m "feat: html skeleton and css tokens"
```

---

### Task 5: Config panel — preset list + toggles

**Files:**
- Modify: `index.html`

This task wires the preset model into the UI. Paste the contents of `src/presets.js` inline into the `<script>` tag (removing the `module.exports` line), then build the config panel renderer.

- [ ] **Step 1: Inline presets.js and add state + renderConfig**

Replace the `<script>` tag content:

```js
// ── Inlined: presets.js ──────────────────────────────────────────────────────
const STORAGE_KEY = 'emoji-cleaner-presets';
const DEFAULT_PRESETS = [
  { id: 'estado',   name: 'Estado',   emojis: ['✅', '❌'],             enabled: true },
  { id: 'semaforo', name: 'Semáforo', emojis: ['🟢', '🔴', '🟡'],      enabled: true },
  { id: 'alertas',  name: 'Alertas',  emojis: ['ℹ️', '⚠️'],            enabled: true },
  { id: 'flechas',  name: 'Flechas',  emojis: ['➡️', '⬆️', '⬇️', '↩️'], enabled: false },
];
function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] }));
    return JSON.parse(raw);
  } catch { return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] })); }
}
function savePresets(presets) { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); }
function buildPreserveSet(presets) {
  const set = new Set();
  for (const p of presets) { if (p.enabled) for (const e of p.emojis) set.add(e); }
  return set;
}

// ── App state ────────────────────────────────────────────────────────────────
let presets = loadPresets();
let editingPresetId = null; // id of preset currently open in editor, or null

// ── Config panel ─────────────────────────────────────────────────────────────
function renderConfig() {
  const panel = document.getElementById('config-panel');
  const isCollapsed = panel.classList.contains('collapsed');
  panel.innerHTML = `
    <div class="panel-header" onclick="toggleConfig()">
      <span>⚙ Preservar emojis</span>
      <span>${isCollapsed ? '▼' : '▲'}</span>
    </div>
    <div class="panel-body">
      <div id="preset-list"></div>
      <div class="add-preset-btn" onclick="startNewPreset()">+ nuevo preset</div>
    </div>`;
  renderPresetList();
}

function toggleConfig() {
  document.getElementById('config-panel').classList.toggle('collapsed');
  renderConfig();
}

function renderPresetList() {
  const list = document.getElementById('preset-list');
  if (!list) return;
  list.innerHTML = presets.map(p => renderPresetRow(p)).join('');
  if (editingPresetId === '__new__') {
    list.innerHTML += renderNewPresetForm();
  }
}

function renderPresetRow(p) {
  const isEditing = editingPresetId === p.id;
  return `
    <div class="preset-row ${p.enabled ? 'on' : ''}" id="preset-${p.id}">
      <div class="pr-head">
        <div class="pt ${p.enabled ? 'on' : 'off'}" onclick="togglePreset('${p.id}')"></div>
        <span class="pname">${p.name}</span>
        <span class="pemojis">${p.emojis.join(' ')}</span>
        <span class="pedit" onclick="editPreset('${p.id}')">editar</span>
      </div>
      ${isEditing ? renderPresetEditor(p) : ''}
    </div>`;
}

function togglePreset(id) {
  presets = presets.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
  savePresets(presets);
  invalidatePreviewCards();
  renderConfig();
}

function editPreset(id) {
  editingPresetId = editingPresetId === id ? null : id;
  renderConfig();
}
```

- [ ] **Step 2: Add CSS for preset rows**

Append to `<style>`:

```css
/* ── Preset list ── */
#preset-list { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.5rem; }
.preset-row { border: 1px solid var(--border-2); border-radius: 5px; overflow: hidden; }
.preset-row.on { border-color: #2a3e2a; }
.pr-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.5rem; background: var(--bg-2); font-size: 0.73rem; }
.preset-row.on .pr-head { background: #161e16; }
.pt { width: 26px; height: 14px; border-radius: 7px; border: 1px solid var(--border); background: #222; flex-shrink: 0; cursor: pointer; position: relative; }
.pt.on { background: #2a4a2a; border-color: #3a6a3a; }
.pt.on::after { content:''; position:absolute; right:2px; top:2px; width:8px; height:8px; border-radius:50%; background:var(--green); }
.pt.off::after { content:''; position:absolute; left:2px; top:2px; width:8px; height:8px; border-radius:50%; background:var(--border); }
.pname { color: var(--text-dim); width: 68px; flex-shrink: 0; }
.preset-row.on .pname { color: #999; }
.pemojis { flex:1; font-size:0.88rem; opacity:0.45; }
.preset-row.on .pemojis { opacity:1; }
.pedit { font-size:0.62rem; color:var(--text-faint); cursor:pointer; }
.pedit:hover { color: var(--text-dim); }
.add-preset-btn { font-size:0.7rem; color:var(--text-faint); cursor:pointer; padding:0.25rem 0.5rem; border:1px dashed var(--border-2); border-radius:5px; text-align:center; margin-top:0.3rem; }
.add-preset-btn:hover { color: var(--text-dim); border-color: var(--border); }
```

- [ ] **Step 3: Mount config panel in HTML**

Replace the comment in `.app`:
```html
<div class="app">
  <div class="app-name">emoji-cleaner</div>
  <div class="panel collapsed" id="config-panel"></div>
  <div id="input-zone"></div>
  <div id="card-stack"></div>
  <div id="bulk-bar" style="display:none"></div>
</div>
```

Add at the bottom of the `<script>`, before the closing `</script>`:
```js
function invalidatePreviewCards() { /* wired in Task 9 */ }

// Init
renderConfig();
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Click the config panel header — it should expand and show the 4 presets. Click each toggle — rows change style. Check localStorage in DevTools → Application → Local Storage: `emoji-cleaner-presets` should update.

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: config panel with preset toggles"
```

---

### Task 6: Config panel — preset editor

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add `renderPresetEditor`, `renderNewPresetForm`, and editor actions**

Append to the `<script>`:

```js
function renderPresetEditor(p) {
  return `
    <div class="pr-edit-body">
      <div class="edit-row">
        <span class="edit-label">Nombre</span>
        <input class="mock-input" id="edit-name-${p.id}" value="${p.name}">
      </div>
      <div class="edit-row" style="align-items:flex-start">
        <span class="edit-label" style="padding-top:0.3rem">Emojis</span>
        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem">
          <div class="emoji-chips-edit">
            ${p.emojis.map(e => `<span class="echip" id="chip-${CSS.escape(e)}-${p.id}">${e}<span class="x" onclick="removeEmojiFromPreset('${p.id}','${e}')">✕</span></span>`).join('')}
          </div>
          <div class="add-emoji-wrap">
            <input class="emoji-input" id="add-emoji-${p.id}" placeholder="🔔" maxlength="8">
            <button class="btn" onclick="addEmojiToPreset('${p.id}')">+ añadir</button>
          </div>
        </div>
      </div>
      <div class="edit-actions">
        <button class="btn primary" onclick="savePresetEdit('${p.id}')">Guardar</button>
        <button class="btn" onclick="cancelEdit()">Cancelar</button>
        <button class="btn delete-btn" onclick="deletePreset('${p.id}')">Eliminar preset</button>
      </div>
    </div>`;
}

function renderNewPresetForm() {
  return `
    <div class="preset-row new-preset">
      <div class="pr-edit-body">
        <div class="edit-row">
          <span class="edit-label">Nombre</span>
          <input class="mock-input" id="new-preset-name" placeholder="Mi preset">
        </div>
        <div class="edit-row" style="align-items:flex-start">
          <span class="edit-label" style="padding-top:0.3rem">Emojis</span>
          <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem">
            <div class="emoji-chips-edit" id="new-preset-chips">
              <span style="font-size:0.7rem;color:var(--text-faint)">sin emojis aún</span>
            </div>
            <div class="add-emoji-wrap">
              <input class="emoji-input" id="add-emoji-__new__" placeholder="🔔" maxlength="8">
              <button class="btn" onclick="addEmojiToPreset('__new__')">+ añadir</button>
            </div>
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn primary" onclick="saveNewPreset()">Guardar</button>
          <button class="btn" onclick="cancelEdit()">Cancelar</button>
        </div>
      </div>
    </div>`;
}

// Temp storage for new preset emojis during editing
let _newPresetEmojis = [];

function startNewPreset() {
  editingPresetId = '__new__';
  _newPresetEmojis = [];
  renderConfig();
  setTimeout(() => document.getElementById('new-preset-name')?.focus(), 0);
}

function cancelEdit() {
  editingPresetId = null;
  _newPresetEmojis = [];
  renderConfig();
}

function savePresetEdit(id) {
  const nameEl = document.getElementById(`edit-name-${id}`);
  const name = nameEl?.value.trim();
  if (!name) return;
  presets = presets.map(p => p.id === id ? { ...p, name } : p);
  savePresets(presets);
  editingPresetId = null;
  invalidatePreviewCards();
  renderConfig();
}

function saveNewPreset() {
  const name = document.getElementById('new-preset-name')?.value.trim();
  if (!name || _newPresetEmojis.length === 0) return;
  const id = 'custom-' + Date.now();
  presets = [...presets, { id, name, emojis: [..._newPresetEmojis], enabled: true }];
  savePresets(presets);
  editingPresetId = null;
  _newPresetEmojis = [];
  invalidatePreviewCards();
  renderConfig();
}

function deletePreset(id) {
  presets = presets.filter(p => p.id !== id);
  savePresets(presets);
  editingPresetId = null;
  invalidatePreviewCards();
  renderConfig();
}

function addEmojiToPreset(id) {
  const input = document.getElementById(`add-emoji-${id}`);
  const emoji = input?.value.trim();
  if (!emoji) return;
  input.value = '';

  if (id === '__new__') {
    if (_newPresetEmojis.includes(emoji)) {
      // Flash the specific chip by finding it in the new-preset-chips container
      const container = document.getElementById('new-preset-chips');
      const chips = container?.querySelectorAll('.echip');
      chips?.forEach(chip => { if (chip.textContent.startsWith(emoji)) flashDuplicate(chip); });
      return;
    }
    _newPresetEmojis.push(emoji);
    renderConfig();
    return;
  }

  const preset = presets.find(p => p.id === id);
  if (!preset) return;
  if (preset.emojis.includes(emoji)) { flashDuplicate(`chip-${CSS.escape(emoji)}-${id}`); return; }
  presets = presets.map(p => p.id === id ? { ...p, emojis: [...p.emojis, emoji] } : p);
  savePresets(presets);
  invalidatePreviewCards();
  renderConfig();
}

function removeEmojiFromPreset(id, emoji) {
  presets = presets.map(p => p.id === id ? { ...p, emojis: p.emojis.filter(e => e !== emoji) } : p);
  savePresets(presets);
  invalidatePreviewCards();
  renderConfig();
}

function flashDuplicate(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.style.outline = '1px solid var(--orange)';
  setTimeout(() => { el.style.outline = ''; }, 400);
}
```

- [ ] **Step 2: Add CSS for editor**

Append to `<style>`:

```css
/* ── Preset editor ── */
.pr-edit-body { padding:0.6rem 0.6rem; background:#121212; border-top:1px solid var(--border-2); display:flex; flex-direction:column; gap:0.5rem; }
.edit-row { display:flex; align-items:center; gap:0.5rem; font-size:0.7rem; }
.edit-label { color:var(--text-faint); width:52px; flex-shrink:0; }
.mock-input { background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.25rem 0.5rem; font-size:0.72rem; color:var(--text); flex:1; max-width:160px; font-family:inherit; }
.emoji-chips-edit { display:flex; flex-wrap:wrap; gap:0.3rem; min-height:1.5rem; }
.echip { display:inline-flex; align-items:center; gap:0.2rem; padding:0.18rem 0.4rem; border-radius:var(--radius-sm); border:1px solid #2a3a2a; background:#161e16; font-size:0.88rem; }
.echip .x { font-size:0.6rem; color:#3a5a3a; cursor:pointer; line-height:1; }
.echip .x:hover { color:#c66; }
.add-emoji-wrap { display:flex; align-items:center; gap:0.4rem; }
.emoji-input { background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.22rem 0.45rem; font-size:0.88rem; width:52px; text-align:center; color:var(--text); }
.edit-actions { display:flex; gap:0.4rem; align-items:center; }
.delete-btn { margin-left:auto; border-color:#3a1a1a; color:var(--red-dim); }
.delete-btn:hover { color:#c66; border-color:var(--red-dim); }
.new-preset { border:1px dashed var(--border-2); }
```

- [ ] **Step 3: Verify in browser**

- Click "editar" on a preset → editor expands inline
- Change name and Save → updates
- Click ✕ on an emoji chip → removes it
- Add an emoji → chip appears
- Add same emoji again → chip flashes orange, not duplicated
- Click Eliminar → preset removed
- Click "+ nuevo preset" → empty form appears, fill name + emojis, Save → new preset in list with toggle ON
- Click Cancel → form disappears

- [ ] **Step 4: Commit**

```
git add index.html
git commit -m "feat: preset editor — create, edit, delete, emoji chips"
```

---

### Task 7: Input zone

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add input zone renderer and card creation**

Append to `<script>`:

```js
// ── Input zone ────────────────────────────────────────────────────────────────
let _pendingFiles = []; // FileList or File[] staged for Añadir

function renderInputZone() {
  const zone = document.getElementById('input-zone');
  zone.innerHTML = `
    <div class="input-zone" id="drop-zone">
      <div class="input-zone-header">
        <span>Pega texto o arrastra archivos aquí</span>
        <label class="btn" style="cursor:pointer">
          + archivos
          <input type="file" multiple accept=".txt,.md,.js,.py,.json,.csv,.log,.html,.css,.xml,.yaml,text/*" style="display:none" id="file-input">
        </label>
      </div>
      <textarea id="text-input" class="text-input" placeholder="Pega aquí..."></textarea>
      <div class="input-zone-footer">
        <button class="btn primary" id="add-btn" onclick="handleAdd()" disabled>Añadir →</button>
      </div>
    </div>`;

  const ta = document.getElementById('text-input');
  const btn = document.getElementById('add-btn');
  ta.addEventListener('input', () => { btn.disabled = ta.value.trim() === '' && _pendingFiles.length === 0; });

  document.getElementById('file-input').addEventListener('change', (e) => {
    _pendingFiles = Array.from(e.target.files);
    btn.disabled = _pendingFiles.length === 0 && document.getElementById('text-input').value.trim() === '';
  });

  // Drag & drop — dragover on document to highlight the zone from anywhere on the page,
  // but drop is only accepted inside the drop zone (spec: "el drop solo se acepta dentro")
  const dropZone = document.getElementById('drop-zone');
  document.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) dropZone.classList.remove('drag-over'); });
  // Drop outside the zone is ignored (no preventDefault on document drop)
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    _pendingFiles = Array.from(e.dataTransfer.files);
    btn.disabled = _pendingFiles.length === 0 && document.getElementById('text-input').value.trim() === '';
  });
}

function handleAdd() {
  const ta = document.getElementById('text-input');
  const text = ta.value;

  if (text.trim()) {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    addCard({ type: 'text', id: 'card-' + Date.now(), name: `Texto · ${ts}`, content: text, state: 'pendiente' });
    ta.value = '';
  }

  for (const file of _pendingFiles) {
    addCard({ type: 'file', id: 'card-' + Date.now() + '-' + file.name, name: file.name, file, content: null, state: 'pendiente' });
  }
  _pendingFiles = [];

  document.getElementById('add-btn').disabled = true;
  document.getElementById('file-input').value = '';
}
```

- [ ] **Step 2: Add input zone CSS**

Append to `<style>`:

```css
/* ── Input zone ── */
.input-zone { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; transition: border-color 0.15s; }
.input-zone.drag-over { border-color: var(--green); }
.input-zone-header { display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.75rem; background:var(--bg-3); border-bottom:1px solid var(--border-2); font-size:0.68rem; color:var(--text-faint); }
.text-input { display:block; width:100%; background:var(--bg-4); border:none; padding:0.65rem 0.75rem; font-size:0.78rem; color:#555; font-family:monospace; line-height:1.7; resize:vertical; min-height:80px; color: var(--text); }
.text-input:focus { outline:none; background:#131313; }
.text-input::placeholder { color: #333; }
.input-zone-footer { display:flex; justify-content:flex-end; padding:0.35rem 0.75rem; background:var(--bg-3); border-top:1px solid var(--border-2); }
```

- [ ] **Step 3: Stub `addCard` temporarily**

Append to `<script>` (will be replaced in Task 8):

```js
let cards = [];
function addCard(card) {
  cards.push(card);
  console.log('addCard', card.name, card.type);
  renderBulkBar();
}
function renderBulkBar() { /* Task 11 */ }
```

- [ ] **Step 4: Wire renderInputZone into init**

Update the init block at the bottom of `<script>`:
```js
renderConfig();
renderInputZone();
```

- [ ] **Step 5: Verify in browser**

- "Añadir →" is disabled on load
- Paste text → button enables
- Click "Añadir →" → console shows `addCard Texto · HH:MM text`, textarea clears, button disables
- Click "+ archivos" → file picker opens, select a .txt → button enables
- Click "Añadir →" → console shows `addCard filename.txt file`
- Drag a file onto the page → drop zone border turns green

- [ ] **Step 6: Commit**

```
git add index.html
git commit -m "feat: input zone — paste, file picker, drag and drop"
```

---

### Task 8: Card rendering + states

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace stub `addCard` with full card renderer**

Replace the stub `addCard` and `cards` declaration with:

```js
let cards = [];

function addCard(card) {
  cards.push(card);
  renderCards();
  renderBulkBar();
}

function renderCards() {
  const stack = document.getElementById('card-stack');
  stack.innerHTML = cards.map(renderCard).join('');
}

function renderCard(card) {
  const isCollapsed = card.collapsed ?? false;
  return `
    <div class="card ${isCollapsed ? 'collapsed' : 'expanded'}" id="${card.id}">
      <div class="card-header" onclick="toggleCard('${card.id}')">
        <span class="card-icon">${card.type === 'text' ? '¶' : '≡'}</span>
        <span class="card-name">${card.name}</span>
        <span class="card-status s-${card.state}">${statusLabel(card.state)}</span>
        <span class="card-x" onclick="deleteCard(event,'${card.id}')">✕</span>
        <span class="card-chevron">${isCollapsed ? '▼' : '▲'}</span>
      </div>
      <div class="card-body">
        ${renderCardBody(card)}
      </div>
    </div>`;
}

function statusLabel(state) {
  return { pendiente: 'pendiente', preview: 'preview', listo: 'listo', error: 'error' }[state] ?? state;
}

function renderCardBody(card) {
  if (card.state === 'error') {
    return `<div class="output" style="color:var(--red-dim)">${card.errorMsg ?? 'archivo no compatible'}</div>`;
  }
  const showDownload = card.type === 'file' && card.state === 'listo';
  const showCopy    = card.type === 'text' && card.state === 'listo';
  const showToggle  = card.state === 'preview';
  // Preview is primary in pendiente/listo; Limpiar is primary in preview
  const previewClass = card.state === 'preview' ? 'btn' : 'btn primary';
  const limpiarClass = card.state === 'preview' ? 'btn primary' : 'btn';
  return `
    <div class="btn-row">
      <button class="${previewClass}" onclick="previewCard('${card.id}')">Preview</button>
      <button class="${limpiarClass}" onclick="cleanCard('${card.id}')">Limpiar</button>
      ${showCopy    ? `<button class="btn" id="copy-btn-${card.id}" onclick="copyCard('${card.id}')">Copiar</button>` : ''}
      ${showDownload ? `<button class="btn" onclick="downloadCard('${card.id}')">⬇ Descargar</button>` : ''}
      ${!showCopy && !showDownload ? `<button class="btn" disabled>${card.type === 'text' ? 'Copiar' : '⬇ Descargar'}</button>` : ''}
      ${showToggle ? `
        <div class="view-toggle" id="vt-${card.id}">
          <span class="${card.viewMode === 'resultado' ? '' : 'active'}" onclick="setViewMode('${card.id}','diff')">diff</span>
          <span class="${card.viewMode === 'resultado' ? 'active' : ''}" onclick="setViewMode('${card.id}','resultado')">resultado</span>
        </div>` : ''}
    </div>
    <div class="output" id="output-${card.id}">${renderOutput(card)}</div>`;
}

function renderOutput(card) {
  if (!card.segments && !card.cleanContent) return '<span style="color:var(--text-faint)">— sin procesar —</span>';
  if (card.state === 'listo') return escapeHtml(card.cleanContent ?? '');
  if (card.state === 'preview') {
    if (card.viewMode === 'resultado') return escapeHtml(card.cleanContent ?? '');
    return (card.segments ?? []).map(s => {
      if (s.type === 'plain') return escapeHtml(s.text);
      if (s.type === 'keep') return `<span class="keep">${s.text}</span>`;
      return `<span class="del">${s.text}</span>`;
    }).join('');
  }
  return '';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toggleCard(id) {
  cards = cards.map(c => c.id === id ? { ...c, collapsed: !(c.collapsed ?? false) } : c);
  renderCards();
}

function deleteCard(e, id) {
  e.stopPropagation();
  cards = cards.filter(c => c.id !== id);
  renderCards();
  renderBulkBar();
}

function setViewMode(id, mode) {
  cards = cards.map(c => c.id === id ? { ...c, viewMode: mode } : c);
  renderCards();
}
```

- [ ] **Step 2: Add card CSS**

Append to `<style>`:

```css
/* ── Cards ── */
#card-stack { display:flex; flex-direction:column; gap:0.5rem; }
.card { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
.card-header { display:flex; align-items:center; gap:0.45rem; padding:0.38rem 0.75rem; background:#161616; font-size:0.72rem; cursor:pointer; user-select:none; }
.card.expanded .card-header { border-bottom:1px solid var(--border-2); }
.card-icon { opacity:0.45; flex-shrink:0; }
.card-name { flex:1; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card-status { font-size:0.61rem; padding:0.09rem 0.38rem; border-radius:3px; flex-shrink:0; }
.s-pendiente { color:var(--text-faint); background:#141414; border:1px solid var(--border-2); }
.s-preview   { color:#886633; background:#1a1500; border:1px solid #332800; }
.s-listo     { color:var(--green); background:var(--green-bg); border:1px solid var(--green-border); }
.s-error     { color:var(--orange); background:var(--orange-bg); border:1px solid #5a2200; }
.card-x { font-size:0.65rem; color:var(--text-faint); cursor:pointer; flex-shrink:0; line-height:1; padding:0.1rem 0.15rem; }
.card-x:hover { color:#c66; }
.card-chevron { font-size:0.58rem; color:var(--text-faint); flex-shrink:0; }
.card.collapsed .card-body { display:none; }
.card-body { padding:0.65rem 0.75rem; background:#141414; display:flex; flex-direction:column; gap:0.5rem; }
```

- [ ] **Step 3: Verify in browser**

- Paste text and click Añadir → card appears with ¶ icon, name "Texto · HH:MM", status "pendiente"
- Chevron collapses/expands card
- ✕ removes card
- Add a file → card appears with ≡ icon

- [ ] **Step 4: Commit**

```
git add index.html
git commit -m "feat: card rendering, states, collapse, delete"
```

---

### Task 9: Card cycle — text (preview + clean + copy)

**Files:**
- Modify: `index.html`

Inline `src/engine.js` into `index.html` (removing `module.exports`), then wire preview/clean/copy.

- [ ] **Step 1: Inline engine.js into `<script>` (before the presets block)**

Copy the full content of `src/engine.js`, remove the `module.exports` line, and paste it at the top of the `<script>` block.

- [ ] **Step 2: Implement `previewCard`, `cleanCard`, `copyCard`**

Append to `<script>`:

```js
function previewCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || card.state === 'error') return;

  const text = card.content ?? '';
  const preserve = buildPreserveSet(presets);
  const detections = detectEmojis(text, preserve);
  const segments = buildDiffSegments(text, detections);
  const cleanContent = cleanText(text, preserve);

  cards = cards.map(c => c.id === id
    ? { ...c, state: 'preview', segments, cleanContent, viewMode: 'diff' }
    : c);
  renderCards();
}

function cleanCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || card.state === 'error') return;

  if (card.type === 'file' && card.content === null) {
    // File not yet loaded — load then clean
    readFileCard(id, (text) => {
      const preserve = buildPreserveSet(presets);
      const clean = cleanText(text, preserve);
      cards = cards.map(c => c.id === id ? { ...c, content: text, cleanContent: clean, state: 'listo', segments: null } : c);
      renderCards();
      renderBulkBar();
    });
    return;
  }

  const text = card.content ?? '';
  const preserve = buildPreserveSet(presets);
  const clean = cleanText(text, preserve);
  cards = cards.map(c => c.id === id ? { ...c, cleanContent: clean, state: 'listo', segments: null } : c);
  renderCards();
  renderBulkBar();
}

function copyCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || !card.cleanContent) return;
  navigator.clipboard.writeText(card.cleanContent).then(() => {
    const btn = document.getElementById(`copy-btn-${id}`);
    if (!btn) return;
    btn.textContent = 'Copiado ✓';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
  });
}
```

- [ ] **Step 3: Wire `invalidatePreviewCards`** (replace the stub from Task 5)

Find and replace:
```js
function invalidatePreviewCards() { /* wired in Task 9 */ }
```
With:
```js
function invalidatePreviewCards() {
  cards = cards.map(c => c.state === 'preview' ? { ...c, state: 'pendiente', segments: null, cleanContent: null } : c);
  renderCards();
}
```

- [ ] **Step 4: Verify in browser**

- Paste text with emojis (e.g., `✅ done 🚀 deployed 🎉`)
- Click Preview → output shows diff: 🚀 and 🎉 in orange strikethrough, ✅ in green
- Toggle diff/resultado → shows clean text
- Click Limpiar → status changes to "listo", toggle disappears, output shows clean text
- Click Copiar → button says "Copiado ✓" for 1.5s
- Disable "Estado" preset, add new text, Preview → ✅ now appears as orange (not preserved)

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: card preview, clean, copy with diff inline"
```

---

### Task 10: Card cycle — file (load + preview + clean + download)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add `readFileCard` and file validation**

Append to `<script>`:

```js
const ACCEPTED_EXTENSIONS = new Set(['.txt','.md','.js','.py','.json','.csv','.log','.html','.css','.xml','.yaml']);

function isAcceptedFile(filename) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return ACCEPTED_EXTENSIONS.has(ext);
}

function readFileCard(id, callback) {
  const card = cards.find(c => c.id === id);
  if (!card || !card.file) return;

  if (!isAcceptedFile(card.file.name)) {
    cards = cards.map(c => c.id === id ? { ...c, state: 'error', errorMsg: 'archivo no compatible' } : c);
    renderCards();
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    cards = cards.map(c => c.id === id ? { ...c, content: text } : c);
    callback(text);
  };
  reader.onerror = () => {
    cards = cards.map(c => c.id === id ? { ...c, state: 'error', errorMsg: 'error al leer archivo' } : c);
    renderCards();
  };
  reader.readAsText(card.file, 'utf-8');
}
```

- [ ] **Step 2: Patch `previewCard` to handle unloaded files**

Find the line `const text = card.content ?? '';` inside `previewCard` and wrap it:

```js
function previewCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || card.state === 'error') return;

  if (card.type === 'file' && card.content === null) {
    readFileCard(id, (text) => {
      const preserve = buildPreserveSet(presets);
      const detections = detectEmojis(text, preserve);
      const segments = buildDiffSegments(text, detections);
      const cleanContent = cleanText(text, preserve);
      cards = cards.map(c => c.id === id ? { ...c, state: 'preview', segments, cleanContent, viewMode: 'diff' } : c);
      renderCards();
    });
    return;
  }

  const text = card.content ?? '';
  const preserve = buildPreserveSet(presets);
  const detections = detectEmojis(text, preserve);
  const segments = buildDiffSegments(text, detections);
  const cleanContent = cleanText(text, preserve);
  cards = cards.map(c => c.id === id ? { ...c, state: 'preview', segments, cleanContent, viewMode: 'diff' } : c);
  renderCards();
}
```

- [ ] **Step 3: Add `downloadCard`**

Append to `<script>`:

```js
function downloadCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || !card.cleanContent) return;
  const blob = new Blob([card.cleanContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = card.name;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Verify in browser**

- Upload a `.txt` file with emojis → card appears
- Preview → reads file, shows diff
- Limpiar → status "listo", download button active
- Descargar → file downloads as cleaned `.txt`
- Upload a `.pdf` → card shows status "error", message "archivo no compatible"

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: file card — load, preview, clean, download"
```

---

### Task 11: Bulk bar

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add inline zip writer**

Paste this minimal store-only ZIP writer at the top of the `<script>` block (before the engine code):

```js
// Minimal ZIP writer — store only (no compression), UTF-8 text files
function buildZip(files) {
  // files: [{ name: string, content: string }]
  const enc = new TextEncoder();
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(localHeader.buffer);
    dv.setUint32(0, 0x04034b50, true);  // local file header sig
    dv.setUint16(4, 20, true);           // version needed
    dv.setUint16(6, 0, true);            // flags
    dv.setUint16(8, 0, true);            // compression: STORE
    dv.setUint16(10, 0, true);           // mod time
    dv.setUint16(12, 0, true);           // mod date
    dv.setUint32(14, crc, true);         // crc32
    dv.setUint32(18, data.length, true); // compressed size
    dv.setUint32(22, data.length, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);           // extra field len
    localHeader.set(nameBytes, 30);

    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cdEntry.buffer);
    cdv.setUint32(0, 0x02014b50, true);  // central dir sig
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);

    parts.push(localHeader, data);
    centralDir.push(cdEntry);
    offset += localHeader.length + data.length;
  }

  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const all = [...parts, ...centralDir, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of all) { out.set(a, pos); pos += a.length; }
  return out;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
```

- [ ] **Step 2: Replace stub `renderBulkBar` with full implementation**

Find and replace `function renderBulkBar() { /* Task 11 */ }`:

```js
function renderBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (cards.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = `
    <button class="btn" onclick="processAll()">▶ Procesar todas</button>
    <button class="btn" onclick="downloadReady()">⬇ Descargar listas (.zip)</button>`;
}

function processAll() {
  const toProcess = cards.filter(c => c.state === 'pendiente' || c.state === 'preview');
  for (const card of toProcess) cleanCard(card.id);
}

function downloadReady() {
  const ready = cards.filter(c => c.type === 'file' && c.state === 'listo' && c.cleanContent);
  if (ready.length === 0) return;

  if (ready.length === 1) {
    downloadCard(ready[0].id);
    return;
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const files = ready.map(c => ({ name: c.name, content: c.cleanContent }));
  const zipBytes = buildZip(files);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emoji-cleaner-${dateStr}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Add bulk bar CSS**

Append to `<style>`:

```css
/* ── Bulk bar ── */
#bulk-bar { display:flex; gap:0.4rem; flex-wrap:wrap; }
```

- [ ] **Step 4: Verify in browser**

- Add 3 files → bulk bar appears
- Click "Procesar todas" → all cards go to "listo"
- Click "⬇ Descargar listas (.zip)" → downloads `emoji-cleaner-YYYY-MM-DD.zip` containing the 3 files
- Repeat with 1 file → single file download (no zip)
- Delete all cards → bulk bar disappears

- [ ] **Step 5: Commit**

```
git add index.html
git commit -m "feat: bulk bar — process all, download zip"
```

---

### Task 12: Final wiring + polish

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Verify same-minute timestamp collision**

Add two text cards within the same minute. If both show "Texto · HH:MM", patch `handleAdd` to include seconds when a duplicate timestamp exists:

```js
// In handleAdd, replace the timestamp line:
const now = new Date();
const base = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
const exists = cards.some(c => c.name.startsWith(`Texto · ${base}`));
const ts = exists
  ? `${base}:${String(now.getSeconds()).padStart(2,'0')}`
  : base;
```

- [ ] **Step 2: Verify drag-over cleanup on window blur**

Add to the drag setup in `renderInputZone`:

```js
window.addEventListener('blur', () => {
  document.getElementById('drop-zone')?.classList.remove('drag-over');
});
```

- [ ] **Step 3: Smoke test full flow**

Open `index.html` in browser. Run through:
1. Paste text with `✅ ok 🚀 done 🎉` → Preview → diff shows correctly → Limpiar → Copiar
2. Toggle off "Estado" preset → card with ✅ invalidates back to pendiente
3. Upload `.txt` with emojis → Preview → Limpiar → Descargar → open file, verify clean
4. Upload `.pdf` → card shows "error"
5. Upload 3 `.txt` files → Procesar todas → Descargar listas → open zip, verify all 3 files
6. Create new preset "Custom" with 🔧 → add text with 🔧 → Preview → 🔧 appears green
7. Reload page → presets survive (localStorage)

- [ ] **Step 4: Run all unit tests one final time**

```
node tests/engine.test.js && node tests/presets.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```
git add index.html
git commit -m "feat: emoji-cleaner web app complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| Single HTML, offline, no deps | Task 4 skeleton + Task 12 inline |
| Engine from icono.py Unicode 17.0 | Task 1 |
| cleanText + buildDiffSegments | Task 2 |
| Preset model + localStorage | Task 3 |
| Config panel — toggle | Task 5 |
| Preset editor — create/edit/delete/chips/duplicate flash | Task 6 |
| Input zone — textarea + drop + file picker + disabled state | Task 7 |
| Card rendering — types, states, collapse, delete, names | Task 8 |
| Card cycle — preview, clean, copy, feedback, toggle diff, invalidation | Task 9 |
| File card — load, validate, error state, download | Task 10 |
| Bulk bar — process all, zip/single download, skip error | Task 11 |
| Same-minute collision, drag cleanup | Task 12 |

All spec requirements covered.

**Placeholder scan:** No TBD, TODO, or "similar to Task N" patterns present.

**Type consistency:** `detectEmojis` signature (`text`, `preserveSet`) consistent across Tasks 1, 9, 10. `buildDiffSegments` takes `(text, detections)` consistently. `cleanText` takes `(text, preserveSet)` consistently. `cards` array shape `{ id, type, name, state, content, cleanContent, segments, viewMode, file, collapsed }` consistent across Tasks 7–11.
