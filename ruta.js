// ruta.js — "Ruta del ingresante": el proceso completo, del QR a iCheck, como
// 13 oficinas en fila (una por paso) más la de salidas. Une lo que antes estaba
// repartido en Citaciones Tortus, TAREAS GRUPALES y Tareas grupales/zonas.
// Solo muestra: el trabajo se sigue haciendo en las planillas.
//
// Fuentes (clave publicable, solo totales):
//   rpc/ruta_estaciones → cuántas personas pasaron por cada paso en el período,
//     hoy y en los últimos 7 días, contando solo pasos con fecha real. Lo que
//     está en la planilla sin fecha del paso (cargas iniciales, fechas mal
//     escritas) se informa aparte y no se suma.
//   rpc/ruta_oficinas → datos en vivo de las oficinas: turnos de la sala (lo que
//     muestra el Panel de Sala), solicitudes por estado y selector (lo que cuenta
//     el Contador de Vacantes), onboardings, primeros días, agenda de salas,
//     encuesta y uniformes.
// n8n y los Apps Script de cada planilla cargan esos datos; la ruta no los modifica.
//
// Arma el panel de la oficina a la vista (números, tutor, datos en vivo y accesos
// a sus planillas). ruta-3d.js dibuja las oficinas y se comunica con eventos:
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

  // Tutores: los personajes del equipo (los de personajes.html) hacen de referentes
  // de cada oficina. Van rotando por la ruta y cada uno personaliza la suya: su
  // color (almohadones, alfombra, pergamino), su herramienta en el armero, sus
  // frases (las mismas de personajes.js, FRASES_EQUIPO) y su movida.
  const TUTORES = {
    kevin: { nombre: 'Kevin', personaje: 'rata', color: '#5c2430', lema: 'Autómata y estratégico',
      herramienta: 'baston', accion: 'reverencia', movida: '🙇 Reverencia de sensei',
      frases: ['Antes de preguntar… ¿pensaste?', '¿Cuántas altas tuvimos en el mes?', '¿Me explico?', '¿Ya terminaron de jugar?'] },
    agustin: { nombre: 'Agustín', personaje: 'tortuga', arma: 'bo', color: '#5b2d78', lema: 'El innovador',
      herramienta: 'bo', accion: 'giro', movida: '🌀 Giro con el bo',
      frases: ['¿Qué harías vos?', 'Pensando qué automatizar…'] },
    agustina: { nombre: 'Agustina', personaje: 'tortuga', arma: 'sai', color: '#cc2f2f', lema: 'La creativa',
      herramienta: 'sai', accion: 'salto', movida: '🦘 Salto ninja',
      frases: ['¿Alguno tiene gerencial de Sur?', '¿Salimos al break?', '¿Trajeron comida?'] },
    rafael: { nombre: 'Rafael', personaje: 'tortuga', arma: 'nunchaku', color: '#e2721f', lema: 'El compañero confiable',
      herramienta: 'nunchaku', accion: 'molinete', movida: '🥢 Molinete de nunchakus',
      frases: ['Mientras menos pregunten, mejor…', 'Qué tranquilo que está Oeste…'] },
    gustavo: { nombre: 'Gustavo', personaje: 'tortuga', arma: 'katana', color: '#4f8fc9', lema: 'El más versátil',
      herramienta: 'katana', accion: 'guardia', movida: '⚔️ En guardia',
      frases: ['Tengo hambre…'] },
    albana: { nombre: 'Albana', personaje: 'april', color: '#d4a017', lema: 'La estructurada',
      herramienta: 'microfono', accion: 'saludo', movida: '🎙️ Saludo a cámara',
      frases: ['En busca de gerente de tienda…', '¿Salimos así puedo fumar?'] },
  };
  const HERRAMIENTAS = { baston: 'Bastón de sensei', bo: 'Bo', sai: 'Sai', nunchaku: 'Nunchakus', katana: 'Katanas', microfono: 'Micrófono y cámara' };
  const SOLICITUDES = 'TAREAS GRUPALES · Solicitudes Sabores / Extremas';

  // Cada paso: tramo, ícono, tutor, dónde se hace (siempre en la planilla), datos
  // en vivo y sus planillas y herramientas (H).
  const ESTACIONES = {
    POSTULADO: { tramo: 1, icono: '📝', corto: 'Postulados', tutor: 'kevin', donde: 'el formulario QR (llega solo al ATS)',
      herramientas: [H.ats, H.formQR, H.portal] },
    CITADO_ENTREVISTA: { tramo: 1, icono: '✉️', corto: 'Citados', tutor: 'agustin', vivo: 'agenda',
      donde: 'Citaciones Tortus · tu pestaña Citaciones-… → 📞 Citar', herramientas: [H.citaciones, H.agendaOp] },
    CONFIRMO_ENTREVISTA: { tramo: 1, icono: '✅', corto: 'Confirmaron', tutor: 'agustina', vivo: 'confirmados',
      donde: 'Citaciones Tortus · Confirmados', herramientas: [H.confirmados, H.panelSala] },
    ASISTIO_ENTREVISTA: { tramo: 2, icono: '🪑', corto: 'Asistieron', tutor: 'rafael', vivo: 'sala',
      donde: 'TAREAS GRUPALES · Proceso de Selección', herramientas: [H.proceso, H.panelSala] },
    APROBADO: { tramo: 2, icono: '👍', corto: 'Aprobados', tutor: 'gustavo',
      donde: 'TAREAS GRUPALES · Proceso de Selección', herramientas: [H.proceso, H.baseDatos, H.bloqueados] },
    COMPARTIDO_ZONAL: { tramo: 3, icono: '📤', corto: 'Al zonal', tutor: 'albana', vivo: 'vacantes',
      donde: 'TAREAS GRUPALES · Proceso de Selección y Solicitudes', herramientas: [H.zonales, H.proceso] },
    VACANTE_ASIGNADA: { tramo: 3, icono: '📌', corto: 'Con vacante', tutor: 'kevin', vivo: 'vacantes',
      donde: 'TAREAS GRUPALES · Solicitudes y Vacantes Reservadas', herramientas: [H.solSabores, H.solExtremas] },
    APROBADO_ZONAL: { tramo: 3, icono: '🆗', corto: 'OK del zonal', tutor: 'agustin', vivo: 'vacantes',
      donde: SOLICITUDES, herramientas: [H.solSabores, H.solExtremas] },
    CITADO_ONB: { tramo: 4, icono: '📅', corto: 'Citados ONB', tutor: 'agustina', vivo: 'onb',
      donde: SOLICITUDES, herramientas: [H.solSabores, H.solExtremas, H.agendaOp] },
    CONFIRMA_ONB: { tramo: 4, icono: '☑️', corto: 'Confirman ONB', tutor: 'rafael', vivo: 'onb',
      donde: SOLICITUDES, herramientas: [H.solSabores, H.solExtremas] },
    HIZO_ONB: { tramo: 4, icono: '🎓', corto: 'Hicieron ONB', tutor: 'gustavo', vivo: 'uniformes',
      donde: SOLICITUDES, herramientas: [H.ingreso, H.docIngreso, H.constancias] },
    ALTA_ICHECK: { tramo: 4, icono: '💾', corto: 'En iCheck', tutor: 'albana', vivo: 'primeros',
      donde: 'TAREAS GRUPALES · exportacion_icheck', herramientas: [H.icheck, H.carpetaIcheck] },
    INGRESO: { tramo: 4, icono: '🎉', corto: 'Ingresaron', tutor: 'kevin', vivo: 'ingreso',
      donde: SOLICITUDES, herramientas: [H.solSabores, H.solExtremas, H.altas, H.encuesta] },
    NO_AVANZA: { tramo: 'x', icono: '⛔', corto: 'No avanzan', tutor: 'agustin',
      donde: 'TAREAS GRUPALES · Proceso de Selección', herramientas: [H.proceso, H.bloqueados] },
    NO_SE_PRESENTO: { tramo: 'x', icono: '🚷', corto: 'No vinieron', tutor: 'agustin',
      donde: 'Citaciones Tortus · Confirmados', herramientas: [H.confirmados, H.panelSala] },
    DESISTIO: { tramo: 'x', icono: '🏳️', corto: 'Desistieron', tutor: 'agustin', donde: SOLICITUDES,
      herramientas: [H.solSabores, H.solExtremas] },
    RECHAZADO_ZONAL: { tramo: 'x', icono: '✋', corto: 'Rechazo zonal', tutor: 'agustin', donde: SOLICITUDES,
      herramientas: [H.solSabores, H.solExtremas, H.bloqueados] },
  };
  return { TRAMOS, TUTORES, HERRAMIENTAS, ESTACIONES, datos: null, elegida: null };
})();

(() => {
  const seccion = document.getElementById('rutaSeccion');
  if (!seccion || !window.SB) return;
  const { TRAMOS, TUTORES, HERRAMIENTAS, ESTACIONES } = window.RUTA;
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
      // Solicitudes con fecha en los próximos 30 días; "comunicados" es el estado COMUNICADO (ya avisados).
      const lista = (arr, vacioTxt) => (arr.length
        ? `<ul class="ru-vivo">${arr.map((d) => `<li><span>${esc(d.fecha === vivo.hoy ? 'Hoy' : dia(d.fecha))}</span><b>${fmt(d.n)}</b>${d.comunicados ? `<small>${fmt(d.comunicados)} comunicados</small>` : ''}</li>`).join('')}</ul>`
        : vacio(vacioTxt));
      const onb = `<p class="ru-sub">Onboardings por día · Solicitudes</p>${lista(vivo.onb_dias || [], 'No hay onboardings cargados para los próximos 30 días.')}`;
      if (tipo === 'onb') return onb;
      const primeros = `<p class="ru-sub">Primeros días · Solicitudes</p>${lista(vivo.primeros_dias || [], 'No hay primeros días cargados para los próximos 30 días.')}`;
      if (tipo === 'primeros') return primeros;
      if (tipo === 'uniformes') {
        const u = vivo.uniformes;
        return onb
          + (u ? `<p class="ru-sub">Uniformes entregados · planilla Uniformes${u.ultima_fecha ? `, última entrega cargada el ${esc(dia(u.ultima_fecha, { day: 'numeric', month: 'numeric', year: '2-digit' }))}` : ''}</p><div class="tab-chips"><span class="tab-chip">${fmt(u.personas)} personas</span><span class="tab-chip">${fmt(u.remeras)} remeras</span><span class="tab-chip">${fmt(u.gorras)} gorras</span><span class="tab-chip">${fmt(u.delantales)} delantales</span></div>` : '');
      }
      const enc = vivo.encuesta;
      return primeros + (enc ? `<p class="ru-sub">Encuesta de experiencia</p><div class="tab-chips"><span class="tab-chip"><b>${fmt(enc.satisfaccion_pct)}%</b> satisfechos</span><span class="tab-chip">${fmt(enc.respuestas)} respuestas</span>${enc.malas ? `<span class="tab-chip is-alerta">${fmt(enc.malas)} malas</span>` : ''}</div>` : '');
    }
    return '';
  }

  /* ── Panel de la oficina a la vista ── */
  const corta = (iso) => dia(iso, { day: 'numeric', month: 'numeric' });
  const ICONO_TUTOR = { tortuga: '🐢', rata: '🐀', april: '🎙️' };
  function pintarPanel() {
    const panel = $('rutaPanel');
    if (!datos) {
      panel.innerHTML = '<p class="desc">Cargando la ruta…</p>';
      return;
    }
    const e = est(elegida) || { etapa: elegida, nombre: elegida, personas: 0, hoy: 0, semana: 0, sin_fecha: 0 };
    const meta = ESTACIONES[elegida] || {};
    const tr = tramoDe(elegida);
    const tutor = TUTORES[meta.tutor];
    const salida = meta.tramo === 'x';
    const n = PASOS.indexOf(elegida);
    const ant = salida ? PASOS[PASOS.length - 1] : PASOS[n - 1];
    const sig = salida ? null : PASOS[n + 1] || 'NO_AVANZA';
    const otrasSalidas = salida ? `<div class="tab-chips">${SALIDAS.map((s) => `<button type="button" class="ru-chip-btn" data-etapa="${s}" aria-pressed="${s === elegida}">${esc(ESTACIONES[s].corto)} · ${fmt((est(s) || {}).personas)}</button>`).join('')}</div>` : '';
    // Si el paso tiene fechas desde hace menos que el período, se dice desde cuándo.
    const desde = e.datos_desde && e.datos_desde > datos.desde && e.datos_desde <= datos.hasta ? e.datos_desde : null;
    panel.innerHTML = `
      <div class="ru-panel-col">
        <div class="ru-panel-head" style="--c:${tr.color};--cs:${tr.suave}">
          <span class="ru-panel-emoji" aria-hidden="true">${esc(meta.icono || '📍')}</span>
          <div><p>${salida ? 'Salidas · de cualquier paso' : `Paso ${n + 1} de ${PASOS.length} · <span class="ru-tramo-pill">${esc(tr.nombre)}</span>`}</p><h3>${esc(e.nombre)}</h3></div>
        </div>
        ${otrasSalidas}
        <div class="ru-stats">
          <div><b>${fmt(e.personas)}</b><span>${desde ? `pasaron desde el ${esc(corta(desde))}` : `pasaron en ${fmt(dias)} días`}</span></div>
          <div><b>${fmt(e.semana)}</b><span>últimos 7 días</span></div>
          <div><b>${fmt(e.hoy)}</b><span>hoy</span></div>
        </div>
        ${desde ? `<p class="ru-nota">Hay fechas de este paso desde el ${esc(corta(desde))}: antes no se registraban.</p>` : ''}
        ${e.sin_fecha ? `<p class="ru-nota">📄 ${fmt(e.sin_fecha)} más ${e.sin_fecha === 1 ? 'está' : 'están'} en la planilla sin la fecha del paso (carga inicial o fecha mal escrita): no se cuentan.</p>` : ''}
        ${e.programados ? `<p class="ru-nota">📅 ${fmt(e.programados)} con fecha futura (programados).</p>` : ''}
        ${tutor ? `<div class="ru-tutor" style="--c:${tutor.color}"><span class="ru-tutor-ico" aria-hidden="true">${ICONO_TUTOR[tutor.personaje] || '🤖'}</span><p><small>Referente de esta oficina</small><b>${esc(tutor.nombre)} · ${esc(tutor.lema)}</b><span>${esc(HERRAMIENTAS[tutor.herramienta] || '')} · ${esc(tutor.movida)}</span><q>${esc(tutor.frases[0])}</q></p></div>` : ''}
        <div class="ru-nav">
          ${ant ? `<button type="button" class="ru-nav-btn" data-etapa="${ant}">‹ ${esc(ESTACIONES[ant].corto)}</button>` : '<span></span>'}
          ${sig ? `<button type="button" class="ru-nav-btn" data-etapa="${sig}">${esc(sig === 'NO_AVANZA' ? 'Salidas' : ESTACIONES[sig].corto)} ›</button>` : '<span></span>'}
        </div>
      </div>
      <div class="ru-panel-col">
        <div class="ru-box"><span>Se hace en la planilla</span><p><b>${esc(meta.donde || '')}</b></p>
          <div class="ru-herr">${(meta.herramientas || []).map((h) => `<a class="ru-herr-btn" href="${esc(h.u)}" target="_blank" rel="noopener"><b>${esc(h.t)}</b><small>${esc(h.d)} ↗</small></a>`).join('')}</div>
        </div>
        ${meta.vivo ? `<div class="ru-box is-vivo"><span>En vivo</span>${widget(meta.vivo)}</div>` : ''}
      </div>`;
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

  function elegir(etapa) {
    if (!ESTACIONES[etapa]) return;
    elegida = etapa;
    window.RUTA.elegida = etapa;
    try { history.replaceState(null, '', '#' + hashDe(etapa)); } catch (e) { /* sin historial */ }
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
