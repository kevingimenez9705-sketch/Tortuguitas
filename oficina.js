// oficina.js — "Oficina digital": los agentes de IA del equipo (n8n), sus
// tareas y su actividad. Lee de Supabase la ficha de cada agente (tabla
// agentes) y totales sin datos personales (funciones oficina_*).
(() => {
  const N8N_AGENTES = 'https://kevin9705.app.n8n.cloud/projects/MzRtqNwNuk7fWtaT/agents/';
  const DIAS = 30, DIAS_GRAFICO = 14;
  const ESTADOS = { activo: 'Activo', borrador: 'Borrador', pausado: 'Pausado' };
  const RECOMENDACIONES = [
    { key: 'avanzar', label: 'Avanzar', color: Charts.COLORS.green },
    { key: 'revisar', label: 'Revisar', color: Charts.COLORS.blue },
    { key: 'duplicado', label: 'Duplicado', color: Charts.COLORS.grey },
    { key: 'descartar', label: 'Descartar', color: Charts.COLORS.red },
  ];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtInt = (n) => Number(n || 0).toLocaleString('es-AR');
  const fmtHoras = (min) => {
    const h = (Number(min) || 0) / 60;
    return (h < 10 ? h.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : Math.round(h).toLocaleString('es-AR')) + ' h';
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Últimos N días (hora de Buenos Aires) como YYYY-MM-DD, del más viejo al más nuevo.
  function ultimosDias(n) {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    const base = new Date(hoy + 'T12:00:00Z');
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() - (n - 1 - i));
      return d.toISOString().slice(0, 10);
    });
  }

  function kpiHtml(label, value, sub, color) {
    return `<div class="kpi ${color}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
  }

  function agenteHtml(a, act) {
    const estado = a.estado || 'borrador';
    const chips = (lista, cls) => (lista || []).map(x => `<span>${esc(x)}</span>`).join('') || '<span>—</span>';
    const alerta = act && (act.errores > 0 || act.pendientes > 0)
      ? `<div class="ofi-alerta">⚠️ ${[act.errores > 0 && `${act.errores} con error`, act.pendientes > 0 && `${act.pendientes} pendientes`].filter(Boolean).join(' · ')}</div>`
      : '';
    return `<article class="ofi-card">
      <header class="ofi-card-head">
        <span class="ofi-emoji" aria-hidden="true">${esc(a.emoji)}</span>
        <h3>${esc(a.nombre)}</h3>
        <span class="ofi-estado is-${esc(estado)}">${esc(ESTADOS[estado] || estado)}</span>
      </header>
      <p class="ofi-rol">${esc(a.rol)}</p>
      <div class="ofi-stats">
        <div><strong>${fmtInt(act ? act.items : 0)}</strong><span>ítems · ${DIAS} días</span></div>
        <div><strong>${fmtHoras(act ? act.minutos : 0)}</strong><span>ahorradas</span></div>
        <div><strong>${esc(act && act.ultima ? cap(SB.hace(act.ultima)) : 'Sin actividad')}</strong><span>última vez</span></div>
      </div>
      ${alerta}
      <div class="ofi-label">Tareas</div>
      <ul class="ofi-tareas">${(a.tareas || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="ofi-label">Cuándo trabaja</div>
      <div class="ofi-chips">${chips(a.disparadores)}</div>
      <div class="ofi-label">Herramientas</div>
      <div class="ofi-chips is-soft">${chips(a.herramientas)}</div>
      <dl class="ofi-meta">
        <div><dt>Control humano</dt><dd>${esc(a.aprobacion_humana || '—')}</dd></div>
        <div><dt>Responsable</dt><dd>${esc(a.responsable || '—')}</dd></div>
        <div><dt>KPI</dt><dd>${esc(a.kpi || '—')}</dd></div>
      </dl>
      ${a.n8n_agent_id ? `<a class="ofi-link" href="${N8N_AGENTES + encodeURIComponent(a.n8n_agent_id)}" target="_blank" rel="noopener noreferrer">Abrir en n8n →</a>` : ''}
    </article>`;
  }

  async function cargar() {
    const [agentes, actividad, diaria, screening] = await Promise.all([
      SB.pedir('agentes?select=*&order=orden.asc'),
      SB.pedir('rpc/oficina_actividad', { dias: DIAS }),
      SB.pedir('rpc/oficina_actividad_diaria', { dias: DIAS_GRAFICO }),
      SB.pedir('rpc/oficina_screening', { dias: DIAS }),
    ]);

    const porAgente = Object.fromEntries(actividad.map(x => [x.agente_id, x]));
    const total = actividad.reduce((t, x) => ({
      acciones: t.acciones + Number(x.acciones), items: t.items + Number(x.items), minutos: t.minutos + Number(x.minutos),
    }), { acciones: 0, items: 0, minutos: 0 });
    const activos = agentes.filter(a => a.estado === 'activo').length;

    document.getElementById('ofiKpis').innerHTML = [
      kpiHtml('Agentes', fmtInt(agentes.length), `${activos} ${activos === 1 ? 'activo' : 'activos'}`, 'c-blue'),
      kpiHtml('Acciones', fmtInt(total.acciones), 'Corridas y pedidos resueltos', 'c-purple'),
      kpiHtml('Ítems procesados', fmtInt(total.items), 'Postulaciones, búsquedas, entrevistas…', 'c-blue'),
      kpiHtml('Tiempo ahorrado', fmtHoras(total.minutos), 'Estimado por cada agente', 'c-green'),
    ].join('');

    const dias = ultimosDias(DIAS_GRAFICO);
    const itemsDia = Object.fromEntries(dias.map(d => [d, 0]));
    diaria.forEach(x => { if (x.dia in itemsDia) itemsDia[x.dia] += Number(x.items); });
    Charts.line('ofiChartDiaria', dias.map(d => `${d.slice(8, 10)}/${d.slice(5, 7)}`), dias.map(d => itemsDia[d]), { color: Charts.COLORS.purple });

    const recos = RECOMENDACIONES.map(r => ({ ...r, n: Number((screening.find(s => s.recomendacion === r.key) || {}).cantidad || 0) }));
    Charts.horizontalBar('ofiChartScreening', recos.map(r => r.label), recos.map(r => r.n), Charts.COLORS.green);

    document.getElementById('ofiAgentes').innerHTML = agentes.map(a => agenteHtml(a, porAgente[a.id])).join('');
    document.getElementById('ofiContent').style.display = '';
  }

  cargar().catch(err => {
    document.getElementById('ofiErrorMsg').textContent = `Supabase no respondió (${err.message}). Probá recargar la página.`;
    document.getElementById('ofiError').style.display = '';
  });
})();
