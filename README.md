# Las Tortuguitas Ninja · Equipo + Dashboard

Sitio estático (HTML/CSS/JS vanilla + Chart.js) con una página de equipo de Selección y un dashboard de altas de personal, presentismo y cumplimiento para Sabores Express y Hamburguesas Extremas.

## Estructura

- `index.html` — página de equipo (landing): banner "Equipo Tortuguitas" en degradé de marrones y una tarjeta minimalista por integrante (solo nombre y apellido), cada una linkeando a sus resultados en `dashboard.html`.
- `dashboard.html` — layout y contenedores de cada card/gráfico del dashboard (antes `index.html`). Funciona como panel general (sin filtrar) o filtrado por integrante vía `?miembro=`.
- `styles.css` — estilos de ambas páginas.
- `data.js` — `window.ALTAS_DATA`: datos crudos normalizados (altas + cumplimiento). Reemplazar con la exportación actualizada del Excel para refrescar el dashboard.
- `charts.js` — helpers genéricos para instanciar/actualizar gráficos Chart.js (línea, barra apilada, barra horizontal, dona).
- `app.js` — lógica de filtros de período (6/12/histórico/meses específicos), filtro por integrante (`?miembro=`) y agregaciones que alimentan KPIs, gráficos y rankings.
- `vendor/chart.umd.min.js` — copia local de Chart.js 4.4.4. Se dejó de cargar desde el CDN (`cdnjs.cloudflare.com`) porque en varias redes (firewalls corporativos, bloqueadores de contenido) esa URL queda bloqueada y el script nunca llega a definir `Chart`; eso hacía que todos los gráficos quedaran en blanco aunque `data.js` sí tuviera datos. Al servir el archivo desde el propio sitio, los gráficos ya no dependen de una red externa.
- `images/` — fotos subidas para versiones anteriores de la página de equipo. Ya no se usan (la página actual es solo texto), quedaron por si se quiere volver a un diseño con fotos.

## Página de equipo y resultados por integrante

`index.html` tiene una tarjeta por integrante (Kevin García, Agustín Márquez, Agustina Castillo, Rafael Barberi, Gustavo Sotelo, Otros). Cada una linkea a `dashboard.html?miembro=<clave>`, que filtra todos los KPIs/gráficos a los datos de esa persona. El mapeo integrante → `selector` de `data.js` vive en `MEMBER_MAP` dentro de `app.js`:

- **Kevin García** → sin filtro (`dashboard.html` sin query param): ve el panel ejecutivo completo, como coordinador.
- **Agustín Márquez** → `selector: "Agustin"`.
- **Agustina Castillo** → `selector: "Agustina"`.
- **Rafael Barberi** y **Gustavo Sotelo** → todavía no tienen `selector` propio en `data.js`, así que su página muestra un estado "S/D" (sin datos) en vez de gráficos vacíos. En cuanto la planilla fuente tenga altas con su nombre como selector, agregar la clave correspondiente en `MEMBER_MAP` y van a mostrar datos automáticamente.
- **Otros** → agrupa `Emiliano`, `Mariano`, `Facundo` y `Seleccion` (altas sin selector puntual asignado en la planilla) en un solo resultado combinado.

## Cómo actualizar los datos

Los datos NO están pre-agregados: `data.js` guarda cada registro individual (`altas`: selector, regional, zonal, local, fecha, mes, presente, marca; `cumplimiento`: mes, semana, selector, cumplimiento, enviados, restantes, total). Todas las agregaciones (por mes, por selector, top zonales/locales, etc.) se calculan en `app.js` en tiempo real según el período elegido. Esto lo hace escalable: para actualizar, solo hay que regenerar `data.js` desde el Excel fuente (misma estructura de columnas) y no tocar el resto del código.

## Deploy

Proyecto 100% estático → deploy directo en Vercel (Framework Preset: "Other") o GitHub Pages, sin build step.

## Fuente de datos

Excel `informe_anual` (hoja "informe anual" para altas, hoja "cumplimiento" para envíos/vacantes).
