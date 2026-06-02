// Unicode 17.0 emoji ranges, ported from icono.py. Defines which base characters
// the engine recognizes as emoji (before optional skin tone / VS16 / ZWJ).
const _BASE_CLASS = (
  '\u{1F600}-\u{1F64F}' +
  '\u{1F300}-\u{1F5FF}' +
  '\u{1F680}-\u{1F6FF}' +
  '\u{1F700}-\u{1F77F}' +
  '\u{1F780}-\u{1F7FF}' +
  '\u{1F800}-\u{1F8FF}' +
  '\u{1F900}-\u{1F9FF}' +
  '\u{1FA00}-\u{1FA6F}' +
  '\u{1FA70}-\u{1FAFF}' +
  '\u{1F004}-\u{1F2FF}' +
  '©®' +           // Copyright, registered U+00A9, U+00AE
  '™' +            // Trade mark U+2122
  '↔-↙' +         // Bidirectional/diagonal arrows U+2194-U+2199
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
  '↩↪' +
  '─-╿' +   // Box drawings U+2500-U+257F
  '▀-▟' +   // Block elements U+2580-U+259F
  '■-◿' +   // Geometric shapes U+25A0-U+25FF
  '〰〽㊗㊙'
);

const SKIN_TONE = '\u{1F3FB}-\u{1F3FF}';
const VS16      = '️';
const ZWJ       = '\u{200D}';

const KEYCAP = '⃣'; // combining enclosing keycap U+20E3

const EMOJI_RE = new RegExp(
  `(?:[${_BASE_CLASS}])` +
  `(?:[${SKIN_TONE}])?` +
  `(?:${VS16})?` +
  `(?:${ZWJ}(?:[${_BASE_CLASS}])(?:[${SKIN_TONE}])?(?:${VS16})?)*` +
  `|[0-9#*](?:${VS16}${KEYCAP}?|${KEYCAP})`, // digit/symbol + VS16 and/or keycap: #️ *️ 0️–9️ and #️⃣ *️⃣ 0️⃣–9️⃣
  'gu'
);

function detectEmojis(text, preserveSet = new Set()) {
  const results = [];
  EMOJI_RE.lastIndex = 0; // required: regex is shared with /g flag; without reset, next call continues from last match position
  let m;
  while ((m = EMOJI_RE.exec(text)) !== null) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      emoji: m[0],
      preserved: preserveSet.has(m[0]) || preserveSet.has(m[0].replace(/️$/, '')), // fallback: match emoji stored without VS16 (U+FE0F)
    });
  }
  return results;
}

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
