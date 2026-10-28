// ruta.js — "Ruta del ingresante": el proceso completo, del QR a iCheck, como
// 13 oficinas en fila (una por paso) más la de salidas. Une lo que antes estaba
// repartido en Citaciones Tortus, TAREAS GRUPALES y Tareas grupales/zonas.
//
// Fuentes (clave publicable, solo totales):
//   rpc/ruta_estaciones → cuántas personas pasaron por cada paso en el período,
//     hoy, cuántas están ahí ahora, de qué planilla llegó el dato y los últimos
//     movimientos sin nombres.
//   rpc/ruta_oficinas → datos en vivo de las oficinas: turnos de la sala (lo que
//     muestra el Panel de Sala), solicitudes por estado y selector (lo que cuenta
//     el Contador de Vacantes), onboardings, primeros días, agenda de salas,
//     encuesta y uniformes.
// n8n y los Apps Script de cada planilla cargan esos datos; la ruta no los modifica.
//
// Arma el panel "Funciones de esta oficina" (herramientas y planillas del paso,
// datos en vivo, con qué scripts funciona y "Preguntale" al agente), la línea
// estación por estación y los últimos movimientos. ruta-3d.js dibuja las
// oficinas y se comunica con eventos:
//   ruta:datos   → { ...respuesta de ruta_estaciones } (cada vez que se leen)
//   ruta:elegir  → { etapa } (la 3D pide ir a un paso)
//   ruta:elegida → { etapa } (paso a la vista, para mover la 3D)
// El paso elegido queda en la dirección (#paso-4, #salidas) para compartirlo.
window.RUTA = (() => {
  const TRAMOS = {
    1: { nombre: 'Postulación y citación', color: '#0f8b8d', suave: '#ddf1f1' },
    2: { nombre: 'Entrevista', color: '#c2780a', suave: '#f8ebd6' },
    3: { nombre: 'Vacantes', color: '#3e5bd8', suave: '#e3e8fb' },
    4: { nombre: 'Ingreso e iCheck', color: '#2c9356', suave: '#ddf0e4' },
    x: { nombre: 'Salidas', color: '#b7473f', suave: '#f6e0de' },
  };
  // Mismos agentes que la Oficina (ids de la tabla agentes) y la pregunta que se les hace.
  const AGENTES = {
    screening: { emoji: '🔎', nombre: 'Screening', pregunta: '¿Cuántas postulaciones recomendó avanzar el Screening en las últimas 48 horas y de qué zonas?' },
    agenda: { emoji: '📅', nombre: 'Agenda', pregunta: '¿Qué entrevistas hay hoy y mañana?' },
    vacantes: { emoji: '📌', nombre: 'Vacantes', pregunta: '¿Qué búsquedas siguen abiertas o trabadas y de quién son?' },
    onboarding: { emoji: '🤝', nombre: 'Onboarding', pregunta: '¿Qué ingresos hay en los próximos días?' },
    coordinador: { emoji: '🧭', nombre: 'Coordinador', pregunta: '¿Qué hizo la oficina hoy?' },
    analista: { emoji: '📊', nombre: 'Analista', pregunta: '¿Cómo vienen las postulaciones hoy comparado con ayer?' },
  };

  // Planillas y herramientas que ya usa el equipo (se abren tal cual, sin cambios).
  const hoja = (id, gid) => `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${gid}`;
  const TAREAS = '1BeSkjch_rEdZx7QTRcJK0XV9fGcHcFpXWQX-vlFrT98';
  const ZONAS = '1YhOjO2nACt7WLHuOF5JShQA-AUlYvmkdULdgi4MwPRM';
  const CITACIONES = '1HF7Hpj6tQ6yd0FDC1TTvK0hG2xOhdELCYiGy80fZhhI';
  const H = {
    ats: { t: 'ATS - Postulaciones', d: 'Tareas grupales/zonas', u: hoja(ZONAS, 5562028) },
    formQR: { t: 'Formulario de postulación (QR)', d: 'Sitio', u: 'https://form-solicitud-empleo.vercel.app/' },
    portal: { t: 'Panel de Selección', d: 'Sitio', u: 'https://kevingimenez9705-sketch.github.io/Portal-de-selecci-n/' },
    citaciones: { t: 'Citaciones-Gustavo', d: 'Citaciones Tortus', u: hoja(CITACIONES, 0) },
    confirmados: { t: 'Confirmados', d: 'Citaciones Tortus', u: hoja(CITACIONES, 665573720) },
    agendaOp: { t: 'Agenda de Selección', d: 'Entrevistas Op', u: 'https://docs.google.com/spreadsheets/d/1ACEhOwCwAg9_216w9vRgJelp2fRQxdZBknbBoirVrVs/edit' },
    panelSala: { t: 'Panel de Sala (Clippy)', d: 'Sitio', u: 'https://kevingimenez9705-sketch.github.io/clippy/' },
    proceso: { t: 'Proceso de Selección', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 1904418225) },
    baseDatos: { t: 'BASE DE DATOS', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 376938464) },
    bloqueados: { t: 'BLOQUEADOS', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 33099370) },
    zonales: { t: 'HOJAS ZONALES', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 2054216632) },
    solSabores: { t: 'Solicitudes Sabores', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 982901343) },
    solExtremas: { t: 'Solicitudes Extremas', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 87947209) },
    ingreso: { t: 'Proceso de Ingreso', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 409551323) },
    icheck: { t: 'exportacion_icheck', d: 'TAREAS GRUPALES', u: hoja(TAREAS, 1182409543) },
    carpetaIcheck: { t: 'Carpeta iCheck', d: 'Drive', u: 'https://drive.google.com/drive/folders/1Qntxhq59U6ELX6T8nWSEWiKqLQQwVWns' },
    docIngreso: { t: 'Documentación de Ingreso · Firma digital', d: 'Sitio', u: 'https://c-digo-de-etica.vercel.app/' },
    constancias: { t: 'Constancias de puesto y sucursal', d: 'Drive', u: 'https://drive.google.com/drive/folders/1QWtLX10A4Ko605G27Qbczez3OLWR5WIZ' },
    encuesta: { t: 'Encuesta de experiencia', d: 'Sitio', u: 'https://encuesta-de-exp.vercel.app' },
    altas: { t: 'Dashboard de altas', d: 'Tortuguitas', u: 'dashboard.html' },
  };

  // Cada paso: tramo, agente que lo cuida, herramientas (H), datos en vivo,
  // columnas de Solicitudes que se pueden cambiar desde la oficina (con PIN),
  // con qué scripts funciona hoy, dónde se carga y qué lo reemplaza.
  const ESTACIONES = {
    POSTULADO: { tramo: 1, agente: 'screening', corto: 'Postulados',
      herramientas: [H.formQR, H.ats, H.portal],
      scripts: ['Formulario QR → Supabase', 'n8n · Screening IA', 'n8n · ATS a Sheets (8 y 14 h)', 'Citaciones Tortus · menú 📞 Citar por zona'],
      hoy: 'Formulario QR → Supabase. Después se copia a "ATS - Postulaciones" y a "Citaciones-<selector>".',
      app: 'Bandeja de postulantes con puntaje A/B/C y la recomendación de Screening, sin copiar a planillas.' },
    CITADO_ENTREVISTA: { tramo: 1, agente: 'agenda', corto: 'Citados', vivo: 'agenda',
      herramientas: [H.citaciones, H.agendaOp],
      scripts: ['Citaciones Tortus · 📞 Citar por zona (CABA y Norte → Florida, Sur → Adrogué, Oeste → Merlo): manda el mail y marca ENVIADO', 'n8n · Ruta (cada 30 min)'],
      hoy: 'Citaciones Tortus: fecha, hora y "ENVIADO" en la pestaña de cada selector.',
      app: 'Agenda por sede: se elige el horario y sale la citación.' },
    CONFIRMO_ENTREVISTA: { tramo: 1, agente: 'agenda', corto: 'Confirmaron', vivo: 'confirmados',
      herramientas: [H.confirmados, H.panelSala],
      scripts: ['Citaciones Tortus · 📋 Recopilar confirmados (lee «Confirmo» en Gmail y arma Confirmados)', 'Citaciones Tortus · Panel «Estado de Sala» (cupo 40 por turno)', 'n8n · Ruta (cada 30 min)'],
      hoy: 'Citaciones Tortus · pestaña Confirmados.',
      app: 'La confirmación tilda al postulante en la agenda.' },
    ASISTIO_ENTREVISTA: { tramo: 2, agente: 'agenda', corto: 'Asistieron', vivo: 'sala',
      herramientas: [H.proceso, H.panelSala],
      scripts: ['Formulario Proceso de Selección', 'Apps Script de TAREAS GRUPALES (ID POSTULANTE → ruta)'],
      hoy: 'TAREAS GRUPALES · Proceso de Selección (formulario en la sede).',
      app: 'Check-in en la sala desde el Panel de Sala.' },
    APROBADO: { tramo: 2, agente: 'screening', corto: 'Aprobados',
      herramientas: [H.proceso, H.baseDatos, H.bloqueados],
      scripts: ['Apps Script de TAREAS GRUPALES (ESTADO → ruta)'],
      hoy: 'Columna ESTADO de Proceso de Selección y BASE DE DATOS.',
      app: 'Botones Aprobado / En espera / No avanza en la ficha. Si está en BLOQUEADOS, aparece el aviso.' },
    COMPARTIDO_ZONAL: { tramo: 3, agente: 'vacantes', corto: 'Al zonal', vivo: 'vacantes', acciones: ['ESTADO'],
      herramientas: [H.zonales, H.proceso],
      scripts: ['Apps Script de TAREAS GRUPALES (copia a la planilla de cada regional)'],
      hoy: 'Columna ESTADO ENVIO y la planilla de cada regional (HOJAS ZONALES).',
      app: 'Cada zonal ve sus candidatos sugeridos por cercanía al local.' },
    VACANTE_ASIGNADA: { tramo: 3, agente: 'vacantes', corto: 'Con vacante', vivo: 'vacantes', acciones: ['ESTADO', 'NOTAS'],
      herramientas: [H.solSabores, H.solExtremas],
      scripts: ['Apps Script «vacantesAsignaciones» (Contador de Vacantes)', 'Apps Script «Vacantes (tablero)»', 'Solicitud de Búsqueda de Personal (web + Apps Script)'],
      hoy: 'Solicitudes Sabores y Extremas, y vacantes reservadas.',
      app: 'Tablero de vacantes por local: cada solicitud es una tarjeta con su candidato.' },
    APROBADO_ZONAL: { tramo: 3, agente: 'vacantes', corto: 'OK del zonal', vivo: 'vacantes', acciones: ['ESTADO'],
      herramientas: [H.solSabores, H.solExtremas],
      scripts: ['n8n · Avisos por mail (cambio de ESTADO)', 'Apps Script de TAREAS GRUPALES (ESTADO → ruta)'],
      hoy: 'Columna ESTADO de Solicitudes, editada a mano.',
      app: 'El zonal aprueba o rechaza con un clic y el selector recibe el aviso.' },
    CITADO_ONB: { tramo: 4, agente: 'onboarding', corto: 'Citados ONB', vivo: 'onb', acciones: ['FECHA', 'HORA', 'ESTADO'],
      herramientas: [H.solSabores, H.solExtremas, H.agendaOp],
      scripts: ['n8n · Avisos por mail (cambio de ESTADO)', 'Apps Script de TAREAS GRUPALES (ESTADO → ruta)'],
      hoy: 'FECHA y HORA de la fila en Solicitudes.',
      app: 'Calendario de onboarding con los cupos por día.' },
    CONFIRMA_ONB: { tramo: 4, agente: 'onboarding', corto: 'Confirman ONB', vivo: 'onb', acciones: ['ESTADO'],
      herramientas: [H.solSabores, H.solExtremas],
      scripts: ['Apps Script de TAREAS GRUPALES (ALTAS RRHH → ruta)'],
      hoy: 'ALTAS RRHH = "CONFIRMA ONB" en Solicitudes.',
      app: 'Se marca al confirmar y Onboarding avisa a quien no confirmó.' },
    HIZO_ONB: { tramo: 4, agente: 'onboarding', corto: 'Hicieron ONB', vivo: 'uniformes',
      herramientas: [H.ingreso, H.docIngreso, H.constancias],
      scripts: ['Formulario Proceso de Ingreso', 'Documentación de Ingreso (web + Apps Script, firma digital)', 'Constancia de puesto y sucursal (web + Apps Script)'],
      hoy: 'Solicitudes + formulario Proceso de Ingreso (datos personales).',
      app: 'Ficha de alta que marca lo que falta: DNI, CUIL, domicilio o fechas mal escritas.' },
    ALTA_ICHECK: { tramo: 4, agente: 'onboarding', corto: 'En iCheck', vivo: 'primeros',
      herramientas: [H.icheck, H.carpetaIcheck],
      scripts: ['n8n · Ruta (cada 30 min, cruza DNI con Solicitudes)'],
      hoy: 'Pestaña exportacion_icheck, armada a mano. Cuando alguien aparece ahí, llega a la ruta (cada 30 min).',
      app: 'Cola de altas con el botón "Exportar iCheck", que arma el archivo y mueve a todos de paso.' },
    INGRESO: { tramo: 4, agente: 'onboarding', corto: 'Ingresaron', vivo: 'ingreso', acciones: ['PRIMER DIA'],
      herramientas: [H.altas, H.encuesta],
      scripts: ['Supabase · seguimiento → altas del dashboard', 'Encuesta de experiencia (web + Apps Script)'],
      hoy: 'PRIMER DÍA en Solicitudes.',
      app: 'Se registra solo y suma al dashboard de altas de Tortuguitas.' },
    NO_AVANZA: { tramo: 'x', agente: 'screening', corto: 'No avanzan', herramientas: [H.proceso, H.bloqueados], scripts: [],
      hoy: 'Se pierde entre ESTADO y OBSERVACIONES.', app: 'Cada salida con su motivo.' },
    NO_SE_PRESENTO: { tramo: 'x', agente: 'agenda', corto: 'No vinieron', herramientas: [H.panelSala], scripts: [],
      hoy: 'No se registra en ninguna planilla.', app: 'La agenda marca a quien no vino a la entrevista o al ONB.' },
    DESISTIO: { tramo: 'x', agente: 'onboarding', corto: 'Desistieron', herramientas: [H.solSabores, H.solExtremas], scripts: [],
      hoy: 'Queda en OBSERVACIONES.', app: 'Se marca en la ficha con el motivo.' },
    RECHAZADO_ZONAL: { tramo: 'x', agente: 'vacantes', corto: 'Rechazo zonal', herramientas: [H.solSabores, H.solExtremas, H.bloqueados], acciones: ['ESTADO', 'NOTAS'],
      scripts: ['Apps Script de TAREAS GRUPALES (ESTADO → ruta)'],
      hoy: 'Columna ESTADO de Solicitudes.', app: 'Vuelve a la bandeja con el motivo, lista para otra vacante.' },
  };
  return { TRAMOS, AGENTES, ESTACIONES, datos: null, elegida: null };
})();

(() => {
  const seccion = document.getElementById('rutaSeccion');
  if (!seccion || !window.SB) return;
  const { TRAMOS, AGENTES, ESTACIONES } = window.RUTA;
  const ZONA = 'America/Argentina/Buenos_Aires';
  const CLAVE_DIAS = 'ruta-dias';
  const PASOS = Object.keys(ESTACIONES).filter((k) => ESTACIONES[k].tramo !== 'x');
  const SALIDAS = Object.keys(ESTACIONES).filter((k) => ESTACIONES[k].tramo === 'x');

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
  const avisar = (nombre, detalle) => document.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const dia = (iso, opciones = { weekday: 'short', day: 'numeric', month: 'numeric' }) =>
    new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones }).format(new Date(String(iso).slice(0, 10) + 'T12:00:00'));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  // Misma escala que el Panel «Estado de Sala» de Citaciones Tortus (PanelB.gs · PANEL.ESCALA, % de la sala).
  const ESCALA_SALA = [
    { hasta: 45, clave: 'frio', texto: 'paspando moscas', icono: '🪰' },
    { hasta: 66, clave: 'tibio', texto: 'calentando motores', icono: '🔥' },
    { hasta: 91, clave: 'vivo', texto: 'A full', icono: '⚡' },
    { hasta: Infinity, clave: 'lleno', texto: 'explotado', icono: '🚨' },
  ];
  const tramoSala = (t) => ESCALA_SALA.find((e) => (t.cupo ? (t.confirmados / t.cupo) * 100 : 0) < e.hasta);
  // Como el panel: un turno dura 60 min y "Salas vacías" mira las próximas 48 hs.
  const DURACION_TURNO = 60 * 60000;
  const HORAS_SALA_VACIA = 48;
  const inicioTurno = (t) => Date.parse(`${t.fecha}T${t.hora}:00-03:00`);

  let dias = Number(leer(CLAVE_DIAS)) || 30;
  let datos = null;
  let vivo = null;
  let elegida = desdeHash() || 'POSTULADO';
  window.RUTA.elegida = elegida;

  function desdeHash() {
    const h = location.hash.replace('#', '');
    if (h === 'salidas') return 'NO_AVANZA';
    const m = h.match(/^paso-(\d{1,2})$/);
    return m && PASOS[Number(m[1]) - 1] ? PASOS[Number(m[1]) - 1] : null;
  }
  const hashDe = (etapa) => (SALIDAS.includes(etapa) ? 'salidas' : `paso-${PASOS.indexOf(etapa) + 1}`);

  const est = (etapa) => (datos && datos.estaciones || []).find((e) => e.etapa === etapa);
  const tramoDe = (etapa) => TRAMOS[(ESTACIONES[etapa] || {}).tramo] || TRAMOS.x;

  /* ── Línea 2D: estación por estación ── */
  function pintarLinea() {
    const lista = $('rutaLinea');
    const estaciones = (datos && datos.estaciones) || [];
    const grupos = [1, 2, 3, 4, 'x'].map((t) => ({ t, filas: estaciones.filter((e) => (ESTACIONES[e.etapa] || {}).tramo === t) }));
    lista.innerHTML = grupos.filter((g) => g.filas.length).map((g) => {
      const tr = TRAMOS[g.t];
      const filas = g.filas.map((e) => {
        const vacia = !e.personas;
        const chips = [
          e.hoy ? `<span class="ru-chip is-hoy">+${fmt(e.hoy)} hoy</span>` : '',
          e.programados ? `<span class="ru-chip">${fmt(e.programados)} programados</span>` : '',
        ].join('');
        return `<li>
          <button type="button" class="ru-est${vacia ? ' is-vacia' : ''}" data-etapa="${esc(e.etapa)}" aria-pressed="${elegida === e.etapa}">
            <span class="ru-est-punto" aria-hidden="true"></span>
            <span class="ru-est-nombre">${esc(e.nombre)}</span>
            <span class="ru-est-chips">${chips}</span>
            <span class="ru-est-n">${vacia ? 'Sin datos' : fmt(e.personas)}</span>
          </button>
        </li>`;
      }).join('');
      return `<li class="ru-tramo" style="--c:${tr.color};--cs:${tr.suave}">
        <div class="ru-tramo-head"><span class="ru-tramo-badge">${g.t === 'x' ? '×' : g.t}</span>${esc(tr.nombre)}</div>
        <ol class="ru-tramo-lista">${filas}</ol>
      </li>`;
    }).join('');
  }

  /* ── Datos en vivo de cada oficina (replican el Panel de Sala y el Contador de Vacantes) ── */
  function widget(tipo) {
    if (!vivo) return '<p class="ru-nota">Cargando datos en vivo…</p>';
    const vacio = (txt) => `<p class="ru-nota">${esc(txt)}</p>`;
    const barra = (n, total) => `<span class="ru-or-bar"><i style="width:${Math.min(100, Math.max(3, pct(n, total)))}%"></i></span>`;
    if (tipo === 'sala') {
      const turnos = vivo.sala_turnos || [];
      if (!turnos.length) return vacio('No hay turnos confirmados para hoy ni mañana.');
      const ahora = Date.now();
      const proximos = turnos.filter((t) => !(inicioTurno(t) + DURACION_TURNO <= ahora));
      const explotados = proximos.filter((t) => tramoSala(t).clave === 'lleno').length;
      const vacias = proximos.filter((t) => tramoSala(t).clave === 'frio' && inicioTurno(t) - ahora <= HORAS_SALA_VACIA * 3600000).length;
      const prox = proximos[0];
      const cuando = (t) => `${t.fecha === vivo.hoy ? 'Hoy' : dia(t.fecha)} ${t.hora}`;
      return (prox ? `<p class="ru-nota">Próximo turno: <b>${esc(cuando(prox))} · ${esc(prox.sede)}</b> · ${fmt(prox.confirmados)} confirmados${inicioTurno(prox) <= ahora ? ' · en curso' : ''}</p>` : '')
        + `<div class="tab-chips"><span class="tab-chip${explotados ? ' is-alerta' : ''}">🚨 <b>${fmt(explotados)}</b> explotados</span><span class="tab-chip">🪰 <b>${fmt(vacias)}</b> salas vacías</span></div>`
        + `<ul class="ru-vivo">${turnos.map((t) => {
          const tr = tramoSala(t);
          const terminado = inicioTurno(t) + DURACION_TURNO <= ahora;
          return `<li class="is-${tr.clave}${terminado ? ' is-terminado' : ''}"><span>${esc(cuando(t))} · ${esc(t.sede)}</span>${barra(t.confirmados, t.cupo)}<b>${fmt(t.confirmados)}/${fmt(t.cupo)}</b><small>${terminado ? 'terminado' : `${tr.icono} ${esc(tr.texto)} · ${pct(t.confirmados, t.cupo)}%`}</small></li>`;
        }).join('')}</ul>`;
    }
    if (tipo === 'confirmados' || tipo === 'agenda') {
      const dias7 = vivo.sala_dias || [];
      const max = Math.max(1, ...dias7.map((d) => d.confirmados));
      const lista = dias7.length
        ? `<ul class="ru-vivo">${dias7.map((d) => `<li><span>${esc(d.fecha === vivo.hoy ? 'Hoy' : dia(d.fecha))} · ${esc(d.sede)}</span>${barra(d.confirmados, max)}<b>${fmt(d.confirmados)}</b></li>`).join('')}</ul>`
        : vacio('Sin confirmados para los próximos 7 días.');
      if (tipo === 'confirmados') return lista;
      const salas = (vivo.agenda || []).slice(0, 5);
      return lista + (salas.length ? `<p class="ru-sub">Salas reservadas</p><ul class="ru-vivo">${salas.map((a) => `<li><span>${esc(dia(a.fecha))} · ${esc(a.horario)}</span><b>${esc(a.sala || 'Sala')}</b>${a.reunion === 'Sí' ? '<small>reunión</small>' : ''}</li>`).join('')}</ul>` : '');
    }
    if (tipo === 'vacantes') {
      const sol = vivo.solicitudes || [];
      if (!sol.length) return vacio('No hay solicitudes cargadas.');
      const total = sol.reduce((s, x) => s + x.n, 0);
      const marcas = [...new Set(sol.map((x) => x.marca))];
      return marcas.map((m) => `<p class="ru-sub">${esc(m === 'Sabores' ? 'Sabores Express' : m === 'Extremas' ? 'Hamburguesas Extremas' : m)}</p>
        <ul class="ru-vivo">${sol.filter((x) => x.marca === m).map((x) => `<li><span>${esc(x.estado)}</span>${barra(x.n, total)}<b>${fmt(x.n)}</b></li>`).join('')}</ul>`).join('')
        + `<p class="ru-sub">Por selector</p><div class="tab-chips">${(vivo.selectores || []).map((s) => `<span class="tab-chip">${esc(s.selector)} <b>${fmt(s.n)}</b></span>`).join('')}</div>`;
    }
    if (tipo === 'onb' || tipo === 'primeros' || tipo === 'ingreso' || tipo === 'uniformes') {
      const lista = (arr, vacioTxt) => (arr.length
        ? `<ul class="ru-vivo">${arr.map((d) => `<li><span>${esc(d.fecha === vivo.hoy ? 'Hoy' : dia(d.fecha))}</span><b>${fmt(d.n)}</b></li>`).join('')}</ul>`
        : vacio(vacioTxt));
      if (tipo === 'onb') return `<p class="ru-sub">Onboardings por día</p>${lista(vivo.onb_dias || [], 'No hay onboardings cargados desde hoy.')}`;
      const primeros = `<p class="ru-sub">Primeros días</p>${lista(vivo.primeros_dias || [], 'No hay primeros días cargados desde hoy.')}`;
      if (tipo === 'primeros') return primeros;
      if (tipo === 'uniformes') {
        const u = vivo.uniformes;
        return `<p class="ru-sub">Onboardings por día</p>${lista(vivo.onb_dias || [], 'No hay onboardings cargados desde hoy.')}`
          + (u ? `<p class="ru-sub">Uniformes entregados (planilla Uniformes)</p><div class="tab-chips"><span class="tab-chip">${fmt(u.personas)} personas</span><span class="tab-chip">${fmt(u.remeras)} remeras</span><span class="tab-chip">${fmt(u.gorras)} gorras</span><span class="tab-chip">${fmt(u.delantales)} delantales</span></div>` : '');
      }
      const enc = vivo.encuesta;
      return primeros + (enc ? `<p class="ru-sub">Encuesta de experiencia</p><div class="tab-chips"><span class="tab-chip"><b>${fmt(enc.satisfaccion_pct)}%</b> satisfechos</span><span class="tab-chip">${fmt(enc.respuestas)} respuestas</span>${enc.malas ? `<span class="tab-chip is-alerta">${fmt(enc.malas)} malas</span>` : ''}</div>` : '');
    }
    return '';
  }

  /* ── Cambiar en la planilla, confirmado con PIN ── */
  // Igual que el chat del Coordinador: Supabase arma el pedido (proponer_accion),
  // alguien del equipo lo confirma con su PIN personal y n8n lo escribe en
  // Solicitudes Sabores/Extremas (TAREAS GRUPALES), donde siguen corriendo sus
  // Apps Script. Nada cambia sin PIN y el PIN no se guarda en ningún lado.
  const ACCION_URL = 'https://kevin9705.app.n8n.cloud/webhook/oficina-accion';
  const CLAVE_CODIGO = 'oficina-codigo'; // el mismo código del equipo que pide el chat
  const COLUMNAS = {
    ESTADO: { t: 'Estado', tipo: 'text', ver: 'estado' },
    FECHA: { t: 'Fecha', tipo: 'date', ver: 'fecha' },
    HORA: { t: 'Hora', tipo: 'time', ver: 'hora' },
    'PRIMER DIA': { t: 'Primer día', tipo: 'date', ver: 'primer_dia' },
    NOTAS: { t: 'Notas', tipo: 'text', ver: null },
  };
  const MARCAS = { sabores: 'Sabores Express', extremas: 'Hamburguesas Extremas' };
  let solicitudes = null; // copia de Solicitudes (sin datos personales), cada 30 min
  const cajas = {}; // una por oficina: lo escrito no se pierde cuando el panel se repinta

  async function cargarSolicitudes() {
    try {
      solicitudes = await SB.pedir('equipo_solicitudes?select=fila,marca,local,puesto,jornada,selector,estado,fecha,hora,primer_dia&order=marca,local,fila', null, 15000);
    } catch (e) {
      console.warn('No se pudieron leer las solicitudes', e);
      solicitudes = solicitudes || [];
    }
    Object.values(cajas).forEach((c) => c.refrescar());
  }

  async function pedirAccion(cuerpo) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(ACCION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: ctrl.signal,
      });
      const texto = res.ok ? (await res.text()).trim() : '';
      return texto ? JSON.parse(texto) : { ok: false, motivo: 'conexion' };
    } catch (e) {
      console.warn('Cambio en planilla', e);
      return { ok: false, motivo: 'conexion' };
    } finally {
      clearTimeout(t);
    }
  }

  // "2026-10-28" → "28/10/2026", como se escribe en la planilla.
  const aPlanilla = (tipo, v) => (tipo === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v);

  function cajaDe(etapa) {
    if (cajas[etapa]) return cajas[etapa].el;
    const meta = ESTACIONES[etapa];
    const id = 'ruAc' + Object.keys(cajas).length;
    const el = document.createElement('div');
    el.className = 'ru-accion';
    el.innerHTML = `
      <h4>✏️ Cambiar en la planilla</h4>
      <p class="ru-nota">Se escribe en Solicitudes (TAREAS GRUPALES) y lo confirmás con tu PIN personal. Las automatizaciones de n8n las maneja Kevin.</p>
      <form class="ru-accion-form" novalidate>
        <label for="${id}b">Solicitud</label>
        <input id="${id}b" type="search" placeholder="Buscar local, puesto, selector o estado…" autocomplete="off" data-buscar />
        <select id="${id}s" aria-label="Solicitud" data-fila></select>
        <div class="ru-accion-fila">
          <div>
            <label for="${id}c">Qué cambiar</label>
            <select id="${id}c" data-col>${meta.acciones.map((c) => `<option value="${esc(c)}">${esc(COLUMNAS[c].t)}</option>`).join('')}</select>
          </div>
          <div>
            <label for="${id}v">Nuevo valor</label>
            <input id="${id}v" type="text" maxlength="120" autocomplete="off" list="${id}l" data-valor />
          </div>
        </div>
        <datalist id="${id}l"></datalist>
        <p class="ru-nota" data-ahora></p>
        <button class="btn-primary" type="submit">Pedir el cambio</button>
        <p class="ru-accion-aviso" role="status"></p>
      </form>
      <div class="ru-accion-pin" hidden></div>`;
    const form = el.querySelector('form');
    const buscar = el.querySelector('[data-buscar]');
    const sel = el.querySelector('[data-fila]');
    const col = el.querySelector('[data-col]');
    const valor = el.querySelector('[data-valor]');
    const lista = el.querySelector('datalist');
    const ahora = el.querySelector('[data-ahora]');
    const aviso = form.querySelector('.ru-accion-aviso');
    const pinBox = el.querySelector('.ru-accion-pin');

    const clave = (s) => `${String(s.marca).toLowerCase()}:${s.fila}`;
    const elegidaSol = () => (solicitudes || []).find((s) => clave(s) === sel.value);
    function mostrarAhora() {
      const c = COLUMNAS[col.value];
      const s = elegidaSol();
      valor.type = c.tipo;
      valor.placeholder = col.value === 'NOTAS' ? 'Sin mails ni teléfonos' : '';
      valor.setAttribute('list', c.tipo === 'text' && col.value === 'ESTADO' ? lista.id : '');
      ahora.textContent = s && c.ver ? `Ahora: ${s[c.ver] || 'vacío'}` : '';
    }
    function refrescar() {
      const previa = sel.value;
      const q = SB.norm(buscar.value);
      const filas = (solicitudes || []).filter((s) => !q || SB.norm([s.local, s.puesto, s.jornada, s.selector, s.estado].join(' ')).includes(q));
      if (!solicitudes) sel.innerHTML = '<option value="">Cargando solicitudes…</option>';
      else if (!filas.length) sel.innerHTML = '<option value="">Ninguna coincide</option>';
      else {
        sel.innerHTML = Object.keys(MARCAS).map((m) => {
          const deMarca = filas.filter((s) => String(s.marca).toLowerCase() === m);
          return deMarca.length ? `<optgroup label="${esc(MARCAS[m])}">${deMarca.map((s) => `<option value="${esc(clave(s))}">${esc([s.local, s.puesto, s.jornada].filter(Boolean).join(' · '))} — ${esc(s.estado || 'sin estado')}</option>`).join('')}</optgroup>` : '';
        }).join('');
        if (filas.some((s) => clave(s) === previa)) sel.value = previa;
      }
      const estados = [...new Set((solicitudes || []).map((s) => s.estado).filter(Boolean))].sort();
      lista.innerHTML = estados.map((e) => `<option value="${esc(e)}"></option>`).join('');
      mostrarAhora();
    }
    buscar.addEventListener('input', refrescar);
    sel.addEventListener('change', mostrarAhora);
    col.addEventListener('change', () => { valor.value = ''; mostrarAhora(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const s = elegidaSol();
      const c = col.value;
      const v = aPlanilla(COLUMNAS[c].tipo, valor.value.trim());
      if (!s) { aviso.textContent = 'Elegí una solicitud.'; sel.focus(); return; }
      if (!v && c !== 'NOTAS') { aviso.textContent = 'Escribí el valor nuevo.'; valor.focus(); return; }
      const boton = form.querySelector('button');
      boton.disabled = true;
      aviso.textContent = 'Preparando el pedido…';
      try {
        const r = await SB.pedir('rpc/proponer_accion', {
          p_tipo: c === 'ESTADO' ? 'estado' : 'editar',
          p_hoja: String(s.marca).toLowerCase(),
          p_fila: s.fila,
          p_columna: c,
          p_valor: v,
          p_pedido_por: 'Ruta · ' + meta.corto,
          p_sesion: 'ruta',
        }, 15000);
        if (!r || !r.ok) { aviso.textContent = (r && r.motivo) || 'No se pudo preparar el cambio.'; return; }
        aviso.textContent = '';
        form.hidden = true;
        pedirPin(r);
      } catch (err) {
        console.warn('proponer_accion', err);
        aviso.textContent = 'No pude conectarme con Supabase. Probá de nuevo.';
      } finally {
        boton.disabled = false;
      }
    });

    // Tarjeta del PIN: vence a los 10 minutos, 3 intentos (lo controla Supabase).
    function pedirPin(p) {
      const sinCodigo = !leer(CLAVE_CODIGO);
      pinBox.hidden = false;
      pinBox.innerHTML = `
        <p class="ru-accion-resumen">🔐 ${esc(p.resumen)}</p>
        <form novalidate>
          ${sinCodigo ? `<label for="${id}k">Código del equipo</label><input id="${id}k" type="password" autocomplete="off" data-codigo />` : ''}
          <label for="${id}p">Tu PIN personal</label>
          <div class="ru-accion-fila">
            <input id="${id}p" type="password" inputmode="numeric" maxlength="6" placeholder="6 números" autocomplete="off" data-pin />
            <button type="submit" class="btn-primary">Confirmar</button>
            <button type="button" class="ru-accion-cancelar">Cancelar</button>
          </div>
        </form>
        <p class="ru-accion-aviso" role="status"></p>
        <p class="ru-nota" data-cuenta></p>`;
      const f = pinBox.querySelector('form');
      const pin = pinBox.querySelector('[data-pin]');
      const codigo = pinBox.querySelector('[data-codigo]');
      const msg = pinBox.querySelector('.ru-accion-aviso');
      const cuenta = pinBox.querySelector('[data-cuenta]');
      const vence = Date.parse(p.expira) || Date.now() + 10 * 60000;
      let trabajando = false;

      const terminar = (texto, ok) => {
        clearInterval(reloj);
        pinBox.innerHTML = `<p class="ru-accion-resumen${ok ? ' is-ok' : ''}">${esc(texto)}</p><button type="button" class="tab-btn">Hacer otro cambio</button>`;
        pinBox.querySelector('button').addEventListener('click', () => {
          pinBox.hidden = true;
          pinBox.innerHTML = '';
          form.hidden = false;
          valor.value = '';
          refrescar();
        });
      };
      const contar = () => {
        if (trabajando) return;
        const seg = Math.round((vence - Date.now()) / 1000);
        if (seg <= 0) { terminar('⏱️ Pasaron 10 minutos y no se hizo nada. Pedilo de nuevo si todavía hace falta.'); return; }
        cuenta.textContent = `Vence en ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}.`;
      };
      const reloj = setInterval(contar, 1000);
      contar();
      setTimeout(() => (codigo || pin).focus({ preventScroll: true }), 50);
      const bloquear = (si) => { trabajando = si; f.querySelectorAll('input, button').forEach((x) => { x.disabled = si; }); };

      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cod = (codigo ? codigo.value : leer(CLAVE_CODIGO) || '').trim();
        const valorPin = pin.value.replace(/\D/g, '');
        if (!cod) { msg.textContent = 'Falta el código del equipo.'; codigo.focus(); return; }
        if (!/^\d{6}$/.test(valorPin)) { msg.textContent = 'El PIN tiene 6 números.'; pin.focus(); return; }
        bloquear(true);
        msg.textContent = 'Haciendo el cambio…';
        const r = await pedirAccion({ codigo: cod, token: p.token, pin: valorPin });
        bloquear(false);
        pin.value = '';
        if (r.motivo !== 'conexion' && codigo) guardar(CLAVE_CODIGO, cod); // n8n respondió: el código es correcto
        if (r.ok && r.hecho) {
          avisar('oficina:cambio', { fase: 'hecho', hoja: r.hoja || p.hoja, tipo: r.tipo || p.tipo });
          terminar(`${r.mensaje || '✅ Listo, cambio hecho.'} La copia se actualiza en un ratito.`, true);
          setTimeout(() => { cargarSolicitudes(); cargarVivo(); cargar(); }, 25000);
        } else if (r.motivo === 'conexion') {
          msg.textContent = codigo ? 'No hubo respuesta: revisá el código del equipo o probá de nuevo.' : 'No pude conectarme con la oficina. Probá de nuevo.';
        } else if (r.motivo === 'pin' || r.motivo === 'bloqueado') {
          if (r.motivo === 'pin' && r.restantes === 0) terminar(r.mensaje || 'PIN incorrecto 3 veces: se canceló el pedido.');
          else { msg.textContent = r.mensaje || 'PIN incorrecto.'; pin.focus(); }
        } else {
          avisar('oficina:cambio', { fase: 'error', hoja: p.hoja, tipo: p.tipo });
          terminar(r.mensaje || 'No se pudo hacer el cambio. No se tocó nada.');
        }
      });

      pinBox.querySelector('.ru-accion-cancelar').addEventListener('click', async () => {
        const cod = (codigo ? codigo.value : leer(CLAVE_CODIGO) || '').trim();
        bloquear(true);
        if (cod) await pedirAccion({ codigo: cod, token: p.token, cancelar: true }); // sin código, vence solo
        avisar('oficina:cambio', { fase: 'cancelado', hoja: p.hoja });
        terminar('Cancelado: no se tocó nada.');
      });
    }

    cajas[etapa] = { el, refrescar };
    refrescar();
    if (!solicitudes) cargarSolicitudes();
    return el;
  }

  /* ── Panel: funciones de la oficina a la vista ── */
  function pintarPanel() {
    const panel = $('rutaPanel');
    const foco = document.activeElement;
    if (!datos) {
      panel.innerHTML = '<p class="desc">Cargando la ruta…</p>';
      return;
    }
    const e = est(elegida) || { etapa: elegida, nombre: elegida, personas: 0, hoy: 0, ahora: 0, origenes: [] };
    const meta = ESTACIONES[elegida] || {};
    const tr = tramoDe(elegida);
    const ag = AGENTES[meta.agente] || AGENTES.coordinador;
    const salida = meta.tramo === 'x';
    const n = PASOS.indexOf(elegida);
    const ant = salida ? PASOS[PASOS.length - 1] : PASOS[n - 1];
    const sig = salida ? null : PASOS[n + 1] || 'NO_AVANZA';
    const total = (e.origenes || []).reduce((s, o) => s + o.personas, 0) || 1;
    const origenes = (e.origenes || []).map((o) => `<li><span class="ru-or-nombre">${esc(o.origen)}</span><span class="ru-or-bar"><i style="width:${Math.max(3, pct(o.personas, total))}%"></i></span><b>${fmt(o.personas)}</b></li>`).join('');
    const otrasSalidas = salida ? `<div class="tab-chips">${SALIDAS.map((s) => `<button type="button" class="ru-chip-btn" data-etapa="${s}" aria-pressed="${s === elegida}">${esc(ESTACIONES[s].corto)} · ${fmt((est(s) || {}).personas)}</button>`).join('')}</div>` : '';
    panel.innerHTML = `
      <div class="ru-panel-head" style="--c:${tr.color};--cs:${tr.suave}">
        <span class="ru-panel-emoji" aria-hidden="true">${esc(ag.emoji)}</span>
        <div><p>${salida ? 'Salidas · de cualquier paso' : `Paso ${n + 1} de ${PASOS.length} · <span class="ru-tramo-pill">${esc(tr.nombre)}</span>`}</p><h3>${esc(e.nombre)}</h3></div>
      </div>
      ${otrasSalidas}
      <div class="ru-stats">
        <div><b>${fmt(e.personas)}</b><span>pasaron en ${fmt(dias)} días</span></div>
        <div><b>${fmt(e.hoy)}</b><span>hoy</span></div>
        <div><b>${fmt(e.ahora)}</b><span>${salida ? 'salieron acá' : 'esperan acá'}</span></div>
      </div>
      ${e.programados ? `<p class="ru-nota">📅 ${fmt(e.programados)} con fecha futura (programados).</p>` : ''}
      <div class="ru-funciones">
        <h4>Funciones de esta oficina</h4>
        <div class="ru-herr">${(meta.herramientas || []).map((h) => `<a class="ru-herr-btn" href="${esc(h.u)}" target="_blank" rel="noopener"><b>${esc(h.t)}</b><small>${esc(h.d)} ↗</small></a>`).join('')}</div>
        ${meta.vivo ? `<div class="ru-box is-vivo"><span>En vivo</span>${widget(meta.vivo)}</div>` : ''}
        <button type="button" class="tab-btn" data-preguntar="${esc(ag.pregunta)}">Preguntale a ${esc(ag.nombre)} →</button>
      </div>
      ${(meta.acciones || []).length ? '<div data-accion></div>' : ''}
      ${(meta.scripts || []).length ? `<div class="ru-box"><span>Funciona con</span><ul class="ru-scripts">${meta.scripts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
      ${origenes ? `<div class="ru-box"><span>De dónde llega el dato</span><ul class="ru-origenes">${origenes}</ul></div>` : '<div class="ru-box is-alerta"><span>Sin datos todavía</span><p>Ninguna planilla carga este paso en el período elegido.</p></div>'}
      <details class="ru-mas"><summary>Hoy se carga en · con la ruta unificada</summary>
        <div class="ru-box"><span>Hoy se carga en</span><p>${esc(meta.hoy || 'S/D')}</p></div>
        <div class="ru-box is-app"><span>Con la ruta unificada</span><p>${esc(meta.app || 'S/D')}</p></div>
      </details>
      <div class="ru-nav">
        ${ant ? `<button type="button" class="ru-nav-btn" data-etapa="${ant}">‹ ${esc(ESTACIONES[ant].corto)}</button>` : '<span></span>'}
        ${sig ? `<button type="button" class="ru-nav-btn" data-etapa="${sig}">${esc(sig === 'NO_AVANZA' ? 'Salidas' : ESTACIONES[sig].corto)} ›</button>` : '<span></span>'}
      </div>`;
    const lugar = panel.querySelector('[data-accion]');
    if (lugar) {
      const caja = cajaDe(elegida);
      lugar.replaceWith(caja);
      if (caja.contains(foco)) foco.focus({ preventScroll: true }); // el panel se repinta cada minuto
    }
  }

  /* ── Últimos movimientos (sin nombres) ── */
  function pintarMovs() {
    const ul = $('rutaMovs');
    const movs = (datos && datos.movimientos) || [];
    if (!movs.length) {
      ul.innerHTML = '<li class="ru-mov-vacio">Todavía no hay movimientos en el período.</li>';
      return;
    }
    const nombre = (etapa) => ((datos.estaciones || []).find((e) => e.etapa === etapa) || {}).nombre || etapa;
    ul.innerHTML = movs.slice(0, 25).map((m) => {
      const tr = tramoDe(m.etapa);
      const extra = [m.lugar, m.selector].filter(Boolean).map(esc).join(' · ');
      return `<li style="--c:${tr.color}">
        <span class="ru-mov-punto" aria-hidden="true"></span>
        <div><b>${esc(nombre(m.etapa))}</b>${extra ? `<small>${extra}</small>` : ''}</div>
        <time datetime="${esc(m.fecha)}">${esc(SB.hace(m.fecha))}</time>
      </li>`;
    }).join('');
  }

  // Nota de la línea: por qué los pasos todavía no encadenan a todos.
  function pintarIdentidad() {
    const id = (datos && datos.identidad) || {};
    $('rutaIdentidad').innerHTML = datos ? `Cada planilla identifica a la persona a su manera: ${fmt(id.con_formulario)} tienen el id del formulario QR, ${fmt(id.solo_planilla)} solo el ID POSTULANTE de las planillas y ${fmt(id.solo_mail)} solo el mail. Por eso los números de cada paso todavía no se pueden restar entre sí.${id.fechas_raras ? ` ${id.fechas_raras === 1 ? 'Un paso tiene una fecha rara' : `${fmt(id.fechas_raras)} pasos tienen fechas raras`} (por ejemplo, un año 0226).` : ''}` : '';
  }

  function pintarBarra() {
    seccion.querySelectorAll('[data-dias]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.dias) === dias)));
    $('rutaCuando').textContent = datos ? `Actualizado ${SB.hace(datos.generado)}` : 'Cargando…';
  }
  function pintarLeyenda() {
    $('rutaLeyenda').innerHTML = Object.values(TRAMOS).map((t) => `<li style="--c:${t.color}">${esc(t.nombre)}</li>`).join('');
  }
  function pintar() {
    pintarBarra();
    pintarLinea();
    pintarPanel();
    pintarMovs();
    pintarIdentidad();
  }

  function elegir(etapa) {
    if (!ESTACIONES[etapa]) return;
    elegida = etapa;
    window.RUTA.elegida = etapa;
    try { history.replaceState(null, '', '#' + hashDe(etapa)); } catch (e) { /* sin historial */ }
    pintarLinea();
    pintarPanel();
    avisar('ruta:elegida', { etapa });
  }

  let pidiendo = 0;
  async function cargar() {
    const yo = ++pidiendo;
    $('rutaCuando').textContent = 'Actualizando…';
    try {
      const r = await SB.pedir('rpc/ruta_estaciones', { dias }, 15000);
      if (yo !== pidiendo) return; // llegó una respuesta vieja después de cambiar el período
      datos = r;
      window.RUTA.datos = r;
      seccion.classList.remove('is-error');
      pintar();
      avisar('ruta:datos', r);
    } catch (e) {
      console.warn('No se pudo leer la ruta', e);
      seccion.classList.add('is-error');
      $('rutaCuando').textContent = 'No se pudo actualizar. Probá de nuevo en un rato.';
    }
  }
  async function cargarVivo() {
    try {
      vivo = await SB.pedir('rpc/ruta_oficinas', {}, 15000);
      pintarPanel();
    } catch (e) {
      console.warn('No se pudieron leer los datos en vivo de las oficinas', e);
    }
  }

  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('[data-etapa]');
    if (b) { elegir(b.dataset.etapa); return; }
    const d = e.target.closest('[data-dias]');
    if (d) {
      dias = Number(d.dataset.dias);
      guardar(CLAVE_DIAS, String(dias));
      pintarBarra();
      cargar();
      return;
    }
    const p = e.target.closest('[data-preguntar]');
    if (p) {
      avisar('oficina:preguntar', { texto: p.dataset.preguntar });
      document.getElementById('ofiChatInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  document.addEventListener('ruta:elegir', (e) => elegir((e.detail || {}).etapa));
  window.addEventListener('hashchange', () => { const h = desdeHash(); if (h && h !== elegida) elegir(h); });

  pintarLeyenda();
  pintar();
  cargar();
  cargarVivo();
  setInterval(cargar, 60000);
  setInterval(cargarVivo, 120000);
})();
