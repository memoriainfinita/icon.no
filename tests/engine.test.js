const assert = require('assert');
const { detectEmojis, cleanText, buildDiffSegments } = require('../src/engine.js');

// detectEmojis tests
{
  const result = detectEmojis('Hello 🚀 world');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '🚀');
  assert.strictEqual(result[0].preserved, false);
  console.log('PASS: detects decorative emoji');
}

{
  const preserve = new Set(['✅']);
  const result = detectEmojis('✅ done 🎉', preserve);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].preserved, true);
  assert.strictEqual(result[1].preserved, false);
  console.log('PASS: marks preserved emoji');
}

{
  const result = detectEmojis('🚀✨🎉');
  assert.strictEqual(result.length, 3);
  console.log('PASS: detects multiple in sequence');
}

{
  const result = detectEmojis('');
  assert.strictEqual(result.length, 0);
  console.log('PASS: empty string');
}

{
  const result = detectEmojis('hello world');
  assert.strictEqual(result.length, 0);
  console.log('PASS: no emoji');
}

{
  const result = detectEmojis('✅ ok');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].emoji, '✅');
  console.log('PASS: BMP emoji detected');
}

{
  const result = detectEmojis('👋🏽 hi');
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].emoji.includes('👋'));
  console.log('PASS: skin tone sequence as one unit');
}

{
  const text = 'ab🚀cd';
  const result = detectEmojis(text);
  assert.strictEqual(result[0].start, 2);
  assert.strictEqual(text.slice(result[0].start, result[0].end), '🚀');
  console.log('PASS: correct positions');
}

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

console.log('\nAll engine tests passed.');
