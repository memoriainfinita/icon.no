const assert = require('assert');
const { detectEmojis, applyDeleteRules } = require('../engine.js');

{
  const result = detectEmojis('Hello 🚀 world');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '🚀');
  console.log('PASS: engine module wired');
}

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

console.log('\nAll engine tests passed.');
