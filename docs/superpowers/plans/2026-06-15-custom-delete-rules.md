# Custom Delete Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user define literal/regex blacklist rules that delete arbitrary text, alongside the existing emoji preserve presets.

**Architecture:** A new pure layer in `engine.js` (`applyDeleteRules`, `analyze`) plus a persistence module `delete-rules.js` (mirroring `presets.js`). `analyze()` is the single source for both the diff and the clean output, built via a per-character mask so emoji detection and delete rules merge without interval-clipping. `index.html` gains a config sub-section and wires `analyze()` into the card pipeline.

**Tech Stack:** Vanilla JS single-file web app, browser globals via `<script src>`, Node `assert` tests run with `node tests/<file>.js`. No build step, no dependencies.

> **Line numbers are indicative.** They reflect the file before any task runs; each insertion shifts later numbers. Anchor edits by function name and by the exact block quoted in each step, not by the line number.

---

## File Structure

- `engine.js` (modify) — add `applyDeleteRules(text, rules)`, `analyze(text, preserveSet, rules)`, guarded `module.exports`. Existing `detectEmojis`/`cleanText`/`buildDiffSegments` stay (still tested; `detectEmojis` is used by `analyze`).
- `delete-rules.js` (create) — `loadDeleteRules`, `saveDeleteRules`, `makeRule`, `isRegexValid`, `DELETE_RULES_KEY`. Mirrors `presets.js`.
- `index.html` (modify) — load `delete-rules.js`; `deleteRules`/`editingRuleId` state; config sub-section + handlers; escape all diff segments in `renderOutput`; wire `analyze()` into `previewCard`/`cleanCard`.
- `tests/engine.test.js` (create) — unit tests for `applyDeleteRules` and `analyze`.
- `tests/delete-rules.test.js` (create) — unit tests for persistence + validation.

UI wiring in `index.html` (Tasks 6–10) has no DOM test harness in this codebase; it is verified manually in the browser (Task 11), consistent with existing practice. Engine and persistence logic (Tasks 1–5) are TDD.

---

## Task 1: Engine test scaffold + exports

**Files:**
- Modify: `engine.js` (append at end, after line 97)
- Create: `tests/engine.test.js`

- [ ] **Step 1: Add guarded exports to engine.js**

Append to the end of `engine.js`:

```js

// Node test harness only; ignored in the browser (no `module`).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectEmojis, cleanText, buildDiffSegments };
}
```

Export only the functions that exist now. `applyDeleteRules` and `analyze` are added to this object in Tasks 2 and 4. (Referencing a not-yet-declared name in the object literal would throw `ReferenceError` the moment the file is `require`d, breaking this task's test.)

- [ ] **Step 2: Write a wiring test**

Create `tests/engine.test.js`:

```js
const assert = require('assert');
const { detectEmojis } = require('../engine.js');

{
  const result = detectEmojis('Hello 🚀 world');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '🚀');
  console.log('PASS: engine module wired');
}

console.log('\nAll engine tests passed.');
```

- [ ] **Step 3: Run the test**

Run: `node tests/engine.test.js`
Expected: prints `PASS: engine module wired` then `All engine tests passed.`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add engine.js tests/engine.test.js
git commit -m "test: add engine test scaffold and node exports"
```

---

## Task 2: applyDeleteRules — literal rules

**Files:**
- Modify: `engine.js`
- Modify: `tests/engine.test.js`

- [ ] **Step 1: Write failing tests**

Insert before the final `console.log('\nAll engine tests passed.');` in `tests/engine.test.js`, and add `applyDeleteRules` to the `require` destructuring at the top (`const { detectEmojis, applyDeleteRules } = require('../engine.js');`):

```js
// applyDeleteRules — literal
{
  const rules = [{ id: '1', type: 'literal', value: '--', enabled: true }];
  const r = applyDeleteRules('a -- b -- c', rules);
  assert.deepStrictEqual(r, [{ start: 2, end: 4 }, { start: 7, end: 9 }]);
  console.log('PASS: literal rule finds all occurrences');
}
{
  const rules = [{ id: '1', type: 'literal', value: 'x', enabled: false }];
  assert.deepStrictEqual(applyDeleteRules('x x x', rules), []);
  console.log('PASS: disabled rule is skipped');
}
{
  const rules = [{ id: '1', type: 'literal', value: '', enabled: true }];
  assert.deepStrictEqual(applyDeleteRules('abc', rules), []);
  console.log('PASS: empty literal value produces no ranges');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `node tests/engine.test.js`
Expected: FAIL — `TypeError: applyDeleteRules is not a function`.

- [ ] **Step 3: Implement applyDeleteRules (literal branch only)**

Insert into `engine.js` after `buildDiffSegments` (after line 97, before the exports block):

```js
function applyDeleteRules(text, rules = []) {
  const ranges = [];
  for (const rule of rules) {
    if (!rule.enabled || !rule.value) continue;
    if (rule.type === 'literal') {
      let idx = 0;
      while ((idx = text.indexOf(rule.value, idx)) !== -1) {
        ranges.push({ start: idx, end: idx + rule.value.length });
        idx += rule.value.length;
      }
    }
  }
  return ranges;
}
```

Then add `applyDeleteRules` to the exports object at the end of `engine.js`:

```js
  module.exports = { detectEmojis, cleanText, buildDiffSegments, applyDeleteRules };
```

- [ ] **Step 4: Run to verify pass**

Run: `node tests/engine.test.js`
Expected: the three new PASS lines print, exit 0.

- [ ] **Step 5: Commit**

```bash
git add engine.js tests/engine.test.js
git commit -m "feat: applyDeleteRules literal matching"
```

---

## Task 3: applyDeleteRules — regex, invalid, zero-width

**Files:**
- Modify: `engine.js`
- Modify: `tests/engine.test.js`

- [ ] **Step 1: Write failing tests**

Insert before the final `console.log` in `tests/engine.test.js`:

```js
// applyDeleteRules — regex
{
  const rules = [{ id: '1', type: 'regex', value: '\\s{2,}', enabled: true }];
  const r = applyDeleteRules('a    b', rules);
  assert.deepStrictEqual(r, [{ start: 1, end: 5 }]);
  console.log('PASS: regex rule matches');
}
{
  const rules = [{ id: '1', type: 'regex', value: '(', enabled: true }]; // invalid
  assert.deepStrictEqual(applyDeleteRules('a(b', rules), []);
  console.log('PASS: invalid regex is skipped, not thrown');
}
{
  const rules = [{ id: '1', type: 'regex', value: 'a*', enabled: true }]; // can match empty
  const r = applyDeleteRules('baa', rules);
  // matches 'aa' at index 1; zero-width matches must not loop forever
  assert.ok(r.every(x => x.end > x.start));
  assert.ok(r.some(x => x.start === 1 && x.end === 3));
  console.log('PASS: zero-width matches do not hang and are dropped');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `node tests/engine.test.js`
Expected: FAIL on the regex assertions (regex branch not implemented yet).

- [ ] **Step 3: Add regex branch**

In `engine.js`, extend `applyDeleteRules` — replace the function body's loop with the version below (adds an `else` regex branch):

```js
function applyDeleteRules(text, rules = []) {
  const ranges = [];
  for (const rule of rules) {
    if (!rule.enabled || !rule.value) continue;
    if (rule.type === 'literal') {
      let idx = 0;
      while ((idx = text.indexOf(rule.value, idx)) !== -1) {
        ranges.push({ start: idx, end: idx + rule.value.length });
        idx += rule.value.length;
      }
    } else if (rule.type === 'regex') {
      let re;
      try {
        re = new RegExp(rule.value, 'gu');
      } catch {
        continue; // invalid pattern: skip this rule
      }
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; } // zero-width guard
        ranges.push({ start: m.index, end: m.index + m[0].length });
      }
    }
  }
  return ranges;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node tests/engine.test.js`
Expected: the three new PASS lines print, exit 0.

- [ ] **Step 5: Commit**

```bash
git add engine.js tests/engine.test.js
git commit -m "feat: applyDeleteRules regex with invalid and zero-width guards"
```

---

## Task 4: analyze — char-mask merge

**Files:**
- Modify: `engine.js`
- Modify: `tests/engine.test.js`

- [ ] **Step 1: Write failing tests**

Add `analyze` to the top `require` destructuring (`const { detectEmojis, applyDeleteRules, analyze } = require('../engine.js');`). Insert before the final `console.log`:

```js
// analyze — segments + cleanContent from one source
{
  const { segments, cleanContent } = analyze('a 🚀 b', new Set(), []);
  assert.strictEqual(cleanContent, 'a  b');
  assert.deepStrictEqual(segments, [
    { type: 'plain', text: 'a ' },
    { type: 'del', text: '🚀' },
    { type: 'plain', text: ' b' },
  ]);
  console.log('PASS: analyze deletes emoji, builds segments');
}
{
  const preserve = new Set(['✅']);
  const { segments, cleanContent } = analyze('✅ ok 🎉', preserve, []);
  assert.strictEqual(cleanContent, '✅ ok ');
  assert.strictEqual(segments[0].type, 'keep');
  assert.strictEqual(segments[0].text, '✅');
  console.log('PASS: analyze preserves via preserveSet');
}
{
  // delete rule wins over preserve
  const preserve = new Set(['✅']);
  const rules = [{ id: '1', type: 'literal', value: '✅', enabled: true }];
  const { cleanContent } = analyze('✅ ok', preserve, rules);
  assert.strictEqual(cleanContent, ' ok');
  console.log('PASS: delete rule overrides preserved emoji');
}
{
  // custom rule deletes plain text
  const rules = [{ id: '1', type: 'literal', value: 'NOTE:', enabled: true }];
  const { cleanContent } = analyze('NOTE: hi', new Set(), rules);
  assert.strictEqual(cleanContent, ' hi');
  console.log('PASS: analyze deletes plain text via rule');
}
{
  const { segments, cleanContent } = analyze('plain', new Set(), []);
  assert.deepStrictEqual(segments, [{ type: 'plain', text: 'plain' }]);
  assert.strictEqual(cleanContent, 'plain');
  console.log('PASS: analyze no-op on plain text');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `node tests/engine.test.js`
Expected: FAIL — `analyze is not a function`.

- [ ] **Step 3: Implement analyze**

Insert into `engine.js` after `applyDeleteRules` (before the exports block):

```js
function analyze(text, preserveSet = new Set(), rules = []) {
  const n = text.length;
  const mark = new Array(n).fill('plain');

  for (const d of detectEmojis(text, preserveSet)) {
    const t = d.preserved ? 'keep' : 'del';
    for (let i = d.start; i < d.end; i++) mark[i] = t;
  }
  for (const r of applyDeleteRules(text, rules)) {
    for (let i = r.start; i < r.end; i++) mark[i] = 'del'; // del overrides keep/plain
  }

  const segments = [];
  let i = 0;
  while (i < n) {
    const t = mark[i];
    let j = i;
    while (j < n && mark[j] === t) j++;
    segments.push({ type: t, text: text.slice(i, j) });
    i = j;
  }

  const cleanContent = segments
    .filter(s => s.type !== 'del')
    .map(s => s.text)
    .join('');

  return { segments, cleanContent };
}
```

Then add `analyze` to the exports object at the end of `engine.js`:

```js
  module.exports = { detectEmojis, cleanText, buildDiffSegments, applyDeleteRules, analyze };
```

Note on performance: `analyze` allocates a mark array of length `text.length`. Fine for the use case (LLM output, docs); multi-MB files are a known limit, not handled in v1.

- [ ] **Step 4: Run to verify pass**

Run: `node tests/engine.test.js`
Expected: all five new PASS lines print, exit 0.

- [ ] **Step 5: Commit**

```bash
git add engine.js tests/engine.test.js
git commit -m "feat: analyze merges emoji detection and delete rules via char mask"
```

---

## Task 5: delete-rules.js persistence + validation

**Files:**
- Create: `delete-rules.js`
- Create: `tests/delete-rules.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/delete-rules.test.js`:

```js
const assert = require('assert');

// Mocks: browser globals used by delete-rules.js
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

const { loadDeleteRules, saveDeleteRules, makeRule, isRegexValid, DELETE_RULES_KEY } = require('../delete-rules.js');

{
  assert.deepStrictEqual(loadDeleteRules(), []);
  console.log('PASS: default is empty array');
}
{
  const rules = [makeRule('literal', '--')];
  saveDeleteRules(rules);
  const back = loadDeleteRules();
  assert.strictEqual(back.length, 1);
  assert.strictEqual(back[0].value, '--');
  assert.strictEqual(back[0].type, 'literal');
  assert.strictEqual(back[0].enabled, true);
  assert.ok(back[0].id);
  console.log('PASS: save then load round-trips');
}
{
  store[DELETE_RULES_KEY] = '{ broken json';
  assert.deepStrictEqual(loadDeleteRules(), []);
  console.log('PASS: corrupt json falls back to empty array');
}
{
  assert.strictEqual(isRegexValid('\\s+'), true);
  assert.strictEqual(isRegexValid('('), false);
  console.log('PASS: isRegexValid distinguishes valid/invalid');
}

console.log('\nAll delete-rules tests passed.');
```

- [ ] **Step 2: Run to verify failure**

Run: `node tests/delete-rules.test.js`
Expected: FAIL — `Cannot find module '../delete-rules.js'`.

- [ ] **Step 3: Implement delete-rules.js**

Create `delete-rules.js`:

```js
const DELETE_RULES_KEY = 'emoji-cleaner-delete-rules';

function loadDeleteRules() {
  try {
    const raw = localStorage.getItem(DELETE_RULES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDeleteRules(rules) {
  localStorage.setItem(DELETE_RULES_KEY, JSON.stringify(rules));
}

function makeRule(type, value) {
  const id = 'rule-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return { id, type, value, enabled: true };
}

function isRegexValid(value) {
  try { new RegExp(value, 'gu'); return true; } catch { return false; }
}

// Node test harness only; ignored in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadDeleteRules, saveDeleteRules, makeRule, isRegexValid, DELETE_RULES_KEY };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node tests/delete-rules.test.js`
Expected: four PASS lines + `All delete-rules tests passed.`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add delete-rules.js tests/delete-rules.test.js
git commit -m "feat: delete-rules persistence and validation module"
```

---

## Task 6: Load script + state in index.html

**Files:**
- Modify: `index.html:219` (script tags)
- Modify: `index.html:313-316` (state)

- [ ] **Step 1: Add the script tag**

After `index.html:219` (`<script src="presets.js"></script>`), add:

```html
<script src="delete-rules.js"></script>
```

- [ ] **Step 2: Add state variables**

After `index.html:316` (`let _newPresetEmojis = [];`), add:

```js
let deleteRules = loadDeleteRules();
let editingRuleId = null;
```

- [ ] **Step 3: Verify load (manual)**

Open `index.html` in the browser, open devtools console, type `deleteRules`.
Expected: `[]` (no errors about `loadDeleteRules` undefined).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: load delete-rules module and state in app"
```

---

## Task 7: Escape all diff segments

**Files:**
- Modify: `index.html:668-669` (`renderOutput`)

- [ ] **Step 1: Apply escaping fix**

In `renderOutput`, replace these two lines:

```js
      if (s.type === 'keep') return `<span class="keep">${s.text}</span>`;
      return `<span class="del">${s.text}</span>`;
```

with:

```js
      if (s.type === 'keep') return `<span class="keep">${escapeHtml(s.text)}</span>`;
      return `<span class="del">${escapeHtml(s.text)}</span>`;
```

- [ ] **Step 2: Verify no regression (manual)**

Open `index.html`, paste `deploy 🚀 done ✅` (Status preset on) into a text card, click Preview.
Expected: `🚀` struck orange, `✅` green, surrounding text intact — the emoji diff still renders exactly as before. (The escaping fix only changes behavior when a `del`/`keep` segment contains HTML-special characters, which requires a custom rule; that case is verified end-to-end in Task 11.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: escape all diff segments to prevent injection from custom text"
```

---

## Task 8: Config sub-section render

**Files:**
- Modify: `index.html` `renderConfig` (lines 325-338) and add render helpers near the preset render functions (after line 366).

- [ ] **Step 1: Add the delete-rules section to renderConfig**

In `renderConfig`, replace the `panel-body` block:

```js
    <div class="panel-body">
      <div id="preset-list"></div>
      <div class="add-preset-btn" onclick="startNewPreset()">+ new preset</div>
    </div>`;
  renderPresetList();
```

with:

```js
    <div class="panel-body">
      <div id="preset-list"></div>
      <div class="add-preset-btn" onclick="startNewPreset()">+ new preset</div>
      <div class="rules-divider">Delete rules</div>
      <div id="rule-list"></div>
      <div class="add-preset-btn" onclick="startNewRule()">+ new rule</div>
    </div>`;
  renderPresetList();
  renderRuleList();
```

- [ ] **Step 2: Add render helpers**

After `renderPresetRow` (after line 366), add:

```js
function renderRuleList() {
  const list = document.getElementById('rule-list');
  if (!list) return;
  list.innerHTML = deleteRules.map(r => renderRuleRow(r)).join('');
  if (editingRuleId === '__new__') {
    list.innerHTML += renderNewRuleForm();
  }
}

function renderRuleRow(r) {
  const invalid = r.type === 'regex' && !isRegexValid(r.value);
  const isEditing = editingRuleId === r.id;
  return `
    <div class="preset-row ${r.enabled ? 'on' : ''}" id="rule-${r.id}">
      <div class="pr-head">
        <div class="pt ${r.enabled ? 'on' : 'off'}" onclick="toggleRule('${r.id}')"></div>
        <span class="pname">${escapeHtml(r.type)}</span>
        <span class="pemojis ${invalid ? 'rule-invalid' : ''}">${escapeHtml(r.value)}</span>
        <span class="pedit" onclick="editRule('${r.id}')">edit</span>
      </div>
      ${invalid && !isEditing ? '<div class="rule-error">invalid regex</div>' : ''}
      ${isEditing ? renderRuleEditor(r) : ''}
    </div>`;
}

function renderRuleEditor(r) {
  // value goes into an attribute, so escape double quotes too (escapeHtml only does & < >)
  const attrValue = escapeHtml(r.value).replace(/"/g, '&quot;');
  return `
    <div class="pr-edit-body">
      <div class="edit-row">
        <span class="edit-label">Type</span>
        <select class="mock-input" id="edit-rule-type-${r.id}">
          <option value="literal" ${r.type === 'literal' ? 'selected' : ''}>literal</option>
          <option value="regex" ${r.type === 'regex' ? 'selected' : ''}>regex</option>
        </select>
      </div>
      <div class="edit-row">
        <span class="edit-label">Value</span>
        <input class="mock-input" id="edit-rule-value-${r.id}" value="${attrValue}">
      </div>
      <div class="edit-actions">
        <button class="btn primary" onclick="saveRuleEdit('${r.id}')">Save</button>
        <button class="btn" onclick="cancelRuleEdit()">Cancel</button>
        <button class="btn delete-btn" onclick="deleteRule('${r.id}')">Delete rule</button>
      </div>
    </div>`;
}

function renderNewRuleForm() {
  return `
    <div class="preset-row new-preset">
      <div class="pr-edit-body">
        <div class="edit-row">
          <span class="edit-label">Type</span>
          <select class="mock-input" id="new-rule-type">
            <option value="literal">literal</option>
            <option value="regex">regex</option>
          </select>
        </div>
        <div class="edit-row">
          <span class="edit-label">Value</span>
          <input class="mock-input" id="new-rule-value" placeholder="text or pattern">
        </div>
        <div class="edit-actions">
          <button class="btn primary" onclick="saveNewRule()">Save</button>
          <button class="btn" onclick="cancelRuleEdit()">Cancel</button>
        </div>
      </div>
    </div>`;
}
```

- [ ] **Step 3: Add minimal CSS**

Find the `<style>` block (before `index.html:218`) and add near the preset styles:

```css
.rules-divider { margin-top: 1rem; padding-top: 0.6rem; border-top: 1px solid var(--border, #333); font-size: 0.75rem; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.05em; }
.rule-invalid { text-decoration: line-through; opacity: 0.6; }
.rule-error { font-size: 0.7rem; color: var(--orange); padding: 0 0.6rem 0.4rem; }
```

(If `--border` is not defined in `:root`, the fallback `#333` is used.)

- [ ] **Step 4: Verify (manual)**

Open `index.html`, expand the config panel.
Expected: below the presets, a "Delete rules" divider, an empty rule list, and a "+ new rule" button. No console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: render delete-rules config sub-section"
```

---

## Task 9: Rule handlers

**Files:**
- Modify: `index.html` — add handlers near the preset handlers (after `cancelEdit`, around line 449).

- [ ] **Step 1: Add handlers**

After `cancelEdit` (after line 449), add:

```js
function startNewRule() {
  editingRuleId = '__new__';
  renderConfig();
  setTimeout(() => document.getElementById('new-rule-value')?.focus(), 0);
}

function cancelRuleEdit() {
  editingRuleId = null;
  renderConfig();
}

function saveNewRule() {
  const typeEl = document.getElementById('new-rule-type');
  const valueEl = document.getElementById('new-rule-value');
  const value = valueEl?.value ?? '';
  if (!value) {
    if (valueEl) { valueEl.style.outline = '1px solid var(--orange)'; setTimeout(() => { valueEl.style.outline = ''; }, 600); }
    return;
  }
  deleteRules = [...deleteRules, makeRule(typeEl?.value === 'regex' ? 'regex' : 'literal', value)];
  saveDeleteRules(deleteRules);
  editingRuleId = null;
  invalidatePreviewCards();
  renderConfig();
}

function toggleRule(id) {
  deleteRules = deleteRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
  saveDeleteRules(deleteRules);
  invalidatePreviewCards();
  renderConfig();
}

function deleteRule(id) {
  deleteRules = deleteRules.filter(r => r.id !== id);
  saveDeleteRules(deleteRules);
  editingRuleId = null;
  invalidatePreviewCards();
  renderConfig();
}

function editRule(id) {
  editingRuleId = editingRuleId === id ? null : id;
  renderConfig();
}

function saveRuleEdit(id) {
  const typeEl = document.getElementById(`edit-rule-type-${id}`);
  const valueEl = document.getElementById(`edit-rule-value-${id}`);
  const value = valueEl?.value ?? '';
  if (!value) {
    if (valueEl) { valueEl.style.outline = '1px solid var(--orange)'; setTimeout(() => { valueEl.style.outline = ''; }, 600); }
    return;
  }
  const type = typeEl?.value === 'regex' ? 'regex' : 'literal';
  deleteRules = deleteRules.map(r => r.id === id ? { ...r, type, value } : r);
  saveDeleteRules(deleteRules);
  editingRuleId = null;
  invalidatePreviewCards();
  renderConfig();
}
```

Note: `value` is intentionally not trimmed — leading/trailing spaces may be exactly what the user wants to delete. Only fully empty values are rejected. `editingRuleId` is shared between the new-rule form (`'__new__'`) and inline editing of an existing rule (its `id`); they never collide.

- [ ] **Step 2: Verify (manual)**

Open `index.html`, config panel → + new rule → type `literal`, value `--`, Save.
Expected: a rule row `literal  --` appears with an on-toggle. Reload the page: the rule persists. Toggle it off, reload: stays off. Click `edit` → change value to `**` and type to `regex`, Save → the row updates and persists across reload. Click `edit` → `Delete rule`: it disappears.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add/toggle/delete handlers for delete rules"
```

---

## Task 10: Wire analyze() into the card pipeline

**Files:**
- Modify: `index.html` `previewCard` (lines 688-713) and `cleanCard` (lines 715-736).

- [ ] **Step 1: Rewrite previewCard to use analyze**

Replace the body of `previewCard` (lines 688-713) with:

```js
function previewCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || card.state === 'error') return;

  if (card.type === 'file' && card.content === null) {
    readFileCard(id, (text) => {
      const { segments, cleanContent } = analyze(text, buildPreserveSet(presets), deleteRules);
      cards = cards.map(c => c.id === id ? { ...c, state: 'preview', segments, cleanContent } : c);
      renderCards();
    });
    return;
  }

  const text = card.content ?? '';
  const { segments, cleanContent } = analyze(text, buildPreserveSet(presets), deleteRules);
  cards = cards.map(c => c.id === id
    ? { ...c, state: 'preview', segments, cleanContent }
    : c);
  renderCards();
}
```

- [ ] **Step 2: Rewrite cleanCard to use analyze**

Replace the body of `cleanCard` (lines 715-736) with:

```js
function cleanCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card || card.state === 'error') return;

  if (card.type === 'file' && card.content === null) {
    readFileCard(id, (text) => {
      const { cleanContent } = analyze(text, buildPreserveSet(presets), deleteRules);
      cards = cards.map(c => c.id === id ? { ...c, content: text, cleanContent, state: 'done', segments: null } : c);
      renderCards();
      renderBulkBar();
    });
    return;
  }

  const text = card.content ?? '';
  const { cleanContent } = analyze(text, buildPreserveSet(presets), deleteRules);
  cards = cards.map(c => c.id === id ? { ...c, cleanContent, state: 'done', segments: null } : c);
  renderCards();
  renderBulkBar();
}
```

- [ ] **Step 3: Verify (manual)**

Open `index.html`. Add a literal rule `NOTE:`. Paste `NOTE: deploy 🚀 done ✅` (Status preset on) into a text card, Preview.
Expected diff: `NOTE:` struck orange, `🚀` struck orange, `✅` green (kept), surrounding text plain. Process: clean output is ` deploy  done ✅`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: wire analyze() with delete rules into preview and clean"
```

---

## Task 11: Full verification + docs

**Files:**
- Modify: `state.md`

- [ ] **Step 1: Run all engine + persistence tests**

Run: `node tests/engine.test.js && node tests/delete-rules.test.js`
Expected: both print their PASS lines and final "All ... tests passed.", exit 0.

- [ ] **Step 2: Manual end-to-end in browser**

Open `index.html` and confirm:
- Add a regex rule `\d{4}` → `año 2026 fin` previews with `2026` struck.
- Add an invalid regex rule `(` → row shows struck value + "invalid regex"; cleaning still works, rule ignored.
- A rule `<b>` deletes the literal text `<b>` and the diff does not break layout (escaping).
- Rules persist across reload; toggling a rule re-invalidates open previews.

- [ ] **Step 3: Update state.md**

Add to `state.md` History (newest first), and mark the TODO `- [ ] Feature: "custom delete rules"` as `[x]`:

```markdown
### 2026-06-15 — Custom delete rules (sesión 6)
- Feature: reglas de borrado custom (lista negra literal/regex), separadas de los presets de preservar
- engine.js: applyDeleteRules + analyze (pipeline unificado por máscara de caracteres)
- delete-rules.js: persistencia y validación, espejo de presets.js
- Fix: renderOutput escapa todos los segmentos del diff (evita inyección de texto custom)
- Tests: tests/engine.test.js y tests/delete-rules.test.js
```

- [ ] **Step 4: Commit**

```bash
git add state.md
git commit -m "docs: update state.md — custom delete rules complete"
```

---

## Self-Review Notes

- **Spec coverage:** literal+regex (T2-T3), per-rule enabled/error (T3, T8), localStorage `[]` default + try/catch + `Date.now`-based id (T5), empty-value rejection on add and edit (T9), edit rule inline (T8 `renderRuleEditor`, T9 `editRule`/`saveRuleEdit`), delete-wins precedence via mask (T4), unified `analyze` source (T4, T10), diff escaping incl. attribute-quote escaping in editor (T7, T8), UI sub-section mirroring presets (T8-T9), zero-width guard (T3), large-file + ReDoS accepted (no task — documented limits). All spec sections map to a task.
- **Type consistency:** `applyDeleteRules(text, rules)→[{start,end}]`, `analyze(text, preserveSet, rules)→{segments, cleanContent}`, segment `{type:'plain'|'keep'|'del', text}`, rule `{id, type, value, enabled}`, helpers `makeRule(type,value)`, `isRegexValid(value)`, key `DELETE_RULES_KEY`, handlers `startNewRule`/`saveNewRule`/`toggleRule`/`deleteRule`/`editRule`/`saveRuleEdit`/`cancelRuleEdit` — used consistently across tasks.
- **Incremental exports:** engine exports grow per task (T1 three fns → T2 +`applyDeleteRules` → T4 +`analyze`) to avoid `ReferenceError` on `require` mid-plan.
