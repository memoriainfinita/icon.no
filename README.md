# emoji-cleaner

Removes decorative emojis from LLM output. Keeps the ones that mean something.

Paste text or drop files. Preview what gets removed. Download clean versions.

---

## How it works

A single HTML file — no install, no server, no dependencies. Open in browser.

**Paste mode** — paste text, run a diff preview, copy the clean result.

**File mode** — drop one or more files, each gets its own preview/clean/download cycle. Bulk download as zip.

**Preserve lists** — toggle preset groups on/off, edit them, create your own. Changes take effect immediately and survive page reload.

---

## Presets (default)

| Name | Keeps |
|------|-------|
| Estado | ✅ ❌ |
| Semáforo | 🟢 🔴 🟡 |
| Alertas | ℹ️ ⚠️ |
| Flechas | ➡️ ⬆️ ⬇️ ↩️ |

All presets are editable. Add emojis, remove them, create new ones, delete the defaults.

---

## Diff preview

Before cleaning, preview shows what changes inline:

- <span style="background:#3a1200;color:#cc6633;text-decoration:line-through">🚀</span> removed
- <span style="background:#0d1e0d;color:#4a8">✅</span> preserved

Toggle between diff view and clean result without reprocessing.

---

## Stack

Vanilla JS · CSS custom properties · `localStorage` · `Blob` API · inline zip writer

No build step. No CDN. Unicode 17.0 emoji ranges ported from [`icono.py`](_archive).
