---
created: 2026-06-15
project: icon.no v0
status: approved
---

# Custom Delete Rules — Design

## Problema

Hoy el usuario solo controla qué emojis **sobreviven** (presets = lista blanca de preservación). No tiene control sobre qué **se elimina** más allá de los emojis que el motor detecta. No puede borrar texto no-emoji (cadenas, palabras, patrones).

## Alcance

- Añadir reglas de borrado definidas por el usuario: lista negra para texto.
- El motor de emojis y el sistema de presets de preservación **no cambian**.
- Dominios separados: preservar-emojis resuelve el borrado automático de lo desconocido; las reglas custom resuelven el borrado explícito de texto conocido.

Fuera de alcance: invertir el modelo de emojis (borrar-todo se mantiene).

## Modelo de datos

Una regla custom:

```
{ id, type: 'literal' | 'regex', value, enabled }
```

- `id` — generado con `crypto.randomUUID()` al crear la regla.
- `type: 'literal'` — borra todas las apariciones exactas de `value`, case-sensitive.
- `type: 'regex'` — `value` es el cuerpo del patrón, se compila con flags `gu`. Si es inválido, la regla se marca con error y se ignora (no rompe la limpieza).
- `enabled` — toggle on/off, igual que los presets.
- Persisten en localStorage bajo clave nueva `emoji-cleaner-delete-rules`, separada de los presets.
- Default: lista vacía `[]`. No hay reglas predefinidas — son inherentemente del usuario.

`loadDeleteRules` / `saveDeleteRules` replican el patrón de `loadPresets` / `savePresets` (presets.js): `try/catch` en la lectura con fallback a `[]` si el JSON está corrupto.

## Comportamiento y precedencia

- Las reglas se aplican al texto y borran lo que capturan, sea texto plano o un emoji.
- Una regla explícita del usuario **gana** sobre un preset de preservación: la acción específica manda.
- En la práctica casi nunca se solapan, porque las reglas custom apuntan a texto no-emoji.

## UI

Nueva sección en el panel de config, debajo de los presets, con el patrón visual ya existente:

- Lista de reglas. Cada una: `value`, indicador de tipo (literal/regex), toggle enabled, botón editar, botón borrar. Mismo estilo que los items de presets.
- Formulario inline para añadir: campo de texto + selector literal/regex + botón añadir.
- Regla regex inválida: marca de error (borde/color) + texto breve; desactivada de facto hasta corregirla.
- Sin nombre: el propio `value` es la etiqueta (una regla = una entrada, no un grupo).
- Validación al añadir/editar: se rechaza `value` vacío (tanto literal como regex). Una regla literal vacía casaría en todas partes o en ninguna; una regex vacía no tiene sentido.

Strings en inglés, siguiendo el i18n de la sesión 4.

## Pipeline y diff

### Fuente única: `analyze(text, preserveSet, rules)`

Hoy hay doble pasada inconsistente: `cleanText` (engine.js:69) vuelve a llamar a `detectEmojis` por su cuenta, separado de `buildDiffSegments`. Con reglas custom, diff y output podrían divergir.

Se reemplaza por una función única `analyze(text, preserveSet, rules)` que devuelve `{ segments, cleanContent }` de una sola pasada. El diff y el texto limpio salen de la misma fuente, garantizando que coincidan. Los call sites (`previewCard`, `cleanCard`, `previewAll`, `processAll`) la consumen.

### Algoritmo por máscara de caracteres

Evita recortar intervalos solapados. Sobre una máscara `mark[]` de longitud `text.length` (índices de code unit, igual que `slice`):

1. Init todas las posiciones a `'plain'`.
2. Detecciones de emoji (`detectEmojis(text, preserveSet)`): marcar cada posición del emoji como `'keep'` si `preserved`, si no `'del'`.
3. Reglas de borrado: por cada match, marcar sus posiciones como `'del'`. **`del` sobrescribe `keep`** → resuelve la precedencia "delete gana sobre preserve" sin lógica extra.
4. Agrupar runs contiguos de la misma marca en segmentos `{ type, text }`.
5. `cleanContent` = concatenación de los caracteres cuya marca no es `'del'`.

Esto resuelve de un golpe: solapamiento entre reglas, solapamiento regla-emoji, precedencia, duplicados de segmento, y la sincronía diff/output. Coste O(n) en memoria sobre el texto, aceptable para el caso de uso.

### Escapado del diff (corrige hueco actual)

El render actual (`index.html:667-669`) solo escapa los segmentos `plain`; inyecta `del`/`keep` crudos en `innerHTML`. Con emojis es inocuo, pero las reglas custom meten texto arbitrario en segmentos `del`: `<div>`, `&`, `<script>` romperían el render o abrirían XSS sobre el texto pegado. `renderOutput` debe escapar **todos** los segmentos (`escapeHtml` sobre un emoji es no-op).

### Diff visual

Las eliminaciones custom se muestran como los emojis a borrar — tachado naranja (`.del`). Preservado en verde (`.keep`). Un solo lenguaje visual: "esto se va", sin importar si era emoji o texto.

## Funciones en engine.js

- `applyDeleteRules(text, rules)` — ejecuta las reglas habilitadas y devuelve rangos `{ start, end }`. Para `regex`, compila con `gu` dentro de `try/catch`; si lanza, omite la regla. El bucle de matching **salta matches de ancho cero** avanzando `lastIndex` manualmente, para no colgar en bucle infinito (ver Robustez).
- `analyze(text, preserveSet, rules)` — orquesta el algoritmo por máscara descrito arriba. Sustituye el uso directo de `cleanText` + `buildDiffSegments` en los call sites. `cleanText` y `buildDiffSegments` se mantienen o se pliegan dentro de `analyze` según convenga en el plan; lo que importa es que exista una sola fuente.

## Robustez

- **Match de ancho cero.** Una regex válida puede casar cadena vacía (`a*`, `^`, lookahead). Con flag `g` y `lastIndex`, un match vacío que no avanza el cursor cuelga el navegador. Mitigación: en `applyDeleteRules`, si `match[0]` tiene longitud 0, no se marca nada y se avanza `lastIndex` en 1.
- **Regex catastrófica (ReDoS).** Un patrón válido pero exponencial (`(a+)+$`) sobre texto grande puede congelar la pestaña. Las regex corren en el hilo principal. Decisión: **riesgo aceptado para v1**. Es una app client-side de archivo único; un patrón catastrófico solo afecta la pestaña del propio usuario, que además escribió la regla. No se añade Web Worker con timeout — sobreingeniería para el caso de uso. Documentado aquí como límite conocido.
- **Regex inválida.** Capturada en `try/catch` al compilar; la regla se marca con error en la UI y se omite en la limpieza.
- **Valor vacío.** Rechazado en el formulario (ver UI).

## Decisiones registradas

- Pasada separada en vez de integrar reglas en el regex de emojis: emojis y texto arbitrario son dominios distintos; mezclarlos ensucia el motor.
- Pipeline unificado por máscara de caracteres con fuente única `analyze()`, en vez de fusionar listas de intervalos: evita recortar solapamientos y garantiza diff = output.
- Items individuales en la UI en vez de un único textarea con una regla por línea.
- ReDoS: riesgo aceptado en v1, sin Web Worker.
- Emojis sin cambios: el default borrar-todo se mantiene porque en output de LLM los decorativos son infinitos e impredecibles y los funcionales son pocos y estables (lista blanca corta).
