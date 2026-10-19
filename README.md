# Las Tortuguitas Ninja · Equipo + Dashboard

Sitio estático (HTML/CSS/JS vanilla + Chart.js) con una página de equipo de Selección y un dashboard de altas de personal, presentismo y cumplimiento para Sabores Express y Hamburguesas Extremas.

## Estructura

- `index.html` — página de equipo (landing): banner "Equipo Tortuguitas" en degradé de marrones y una tarjeta minimalista por integrante (solo nombre y apellido), cada una linkeando a sus resultados en `dashboard.html`.
- `dashboard.html` — layout y contenedores de cada card/gráfico del dashboard (antes `index.html`). Funciona como panel general (sin filtrar) o filtrado por integrante vía `?miembro=`.
- `styles.css` — estilos de ambas páginas.
- `data.js` — `window.ALTAS_DATA`: datos crudos normalizados (altas + cumplimiento). Reemplazar con la exportación actualizada del Excel para refrescar el dashboard.
- `charts.js` — helpers genéricos para instanciar/actualizar gráficos Chart.js (línea, barra apilada, barra horizontal, dona).
- `app.js` — lógica de filtros de período (mes actual/3/6/12/histórico/meses específicos), filtro por integrante (`?miembro=`) y agregaciones que alimentan KPIs, gráficos y rankings.
- `vendor/chart.umd.min.js` — copia local de Chart.js 4.4.4. Se dejó de cargar desde el CDN (`cdnjs.cloudflare.com`) porque en varias redes (firewalls corporativos, bloqueadores de contenido) esa URL queda bloqueada y el script nunca llega a definir `Chart`; eso hacía que todos los gráficos quedaran en blanco aunque `data.js` sí tuviera datos. Al servir el archivo desde el propio sitio, los gráficos ya no dependen de una red externa.
- `images/` — fotos de cada integrante (avatar circular en la tarjeta) y las imágenes `tortuga-*.jpg`, que se muestran como fondo de la tarjeta al pasar el cursor por encima (hover) en `index.html`.

## Página de equipo y resultados por integrante

`index.html` tiene una tarjeta por integrante (Kevin García, Agustín Márquez, Agustina Castillo, Rafael Barberi, Gustavo Sotelo, Albana Pais, Otros). Cada una linkea a `dashboard.html?miembro=<clave>`, que filtra todos los KPIs/gráficos a los datos de esa persona. El mapeo integrante → `selector` de `data.js` vive en `MEMBER_MAP` dentro de `app.js`:

- **Kevin García** → sin filtro (`dashboard.html` sin query param): ve el panel ejecutivo completo, como coordinador.
- **Agustín Márquez** → `selector: "Agustin"`.
- **Agustina Castillo** → `selector: "Agustina"`.
- **Rafael Barberi** → `selector: "Rafael"` (con altas desde agosto 2026).
- **Gustavo Sotelo** → `selector: "Gustavo"` (con altas desde agosto 2026).
- **Albana Pais** → `selector: "Albana"` (con altas desde octubre 2026).
- **Otros** → agrupa `Emiliano`, `Mariano`, `Facundo` y `Seleccion` (altas sin selector puntual asignado en la planilla) en un solo resultado combinado.

## Oficina digital y datos en vivo

- `oficina.html` — página "Oficina digital" (tarjeta "Oficina digital" de `index.html`): oficina 3D en vivo + chat con el Coordinador + tablero de hoy.
- `oficina-3d.js` — **Oficina en vivo en 3D** (three.js sin build: `vendor/three.min.js` es three r186 minificado con `RoundedBoxGeometry`). Maqueta isométrica con los 6 agentes en sus escritorios, por zona (Selección, Entrevistas e ingresos, Coordinación, Servidores). Cada 30 s lee la bitácora (`rpc/oficina_ultimas_acciones`, `rpc/oficina_actividad`): estado de cada agente (trabajando, en horario, con aviso, durmiendo), globito con la última acción y salto cuando registra algo nuevo. De 8 a 18 h, cuando están libres, van a tomar un café, charlan o visitan a un compañero (un solo globito a la vez). Después de las 18 h vuelan a su cama en la sala de descanso (manta del color de cada robot) y duermen (💤); solo se despiertan si les hablamos por el chat. La maqueta tiene rincón del café, puffs, sillón de espera, biblioteca, reloj, cuadros, alfombras y plantas. Clic en un agente: ficha con la última acción, actividad de 24 h y botones "Preguntale" (manda la pregunta al chat) y "Abrir en n8n". Si el navegador no tiene WebGL o three.js no carga, queda la versión 2D.
- `oficina-viva.js` — **chat con el Coordinador** + oficina 2D de respaldo. El chat no necesita usuario de n8n, solo el código del equipo (se lo pide Kevin; queda guardado en el navegador). Llama al webhook del workflow **"Oficina - Chat web (Tortuguitas)"**, que solo consulta datos y nunca devuelve datos personales. Avisa a la oficina 3D con eventos (`oficina:consulta`, `oficina:respuesta`): el Coordinador piensa y los agentes que ayudaron vuelan a la mesa de reunión. Escucha `oficina:preguntar` (botones de la 3D y del tablero).
- `tablero.js` — **Hoy en la oficina · lo que necesita al equipo**: una tarjeta por agente con algo accionable (entrevistas de hoy y mañana, ingresos de los próximos 7 días, búsquedas para mover, recomendadas para llamar, postulaciones de hoy y avisos sin resolver) y su botón "Preguntale". Lee `equipo_solicitudes` y `rpc/oficina_tablero` (solo totales, sin datos personales).
- **Memoria de 7 días**: desde el chat se puede decir "Anotá que…" y el Coordinador guarda el comentario en Supabase (`equipo_comentarios`, se borra solo a los 7 días con pg_cron; se limpian mails y números largos). Los 6 agentes lo leen antes de cada tarea. En la pizarra de la oficina solo se ve la cantidad de notas de la semana (`rpc/oficina_comentarios_cantidad`), nunca el texto.
- **Cambios en planillas con PIN**: desde el chat se puede pedir borrar una fila (va a la pestaña *Papelera*, se puede recuperar), cambiar el estado, editar un dato o agregar una fila en *Solicitudes Sabores*, *Solicitudes Extremas* y *Tareas grupales*. El Coordinador solo **propone** (`rpc/proponer_accion`, arma el resumen con la copia en Supabase); en el chat aparece la tarjeta "Confirmá el cambio" y alguien del equipo lo confirma con su **PIN personal** de 6 números (3 intentos, vence a los 10 min). El workflow **"Oficina - Cambios en planillas con PIN (Tortuguitas)"** (`/webhook/oficina-accion`) valida el PIN en Supabase (`equipo_pines`, guardados con hash), vuelve a leer la planilla, ubica la fila real y recién ahí la cambia; en Solicitudes solo toca las columnas A a L. Queda registrado en `equipo_acciones` y en la bitácora (sin nombres) y re-sincroniza la copia. Los PIN los define Kevin en el SQL editor de Supabase: `select definir_pin('Nombre', '######');` (`quitar_pin('Nombre')` para dar de baja).
- `supabase.js` — lectura de Supabase con la clave publicable (solo lectura, sin datos personales de candidatos).
- `vivo.js` — sección **Hoy · tareas y búsquedas** de `dashboard.html`: tareas abiertas de la planilla *Tareas grupales* y solicitudes de *TAREAS GRUPALES* (Solicitudes Sabores/Extremas) de la persona del dashboard, o de todo el equipo en el panel de Kevin. Altas y cumplimiento siguen saliendo de `data.js`.
- El workflow de n8n **"Equipo - Sync hojas de Drive → Supabase (Tortuguitas)"** copia cada 30 minutos esas hojas a las tablas `equipo_tareas` y `equipo_solicitudes` (de las solicitudes solo lee las columnas A a L, sin datos personales).

## Cómo actualizar los datos

Los datos NO están pre-agregados: `data.js` guarda cada registro individual (`altas`: selector, regional, zonal, local, fecha, mes, presente, marca; `cumplimiento`: mes, semana, selector, cumplimiento, enviados, restantes, total). Todas las agregaciones (por mes, por selector, top zonales/locales, etc.) se calculan en `app.js` en tiempo real según el período elegido. Esto lo hace escalable: para actualizar, solo hay que regenerar `data.js` desde el Excel fuente (misma estructura de columnas) y no tocar el resto del código.

## Deploy

Proyecto 100% estático → deploy directo en Vercel (Framework Preset: "Other") o GitHub Pages, sin build step.

## Fuente de datos

Excel `informe_anual` (hoja "informe anual" para altas, hoja "cumplimiento" para envíos/vacantes).
