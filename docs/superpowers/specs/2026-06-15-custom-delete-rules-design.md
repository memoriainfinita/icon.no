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

- `type: 'literal'` — borra todas las apariciones exactas de `value`, case-sensitive.
- `type: 'regex'` — `value` es el cuerpo del patrón, se compila con flags `gu`. Si es inválido, la regla se marca con error y se ignora (no rompe la limpieza).
- `enabled` — toggle on/off, igual que los presets.
- Persisten en localStorage bajo clave nueva `emoji-cleaner-delete-rules`, separada de los presets.

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

Strings en inglés, siguiendo el i18n de la sesión 4.

## Pipeline y diff

Orden de pasadas sobre cada texto:

1. Detección de emojis (motor actual) — marca qué borrar/preservar.
2. Reglas de borrado custom — marca rangos adicionales a borrar.
3. Fusión de todas las marcas en una lista de segmentos ordenada por posición.
4. Render del diff + texto limpio en una pasada.

Detalles:

- Diff visual: las eliminaciones custom se muestran como los emojis a borrar — tachado naranja. Preservado en verde.
- Solapamiento de rangos: quedarse con la unión de rangos a borrar, evitando segmentos duplicados, para que el diff no se rompa.

## Función nueva en engine.js

`applyDeleteRules(text, rules)` devuelve rangos `{start, end}` en el mismo formato que `detectEmojis`, para que el código de diff existente los consuma sin cambios estructurales.

## Decisiones registradas

- Pasada separada en vez de integrar reglas en el regex de emojis: emojis y texto arbitrario son dominios distintos; mezclarlos ensucia el motor.
- Items individuales en la UI en vez de un único textarea con una regla por línea.
- Emojis sin cambios: el default borrar-todo se mantiene porque en output de LLM los decorativos son infinitos e impredecibles y los funcionales son pocos y estables (lista blanca corta).
