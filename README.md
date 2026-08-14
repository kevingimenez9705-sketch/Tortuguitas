# Las Tortuguitas Ninja · Equipo + Dashboard

Sitio estático (HTML/CSS/JS vanilla + Chart.js) con una página de equipo de Selección y un dashboard de altas de personal, presentismo y cumplimiento para Sabores Express y Hamburguesas Extremas.

## Estructura

- `index.html` — página de equipo (landing): fotos/avatares de Coordinación, Selectores y "Otros", con botón "Ver dashboard →".
- `dashboard.html` — layout y contenedores de cada card/gráfico del dashboard (antes `index.html`).
- `styles.css` — estilos de ambas páginas.
- `data.js` — `window.ALTAS_DATA`: datos crudos normalizados (altas + cumplimiento). Reemplazar con la exportación actualizada del Excel para refrescar el dashboard.
- `charts.js` — helpers genéricos para instanciar/actualizar gráficos Chart.js (línea, barra apilada, barra horizontal, dona).
- `app.js` — lógica de filtros de período (6/12/histórico/meses específicos) y agregaciones que alimentan KPIs, gráficos y rankings.
- `vendor/chart.umd.min.js` — copia local de Chart.js 4.4.4. Se dejó de cargar desde el CDN (`cdnjs.cloudflare.com`) porque en varias redes (firewalls corporativos, bloqueadores de contenido) esa URL queda bloqueada y el script nunca llega a definir `Chart`; eso hacía que todos los gráficos quedaran en blanco aunque `data.js` sí tuviera datos. Al servir el archivo desde el propio sitio, los gráficos ya no dependen de una red externa.

## Página de equipo

`index.html` muestra Coordinación (Kevin García) + Selectores (Agustín Márquez, Agustina Castillo, Rafael Barberi, Gustavo Sotelo) y, en una sección aparte "Otros", a Emiliano, Mariano y Facundo — estos tres coinciden con los `selector` que aparecen en `data.js`. Los avatares son iniciales sobre un círculo de color (no hay fotos reales todavía): para usar fotos reales, reemplazar el `<div class="avatar" style="...">` de cada tarjeta por un `<img class="avatar" src="images/nombre.jpg">` y agregar las imágenes a una carpeta `images/`.

## Cómo actualizar los datos

Los datos NO están pre-agregados: `data.js` guarda cada registro individual (`altas`: selector, regional, zonal, local, fecha, mes, presente, marca; `cumplimiento`: mes, semana, selector, cumplimiento, enviados, restantes, total). Todas las agregaciones (por mes, por selector, top zonales/locales, etc.) se calculan en `app.js` en tiempo real según el período elegido. Esto lo hace escalable: para actualizar, solo hay que regenerar `data.js` desde el Excel fuente (misma estructura de columnas) y no tocar el resto del código.

## Deploy

Proyecto 100% estático → deploy directo en Vercel (Framework Preset: "Other") o GitHub Pages, sin build step.

## Fuente de datos

Excel `informe_anual` (hoja "informe anual" para altas, hoja "cumplimiento" para envíos/vacantes).
