// vivo.js — sección "Hoy" del dashboard: tareas abiertas (Tareas grupales) y
// búsquedas (Solicitudes Sabores/Extremas) de la persona del dashboard, o de
// todo el equipo. Lee Supabase, que n8n actualiza cada 30 minutos desde las
// hojas de Drive. Altas y cumplimiento siguen saliendo de data.js.
(() => {
  const MIEMBRO = new URLSearchParams(location.search).get('miembro');
  // Primer nombre con el que aparece cada integrante en las planillas.
  const NOMBRES = { agustin: 'agustin', agustina: 'agustina', rafael: 'rafael', gustavo: 'gustavo', albana: 'albana' };
  const CERRADAS = ['completado', 'completada', 'finalizado', 'finalizada', 'hecho', 'hecha', 'cancelado', 'cancelada'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Hoy: tareas y búsquedas ----------
  const esDe = (campo, nombre) => String(campo || '')
    .split(/\s*(?:,|;|\/|\s+y\s+)\s*/i)
    .some(p => SB.primerNombre(p) === nombre);
  const abierta = (t) => !CERRADAS.includes(SB.norm(t.estado));
  const peso = (p) => ({ urgente: 0, alta: 1, media: 2, baja: 3 })[SB.norm(p)] ?? 2;
  const estadoTxt = (e) => e || 'Sin estado';

  function chipsEstados(rows) {
    const c = new Map();
    rows.forEach(r => c.set(estadoTxt(r.estado), (c.get(estadoTxt(r.estado)) || 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1])
      .map(([e, n]) => `<span class="vivo-chip">${esc(e)} <b>${n}</b></span>`).join('');
  }

  function htmlTareasPersona(tareas) {
    if (!tareas.length) return '<p class="vivo-vacio">No tenés tareas abiertas. 🎉</p>';
    return '<ul class="vivo-list">' + tareas
      .sort((a, b) => peso(a.prioridad) - peso(b.prioridad))
      .map(t => `<li>
        <span class="vivo-main">${esc(t.tarea)}</span>
        <span class="vivo-meta">${[t.estado, t.prioridad && `Prioridad ${t.prioridad}`, t.fecha_limite && `Vence ${t.fecha_limite}`].filter(Boolean).map(esc).join(' · ')}</span>
      </li>`).join('') + '</ul>';
  }

  function htmlTareasEquipo(tareas) {
    if (!tareas.length) return '<p class="vivo-vacio">No hay tareas abiertas. 🎉</p>';
    const por = new Map();
    tareas.forEach(t => {
      const quien = t.propietario || 'Sin responsable';
      if (!por.has(quien)) por.set(quien, []);
      por.get(quien).push(t);
    });
    return '<ul class="vivo-list">' + [...por.entries()].sort((a, b) => b[1].length - a[1].length)
      .map(([quien, lista]) => {
        const bloq = lista.filter(t => SB.norm(t.estado).startsWith('bloq')).length;
        return `<li>
          <span class="vivo-main">${esc(quien)} <b>${lista.length}</b></span>
          <span class="vivo-meta">${bloq ? `⛔ ${bloq} bloqueada${bloq > 1 ? 's' : ''} · ` : ''}${esc(lista.slice(0, 2).map(t => t.tarea).join(' · '))}${lista.length > 2 ? '…' : ''}</span>
        </li>`;
      }).join('') + '</ul>';
  }

  function htmlBusquedasPersona(sols) {
    if (!sols.length) return '<p class="vivo-vacio">No hay solicitudes a tu nombre.</p>';
    const ultimas = [...sols].sort((a, b) => (b.fila || 0) - (a.fila || 0)).slice(0, 8);
    return `<div class="vivo-chips">${chipsEstados(sols)}</div><ul class="vivo-list">` + ultimas.map(s => `<li>
        <span class="vivo-main">${esc(s.local)} · ${esc(s.puesto)}</span>
        <span class="vivo-meta">${[s.marca, s.jornada, estadoTxt(s.estado), s.primer_dia && `Primer día ${s.primer_dia}`].filter(Boolean).map(esc).join(' · ')}</span>
      </li>`).join('') + '</ul>';
  }

  function htmlBusquedasEquipo(sols) {
    if (!sols.length) return '<p class="vivo-vacio">No hay solicitudes cargadas.</p>';
    const por = new Map();
    sols.forEach(s => {
      const quien = s.selector || 'Sin selector';
      if (!por.has(quien)) por.set(quien, []);
      por.get(quien).push(s);
    });
    return '<ul class="vivo-list">' + [...por.entries()].sort((a, b) => b[1].length - a[1].length)
      .map(([quien, lista]) => `<li>
        <span class="vivo-main">${esc(quien)} <b>${lista.length}</b></span>
        <span class="vivo-chips">${chipsEstados(lista)}</span>
      </li>`).join('') + '</ul>';
  }

  async function renderHoy() {
    const box = document.getElementById('vivoSection');
    if (!box || MIEMBRO === 'otros') return;
    const nombre = MIEMBRO ? NOMBRES[MIEMBRO] : null;
    try {
      const [tareas, sols, sync] = await Promise.all([
        SB.pedir('equipo_tareas?select=tarea,propietario,estado,prioridad,fecha_limite&order=fila'),
        SB.pedir('equipo_solicitudes?select=fila,marca,selector,local,puesto,jornada,estado,primer_dia&order=fila'),
        SB.pedir('equipo_sync?select=fuente,actualizado&fuente=in.(tareas,solicitudes)'),
      ]);
      const abiertas = tareas.filter(t => t.tarea && abierta(t));
      const misTareas = nombre ? abiertas.filter(t => esDe(t.propietario, nombre)) : abiertas;
      const misSols = nombre ? sols.filter(s => SB.primerNombre(s.selector) === nombre) : sols;
      const cuando = sync.map(s => s.actualizado).sort().pop();
      document.getElementById('vivoTareas').innerHTML = nombre ? htmlTareasPersona(misTareas) : htmlTareasEquipo(misTareas);
      document.getElementById('vivoBusquedas').innerHTML = nombre ? htmlBusquedasPersona(misSols) : htmlBusquedasEquipo(misSols);
      document.getElementById('vivoTareasDesc').textContent =
        `${misTareas.length} abierta${misTareas.length === 1 ? '' : 's'} · planilla Tareas grupales`;
      document.getElementById('vivoBusquedasDesc').textContent =
        `${misSols.length} solicitud${misSols.length === 1 ? '' : 'es'} · Sabores y Extremas`;
      document.getElementById('vivoNota').textContent = cuando ? `Datos de las planillas de Drive · actualizados ${SB.hace(cuando)}` : '';
      box.style.display = '';
    } catch (e) {
      console.warn('No se pudieron leer tareas y búsquedas', e);
    }
  }

  renderHoy();
})();
