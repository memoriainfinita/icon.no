# emoji-cleaner web app — spec

**Fecha:** 2026-06-02
**Estado:** aprobado

---

## 1. Stack y arquitectura

- Un solo archivo `index.html` con CSS y JS embebidos
- Sin dependencias externas, sin servidor, sin build step
- Funciona offline, se abre directo en el browser
- Persistencia de presets vía `localStorage`

**Motor de emojis:** rangos Unicode 17.0 portados desde `icono.py` (emoji_scan/). Bloques cubiertos: Emoticons, Misc Symbols and Pictographs, Transport and Map, Supplemental Symbols, Dingbats, más secuencias ZWJ, variantes de skin tone, y flags (regional indicators). Aproximadamente 50 líneas de rangos/regex.

---

## 2. Estructura de la UI

Panel centrado, layout vertical:

1. **Header** — nombre "emoji-cleaner", sin navegación
2. **Config panel** — colapsable, contiene la lista de presets
3. **Input zone** — textarea + drag & drop + botón file picker + botón "Añadir →"
4. **Card stack** — tarjetas apiladas en orden de creación, colapsables
5. **Bulk bar** — acciones globales, visible solo cuando hay tarjetas

Sin toggle de modos. Texto y archivos coexisten como tarjetas del mismo tipo en el mismo stack.

---

## 3. Input zone

- Textarea que acepta texto pegado y drag & drop de archivos
- Botón "+ archivos" abre file picker (acepta múltiples archivos)
- Botón "Añadir →" crea la tarjeta:
  - Si hay texto en la textarea → crea una tarjeta de texto y vacía la textarea
  - Si se han soltado o seleccionado archivos → crea una tarjeta por archivo
  - Si hay texto y archivos → crea ambos tipos
- Al hacer drag sobre cualquier parte de la app, la input zone resalta para guiar al usuario. El drop solo se acepta dentro de la input zone.
- El botón "Añadir →" está desactivado si la textarea está vacía y no hay archivos pendientes de añadir.
- Los archivos se leen como UTF-8. Si el original tenía otro encoding, el resultado se descarga igualmente como UTF-8.

---

## 4. Tarjetas

### Tipos

| Tipo | Icono header | Nombre mostrado | Acción final |
|------|-------------|-----------------|--------------|
| Texto | ¶ | "Texto · 14:23" | Copiar |
| Archivo | ≡ | nombre del archivo | ⬇ Descargar |

### Estados

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Recién creada, sin procesar |
| `preview` | Dry-run ejecutado, diff visible |
| `listo` | Limpieza aplicada, resultado disponible |
| `error` | Archivo no compatible o no legible |

### Ciclo

1. **pendiente** — botones: Preview (primario), Limpiar, Copiar/Descargar (desactivado)
2. **preview** — output muestra diff inline. Toggle "diff / resultado" cambia la vista sin reprocesar. Limpiar pasa a ser primario
3. **listo** — output muestra resultado limpio. Copiar o Descargar disponibles

Preview es opcional: el usuario puede ir directo de pendiente a listo con Limpiar.

### Toggle diff/resultado en estado `listo`

El toggle desaparece en estado `listo`. El output muestra el resultado limpio directamente, sin opción de volver al diff — para ver el diff hay que hacer Preview de nuevo.

### Invalidación de preview

Si el usuario modifica los presets activos después de haber hecho preview en una tarjeta, esa tarjeta vuelve a estado `pendiente`. El diff mostrado quedaría desactualizado si no se invalida.

### Colapsado

Cada tarjeta tiene un chevron en el header para colapsar/expandir el body. El header siempre muestra nombre y estado.

### Eliminar tarjeta

Botón ✕ en el header de cada tarjeta, junto al chevron. Sin confirmación. El header muestra: nombre · estado · ✕ · chevron.

### Nombres de tarjetas de texto

Timestamp corto: "Texto · 14:23". Si se añaden dos en el mismo minuto, el segundo lleva segundos: "Texto · 14:23:05".

### Botón Limpiar en estado `listo`

Sigue visible como botón secundario. Permite re-limpiar con presets distintos. El resultado reemplaza el anterior, la tarjeta permanece en `listo`.

### Feedback al copiar

El botón cambia a "Copiado ✓" durante 1.5 segundos y vuelve a "Copiar". Sin toast ni sonido.

### Tipos de archivo aceptados

MIME `text/*` más extensiones comunes sin MIME declarado: `.txt .md .js .py .json .csv .log .html .css .xml .yaml`. Si el archivo no pasa el filtro, la tarjeta aparece en estado `error` con el mensaje "archivo no compatible" en el header. Sin modal ni bloqueo.

---

## 5. Diff inline

El output en estado `preview` muestra segmentos:

- **Texto plano** — color neutro
- **Emoji preservado** — fondo verde oscuro, borde verde, color verde claro
- **Emoji eliminado** — fondo naranja oscuro, tachado, color naranja

El toggle "diff / resultado" alterna entre la vista de diff y el texto limpio sin reprocesar.

---

## 6. Bulk bar

Visible cuando hay al menos una tarjeta en el stack.

- **▶ Procesar todas** — ejecuta Limpiar en todas las tarjetas en estado `pendiente` o `preview`, incluyendo las colapsadas. Salta las tarjetas en estado `error`. El estado del header se actualiza en tiempo real.
- **⬇ Descargar listas (.zip)** — descarga como zip todas las tarjetas de tipo archivo en estado `listo`. El zip se nombra `emoji-cleaner-YYYY-MM-DD.zip`. Si solo hay una archivo listo, descarga el archivo suelto directamente.

---

## 7. Sistema de presets

### Presets predefinidos

Cargados en `localStorage` la primera vez:

| Nombre | Emojis |
|--------|--------|
| Estado | ✅ ❌ |
| Semáforo | 🟢 🔴 🟡 |
| Alertas | ℹ️ ⚠️ |
| Flechas | ➡️ ⬆️ ⬇️ ↩️ |

### Preserve list activa

Unión de los emojis de todos los presets con toggle ON. Se recalcula en tiempo real al cambiar cualquier toggle. Un cambio invalida los previews activos.

### Editor de preset

Se activa inline al hacer clic en "editar". Solo un preset puede estar en edición a la vez. Campos:

- **Nombre** — texto libre
- **Emojis** — chips con ✕ para eliminar, campo + botón para añadir
- **Guardar** / **Cancelar** / **Eliminar preset**

### Nuevo preset

Mismo formulario vacío, aparece al hacer clic en "+ nuevo preset". Al guardar se añade a la lista con toggle ON por defecto.

Los presets predefinidos se pueden editar y eliminar igual que los custom.

### Emoji duplicado en preset

Si el usuario intenta añadir un emoji que ya existe en el preset, se ignora. El chip existente hace un breve flash (outline naranja, 0.4s) para indicar que ya está presente.

### Persistencia

Todo el estado de presets (nombres, emojis, toggles) se guarda en `localStorage` bajo la clave `emoji-cleaner-presets`. Si la clave no existe, se inicializa con los predefinidos.

---

## 8. Motor de detección

### API interna

```js
detectEmojis(text)
// → [{ start, end, emoji, preserved }]

cleanText(text, preserveSet)
// → string

buildDiffSegments(text, detections)
// → [{ type: 'plain'|'keep'|'del', text }]
```

### Rangos Unicode 17.0 (de icono.py)

Bloques a portar:
- `\u{1F600}-\u{1F64F}` — Emoticons
- `\u{1F300}-\u{1F5FF}` — Misc Symbols and Pictographs
- `\u{1F680}-\u{1F6FF}` — Transport and Map
- `\u{1F700}-\u{1F77F}` — Alchemical / misc
- `\u{1F780}-\u{1F7FF}` — Geometric shapes extended
- `\u{1F800}-\u{1F8FF}` — Supplemental Arrows-C
- `\u{1F900}-\u{1F9FF}` — Supplemental Symbols and Pictographs
- `\u{1FA00}-\u{1FA6F}` — Chess/sport symbols
- `\u{1FA70}-\u{1FAFF}` — Symbols and Pictographs Extended-A
- `\u{2600}-\u{26FF}` — Misc Symbols
- `\u{2700}-\u{27BF}` — Dingbats
- Secuencias ZWJ (`\u{200D}`)
- Variantes de texto/emoji (`\u{FE0F}`)
- Skin tones (`\u{1F3FB}-\u{1F3FF}`)
- Flags: regional indicators (`\u{1F1E0}-\u{1F1FF}`)

La implementación verificará estos rangos contra `icono.py` antes de codificarlos.

---

## 9. Fuera de scope

- Exportar/importar configuración de presets
- Historial de sesión
- Conversión de encoding no-UTF-8
- Vista previa del contenido de archivos antes de procesar
