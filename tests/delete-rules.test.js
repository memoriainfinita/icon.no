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
