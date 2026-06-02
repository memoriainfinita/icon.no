const STORAGE_KEY = 'emoji-cleaner-presets';

const DEFAULT_PRESETS = [
  { id: 'estado',   name: 'Estado',   emojis: ['✅', '❌'],             enabled: true },
  { id: 'semaforo', name: 'Semáforo', emojis: ['🟢', '🔴', '🟡'],      enabled: true },
  { id: 'alertas',  name: 'Alertas',  emojis: ['ℹ️', '⚠️'],            enabled: true },
  { id: 'flechas',  name: 'Flechas',  emojis: ['➡️', '⬆️', '⬇️', '↩️'], enabled: false },
];

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] }));
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRESETS.map(p => ({ ...p, emojis: [...p.emojis] }));
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function buildPreserveSet(presets) {
  const set = new Set();
  for (const p of presets) {
    if (!p.enabled) continue;
    for (const e of p.emojis) set.add(e);
  }
  return set;
}

if (typeof module !== 'undefined') module.exports = { DEFAULT_PRESETS, loadPresets, savePresets, buildPreserveSet };
