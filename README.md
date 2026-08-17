# Las Tortuguitas Ninja · Equipo + Dashboard

Sitio estático (HTML/CSS/JS vanilla + Chart.js) con una página de equipo de Selección y un dashboard de altas de personal, presentismo y cumplimiento para Sabores Express y Hamburguesas Extremas.

## Estructura

- `index.html` — página de equipo (landing): banner "Equipo Tortuguitas" en degradé de marrones y una tarjeta minimalista por integrante (solo nombre y apellido), cada una linkeando a sus resultados en `dashboard.html`.
- `dashboard.html` — layout y contenedores de cada card/gráfico del dashboard (antes `index.html`). Funciona como panel general (sin filtrar) o filtrado por integrante vía `?miembro=`.
- `styles.css` — estilos de ambas páginas.
- `data.js` — `window.ALTAS_DATA`: datos crudos normalizados (altas + cumplimiento). Reemplazar con la exportación actualizada del Excel para refrescar el dashboard.
- `zonas.js` — `window.ZONA_MAP`: mapea cada valor del campo `local` de `data.js` a su zona geográfica del AMBA (CABA / Norte / Oeste / Sur; lo que queda afuera del AMBA — Rosario, Mar del Plata, La Plata — se suma aparte como "Otras"). Alimenta la sección "Altas por zona" del panel de Kevin.
- `charts.js` — helpers genéricos para instanciar/actualizar gráficos Chart.js (línea, barra apilada, barra horizontal, dona).
- `app.js` — lógica de filtros de período (6/12/histórico/meses específicos), filtro por integrante (`?miembro=`) y agregaciones que alimentan KPIs, gráficos, rankings y el resumen por zona.
- `vendor/chart.umd.min.js` — copia local de Chart.js 4.4.4. Se dejó de cargar desde el CDN (`cdnjs.cloudflare.com`) porque en varias redes (firewalls corporativos, bloqueadores de contenido) esa URL queda bloqueada y el script nunca llega a definir `Chart`; eso hacía que todos los gráficos quedaran en blanco aunque `data.js` sí tuviera datos. Al servir el archivo desde el propio sitio, los gráficos ya no dependen de una red externa.
- `images/` — fotos de cada integrante (avatar circular en la tarjeta) y las imágenes `tortuga-*.jpg`, que se muestran como fondo de la tarjeta al pasar el cursor por encima (hover) en `index.html`.

## Altas por zona (panel de Kevin)

El panel completo (`dashboard.html` sin `?miembro=`, el que ve Kevin como coordinador) incluye una sección "Altas por zona (AMBA)": una tarjeta por zona (CABA, Zona Norte, Zona Oeste, Zona Sur) con el total de altas, el % sobre el total y la mezcla Sabores/Extremas, más un gráfico de barras apiladas comparando las cuatro zonas. Respeta el filtro de período (6/12/histórico/meses específicos) igual que el resto del dashboard. Los locales fuera del AMBA (Rosario, Mar del Plata, La Plata) se muestran aparte, en una línea debajo del gráfico. Las vistas filtradas por integrante no muestran esta sección.

La clasificación por zona sale de `zonas.js` (el nombre del local, no de geocoding), así que es instantánea y no depende de ningún servicio externo. Reemplazó a un mapa de pines (Leaflet + geocoding contra Nominatim) que se sacó del panel por pedido: además de no ser el formato que se buscaba, la geocodificación de direcciones con nombre de calle común (San Martín, Rivadavia, Córdoba...) a veces ubicaba locales en la provincia equivocada.

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
