// fuentes.js — "De dónde lee la Oficina": cada fuente de datos que usan los
// agentes y el chat (lo que ya lee, lo que falta conectar) y el mapa de todas
// las carpetas y trabajos del equipo, con su link directo.
//
// Fuente: rpc/oficina_mapa en Supabase (clave publicable, sin datos
// personales). Devuelve { fuentes, trabajos, generado }:
//   - fuentes: tabla oficina_fuentes + cuántas filas tiene la copia y cuándo
//     se actualizó por última vez (equipo_sync, bitácora, postulaciones...).
//   - trabajos: tabla trabajos (planillas, sitios, flujos de n8n, bases) con
//     la marca "oficina": lee / falta / no_conviene / null.
// Para sumar o sacar una fuente se edita la tabla oficina_fuentes; esta
// sección se actualiza sola.
(() => {
  const ZONA = 'America/Argentina/Buenos_Aires';
  const seccion = document.getElementById('fuentesSeccion');
  if (!seccion || !window.SB) return;

  const AGENTES = {
    coordinador: { emoji: '🧭', nombre: 'Coordinador' },
    analista: { emoji: '📊', nombre: 'Analista' },
    screening: { emoji: '🔎', nombre: 'Screening' },
    vacantes: { emoji: '📌', nombre: 'Vacantes' },
    agenda: { emoji: '📅', nombre: 'Agenda' },
    onboarding: { emoji: '🤝', nombre: 'Onboarding' },
  };
  const ICONO = { Planilla: '📗', Supabase: '🗄️', Google: '📅', Drive: '📁', Formulario: '📝', Web: '🌐' };
  // Cada cuántas horas se espera que se renueve cada fuente (semáforo).
  const CADA_HORAS = {
    solicitudes: 2, tareas: 2, postulaciones: 6, screening: 6, bitacora: 24, memoria: 24 * 7,
    confirmados: 2, 'agenda-salas': 2, encuesta: 2, examenes: 2, uniformes: 2, evaluaciones: 2,
  };
  const ESTADO_TXT = { lee: 'La Oficina la lee', falta: 'Falta conectar', no_conviene: 'No conviene leerla' };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hora = (d) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);

  let datos = null;
  const filtro = { q: '', area: '', f: '' };

  function semaforo(f) {
    if (!f.ultima) return '';
    const horas = (Date.now() - new Date(f.ultima).getTime()) / 3600000;
    const limite = CADA_HORAS[f.id] || 24 * 30;
    if (horas <= limite) return '';
    return horas <= limite * 4 ? ' ojo' : ' mal';
  }

  function link(url, texto) {
    if (!url) return '<span class="fu-link sd">Link S/D</span>';
    return `<a class="fu-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(texto || 'Abrir')} ↗</a>`;
  }

  function tarjetaFuente(f, porId) {
    const agentes = (f.agentes || []).filter((a) => AGENTES[a]);
    const chips = agentes.map((a) => `<span class="tab-chip">${AGENTES[a].emoji} ${esc(AGENTES[a].nombre)}</span>`).join('');
    let fresco = '';
    if (f.estado === 'lee') {
      fresco = f.ultima
        ? `<div class="fu-fresco"><span class="fu-dot${semaforo(f)}" aria-hidden="true"></span>${f.filas != null ? `${fmt(f.filas)} filas · ` : ''}actualizado ${esc(SB.hace(f.ultima))}</div>`
        : '<div class="fu-fresco"><span class="fu-dot" aria-hidden="true"></span>La lee directo en cada consulta</div>';
    }
    const extra = (f.trabajos || []).map((id) => porId[id]).filter((t) => t && t.link && t.link !== f.link)
      .slice(0, 2).map((t) => link(t.link, t.nombre)).join('');
    const quien = AGENTES[agentes[0]] || AGENTES.coordinador;
    const boton = f.estado === 'lee'
      ? `<button class="tab-btn" type="button" data-pregunta="${esc(`¿Qué datos tenés de «${f.nombre}»? Resumime lo último.`)}">Preguntale a ${esc(quien.nombre)} →</button>`
      : '';
    return `<article class="fu-item is-${esc(f.estado)}">
      <header class="tab-head">
        <span class="tab-emoji" aria-hidden="true">${ICONO[f.tipo] || '📄'}</span>
        <div><h3>${esc(f.nombre)}</h3><p class="fu-donde">${esc(f.donde || 'S/D')}</p></div>
      </header>
      ${f.estado !== 'lee' ? `<span class="fu-badge ${esc(f.estado)}">${ESTADO_TXT[f.estado] || ''}</span>` : ''}
      ${f.como_llega ? `<p class="fu-como">${esc(f.como_llega)}</p>` : ''}
      ${chips ? `<div class="tab-chips">${chips}</div>` : ''}
      ${fresco}
      ${f.nota ? `<p class="fu-nota">${esc(f.nota)}</p>` : ''}
      <div class="fu-links">${link(f.link, 'Abrir')}${extra}</div>
      ${boton}
    </article>`;
  }

  function render() {
    const fuentes = datos.fuentes || [];
    const trabajos = datos.trabajos || [];
    const porId = {};
    trabajos.forEach((t) => { porId[t.id] = t; });
    const lee = fuentes.filter((f) => f.estado === 'lee');
    const resto = fuentes.filter((f) => f.estado !== 'lee');
    const atrasadas = lee.filter((f) => semaforo(f) === ' mal').length;

    $('fuResumen').innerHTML = [
      `<span class="tab-chip">✅ Lee <b>${fmt(lee.length)}</b></span>`,
      `<span class="tab-chip${resto.length ? ' is-alerta' : ''}">🔌 Falta conectar <b>${fmt(resto.filter((f) => f.estado === 'falta').length)}</b></span>`,
      atrasadas ? `<span class="tab-chip is-alerta">⏱️ Atrasadas <b>${fmt(atrasadas)}</b></span>` : '',
      `<span class="tab-chip">📁 Carpetas y trabajos <b>${fmt(trabajos.length)}</b></span>`,
    ].join('');
    seccion.querySelector('[data-n="lee"]').textContent = fmt(lee.length);
    seccion.querySelector('[data-n="falta"]').textContent = fmt(resto.length);
    seccion.querySelector('[data-n="carpetas"]').textContent = fmt(trabajos.length);

    $('fuLee').innerHTML = lee.length
      ? lee.map((f) => tarjetaFuente(f, porId)).join('')
      : '<p class="tab-vacio">Todavía no hay fuentes cargadas.</p>';
    $('fuFalta').innerHTML = resto.length
      ? resto.map((f) => tarjetaFuente(f, porId)).join('')
      : '<p class="tab-vacio">La Oficina ya lee todo lo que está cargado. 🎉</p>';

    const areas = [...new Set(trabajos.map((t) => t.area).filter(Boolean))];
    $('fuArea').innerHTML = '<option value="">Todas las áreas</option>' +
      areas.map((a) => `<option${a === filtro.area ? ' selected' : ''}>${esc(a)}</option>`).join('');
    renderCarpetas();
  }

  function renderCarpetas() {
    const trabajos = (datos && datos.trabajos) || [];
    const partes = norm(filtro.q).split(/\s+/).filter(Boolean);
    const vis = trabajos.filter((t) => {
      if (filtro.area && t.area !== filtro.area) return false;
      if (filtro.f === 'lee' && t.oficina !== 'lee') return false;
      if (filtro.f === 'no' && t.oficina === 'lee') return false;
      const texto = norm([t.nombre, t.para_que, t.herramientas, t.area, t.nota].join(' '));
      return partes.every((p) => texto.includes(p));
    });
    if (!vis.length) { $('fuCarpetas').innerHTML = '<p class="tab-vacio">No hay carpetas con ese filtro.</p>'; return; }
    const grupos = new Map();
    vis.forEach((t) => { if (!grupos.has(t.area)) grupos.set(t.area, []); grupos.get(t.area).push(t); });
    $('fuCarpetas').innerHTML = [...grupos].map(([area, lista]) => `<div class="fu-grupo">
      <h4>${esc(area || 'S/D')} · ${fmt(lista.length)}</h4>
      ${lista.map((t) => {
        const links = Array.isArray(t.links) && t.links.length ? t.links.map((l) => link(l.u, l.t)).join('') : link(t.link, 'Abrir');
        const badge = t.oficina
          ? `<span class="fu-badge ${esc(t.oficina)}">${ESTADO_TXT[t.oficina]}</span>`
          : '<span class="fu-badge">Sin datos para la Oficina</span>';
        return `<div class="fu-fila">
          <div class="fu-fila-info">
            <div class="fu-fila-t"><strong>${esc(t.nombre)}</strong>${badge}</div>
            <div class="fu-fila-d">${esc(t.para_que || '')}${t.herramientas ? ` · ${esc(t.herramientas)}` : ''}${t.estado && t.estado !== 'Activo' ? ` · ${esc(t.estado)}` : ''}${t.nota ? ` · ${esc(t.nota)}` : ''}</div>
          </div>
          <div class="fu-links">${links}</div>
        </div>`;
      }).join('')}
    </div>`).join('');
  }

  async function cargar() {
    const btn = $('fuRecargar');
    btn.disabled = true;
    $('fuCuando').textContent = 'Actualizando…';
    try {
      datos = (await SB.pedir('rpc/oficina_mapa', {}, 12000)) || { fuentes: [], trabajos: [] };
      render();
      $('fuCuando').textContent = `Actualizado ${hora(new Date(datos.generado || Date.now()))}`;
    } catch (e) {
      console.warn('Mapa de fuentes sin datos', e);
      if (!datos) $('fuLee').innerHTML = '<p class="tab-vacio">No se pudo leer el mapa de fuentes (S/D). Tocá «Actualizar» para reintentar.</p>';
      $('fuCuando').textContent = 'Sin conexión';
    } finally {
      btn.disabled = false;
    }
  }

  function verTab(id) {
    ['lee', 'falta', 'carpetas'].forEach((k) => {
      $('fuT-' + k).setAttribute('aria-selected', String(k === id));
      $('fuT-' + k).tabIndex = k === id ? 0 : -1;
      $('fuP-' + k).hidden = k !== id;
    });
  }

  ['lee', 'falta', 'carpetas'].forEach((k) => $('fuT-' + k).addEventListener('click', () => verTab(k)));
  seccion.querySelector('.fu-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...seccion.querySelectorAll('.fu-tab')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const sig = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    sig.focus();
    sig.click();
  });
  $('fuRecargar').addEventListener('click', cargar);
  $('fuBuscar').addEventListener('input', (e) => { filtro.q = e.target.value; renderCarpetas(); });
  $('fuArea').addEventListener('change', (e) => { filtro.area = e.target.value; renderCarpetas(); });
  seccion.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    filtro.f = b.dataset.f;
    seccion.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderCarpetas();
  }));
  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pregunta]');
    if (b) document.dispatchEvent(new CustomEvent('oficina:preguntar', { detail: { texto: b.dataset.pregunta } }));
  });

  cargar();
  setInterval(() => { if (!document.hidden) cargar(); }, 5 * 60 * 1000);
})();
