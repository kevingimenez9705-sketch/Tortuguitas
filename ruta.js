// ruta.js — "Ruta del ingresante": el proceso completo, del QR a iCheck, como
// una línea con 13 estaciones (y las salidas). Une lo que antes estaba repartido
// en Citaciones Tortus, TAREAS GRUPALES y Tareas grupales/zonas.
//
// Fuente: rpc/ruta_estaciones en Supabase (clave publicable, solo totales):
//   estaciones: cuántas personas pasaron por cada una en el período, hoy,
//     cuántas están ahí ahora (su última estación) y de qué planilla llegó el dato.
//   movimientos: los últimos pasos, sin nombres ni ids.
//   identidad: cuántas personas tienen el id del formulario QR y cuántas solo
//     están en planillas (por eso la línea todavía no encadena a todos).
// n8n carga la tabla seguimiento: el formulario QR, Proceso de Selección y
// Solicitudes (Apps Script) y, cada 30 min, Citaciones Tortus y exportacion_icheck
// (workflow "Ruta - Citaciones e iCheck → seguimiento").
//
// Arma la línea en 2D (siempre visible: es la versión accesible y la de
// respaldo), el panel de la estación elegida y los últimos movimientos.
// ruta-3d.js dibuja la maqueta 3D y se comunica con eventos:
//   ruta:datos   → { ...respuesta de ruta_estaciones } (cada vez que se leen)
//   ruta:elegir  → { etapa } (la 3D pide elegir una estación; null = ninguna)
//   ruta:elegida → { etapa } (estación elegida, para resaltarla en la 3D)
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
  // Cada estación: tramo, agente que la cuida, dónde se carga hoy y qué la reemplaza.
  const ESTACIONES = {
    POSTULADO: { tramo: 1, agente: 'screening', corto: 'Postulados',
      hoy: 'Formulario QR → Supabase. Después se copia a "ATS - Postulaciones" y a "Citaciones-<selector>".',
      app: 'Bandeja de postulantes con puntaje A/B/C y la recomendación de Screening, sin copiar a planillas.' },
    CITADO_ENTREVISTA: { tramo: 1, agente: 'agenda', corto: 'Citados',
      hoy: 'Citaciones Tortus: fecha, hora y "ENVIADO" en la pestaña de cada selector. Llega a la ruta cada 30 min.',
      app: 'Agenda por sede: se elige el horario y sale la citación.' },
    CONFIRMO_ENTREVISTA: { tramo: 1, agente: 'agenda', corto: 'Confirmaron',
      hoy: 'Citaciones Tortus · pestaña Confirmados. Llega a la ruta cada 30 min.',
      app: 'La confirmación tilda al postulante en la agenda.' },
    ASISTIO_ENTREVISTA: { tramo: 2, agente: 'agenda', corto: 'Asistieron',
      hoy: 'TAREAS GRUPALES · Proceso de Selección (formulario en la sede).',
      app: 'Check-in en la sala desde el Panel de Sala.' },
    APROBADO: { tramo: 2, agente: 'screening', corto: 'Aprobados',
      hoy: 'Columna ESTADO de Proceso de Selección y BASE DE DATOS.',
      app: 'Botones Aprobado / En espera / No avanza en la ficha. Si está en BLOQUEADOS, aparece el aviso.' },
    COMPARTIDO_ZONAL: { tramo: 3, agente: 'vacantes', corto: 'Al zonal',
      hoy: 'Columna ESTADO ENVIO y la planilla de cada regional (HOJAS ZONALES).',
      app: 'Cada zonal ve sus candidatos sugeridos por cercanía al local.' },
    VACANTE_ASIGNADA: { tramo: 3, agente: 'vacantes', corto: 'Con vacante',
      hoy: 'Solicitudes Sabores y Extremas, y vacantes reservadas.',
      app: 'Tablero de vacantes por local: cada solicitud es una tarjeta con su candidato.' },
    APROBADO_ZONAL: { tramo: 3, agente: 'vacantes', corto: 'OK del zonal',
      hoy: 'Columna ESTADO de Solicitudes, editada a mano.',
      app: 'El zonal aprueba o rechaza con un clic y el selector recibe el aviso.' },
    CITADO_ONB: { tramo: 4, agente: 'onboarding', corto: 'Citados ONB',
      hoy: 'FECHA y HORA de la fila en Solicitudes.',
      app: 'Calendario de onboarding con los cupos por día.' },
    CONFIRMA_ONB: { tramo: 4, agente: 'onboarding', corto: 'Confirman ONB',
      hoy: 'ALTAS RRHH = "CONFIRMA ONB" en Solicitudes.',
      app: 'Se marca al confirmar y Onboarding avisa a quien no confirmó.' },
    HIZO_ONB: { tramo: 4, agente: 'onboarding', corto: 'Hicieron ONB',
      hoy: 'Solicitudes + formulario Proceso de Ingreso (datos personales).',
      app: 'Ficha de alta que marca lo que falta: DNI, CUIL, domicilio o fechas mal escritas.' },
    ALTA_ICHECK: { tramo: 4, agente: 'onboarding', corto: 'En iCheck',
      hoy: 'Pestaña exportacion_icheck, armada a mano. Cuando alguien aparece ahí, llega a la ruta (cada 30 min).',
      app: 'Cola de altas con el botón "Exportar iCheck", que arma el archivo y mueve a todos de estación.' },
    INGRESO: { tramo: 4, agente: 'onboarding', corto: 'Ingresaron',
      hoy: 'PRIMER DÍA en Solicitudes.',
      app: 'Se registra solo y suma al dashboard de altas de Tortuguitas.' },
    NO_AVANZA: { tramo: 'x', agente: 'screening', corto: 'No avanzan',
      hoy: 'Se pierde entre ESTADO y OBSERVACIONES.', app: 'Cada salida con su motivo.' },
    NO_SE_PRESENTO: { tramo: 'x', agente: 'agenda', corto: 'No vinieron',
      hoy: 'No se registra en ninguna planilla.', app: 'La agenda marca a quien no vino a la entrevista o al ONB.' },
    DESISTIO: { tramo: 'x', agente: 'onboarding', corto: 'Desistieron',
      hoy: 'Queda en OBSERVACIONES.', app: 'Se marca en la ficha con el motivo.' },
    RECHAZADO_ZONAL: { tramo: 'x', agente: 'vacantes', corto: 'Rechazo zonal',
      hoy: 'Columna ESTADO de Solicitudes.', app: 'Vuelve a la bandeja con el motivo, lista para otra vacante.' },
  };
  return { TRAMOS, AGENTES, ESTACIONES, datos: null };
})();

(() => {
  const seccion = document.getElementById('rutaSeccion');
  if (!seccion || !window.SB) return;
  const { TRAMOS, AGENTES, ESTACIONES } = window.RUTA;
  const ZONA = 'America/Argentina/Buenos_Aires';
  const CLAVE_DIAS = 'ruta-dias';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
  const avisar = (nombre, detalle) => document.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const fechaCorta = (iso) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: 'numeric', month: 'numeric' }).format(new Date(iso + 'T12:00:00'));

  let dias = Number(leer(CLAVE_DIAS)) || 30;
  let elegida = null;
  let datos = null;

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
          <button type="button" class="ru-est${vacia ? ' is-vacia' : ''}${e.es_salida ? ' is-salida' : ''}" data-etapa="${esc(e.etapa)}" aria-pressed="${elegida === e.etapa}">
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

  /* ── Panel de la estación elegida (o el resumen de la ruta) ── */
  function pintarPanel() {
    const panel = $('rutaPanel');
    if (!datos) {
      panel.innerHTML = '<p class="desc">Cargando la ruta…</p>';
      return;
    }
    const e = elegida && est(elegida);
    if (!e) {
      const todas = datos.estaciones || [];
      const movHoy = todas.filter((x) => x.etapa !== 'POSTULADO').reduce((s, x) => s + (x.hoy || 0), 0);
      const postHoy = (est('POSTULADO') || {}).hoy || 0;
      const ing = est('INGRESO') || {};
      const id = datos.identidad || {};
      const sinDatos = todas.filter((x) => !x.es_salida && !x.personas).map((x) => x.nombre);
      panel.innerHTML = `
        <div class="ru-panel-head"><span class="ru-panel-emoji" aria-hidden="true">🚉</span><div><h3>Cómo leer la ruta</h3><p>${esc(fechaCorta(datos.desde))} al ${esc(fechaCorta(datos.hasta))}</p></div></div>
        <p class="ru-panel-txt">Cada estación es un paso del proceso. El número es cuánta gente pasó por ahí en el período. Los muñequitos son la gente que está esperando en esa estación: más muñequitos, más gente esperando. Tocá una estación para ver de dónde sale el dato.</p>
        <div class="ru-stats">
          <div><b>${fmt(postHoy)}</b><span>postulaciones hoy</span></div>
          <div><b>${fmt(movHoy)}</b><span>pasos hoy en el resto de la ruta</span></div>
          <div><b>${fmt(ing.personas)}</b><span>ingresaron${ing.programados ? ` · ${fmt(ing.programados)} programados` : ''}</span></div>
        </div>
        <div class="ru-box"><span>Por qué la línea no encadena a todos</span>
          <p>Cada planilla identifica a la persona a su manera. ${fmt(id.con_formulario)} tienen el id del formulario QR, ${fmt(id.solo_planilla)} solo el ID POSTULANTE de las planillas y ${fmt(id.solo_mail)} solo el mail. Cuando todo se cargue en la ruta, va a haber una sola ficha por persona.</p></div>
        ${sinDatos.length ? `<div class="ru-box is-alerta"><span>Estaciones sin datos todavía</span><p>${sinDatos.map(esc).join(' · ')}</p></div>` : ''}
        ${id.fechas_raras ? `<p class="ru-nota">⚠️ ${id.fechas_raras === 1 ? 'Un paso tiene una fecha rara' : `${fmt(id.fechas_raras)} pasos tienen fechas raras`} (por ejemplo, un año 0226). En la ficha de la ruta no se van a poder cargar.</p>` : ''}`;
      return;
    }
    const meta = ESTACIONES[e.etapa] || {};
    const tr = tramoDe(e.etapa);
    const ag = AGENTES[meta.agente] || AGENTES.coordinador;
    const total = (e.origenes || []).reduce((s, o) => s + o.personas, 0) || 1;
    const origenes = (e.origenes || []).map((o) => `<li><span class="ru-or-nombre">${esc(o.origen)}</span><span class="ru-or-bar"><i style="width:${Math.max(3, Math.round((o.personas / total) * 100))}%"></i></span><b>${fmt(o.personas)}</b></li>`).join('');
    panel.innerHTML = `
      <div class="ru-panel-head" style="--c:${tr.color};--cs:${tr.suave}">
        <span class="ru-panel-emoji" aria-hidden="true">${esc(ag.emoji)}</span>
        <div><h3>${esc(e.nombre)}</h3><p><span class="ru-tramo-pill">${esc(tr.nombre)}</span> · la cuida ${esc(ag.nombre)}</p></div>
        <button type="button" class="ru-cerrar" data-cerrar aria-label="Volver al resumen">×</button>
      </div>
      ${e.personas ? `<div class="ru-stats">
        <div><b>${fmt(e.personas)}</b><span>pasaron en ${fmt(dias)} días</span></div>
        <div><b>${fmt(e.hoy)}</b><span>hoy</span></div>
        <div><b>${fmt(e.ahora)}</b><span>${e.es_salida ? 'salieron acá' : 'esperan acá'}</span></div>
      </div>
      ${e.programados ? `<p class="ru-nota">📅 ${fmt(e.programados)} con fecha futura (programados).</p>` : ''}
      ${e.ultima ? `<p class="ru-nota">Último paso: ${esc(SB.hace(e.ultima))}.</p>` : ''}
      ${origenes ? `<div class="ru-box"><span>De dónde llega el dato</span><ul class="ru-origenes">${origenes}</ul></div>` : ''}`
      : '<div class="ru-box is-alerta"><span>Sin datos todavía</span><p>Ninguna planilla carga esta estación en el período elegido.</p></div>'}
      <div class="ru-box"><span>Hoy se carga en</span><p>${esc(meta.hoy || 'S/D')}</p></div>
      <div class="ru-box is-app"><span>Con la ruta unificada</span><p>${esc(meta.app || 'S/D')}</p></div>
      <button type="button" class="tab-btn" data-preguntar="${esc(ag.pregunta)}">Preguntale a ${esc(ag.nombre)} →</button>`;
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
  }

  function elegir(etapa, desde3d = false) {
    elegida = etapa && etapa !== elegida ? etapa : desde3d && etapa ? etapa : null;
    pintarLinea();
    pintarPanel();
    avisar('ruta:elegida', { etapa: elegida });
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

  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('[data-etapa]');
    if (b) { elegir(b.dataset.etapa); return; }
    if (e.target.closest('[data-cerrar]')) { elegir(null); return; }
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
  document.addEventListener('ruta:elegir', (e) => elegir((e.detail || {}).etapa || null, true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && elegida) elegir(null); });

  pintarLeyenda();
  pintar();
  cargar();
  setInterval(cargar, 60000);
})();
