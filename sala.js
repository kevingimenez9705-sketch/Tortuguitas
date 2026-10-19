// sala.js — multijugador de "Elegí tu personaje" (personajes.js): quién está
// conectado (1P, 2P…), qué personaje mira o eligió cada uno y por dónde camina
// en la azotea, más los gestos (saludar, chocar los cinco…).
//
// Usa Supabase Realtime (presencia + broadcast, sin tablas) con la clave
// publicable de supabase.js. Solo viaja la clave del personaje, el número de
// jugador, la posición y el gesto: ningún dato personal.
// Con ?sala=local usa BroadcastChannel (pestañas del mismo navegador), para
// probar sin red; con ?sala=no queda en un jugador. Si Supabase no conecta,
// la página sigue igual que antes, en un jugador.
const CANAL = 'tortuguitas-azotea';
const VIVO_MS = 7000; // modo local: sin noticias de alguien en este tiempo, se fue

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

/**
 * crearSala({ alCambiar(jugadores), alMover(id, pos), alGesto(id, gesto) })
 * jugadores: Map id → { id, n, t, en, mira, personaje, parada, desde } (sin mí).
 */
export function crearSala({ alCambiar = () => {}, alMover = () => {}, alGesto = () => {} } = {}) {
  const modo = new URLSearchParams(location.search).get('sala');
  const yo = { id: nuevoId(), n: null, t: Date.now(), en: 'seleccion', mira: null, personaje: null, parada: null, desde: 0 };
  const otros = new Map();
  let transporte = null;
  let conectado = false;
  let trackPendiente = null;

  // Número de jugador: el más chico libre; si dos toman el mismo, lo conserva
  // el que entró antes a la sala.
  function asignar() {
    const usados = new Set();
    let pisado = false;
    for (const o of otros.values()) {
      if (!o.n) continue;
      usados.add(o.n);
      if (o.n === yo.n && (o.t < yo.t || (o.t === yo.t && o.id < yo.id))) pisado = true;
    }
    if (yo.n && !pisado) return false;
    let n = 1;
    while (usados.has(n)) n++;
    if (n === yo.n) return false;
    yo.n = n;
    return true;
  }

  function aplicar(lista) {
    otros.clear();
    for (const o of lista) if (o && o.id && o.id !== yo.id) otros.set(o.id, o);
    if (asignar()) publicar(true);
    alCambiar(otros);
  }

  // La presencia es más pesada que un broadcast: se manda solo cuando cambia
  // algo, y los cambios rápidos (pasar el cursor por los casilleros) se juntan.
  function publicar(ya = false) {
    if (!transporte) return;
    clearTimeout(trackPendiente);
    if (ya) transporte.estado({ ...yo });
    else trackPendiente = setTimeout(() => transporte.estado({ ...yo }), 150);
  }

  /* ── Transporte: Supabase Realtime ── */
  function supabase() {
    const lib = window.supabase;
    const SB = window.SB;
    if (!lib || !lib.createClient || !SB || !SB.BASE || !SB.KEY) return null;
    const cliente = lib.createClient(SB.BASE, SB.KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
    const canal = cliente.channel(CANAL, { config: { presence: { key: yo.id }, broadcast: { self: false } } });
    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState();
      aplicar(Object.values(estado).map((metas) => metas[metas.length - 1]));
    });
    canal.on('broadcast', { event: 'pos' }, ({ payload }) => payload && alMover(payload.id, payload));
    canal.on('broadcast', { event: 'gesto' }, ({ payload }) => payload && alGesto(payload.id, payload.g));
    let alguna = false; // ¿llegó a conectar alguna vez?
    canal.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        conectado = alguna = true;
        canal.track({ ...yo });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        conectado = false; // si ya había conectado, realtime-js reintenta solo
      }
    });
    // Red que bloquea el websocket (firewall): si en 20 s no conectó, se deja
    // de reintentar y la página sigue en un jugador.
    setTimeout(() => {
      if (alguna) return;
      console.warn('Sala multijugador no disponible: no se pudo conectar a Supabase Realtime.');
      cliente.removeAllChannels();
      cliente.realtime.disconnect();
    }, 20000);
    return {
      estado: (e) => { if (conectado) canal.track(e); },
      enviar: (event, payload) => { if (conectado) canal.send({ type: 'broadcast', event, payload }); },
    };
  }

  /* ── Transporte: BroadcastChannel (pestañas del mismo navegador) ── */
  function local() {
    if (!('BroadcastChannel' in window)) return null;
    const bc = new BroadcastChannel(CANAL);
    const vistos = new Map(); // id → { estado, visto }
    const refrescar = () => aplicar([...vistos.values()].map((v) => v.estado));
    bc.onmessage = ({ data }) => {
      if (!data || data.id === yo.id) return;
      if (data.tipo === 'estado') {
        const nuevo = !vistos.has(data.id);
        vistos.set(data.id, { estado: data.estado, visto: Date.now() });
        if (nuevo) bc.postMessage({ tipo: 'estado', id: yo.id, estado: { ...yo } }); // que el nuevo me conozca
        refrescar();
      } else if (data.tipo === 'chau') {
        vistos.delete(data.id);
        refrescar();
      } else if (data.tipo === 'pos') alMover(data.id, data.payload);
      else if (data.tipo === 'gesto') alGesto(data.id, data.payload.g);
    };
    setInterval(() => {
      bc.postMessage({ tipo: 'estado', id: yo.id, estado: { ...yo } });
      const antes = vistos.size;
      for (const [id, v] of vistos) if (Date.now() - v.visto > VIVO_MS) vistos.delete(id);
      if (vistos.size !== antes) refrescar();
    }, 2000);
    addEventListener('pagehide', () => bc.postMessage({ tipo: 'chau', id: yo.id }));
    conectado = true;
    bc.postMessage({ tipo: 'estado', id: yo.id, estado: { ...yo } });
    setTimeout(() => { if (asignar()) publicar(true); alCambiar(otros); }, 400); // solo en la sala
    return {
      estado: (e) => bc.postMessage({ tipo: 'estado', id: yo.id, estado: e }),
      enviar: (event, payload) => bc.postMessage({ tipo: event, id: yo.id, payload }),
    };
  }

  if (modo !== 'no') {
    try {
      transporte = modo === 'local' ? local() : supabase();
    } catch (e) {
      console.warn('Sala multijugador no disponible.', e);
      transporte = null;
    }
  }

  return {
    yo,
    otros,
    get activa() { return !!transporte; },
    /** Cambios de estado (en, mira, personaje, parada); se publican si cambió algo. */
    actualizar(cambios) {
      let cambio = false;
      for (const [k, v] of Object.entries(cambios)) if (yo[k] !== v) { yo[k] = v; cambio = true; }
      if (cambio) publicar(cambios.en !== undefined || cambios.personaje !== undefined);
    },
    mover(pos) { transporte?.enviar('pos', { id: yo.id, ...pos }); },
    gesto(g) { transporte?.enviar('gesto', { id: yo.id, g }); },
  };
}
