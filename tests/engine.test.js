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

console.log('\nAll engine tests passed.');
