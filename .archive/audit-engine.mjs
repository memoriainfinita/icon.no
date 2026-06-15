// Audit: which Unicode 17.0 "Emoji" property codepoints does engine.js NOT detect?
// Reads engine.js, extracts EMOJI_RE, tests every "Emoji" codepoint from emoji-data.txt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Load engine.js and expose EMOJI_RE
const engineSrc = readFileSync(join(root, 'engine.js'), 'utf8');
const getRe = new Function(engineSrc + '\nreturn EMOJI_RE;');
const EMOJI_RE = getRe();

// Parse emoji-data.txt for "Emoji" property ranges (exact property, not Emoji_Presentation etc.)
const data = readFileSync(join(here, 'emoji-data.txt'), 'utf8');
const VS16 = '️';
const targets = []; // {cp, name}
for (const line of data.split('\n')) {
  const m = line.match(/^([0-9A-F]{4,5})(?:\.\.([0-9A-F]{4,5}))?\s*;\s*Emoji\s+#(.*)$/);
  if (!m) continue;
  const start = parseInt(m[1], 16);
  const end = m[2] ? parseInt(m[2], 16) : start;
  for (let cp = start; cp <= end; cp++) targets.push({ cp, name: m[3].trim() });
}

// A codepoint is "covered" if the engine matches it alone OR with a trailing VS16,
// and the match consumes the whole emoji character.
function covered(cp) {
  const ch = String.fromCodePoint(cp);
  for (const s of [ch, ch + VS16]) {
    EMOJI_RE.lastIndex = 0;
    const r = EMOJI_RE.exec(s);
    if (r && r.index === 0 && r[0].length >= ch.length) return true;
  }
  return false;
}

const missing = targets.filter(t => !covered(t.cp));

// Group consecutive missing codepoints into ranges
const ranges = [];
for (const t of missing) {
  const last = ranges[ranges.length - 1];
  if (last && t.cp === last.end + 1) { last.end = t.cp; last.names.push(t.name); }
  else ranges.push({ start: t.cp, end: t.cp, names: [t.name] });
}

console.log(`Total "Emoji" codepoints: ${targets.length}`);
console.log(`Missing (not detected): ${missing.length}`);
console.log(`Missing ranges: ${ranges.length}\n`);
const hex = n => 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
for (const r of ranges) {
  const label = r.start === r.end ? hex(r.start) : `${hex(r.start)}..${hex(r.end)}`;
  console.log(`${label.padEnd(16)} ${r.names[0]}${r.names.length > 1 ? ` ..${r.names[r.names.length-1]}` : ''}`);
}
