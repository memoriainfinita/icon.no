const assert = require('assert');
const { detectEmojis } = require('../engine.js');

{
  const result = detectEmojis('Hello 🚀 world');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '🚀');
  console.log('PASS: engine module wired');
}

console.log('\nAll engine tests passed.');
