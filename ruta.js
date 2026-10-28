// ruta.js — "Ruta del ingresante": el proceso completo, del QR a iCheck, como
// 13 oficinas en fila (una por paso) más la de salidas. Une lo que antes estaba
// repartido en Citaciones Tortus, TAREAS GRUPALES y Tareas grupales/zonas.
//
// Fuentes (clave publicable, solo totales):
//   rpc/ruta_estaciones → cuántas personas pasaron por cada paso en el período,
//     hoy y cuántas están ahí ahora.
//   rpc/ruta_oficinas → datos en vivo de las oficinas: turnos de la sala (lo que
//     muestra el Panel de Sala), solicitudes por estado y selector (lo que cuenta
//     el Contador de Vacantes), onboardings, primeros días, agenda de salas,
//     encuesta y uniformes.
// n8n y los Apps Script de cada planilla cargan esos datos; la ruta no los modifica.
//
// Arma, para la oficina a la vista: el panel (números, datos en vivo, cambios
// con PIN y accesos), los botones de Apps Script (Botonera) y su planilla real
// adentro de la página. ruta-3d.js dibuja las oficinas y se comunica con eventos:
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

  // Cada paso: tramo, ícono, planillas y herramientas (H), datos en vivo, botones
  // de Apps Script (funciones: vista de la botonera) y columnas de Solicitudes que
  // se pueden cambiar desde la oficina con PIN (acciones).
  const ESTACIONES = {
    POSTULADO: { tramo: 1, icono: '📝', corto: 'Postulados', herramientas: [H.ats, H.formQR, H.portal] },
    CITADO_ENTREVISTA: { tramo: 1, icono: '✉️', corto: 'Citados', vivo: 'agenda', funciones: 'citar',
      herramientas: [H.citaciones, H.agendaOp] },
    CONFIRMO_ENTREVISTA: { tramo: 1, icono: '✅', corto: 'Confirmaron', vivo: 'confirmados', funciones: 'confirmados',
      herramientas: [H.confirmados, H.panelSala] },
    ASISTIO_ENTREVISTA: { tramo: 2, icono: '🪑', corto: 'Asistieron', vivo: 'sala', herramientas: [H.proceso, H.panelSala] },
    APROBADO: { tramo: 2, icono: '👍', corto: 'Aprobados', herramientas: [H.proceso, H.baseDatos, H.bloqueados] },
    COMPARTIDO_ZONAL: { tramo: 3, icono: '📤', corto: 'Al zonal', vivo: 'vacantes', acciones: ['ESTADO'],
      herramientas: [H.zonales, H.proceso] },
    VACANTE_ASIGNADA: { tramo: 3, icono: '📌', corto: 'Con vacante', vivo: 'vacantes', acciones: ['ESTADO', 'NOTAS'],
      herramientas: [H.solSabores, H.solExtremas] },
    APROBADO_ZONAL: { tramo: 3, icono: '🆗', corto: 'OK del zonal', vivo: 'vacantes', acciones: ['ESTADO'],
      herramientas: [H.solSabores, H.solExtremas] },
    CITADO_ONB: { tramo: 4, icono: '📅', corto: 'Citados ONB', vivo: 'onb', acciones: ['FECHA', 'HORA', 'ESTADO'],
      herramientas: [H.solSabores, H.solExtremas, H.agendaOp] },
    CONFIRMA_ONB: { tramo: 4, icono: '☑️', corto: 'Confirman ONB', vivo: 'onb', acciones: ['ESTADO'],
      herramientas: [H.solSabores, H.solExtremas] },
    HIZO_ONB: { tramo: 4, icono: '🎓', corto: 'Hicieron ONB', vivo: 'uniformes', herramientas: [H.ingreso, H.docIngreso, H.constancias] },
    ALTA_ICHECK: { tramo: 4, icono: '💾', corto: 'En iCheck', vivo: 'primeros', herramientas: [H.icheck, H.carpetaIcheck] },
    INGRESO: { tramo: 4, icono: '🎉', corto: 'Ingresaron', vivo: 'ingreso', acciones: ['PRIMER DIA'],
      herramientas: [H.solSabores, H.solExtremas, H.altas, H.encuesta] },
    NO_AVANZA: { tramo: 'x', icono: '⛔', corto: 'No avanzan', herramientas: [H.proceso, H.bloqueados] },
    NO_SE_PRESENTO: { tramo: 'x', icono: '🚷', corto: 'No vinieron', herramientas: [H.confirmados, H.panelSala] },
    DESISTIO: { tramo: 'x', icono: '🏳️', corto: 'Desistieron', herramientas: [H.solSabores, H.solExtremas] },
    RECHAZADO_ZONAL: { tramo: 'x', icono: '✋', corto: 'Rechazo zonal', acciones: ['ESTADO', 'NOTAS'],
      herramientas: [H.solSabores, H.solExtremas, H.bloqueados] },
  };
  return { TRAMOS, ESTACIONES, datos: null, elegida: null };
})();

(() => {
  const seccion = document.getElementById('rutaSeccion');
  if (!seccion || !window.SB) return;
  const { TRAMOS, ESTACIONES } = window.RUTA;
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

  /* ── Por citar: lo que espera el menú 📞 Citar de Citaciones Tortus ── */
  // Las citaciones se siguen mandando desde la planilla (cada uno desde su Gmail).
  // n8n cuenta cada 30 min, con la misma regla del script, las filas sin ENVIADO
  // con email, fecha y hora, por pestaña y zona. Solo totales.
  const vacio = (txt) => `<p class="ru-nota">${esc(txt)}</p>`;
  const barra = (n, total) => `<span class="ru-or-bar"><i style="width:${Math.min(100, Math.max(3, pct(n, total)))}%"></i></span>`;
  const ZONAS_CITAR = ['CABA', 'Norte', 'Sur', 'Oeste'];
  function porCitar() {
    const filas = vivo.citaciones || [];
    if (!filas.length) return '';
    const pestanas = filas.filter((f) => f.tipo === 'pestana');
    const zonas = filas.filter((f) => f.tipo === 'zona');
    const resumen = filas.find((f) => f.tipo === 'resumen') || {};
    const suma = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
    const total = suma(zonas, 'pendientes');
    const porZona = ZONAS_CITAR.map((z) => {
      const deZona = zonas.filter((x) => x.zona === z);
      const proxima = deZona.map((x) => x.proxima).filter(Boolean).sort()[0];
      return { z, sede: (deZona[0] || {}).sede || '', n: suma(deZona, 'pendientes'), vencidas: suma(deZona, 'vencidas'), quienes: deZona, proxima };
    }).filter((x) => x.n);
    const avisos = [
      [suma(pestanas, 'enviados'), '✉️', 'ya enviadas', ''],
      [suma(pestanas, 'sin_zona'), '⚠️', 'sin zona (no se mandan)', ' is-alerta'],
      [suma(pestanas, 'errores'), '⚠️', 'con ERROR', ' is-alerta'],
      [suma(pestanas, 'sin_datos'), '📝', 'sin mail, fecha u hora', ''],
    ].filter(([n]) => n).map(([n, ico, txt, cls]) => `<span class="tab-chip${cls}">${ico} <b>${fmt(n)}</b> ${txt}</span>`).join('');
    const rotas = pestanas.filter((p) => p.faltan).map((p) => `<p class="ru-nota">⚠️ ${esc(p.pestana)}: faltan las columnas ${esc(p.faltan)}.</p>`).join('');
    return `<p class="ru-sub">Por citar · menú 📞 Citar${resumen.generado ? ` · ${esc(SB.hace(resumen.generado))}` : ''}</p>`
      + (porZona.length
        ? `<ul class="ru-vivo">${porZona.map((x) => `<li${x.vencidas ? ' class="is-lleno"' : ''}><span>${esc(x.z)} → ${esc(x.sede)}</span>${barra(x.n, total)}<b>${fmt(x.n)}</b><small>${x.quienes.map((q) => `${esc(q.selector)} ${fmt(q.pendientes)}`).join(' · ')}${x.proxima ? ` · próxima ${esc(dia(x.proxima))}` : ''}${x.vencidas ? ` · ⚠️ ${fmt(x.vencidas)} con fecha pasada` : ''}</small></li>`).join('')}</ul>`
        : vacio('No hay citaciones pendientes: todas las filas con fecha y hora ya dicen ENVIADO.'))
      + (avisos ? `<div class="tab-chips">${avisos}</div>` : '')
      + rotas
      + '<p class="ru-nota">Se citan desde la planilla: abrí tu pestaña Citaciones-… y usá 📞 Citar → la zona.</p>';
  }

  /* ── Datos en vivo de cada oficina (replican el Panel de Sala y el Contador de Vacantes) ── */
  function widget(tipo) {
    if (!vivo) return '<p class="ru-nota">Cargando datos en vivo…</p>';
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
      return porCitar() + '<p class="ru-sub">Confirmados por día</p>' + lista + (salas.length ? `<p class="ru-sub">Salas reservadas</p><ul class="ru-vivo">${salas.map((a) => `<li><span>${esc(dia(a.fecha))} · ${esc(a.horario)}</span><b>${esc(a.sala || 'Sala')}</b>${a.reunion === 'Sí' ? '<small>reunión</small>' : ''}</li>`).join('')}</ul>` : '');
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
  // Supabase arma el pedido (proponer_accion),
  // alguien del equipo lo confirma con su PIN personal y n8n lo escribe en
  // Solicitudes Sabores/Extremas (TAREAS GRUPALES), donde siguen corriendo sus
  // Apps Script. Nada cambia sin PIN y el PIN no se guarda en ningún lado.
  const ACCION_URL = 'https://kevin9705.app.n8n.cloud/webhook/oficina-accion';
  const CLAVE_CODIGO = 'oficina-codigo'; // código del equipo: se pide una vez y queda en el navegador
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

  /* ── Panel de la oficina a la vista ── */
  const esHoja = (h) => /docs\.google\.com\/spreadsheets\//.test(h.u);
  function pintarPanel() {
    const panel = $('rutaPanel');
    const foco = document.activeElement;
    if (!datos) {
      panel.innerHTML = '<p class="desc">Cargando la ruta…</p>';
      return;
    }
    const e = est(elegida) || { etapa: elegida, nombre: elegida, personas: 0, hoy: 0, ahora: 0 };
    const meta = ESTACIONES[elegida] || {};
    const tr = tramoDe(elegida);
    const salida = meta.tramo === 'x';
    const n = PASOS.indexOf(elegida);
    const ant = salida ? PASOS[PASOS.length - 1] : PASOS[n - 1];
    const sig = salida ? null : PASOS[n + 1] || 'NO_AVANZA';
    const otrasSalidas = salida ? `<div class="tab-chips">${SALIDAS.map((s) => `<button type="button" class="ru-chip-btn" data-etapa="${s}" aria-pressed="${s === elegida}">${esc(ESTACIONES[s].corto)} · ${fmt((est(s) || {}).personas)}</button>`).join('')}</div>` : '';
    // Las planillas se ven adentro (a la derecha); acá quedan los sitios y carpetas del paso.
    const accesos = (meta.herramientas || []).filter((h) => !esHoja(h));
    panel.innerHTML = `
      <div class="ru-panel-head" style="--c:${tr.color};--cs:${tr.suave}">
        <span class="ru-panel-emoji" aria-hidden="true">${esc(meta.icono || '📍')}</span>
        <div><p>${salida ? 'Salidas · de cualquier paso' : `Paso ${n + 1} de ${PASOS.length} · <span class="ru-tramo-pill">${esc(tr.nombre)}</span>`}</p><h3>${esc(e.nombre)}</h3></div>
      </div>
      ${otrasSalidas}
      <div class="ru-stats">
        <div><b>${fmt(e.personas)}</b><span>pasaron en ${fmt(dias)} días</span></div>
        <div><b>${fmt(e.hoy)}</b><span>hoy</span></div>
        <div><b>${fmt(e.ahora)}</b><span>${salida ? 'salieron acá' : 'esperan acá'}</span></div>
      </div>
      ${e.programados ? `<p class="ru-nota">📅 ${fmt(e.programados)} con fecha futura (programados).</p>` : ''}
      ${meta.vivo ? `<div class="ru-box is-vivo"><span>En vivo</span>${widget(meta.vivo)}</div>` : ''}
      ${(meta.acciones || []).length ? '<div data-accion></div>' : ''}
      ${accesos.length ? `<div class="ru-herr">${accesos.map((h) => `<a class="ru-herr-btn" href="${esc(h.u)}" target="_blank" rel="noopener"><b>${esc(h.t)}</b><small>${esc(h.d)} ↗</small></a>`).join('')}</div>` : ''}
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

  /* ── Botonera: las funciones de los Apps Script como botones ── */
  // App web en un proyecto de Apps Script aparte (apps-script/botonera) que usa
  // el mismo código de Citaciones Tortus sin tocar el original. Corre con la
  // cuenta de quien la usa: la citación sale de su Gmail, igual que con el menú.
  // Cada vista queda cargada (un iframe que se mueve en la página se recarga).
  const BOTONERA_URL = 'https://script.google.com/macros/s/AKfycbzxs6r4Gt7tBRg1KjaltsDWeBLRxGPkByTbcNaWlWpyQHoXLNbZ019WtKRvYjGg4WMghA/exec';
  const VISTAS = {
    citar: { titulo: '📞 Citar por zona', alto: 470 },
    confirmados: { titulo: '📋 Confirmados', alto: 330 },
  };
  const botoneras = new Map(); // vista → iframe
  function pintarBotonera() {
    const caja = $('rutaBotonera');
    const vista = (ESTACIONES[elegida] || {}).funciones;
    caja.hidden = !vista;
    if (!vista) return;
    $('rutaBotoneraTitulo').textContent = VISTAS[vista].titulo;
    const url = BOTONERA_URL ? `${BOTONERA_URL}?vista=${vista}` : '';
    $('rutaBotoneraAbrir').hidden = !url;
    $('rutaBotoneraAbrir').href = url || '#';
    $('rutaBotoneraFalta').hidden = !!url;
    if (!url) return;
    let marco = botoneras.get(vista);
    if (!marco) {
      marco = document.createElement('iframe');
      marco.className = 'ru-botonera-marco';
      marco.title = VISTAS[vista].titulo;
      marco.style.height = VISTAS[vista].alto + 'px';
      marco.src = url;
      $('rutaBotoneraMarcos').appendChild(marco);
      botoneras.set(vista, marco);
    }
    botoneras.forEach((f) => { f.hidden = f !== marco; });
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
    pintarPanel();
  }

  /* ── La planilla real de la oficina, adentro de la página ── */
  // Cada oficina abre su pestaña de Google Sheets tal cual: se edita igual que
  // siempre, con sus menús (📞 Citar…) y sus Apps Script, y abajo de la hoja
  // están todas las pestañas. Hay que estar con la cuenta de Google que tiene
  // acceso. Quedan hasta 3 abiertas para ir y volver sin recargarlas.
  const MAX_ABIERTAS = 3;
  const abiertas = new Map(); // url → iframe, la última usada al final
  const hojaDe = {}; // etapa → url de la pestaña elegida
  function pintarHoja() {
    const caja = $('rutaHoja');
    const hojas = (ESTACIONES[elegida].herramientas || []).filter(esHoja);
    caja.hidden = !hojas.length;
    if (!hojas.length) return;
    const actual = hojas.find((h) => h.u === hojaDe[elegida]) || hojas[0];
    $('rutaHojaTabs').innerHTML = hojas.map((h) => `<button type="button" class="ru-hoja-tab" data-hoja="${esc(h.u)}" aria-pressed="${h === actual}"><b>${esc(h.t)}</b><small>${esc(h.d)}</small></button>`).join('');
    $('rutaHojaAbrir').href = actual.u;
    let marco = abiertas.get(actual.u);
    if (marco) {
      abiertas.delete(actual.u);
    } else {
      marco = document.createElement('iframe');
      marco.className = 'ru-hoja-marco';
      marco.title = `${actual.t} · ${actual.d}`;
      marco.allow = 'clipboard-read; clipboard-write';
      marco.src = actual.u;
      $('rutaHojaMarcos').appendChild(marco);
    }
    abiertas.set(actual.u, marco);
    if (abiertas.size > MAX_ABIERTAS) {
      const [vieja, f] = abiertas.entries().next().value;
      f.remove();
      abiertas.delete(vieja);
    }
    abiertas.forEach((f) => { f.hidden = f !== marco; });
  }

  function elegir(etapa) {
    if (!ESTACIONES[etapa]) return;
    elegida = etapa;
    window.RUTA.elegida = etapa;
    try { history.replaceState(null, '', '#' + hashDe(etapa)); } catch (e) { /* sin historial */ }
    pintarPanel();
    pintarBotonera();
    pintarHoja();
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
    const h = e.target.closest('[data-hoja]');
    if (h) {
      hojaDe[elegida] = h.dataset.hoja;
      pintarHoja();
    }
  });
  document.addEventListener('ruta:elegir', (e) => elegir((e.detail || {}).etapa));
  window.addEventListener('hashchange', () => { const h = desdeHash(); if (h && h !== elegida) elegir(h); });

  pintarLeyenda();
  pintar();
  pintarBotonera();
  pintarHoja();
  cargar();
  cargarVivo();
  setInterval(cargar, 60000);
  setInterval(cargarVivo, 120000);
})();
