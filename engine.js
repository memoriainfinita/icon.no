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
  '\u{1F004}-\u{1F1FF}' +
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
  '〰〽㊗㊙'
);

const SKIN_TONE = '\u{1F3FB}-\u{1F3FF}';
const VS16      = '️';
const ZWJ       = '\u{200D}';

const EMOJI_RE = new RegExp(
  `(?:[${_BASE_CLASS}])` +
  `(?:[${SKIN_TONE}])?` +
  `(?:${VS16})?` +
  `(?:${ZWJ}(?:[${_BASE_CLASS}])(?:[${SKIN_TONE}])?(?:${VS16})?)*`,
  'gu'
);

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
