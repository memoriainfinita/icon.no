const assert = require('assert');

const _store = {};
global.localStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v; },
  removeItem: (k) => { delete _store[k]; },
};

const { DEFAULT_PRESETS, loadPresets, savePresets, buildPreserveSet } = require('../src/presets.js');

{
  assert.ok(Array.isArray(DEFAULT_PRESETS));
  assert.ok(DEFAULT_PRESETS.length >= 4);
  assert.ok(DEFAULT_PRESETS[0].id);
  assert.ok(DEFAULT_PRESETS[0].name);
  assert.ok(Array.isArray(DEFAULT_PRESETS[0].emojis));
  assert.ok(typeof DEFAULT_PRESETS[0].enabled === 'boolean');
  console.log('PASS: DEFAULT_PRESETS structure');
}

{
  const presets = loadPresets();
  assert.strictEqual(presets.length, DEFAULT_PRESETS.length);
  console.log('PASS: loadPresets returns defaults on first load');
}

{
  const custom = [{ id: 'test', name: 'Test', emojis: ['🔧'], enabled: true }];
  savePresets(custom);
  const loaded = loadPresets();
  assert.strictEqual(loaded[0].name, 'Test');
  assert.deepStrictEqual(loaded[0].emojis, ['🔧']);
  console.log('PASS: savePresets/loadPresets roundtrip');
}

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

{
  const presets = [
    { id: '1', name: 'A', emojis: ['✅'], enabled: false },
  ];
  const set = buildPreserveSet(presets);
  assert.strictEqual(set.size, 0);
  console.log('PASS: buildPreserveSet all disabled');
}

console.log('\nAll preset tests passed.');
