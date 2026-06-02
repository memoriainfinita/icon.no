# state.md — icon.no v0

**Actualizado:** 2026-06-02

---

## Project

**Nombre:** icon.no — web app
**Descripcion:** App HTML de archivo único para eliminar emojis decorativos de texto pegado y archivos subidos, preservando emojis de estado configurables mediante presets.
**Estado:** implementación completa y funcional.
**Node.js:** v24.9.0 (para tests del motor durante desarrollo)

---

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `index.html` | Entregable final — app completa, single-file, sin deps |
| `src/engine.js` | Motor de detección (inlineado en index.html) |
| `src/presets.js` | Modelo de presets (inlineado en index.html) |
| `tests/engine.test.js` | Tests Node.js del motor — 13 tests |
| `tests/presets.test.js` | Tests Node.js del modelo de presets — 5 tests |
| `test-files/` | Archivos de prueba (ignorados en git) |
| `docs/superpowers/specs/2026-06-02-emoji-cleaner-webapp-design.md` | Spec aprobada |
| `docs/superpowers/plans/2026-06-02-emoji-cleaner-webapp.md` | Plan de implementación (12 tareas) |
| `mockups/` | Mockups HTML del proceso de diseño (referencia) |
| `emoji-cleaner.js` | Script CLI anterior — descartado, no continuar |

---

## Decisiones de diseño

- **Un solo archivo HTML** — sin deps externas, sin servidor, funciona offline
- **Motor:** rangos Unicode 17.0 portados desde `_EMOJIS` en `icono.py` (líneas 76–104)
- **Referencia icono.py:** `EMOJI/emoji_scan/icono.py`
- **Sin toggle de modos** — texto y archivos coexisten como tarjetas en el mismo stack
- **Presets configurables** — toggleables, editables inline, custom, persisten en localStorage bajo clave `emoji-cleaner-presets`
- **Presets predefinidos:** Estado (✅ ❌), Semáforo (🟢 🔴 🟡), Alertas (ℹ️ ⚠️), Flechas (➡️ ⬆️ ⬇️ ↩️)
- **Diff inline** — naranja tachado (eliminar), verde con borde (preservar); toggle diff/resultado en estado preview
- **Zip writer inline** — implementación propia ~60 líneas, sin deps, para bulk download
- **Drag & drop** — archivos soltados se añaden directamente como cards (sin pasar por Añadir)
- **Nombre:** renombrado a icon.no (título y label de la app)

---

## TODO

- [ ] Considerar mejoras futuras si surgen en uso real

---

## History

### 2026-06-02 — Implementación completa + fixes + UX

**Implementación (Tasks 1–12):**
- `src/engine.js` + tests: detectEmojis, cleanText, buildDiffSegments — 13 tests pass
- `src/presets.js` + tests: loadPresets, savePresets, buildPreserveSet — 5 tests pass
- `index.html`: app completa single-file con engine + presets inlineados
- Config panel con preset toggles y editor inline (crear/editar/borrar/chips)
- Input zone: textarea + file picker + drag & drop
- Cards con ciclo pendiente→preview→listo, diff inline naranja/verde
- Bulk bar: Preview todas / Procesar todas / Descargar listas (.zip)
- Zip writer inline ~60 líneas sin deps

**Fixes y mejoras post-implementación:**
- Drag & drop: archivos soltados se añaden directamente como cards (sin Añadir)
- Pending files: chips visuales en input zone al seleccionar con file picker
- Preset Guardar: corregido fallo silencioso por TypeError en optional chaining
- saveNewPreset: eliminado requisito de emojis obligatorio; feedback visual si falta nombre
- Bulk bar: añadido botón "Preview todas" para revisar diffs antes de procesar
- Renombrado de emoji-cleaner a icon.no (title + app-name label)

**Archivos de prueba** (en `test-files/`, ignorados en git):
- Un archivo por cada formato soportado: txt, md, html, js, py, json, csv, log, css, xml, yaml
- `all-ranges.txt`: cobertura de todos los rangos Unicode del motor
- `edge-cases.txt`: skin tones, ZWJ, VS16, banderas, caracteres no-emoji

### 2026-06-02 — Brainstorming + spec + plan completos
- Brainstorming UI: flujo unificado sin toggle de modos, tarjetas colapsables con ciclo preview→limpiar→copiar/descargar
- Decisiones clave: presets con editor inline, diff naranja/verde, zip writer inline sin deps, drop solo en input zone
- Spec aprobada: `docs/superpowers/specs/2026-06-02-emoji-cleaner-webapp-design.md`
- Plan listo (12 tareas, TDD para engine y presets): `docs/superpowers/plans/2026-06-02-emoji-cleaner-webapp.md`

### 2026-05-12 — Inicio v0 + pivot a web app
- Carpeta creada como copia limpia desde ICO.NO/PROTOTIPOS/emoji-cleaner/
- Script CLI descartado — caso de uso principal es output LLM (texto/archivos sueltos), no batch de codebase
- Referencia técnica: icono.py (emoji_scan/) — mejores rangos Unicode y arquitectura
