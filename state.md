# state.md — emoji-cleaner v0

**Actualizado:** 2026-06-02

---

## Project

**Nombre:** emoji-cleaner — web app
**Descripcion:** App HTML de archivo único para eliminar emojis decorativos de texto pegado y archivos subidos, preservando emojis de estado configurables mediante presets.
**Estado:** diseño completo, plan de implementación listo. Pendiente ejecutar.
**Node.js:** v24.9.0 (para tests del motor durante desarrollo)

---

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `index.html` | Entregable final (aún no existe — se crea en la implementación) |
| `src/engine.js` | Motor de detección (desarrollo, se inlinea en index.html al final) |
| `src/presets.js` | Modelo de presets (desarrollo, se inlinea en index.html al final) |
| `tests/engine.test.js` | Tests Node.js del motor |
| `tests/presets.test.js` | Tests Node.js del modelo de presets |
| `docs/superpowers/specs/2026-06-02-emoji-cleaner-webapp-design.md` | Spec aprobada |
| `docs/superpowers/plans/2026-06-02-emoji-cleaner-webapp.md` | Plan de implementación (12 tareas) |
| `mockups/` | Mockups HTML del proceso de diseño (referencia, no son la app) |
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

---

## TODO

- [ ] Ejecutar plan: `docs/superpowers/plans/2026-06-02-emoji-cleaner-webapp.md`
  - Task 0: git init
  - Tasks 1–2: motor de emojis (TDD)
  - Task 3: modelo de presets (TDD)
  - Task 4: HTML skeleton + CSS
  - Tasks 5–6: config panel + editor de presets
  - Task 7: input zone
  - Task 8: card rendering
  - Task 9: ciclo texto (preview / limpiar / copiar)
  - Task 10: ciclo archivo (carga / preview / limpiar / descargar)
  - Task 11: bulk bar (procesar todas / zip)
  - Task 12: polish + smoke test

---

## History

### 2026-06-02 — Brainstorming + spec + plan completos
- Brainstorming UI: flujo unificado sin toggle de modos, tarjetas colapsables con ciclo preview→limpiar→copiar/descargar
- Decisiones clave: presets con editor inline, diff naranja/verde, zip writer inline sin deps, drop solo en input zone
- Spec aprobada: `docs/superpowers/specs/2026-06-02-emoji-cleaner-webapp-design.md`
- Plan listo (12 tareas, TDD para engine y presets): `docs/superpowers/plans/2026-06-02-emoji-cleaner-webapp.md`

### 2026-05-12 — Inicio v0 + pivot a web app
- Carpeta creada como copia limpia desde ICO.NO/PROTOTIPOS/emoji-cleaner/
- Script CLI descartado — caso de uso principal es output LLM (texto/archivos sueltos), no batch de codebase
- Referencia técnica: icono.py (emoji_scan/) — mejores rangos Unicode y arquitectura
