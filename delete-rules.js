const DELETE_RULES_KEY = 'emoji-cleaner-delete-rules';

function loadDeleteRules() {
  try {
    const raw = localStorage.getItem(DELETE_RULES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDeleteRules(rules) {
  localStorage.setItem(DELETE_RULES_KEY, JSON.stringify(rules));
}

function makeRule(type, value) {
  const id = 'rule-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return { id, type, value, enabled: true };
}

function isRegexValid(value) {
  try { new RegExp(value, 'gu'); return true; } catch { return false; }
}

// Node test harness only; ignored in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadDeleteRules, saveDeleteRules, makeRule, isRegexValid, DELETE_RULES_KEY };
}
