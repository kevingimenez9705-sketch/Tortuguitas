// vivo.js — conecta el dashboard con las hojas de Drive (vía Supabase, que n8n
// actualiza cada 30 minutos).
//
// 1) Altas y cumplimiento: si la hoja altas_anual llega al menos hasta el
//    mismo mes que data.js, el dashboard usa la hoja; si está más atrasada,
//    sigue usando data.js (así nunca se muestran menos datos que antes).
//    Recién después de decidir eso se carga app.js.
// 2) "Hoy": tareas abiertas (Tareas grupales) y búsquedas (Solicitudes
//    Sabores/Extremas) de la persona del dashboard, o de todo el equipo.
(() => {
  const DATA = window.ALTAS_DATA;
  const MIEMBRO = new URLSearchParams(location.search).get('miembro');
  // Primer nombre con el que aparece cada integrante en las planillas.
  const NOMBRES = { agustin: 'agustin', agustina: 'agustina', rafael: 'rafael', gustavo: 'gustavo', albana: 'albana' };
  const CERRADAS = ['completado', 'completada', 'finalizado', 'finalizada', 'hecho', 'hecha', 'cancelado', 'cancelada'];
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const maxMes = (rows) => rows.reduce((m, r) => (r.mes > m ? r.mes : m), '');
  const mesLabel = (mes) => (mes ? `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}` : 'S/D');

  function cargarApp() {
    const s = document.createElement('script');
    s.src = 'app.js?v=20261015';
    document.body.appendChild(s);
  }

  async function datosDeHojas() {
    const sync = await SB.pedir('equipo_sync?select=*');
    const cuando = Object.fromEntries(sync.map(s => [s.fuente, s.actualizado]));
    const [ultAlta, ultCumpl] = await Promise.all([
      SB.pedir('equipo_altas?select=mes&order=mes.desc&limit=1'),
      SB.pedir('equipo_cumplimiento?select=mes&order=mes.desc&limit=1'),
    ]);
    const mesHojaAltas = ultAlta[0] ? ultAlta[0].mes : '';
    const mesHojaCumpl = ultCumpl[0] ? ultCumpl[0].mes : '';
    const archivo = DATA.fuente.split(' · ')[0]; // ej. informe_anual_drive_12.xlsx
    const hoja = (fuente) => `hoja altas_anual (actualizada ${SB.hace(cuando[fuente])})`;
    const atrasada = (mes) => (mes ? ` · la hoja altas_anual llega hasta ${mesLabel(mes)}` : '');
    let fuenteAltas = archivo + atrasada(mesHojaAltas);
    let fuenteCumpl = archivo + atrasada(mesHojaCumpl);

    if (mesHojaAltas && mesHojaAltas >= maxMes(DATA.altas)) {
      const filas = await SB.todo('equipo_altas', 'selector,regional,zonal,local,fecha,mes,presente,marca,cantidad');
      const altas = [];
      filas.forEach(r => {
        const { cantidad, ...alta } = r;
        for (let i = 0; i < (cantidad || 1); i++) altas.push(alta);
      });
      DATA.altas = altas;
      fuenteAltas = hoja('altas');
    }

    if (mesHojaCumpl && mesHojaCumpl >= maxMes(DATA.cumplimiento)) {
      DATA.cumplimiento = await SB.todo('equipo_cumplimiento', 'mes,semana,selector,cumplimiento,enviados,restantes,total');
      fuenteCumpl = hoja('cumplimiento');
    }

    DATA.fuente = `altas: ${fuenteAltas} — cumplimiento: ${fuenteCumpl}`;
  }

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

  datosDeHojas()
    .catch(e => console.warn('Se usan los datos de data.js', e))
    .finally(cargarApp);
  renderHoy();
})();
