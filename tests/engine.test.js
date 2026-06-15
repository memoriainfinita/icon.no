const assert = require('assert');
const { detectEmojis, applyDeleteRules, analyze } = require('../engine.js');

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

console.log('\nAll engine tests passed.');
