// tablero.js — "Hoy en la oficina": lo que encontró cada agente y necesita a
// una persona del equipo. Cada tarjeta tiene un botón "Preguntale" que manda
// la consulta al chat (evento oficina:preguntar, ver oficina-viva.js).
//
// Fuentes (Supabase, clave publicable, sin datos personales):
//   - equipo_solicitudes: planillas Solicitudes Sabores/Extremas (n8n las copia
//     cada 30 min): entrevistas, ingresos y búsquedas por mover.
//   - rpc/oficina_tablero: totales de postulaciones, recomendaciones del
//     Screening (48 h), avisos de los agentes sin resolver (24 h), notas del
//     equipo y último parte diario.
(() => {
  const ZONA = 'America/Argentina/Buenos_Aires';
  const caja = document.getElementById('tablero');
  if (!caja) return;

  const AGENTES = {
    agenda: { emoji: '📅', nombre: 'Agenda' },
    onboarding: { emoji: '🤝', nombre: 'Onboarding' },
    vacantes: { emoji: '📌', nombre: 'Vacantes' },
    screening: { emoji: '🔎', nombre: 'Screening' },
    analista: { emoji: '📊', nombre: 'Analista' },
    coordinador: { emoji: '🧭', nombre: 'Coordinador' },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1).toLowerCase();

  // ---------- Fechas (las planillas usan dd/mm/aaaa y "14:30 HS") ----------
  const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
  const sumarDias = (iso, n) => {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const fechaISO = (s) => {
    const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    const anio = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  };
  const horaDe = (s) => {
    const m = String(s || '').match(/(\d{1,2})[:.](\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  };
  // "Lun 19/10"
  const diaCorto = (iso) => {
    const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')).replace('.', '');
    return `${cap(dia)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  };

  // ---------- Tarjeta ----------
  function tarjeta({ agente, titulo, sub, numero, numeroSub, chips = [], items = [], vacio, pregunta, boton }) {
    const a = AGENTES[agente];
    return `<article class="card tab-card">
      <header class="tab-head">
        <span class="tab-emoji" aria-hidden="true">${a.emoji}</span>
        <div><h3>${esc(titulo)}</h3><p>${esc(sub)}</p></div>
      </header>
      <div class="tab-num">${numero}${numeroSub ? `<small>${esc(numeroSub)}</small>` : ''}</div>
      ${chips.length ? `<div class="tab-chips">${chips.map((c) => `<span class="tab-chip${c.alerta ? ' is-alerta' : ''}">${c.html}</span>`).join('')}</div>` : ''}
      ${items.length
        ? `<ul class="tab-lista">${items.map((i) => `<li><span>${i.texto}</span><span class="tab-meta">${i.meta || ''}</span></li>`).join('')}</ul>`
        : `<p class="tab-vacio">${esc(vacio)}</p>`}
      <button class="tab-btn" type="button" data-pregunta="${esc(pregunta)}">${esc(boton || `Preguntale a ${a.nombre}`)} →</button>
    </article>`;
  }
  const chip = (texto, n, alerta) => ({ html: `${esc(texto)} <b>${fmt(n)}</b>`, alerta });

  // ---------- Agenda: entrevistas de hoy y mañana ----------
  function tarjetaAgenda(sols, hoy) {
    const manana = sumarDias(hoy, 1);
    const ents = sols
      .map((s) => ({ ...s, dia: fechaISO(s.fecha), h: horaDe(s.hora) }))
      .filter((s) => s.dia === hoy || s.dia === manana)
      .sort((a, b) => (a.dia + a.h).localeCompare(b.dia + b.h));
    const deHoy = ents.filter((s) => s.dia === hoy).length;
    return tarjeta({
      agente: 'agenda',
      titulo: 'Entrevistas',
      sub: 'Hoy y mañana, según las planillas',
      numero: fmt(deHoy),
      numeroSub: `hoy · ${fmt(ents.length - deHoy)} mañana`,
      items: ents.slice(0, 6).map((s) => ({
        texto: `<b>${s.dia === hoy ? esc(s.h || 'Hoy') : 'Mañana ' + esc(s.h)}</b> · ${esc(s.local)} · ${esc(cap(s.puesto))}`,
        meta: esc(s.selector || 'sin selector'),
      })),
      vacio: 'No hay entrevistas cargadas para hoy ni mañana.',
      pregunta: '¿Qué entrevistas hay hoy y mañana?',
    });
  }

  // ---------- Onboarding: ingresos de los próximos 7 días ----------
  function tarjetaOnboarding(sols, hoy) {
    const hasta = sumarDias(hoy, 7);
    const ings = sols
      .map((s) => ({ ...s, dia: fechaISO(s.primer_dia) }))
      .filter((s) => s.dia && s.dia >= hoy && s.dia <= hasta)
      .sort((a, b) => a.dia.localeCompare(b.dia));
    const estaSemana = ings.filter((s) => s.dia <= sumarDias(hoy, 2)).length;
    return tarjeta({
      agente: 'onboarding',
      titulo: 'Ingresos próximos',
      sub: 'Primer día en los próximos 7 días',
      numero: fmt(ings.length),
      numeroSub: estaSemana ? `ingresos · ${fmt(estaSemana)} en 48 h` : 'ingresos',
      items: ings.slice(0, 6).map((s) => ({
        texto: `<b>${esc(diaCorto(s.dia))}</b> · ${esc(s.local)} · ${esc(cap(s.puesto))}`,
        meta: esc(s.selector || 'sin selector'),
      })),
      vacio: 'No hay ingresos cargados para los próximos 7 días.',
      pregunta: '¿Qué ingresos hay en los próximos días?',
    });
  }

  // ---------- Vacantes: búsquedas que hay que mover ----------
  function tarjetaVacantes(sols) {
    const norm = (s) => SB.norm(s);
    const grupos = { noVino: [], sinEstado: [], zonal: [], sinSelector: [] };
    sols.forEach((s) => {
      const e = norm(s.estado);
      if (!s.local && !s.puesto) return;
      if (e.includes('no vino')) grupos.noVino.push(s);
      else if (!e) grupos.sinEstado.push(s);
      else if (e.includes('zonal')) grupos.zonal.push(s);
      if (!norm(s.selector) && !e.startsWith('comunicad')) grupos.sinSelector.push(s);
    });
    const urgentes = [...grupos.noVino, ...grupos.sinEstado];
    return tarjeta({
      agente: 'vacantes',
      titulo: 'Búsquedas para mover',
      sub: 'Ausentes, recién cargadas y esperando al zonal',
      numero: fmt(urgentes.length),
      numeroSub: 'para mover hoy',
      chips: [
        grupos.noVino.length && chip('No vino', grupos.noVino.length, true),
        grupos.sinEstado.length && chip('Sin estado', grupos.sinEstado.length),
        grupos.zonal.length && chip('Esperando al zonal', grupos.zonal.length),
        grupos.sinSelector.length && chip('Sin selector', grupos.sinSelector.length, true),
      ].filter(Boolean),
      items: urgentes.slice(0, 5).map((s) => ({
        texto: `${esc(s.local)} · ${esc(cap(s.puesto))}${s.marca ? ` <span class="tab-marca">${esc(s.marca)}</span>` : ''}`,
        meta: `${esc(s.selector || 'sin selector')} · ${norm(s.estado).includes('no vino') ? 'no vino' : 'sin estado'}`,
      })),
      vacio: 'Ninguna búsqueda trabada: todas tienen estado y nadie faltó. 🎉',
      pregunta: '¿Qué búsquedas siguen abiertas o trabadas y de quién son?',
    });
  }

  // ---------- Screening: a quién llamar ----------
  function tarjetaScreening(t) {
    const p = (t && t.para_llamar) || {};
    return tarjeta({
      agente: 'screening',
      titulo: 'Para llamar',
      sub: 'Recomendadas por el Screening · últimas 48 h',
      numero: fmt(p.prioridad_1),
      numeroSub: `prioridad 1 · ${fmt(p.prioridad_2)} prioridad 2`,
      chips: [
        ...(p.zonas || []).map((z) => chip(z.zona, z.n)),
        p.duplicados ? chip('Duplicados detectados', p.duplicados) : null,
      ].filter(Boolean),
      items: [],
      vacio: (p.prioridad_1 || p.prioridad_2) ? 'Los datos de contacto están en el ATS (no se muestran acá).' : 'Sin recomendaciones nuevas en las últimas 48 h.',
      pregunta: '¿Cuántas postulaciones recomendó avanzar el Screening en las últimas 48 horas y de qué zonas?',
    });
  }

  // ---------- Analista: postulaciones ----------
  function tarjetaAnalista(t) {
    const p = (t && t.postulaciones) || {};
    const pct = p.promedio_7d ? Math.round((p.hoy / p.promedio_7d) * 100) : null;
    return tarjeta({
      agente: 'analista',
      titulo: 'Postulaciones',
      sub: 'Hoy hasta ahora, contra ayer y el promedio',
      numero: fmt(p.hoy),
      numeroSub: `hoy · ayer ${fmt(p.ayer)}`,
      chips: (p.zonas_hoy || []).map((z) => chip(z.zona, z.n)),
      items: [],
      vacio: pct == null ? 'Todavía no hay promedio de 7 días para comparar.' : `Hoy va ${pct}% de un día promedio (${fmt(p.promedio_7d)}).`,
      pregunta: '¿Cómo vienen las postulaciones hoy comparado con ayer?',
    });
  }

  // ---------- Coordinador: avisos de la oficina ----------
  // El parte sale L-V 8:50: si a las 10 no salió, se marca como aviso.
  function parteAtrasado() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    return !['Sat', 'Sun'].includes(p.weekday) && Number(p.hour) >= 10;
  }
  function tarjetaCoordinador(t) {
    const alertas = (t && t.alertas) || [];
    const notas = (t && t.notas) || {};
    const parte = t && t.ultimo_parte;
    const parteHoy = parte && new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(parte)) === hoyISO();
    return tarjeta({
      agente: 'coordinador',
      titulo: 'Avisos de la oficina',
      sub: 'Agentes con algo sin resolver · últimas 24 h',
      numero: alertas.length ? fmt(alertas.length) : '✅',
      numeroSub: alertas.length ? `aviso${alertas.length === 1 ? '' : 's'} sin resolver` : 'todo en orden',
      chips: [
        { html: `📝 Notas de la semana <b>${fmt(notas.semana)}</b>` },
        { html: parteHoy ? `Parte diario <b>${esc(SB.hace(parte))}</b>` : 'Parte diario <b>todavía no salió hoy</b>', alerta: !parteHoy && parteAtrasado() },
      ],
      items: alertas.slice(0, 5).map((a) => ({
        texto: `${(AGENTES[a.agente_id] || {}).emoji || '🤖'} ${a.estado === 'error' ? '⚠️' : '⏳'} ${esc(a.accion)}`,
        meta: esc(SB.hace(a.created_at)),
      })),
      vacio: 'Ningún agente tiene errores ni pendientes sin resolver.',
      pregunta: '¿Qué hizo la oficina hoy?',
      boton: 'Preguntale al Coordinador',
    });
  }

  // ---------- Carga ----------
  async function cargar() {
    const [sols, tab] = await Promise.allSettled([
      SB.pedir('equipo_solicitudes?select=fila,marca,selector,local,puesto,jornada,fecha,hora,estado,primer_dia&order=fila'),
      SB.pedir('rpc/oficina_tablero', {}),
    ]);
    if (sols.status === 'rejected' && tab.status === 'rejected') {
      const err = document.getElementById('ofiError');
      document.getElementById('ofiErrorMsg').textContent = 'Revisá la conexión y recargá la página.';
      err.style.display = '';
      console.warn('Tablero sin datos', sols.reason, tab.reason);
      return;
    }
    const s = sols.status === 'fulfilled' ? sols.value : [];
    const t = tab.status === 'fulfilled' ? tab.value : null;
    const hoy = hoyISO();
    caja.innerHTML = [
      tarjetaAgenda(s, hoy),
      tarjetaOnboarding(s, hoy),
      tarjetaVacantes(s),
      tarjetaScreening(t),
      tarjetaAnalista(t),
      tarjetaCoordinador(t),
    ].join('');
    const nota = document.getElementById('tableroNota');
    if (nota) nota.textContent = `Actualizado ${new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())} · planillas de Drive (cada 30 min) y bitácora de los agentes. Sin datos personales.`;
    document.getElementById('tableroSeccion').style.display = '';
  }

  caja.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pregunta]');
    if (b) document.dispatchEvent(new CustomEvent('oficina:preguntar', { detail: { texto: b.dataset.pregunta } }));
  });

  cargar();
  setInterval(cargar, 2 * 60 * 1000);
  // Después de un cambio con PIN, n8n re-sincroniza la copia: se vuelve a leer en un ratito.
  document.addEventListener('oficina:cambio', (e) => {
    if (e.detail && e.detail.fase === 'hecho') setTimeout(cargar, 20000);
  });
})();
