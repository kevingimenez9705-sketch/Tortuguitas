// oficina-viva.js — la Oficina digital "en vivo": cada agente tiene su
// escritorio, camina por la oficina, toma café, visita a sus compañeros y
// muestra en un globito lo último que hizo según la bitácora real (Supabase).
// Abajo, el chat con el Coordinador: cuando le escribís, el Coordinador se
// va a la mesa de reunión a pensar y los agentes que lo ayudaron se acercan.
(() => {
  const CHAT_URL = 'https://kevin9705.app.n8n.cloud/webhook/oficina-chat';
  const ZONA = 'America/Argentina/Buenos_Aires';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const entre = (a, b) => a + Math.random() * (b - a);

  // Escritorio (x, y en % de la escena) y horario de cada agente.
  // horas: [inicio, fin) en hora de Buenos Aires; dias: 1 = lunes … 7 = domingo.
  const AGENTES = [
    { id: 'coordinador', nombre: 'Coordinador', emoji: '🧭', color: '#0f1c3f', x: 50, y: 40, dias: [1, 2, 3, 4, 5], horas: [8, 20],
      frases: ['Reviso cómo viene cada uno', 'Armo el parte del día', '¿Alguien necesita algo?'] },
    { id: 'screening', nombre: 'Screening', emoji: '🔎', color: '#7c5cf0', x: 15, y: 50, dias: [1, 2, 3, 4, 5, 6], horas: [8, 21],
      frases: ['Leyendo postulaciones nuevas', 'Marcando duplicados', 'Este perfil está muy bien'] },
    { id: 'analista', nombre: 'Analista', emoji: '📊', color: '#4c7cf0', x: 85, y: 50, dias: [1, 2, 3, 4, 5], horas: [8, 20],
      frases: ['Cruzando números por zona', 'Comparando contra la semana pasada', 'Este gráfico sube 📈'] },
    { id: 'vacantes', nombre: 'Vacantes', emoji: '📌', color: '#e05263', x: 15, y: 86, dias: [1, 2, 3, 4, 5], horas: [8, 20],
      frases: ['Repasando búsquedas abiertas', '¿Qué local está trabado?', 'Busco candidatos de la zona'] },
    { id: 'agenda', nombre: 'Agenda', emoji: '📅', color: '#3fbf7f', x: 85, y: 86, dias: [1, 2, 3, 4, 5], horas: [8, 20],
      frases: ['Ordenando las entrevistas', 'Busco un hueco libre', 'Recordatorio listo'] },
    { id: 'onboarding', nombre: 'Onboarding', emoji: '🤝', color: '#f0a94c', x: 50, y: 92, dias: [1, 2, 3, 4, 5], horas: [8, 20],
      frases: ['Preparando bienvenidas', 'Chequeo legajos', '¡Mañana entra alguien nuevo!'] },
  ];
  const LUGARES = {
    cafe: { x: 93, y: 30, frases: ['☕ Un cafecito', '☕ Recargando energía'] },
    planta: { x: 7, y: 30, frases: ['🪴 Riego la planta', '🪴 Un poco de verde'] },
    pizarra: { x: 50, y: 30, frases: ['📝 Anoto en la pizarra', '📝 Repaso los pendientes'] },
    reunion: { x: 50, y: 66 },
  };
  const ACCION_EMOJI = { ok: '✅', error: '⚠️', pendiente: '⏳' };

  const escena = document.getElementById('ofiEscena');
  if (!escena) return;
  const bots = new Map();
  let ocupadoChat = false;

  function horaBA() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23', weekday: 'short', minute: '2-digit' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const dia = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
    return { dia, hora: Number(p.hour), minuto: Number(p.minute) };
  }
  const enHorario = (a) => { const t = horaBA(); return a.dias.includes(t.dia) && t.hora >= a.horas[0] && t.hora < a.horas[1]; };

  // ---------- Armado de la escena ----------
  function armarEscena() {
    escena.innerHTML = `
      <div class="ov-pared">
        <div class="ov-ventana" aria-hidden="true"><span></span><span></span></div>
        <div class="ov-pizarra" aria-hidden="true"><b>Hoy</b><span id="ovPizarra">…</span><span id="ovNotas"></span></div>
        <div class="ov-reloj" aria-hidden="true" id="ovReloj">--:--</div>
      </div>
      <div class="ov-cafe" aria-hidden="true" style="left:${LUGARES.cafe.x}%;top:${LUGARES.cafe.y}%">☕</div>
      <div class="ov-planta" aria-hidden="true" style="left:${LUGARES.planta.x}%;top:${LUGARES.planta.y}%">🪴</div>
      <div class="ov-mesa" aria-hidden="true" style="left:${LUGARES.reunion.x}%;top:${LUGARES.reunion.y}%"></div>`;
    AGENTES.forEach(a => {
      const desk = document.createElement('div');
      desk.className = 'ov-escritorio';
      desk.style.left = a.x + '%';
      desk.style.top = a.y + '%';
      desk.innerHTML = '<span class="ov-monitor">🖥️</span>';
      escena.appendChild(desk);

      const el = document.createElement('div');
      el.className = 'ov-bot';
      el.style.setProperty('--c', a.color);
      el.style.left = a.x + '%';
      el.style.top = (a.y - 4) + '%';
      el.innerHTML = `
        <div class="ov-globo" role="status"></div>
        <div class="ov-cuerpo"><span class="ov-cara">${a.emoji}</span><i class="ov-pata"></i><i class="ov-pata"></i></div>
        <div class="ov-sombra"></div>
        <div class="ov-nombre">${esc(a.nombre)}</div>`;
      escena.appendChild(el);
      bots.set(a.id, { a, el, desk, globo: el.querySelector('.ov-globo'), ultima: null, ocupado: false, reservas: 0, timer: null });
    });
  }

  // ---------- Movimiento y globitos ----------
  function decir(b, texto, ms = 4500) {
    clearTimeout(b.globoTimer);
    b.globo.textContent = texto;
    b.globo.classList.add('on');
    b.globoTimer = setTimeout(() => b.globo.classList.remove('on'), ms);
  }
  function irA(b, x, y) {
    return new Promise(res => {
      const dur = reduce ? 0 : 1800 + Math.random() * 900;
      b.el.style.transitionDuration = dur + 'ms';
      b.el.classList.toggle('mira-izq', parseFloat(b.el.style.left) > x);
      b.el.classList.add('caminando');
      b.desk.classList.remove('activo');
      b.el.style.left = x + '%';
      b.el.style.top = (y - 4) + '%';
      setTimeout(() => { b.el.classList.remove('caminando'); res(); }, dur);
    });
  }
  const volver = (b) => irA(b, b.a.x, b.a.y).then(() => b.desk.classList.toggle('activo', enHorario(b.a)));
  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  // Un "turno" de cada agente: trabajar, ir por café, visitar a un compañero…
  // "reservas": el chat lo llamó a la mesa de reunión; el turno no lo mueve.
  async function turno(b) {
    if (b.ocupado || b.reservas || ocupadoChat) return programar(b);
    b.ocupado = true;
    try {
      if (!enHorario(b.a)) {
        b.desk.classList.remove('activo');
        b.el.classList.add('durmiendo');
        decir(b, '💤 Fuera de horario', 3500);
        return;
      }
      b.el.classList.remove('durmiendo');
      const r = Math.random();
      if (r < 0.45) {
        b.desk.classList.add('activo');
        decir(b, b.ultima && Math.random() < 0.6 ? b.ultima : azar(b.a.frases));
      } else if (r < 0.7) {
        const lugar = azar(['cafe', 'planta', 'pizarra']);
        await irA(b, LUGARES[lugar].x + entre(-3, 3), LUGARES[lugar].y + entre(2, 6));
        decir(b, azar(LUGARES[lugar].frases), 3200);
        await espera(3600);
        if (!b.reservas) await volver(b);
      } else {
        const otro = azar([...bots.values()].filter(o => o !== b && !o.ocupado && !o.reservas));
        if (otro) {
          await irA(b, otro.a.x + (otro.a.x > 50 ? -9 : 9), otro.a.y);
          decir(b, azar(['¿Cómo venís?', '¿Me pasás los números?', 'Tengo algo para vos', '¿Lo vemos juntos?']), 3000);
          setTimeout(() => decir(otro, azar(['¡Dale!', 'Ya te lo paso', 'Viene bien 👌', 'Lo miro y te aviso']), 2600), 1300);
          await espera(3400);
          if (!b.reservas) await volver(b);
        }
      }
    } finally {
      b.ocupado = false;
      if (!b.reservas) programar(b);
    }
  }
  function programar(b) {
    clearTimeout(b.timer);
    b.timer = setTimeout(() => turno(b), entre(5000, 11000));
  }

  // ---------- Bitácora real ----------
  let ultimoId = 0;
  async function leerBitacora(primeraVez) {
    try {
      const acciones = await SB.pedir('rpc/oficina_ultimas_acciones', { limite: 30 });
      const porAgente = new Map();
      acciones.forEach(x => { if (!porAgente.has(x.agente_id)) porAgente.set(x.agente_id, x); });
      porAgente.forEach((x, id) => {
        const b = bots.get(id);
        if (b) b.ultima = `${ACCION_EMOJI[x.estado] || '✅'} ${x.accion}${x.cantidad > 1 ? ' · ' + x.cantidad : ''} (${SB.hace(x.created_at)})`;
      });
      const nuevas = acciones.filter(x => x.id > ultimoId).reverse();
      if (!primeraVez) nuevas.forEach(x => {
        const b = bots.get(x.agente_id);
        if (!b) return;
        b.el.classList.remove('festeja');
        void b.el.offsetWidth;
        b.el.classList.add('festeja');
        decir(b, `✨ ${x.accion}${x.cantidad > 1 ? ' · ' + x.cantidad : ''}`, 6000);
      });
      if (acciones.length) ultimoId = Math.max(ultimoId, ...acciones.map(x => x.id));
      const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
      const deHoy = acciones.filter(x => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(x.created_at)) === hoy);
      const pizarra = document.getElementById('ovPizarra');
      if (pizarra) pizarra.textContent = deHoy.length ? `${deHoy.length} acciones · ${deHoy.reduce((t, x) => t + (x.cantidad || 0), 0)} ítems` : 'Sin acciones todavía';
    } catch (e) {
      console.warn('No se pudo leer la bitácora', e);
    }
    leerNotas();
  }
  // Comentarios del equipo (memoria de 7 días): solo la cantidad, nunca el texto.
  async function leerNotas() {
    try {
      const [n] = await SB.pedir('rpc/oficina_comentarios_cantidad', {});
      const el = document.getElementById('ovNotas');
      if (el && n) el.textContent = n.semana ? `📝 ${n.semana} nota${n.semana === 1 ? '' : 's'} esta semana` : '📝 Sin notas esta semana';
    } catch (e) {
      console.warn('No se pudieron leer las notas', e);
    }
  }
  function reloj() {
    const el = document.getElementById('ovReloj');
    if (el) el.textContent = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  }

  // ---------- Chat con el Coordinador ----------
  const CLAVE_CODIGO = 'oficina-codigo';
  const sesion = (() => {
    try {
      let s = sessionStorage.getItem('oficina-sesion');
      if (!s) { s = 'web-' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('oficina-sesion', s); }
      return s;
    } catch (e) { return 'web-' + Math.random().toString(36).slice(2, 10); }
  })();
  const leerCodigo = () => { try { return localStorage.getItem(CLAVE_CODIGO) || ''; } catch (e) { return ''; } };
  const guardarCodigo = (c) => { try { c ? localStorage.setItem(CLAVE_CODIGO, c) : localStorage.removeItem(CLAVE_CODIGO); } catch (e) {} };
  // El código queda "confirmado" después de la primera respuesta buena: si
  // antes de eso falla la conexión, puede ser el código (n8n no responde nada).
  const CLAVE_OK = 'oficina-codigo-ok';
  const codigoConfirmado = () => { try { return localStorage.getItem(CLAVE_OK) === '1'; } catch (e) { return false; } };
  const confirmarCodigo = (ok) => { try { ok ? localStorage.setItem(CLAVE_OK, '1') : localStorage.removeItem(CLAVE_OK); } catch (e) {} };

  const lista = document.getElementById('ofiChatLista');
  const form = document.getElementById('ofiChatForm');
  const input = document.getElementById('ofiChatInput');
  const boton = document.getElementById('ofiChatEnviar');
  const formCodigo = document.getElementById('ofiCodigoForm');
  const inputCodigo = document.getElementById('ofiCodigoInput');

  function mensaje(quien, texto, extra) {
    const li = document.createElement('li');
    li.className = 'ov-msg ov-msg--' + quien;
    li.innerHTML = (quien === 'bot' ? '<span class="ov-msg-avatar" aria-hidden="true">🧭</span>' : '') +
      `<div class="ov-msg-texto">${esc(texto).replace(/\n/g, '<br>')}${extra ? `<div class="ov-msg-extra">${extra}</div>` : ''}</div>`;
    lista.appendChild(li);
    lista.scrollTop = lista.scrollHeight;
    return li;
  }
  function mostrarCodigo(mostrar) {
    formCodigo.hidden = !mostrar;
    form.hidden = mostrar;
    document.querySelectorAll('.ov-sugerencia').forEach(b => { b.disabled = mostrar; });
    (mostrar ? inputCodigo : input).focus({ preventScroll: true });
  }

  async function reunion(ids) {
    const coord = bots.get('coordinador');
    const ayudantes = ids.filter(id => id !== 'coordinador').map(id => bots.get(id)).filter(Boolean);
    const lugares = [[-12, 4], [12, 4], [-18, -2], [18, -2], [0, 9]];
    await Promise.all(ayudantes.map((b, i) => {
      reservar(b);
      const [dx, dy] = lugares[i % lugares.length];
      return irA(b, LUGARES.reunion.x + dx, LUGARES.reunion.y + dy).then(() => decir(b, azar(['¡Acá tenés!', 'Te paso lo mío', 'Listo 👌', 'Datos frescos']), 3500));
    }));
    decir(coord, '💡 ¡Ya está!', 3000);
    await espera(3800);
    await Promise.all([coord, ...ayudantes].map(liberar));
  }

  // Anotó un comentario: va a la pizarra a escribirlo.
  async function anotar(coord) {
    await irA(coord, LUGARES.pizarra.x, LUGARES.pizarra.y + 4);
    decir(coord, '📝 ¡Anotado por 7 días!', 3500);
    leerNotas();
    await espera(3800);
    liberar(coord);
  }

  // Lo saca de su rutina mientras dura la consulta; liberar lo devuelve a su
  // escritorio (sin trabar el chat) cuando ya no lo necesita ninguna consulta.
  const reservar = (b) => { b.reservas++; clearTimeout(b.timer); };
  const liberar = (b) => {
    b.reservas = Math.max(0, b.reservas - 1);
    if (b.reservas) return Promise.resolve();
    return volver(b).then(() => { if (!b.reservas) programar(b); });
  };

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || ocupadoChat) return;
    const codigo = leerCodigo();
    if (!codigo) return mostrarCodigo(true);
    ocupadoChat = true;
    boton.disabled = true;
    mensaje('yo', texto);
    input.value = '';
    const pensando = mensaje('bot', 'Pensando…');
    pensando.classList.add('pensando');
    const coord = bots.get('coordinador');
    reservar(coord);
    irA(coord, LUGARES.reunion.x, LUGARES.reunion.y).then(() => { if (ocupadoChat) decir(coord, '💭 Pensando…', 20000); });
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, sesion, mensaje: texto }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cuerpo = (await res.text()).trim();
      pensando.remove();
      if (!cuerpo) {
        guardarCodigo('');
        confirmarCodigo(false);
        mensaje('bot', 'Ese código no es el del equipo. Pedíselo a Kevin y probá de nuevo.');
        mostrarCodigo(true);
        decir(coord, '🔒 Necesito el código', 3000);
        liberar(coord);
        return;
      }
      const r = JSON.parse(cuerpo);
      confirmarCodigo(true);
      const ids = Array.isArray(r.agentes) ? r.agentes : ['coordinador'];
      const quienes = ids.filter(id => id !== 'coordinador').map(id => bots.get(id)).filter(Boolean)
        .map(b => `${b.a.emoji} ${esc(b.a.nombre)}`).join(' · ');
      mensaje('bot', r.respuesta || 'No tengo respuesta para eso.', quienes ? `Me ayudaron: ${quienes}` : '');
      if (r.anoto) anotar(coord); else reunion(ids);
    } catch (e) {
      console.warn('Chat de la oficina', e);
      pensando.remove();
      if (codigoConfirmado()) {
        mensaje('bot', 'No pude conectarme con la oficina. Revisá tu conexión y probá de nuevo.');
      } else {
        guardarCodigo('');
        mensaje('bot', 'No pude conectarme con la oficina. Revisá el código del equipo o tu conexión y probá de nuevo.');
        mostrarCodigo(true);
      }
      liberar(coord);
    } finally {
      ocupadoChat = false;
      boton.disabled = false;
    }
  }

  // ---------- Arranque ----------
  armarEscena();
  reloj();
  setInterval(reloj, 30000);
  bots.forEach(b => { b.desk.classList.toggle('activo', enHorario(b.a)); setTimeout(() => turno(b), entre(400, 4000)); });
  leerBitacora(true);
  setInterval(() => leerBitacora(false), 30000);

  if (lista && form) {
    mensaje('bot', '¡Hola! Soy el Coordinador de la oficina. Preguntame por postulaciones, búsquedas, entrevistas, ingresos o qué hizo cada agente. También anoto comentarios del equipo para los agentes: los recordamos 7 días.');
    form.addEventListener('submit', e => { e.preventDefault(); enviar(input.value); });
    formCodigo.addEventListener('submit', e => {
      e.preventDefault();
      const c = inputCodigo.value.trim().toUpperCase();
      if (!c) return;
      guardarCodigo(c);
      confirmarCodigo(false);
      inputCodigo.value = '';
      mostrarCodigo(false);
    });
    document.querySelectorAll('.ov-sugerencia').forEach(b => b.addEventListener('click', () => {
      // "Anotar un comentario" solo completa el principio de la frase.
      if (b.dataset.rellenar) {
        input.value = b.dataset.rellenar;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        return;
      }
      enviar(b.dataset.q || b.textContent);
    }));
    mostrarCodigo(!leerCodigo());
  }
})();
