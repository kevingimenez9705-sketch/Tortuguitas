// sala.js — multijugador de "Elegí tu personaje" (personajes.js): quién está
// conectado (1P, 2P…), qué personaje mira o eligió cada uno y por dónde camina
// en la azotea, más los gestos y las cosas que se tiran.
//
// Usa Supabase Realtime con la clave publicable de supabase.js, sin tablas:
// - Presencia: solo para saber quién está conectado y en qué orden llegó. Se
//   publica UNA vez al conectar ({ id, t }). Supabase corta el canal si un
//   cliente actualiza la presencia más de 5 veces en 30 s
//   (ClientPresenceRateLimitReached), así que nada que cambie seguido va acá.
// - Broadcast: todo lo demás (a quién mira, personaje, parada, posición,
//   gestos, tiros y golpes). El estado se reenvía cada 5 s y cuando llega
//   alguien. Los golpes los decide el que tira (lo que ve él es lo que pasa).
// El número de jugador sale del orden de llegada (el primero es 1P), igual
// en todas las pantallas. Solo viaja la clave del personaje, la parada, la
// posición, el gesto y el tiro: ningún dato personal.
// Con ?sala=local usa BroadcastChannel (pestañas del mismo navegador), para
// probar sin red; con ?sala=no queda en un jugador. Si Supabase no conecta,
// la página sigue igual, en un jugador.
const CANAL = 'tortuguitas-azotea';
const LATIDO_MS = 5000; // reenvío del estado por si alguien se perdió un mensaje
const VIVO_MS = 7000; // modo local: sin noticias de alguien en este tiempo, se fue

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

/**
 * crearSala({ alCambiar(otros), alMover(id, pos), alGesto(id, g), alTiro(id, tiro), alGolpe(id, golpe) })
 * otros: Map id → { id, n, en, mira, personaje, parada, desde } (sin mí).
 */
export function crearSala({ alCambiar = () => {}, alMover = () => {}, alGesto = () => {}, alTiro = () => {}, alGolpe = () => {} } = {}) {
  const modo = new URLSearchParams(location.search).get('sala');
  const yo = { id: nuevoId(), t: Date.now(), n: 1, en: 'seleccion', mira: null, personaje: null, parada: null, desde: 0 };
  const presentes = new Map(); // id → { id, t }: los conectados (sin mí)
  const estados = new Map(); // id → último estado que mandó cada uno
  const otros = new Map();
  let transporte = null;
  let envioPendiente = null;

  const estadoMio = () => ({ id: yo.id, en: yo.en, mira: yo.mira, personaje: yo.personaje, parada: yo.parada, desde: yo.desde });

  // Arma la lista de los otros con su número (orden de llegada: t y después id).
  function recalcular() {
    const orden = [{ id: yo.id, t: yo.t }, ...presentes.values()].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
    otros.clear();
    orden.forEach((p, i) => {
      if (p.id === yo.id) { yo.n = i + 1; return; }
      const e = estados.get(p.id) || {};
      otros.set(p.id, { en: 'seleccion', mira: null, personaje: null, parada: null, desde: 0, ...e, id: p.id, n: i + 1 });
    });
    alCambiar(otros);
  }

  function enviarEstado(ya = false) {
    if (!transporte) return;
    clearTimeout(envioPendiente);
    if (ya) transporte.enviar('estado', estadoMio());
    else envioPendiente = setTimeout(() => transporte.enviar('estado', estadoMio()), 120);
  }

  function recibido(evento, payload) {
    if (!payload || !payload.id || payload.id === yo.id) return;
    if (evento === 'estado') { estados.set(payload.id, payload); recalcular(); }
    else if (evento === 'pos') alMover(payload.id, payload);
    else if (evento === 'gesto') alGesto(payload.id, payload.g);
    else if (evento === 'tiro') alTiro(payload.id, payload);
    else if (evento === 'golpe') alGolpe(payload.id, payload);
  }

  // Cambió la lista de conectados: a los nuevos les mando mi estado.
  function actualizarPresentes(lista) {
    let nuevos = false;
    const ids = new Set();
    for (const p of lista) {
      if (!p || !p.id || p.id === yo.id) continue;
      ids.add(p.id);
      if (!presentes.has(p.id)) nuevos = true;
      presentes.set(p.id, { id: p.id, t: Number(p.t) || 0 });
    }
    for (const id of [...presentes.keys()]) if (!ids.has(id)) { presentes.delete(id); estados.delete(id); }
    if (nuevos) enviarEstado(true);
    recalcular();
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
      actualizarPresentes(Object.values(canal.presenceState()).map((metas) => metas[metas.length - 1]));
    });
    for (const evento of ['estado', 'pos', 'gesto', 'tiro', 'golpe']) {
      canal.on('broadcast', { event: evento }, ({ payload }) => recibido(evento, payload));
    }
    let conectado = false;
    let alguna = false; // ¿llegó a conectar alguna vez?
    canal.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        conectado = alguna = true;
        canal.track({ id: yo.id, t: yo.t }); // la única vez que se toca la presencia (y al reconectar)
        enviarEstado(true);
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
      enviar: (event, payload) => { if (conectado) canal.send({ type: 'broadcast', event, payload }); },
    };
  }

  /* ── Transporte: BroadcastChannel (pestañas del mismo navegador) ── */
  function local() {
    if (!('BroadcastChannel' in window)) return null;
    const bc = new BroadcastChannel(CANAL);
    const vistos = new Map(); // id → { t, visto }: presencia simulada con latidos
    const refrescar = () => actualizarPresentes([...vistos.entries()].map(([id, v]) => ({ id, t: v.t })));
    const hola = () => bc.postMessage({ tipo: 'hola', id: yo.id, t: yo.t });
    bc.onmessage = ({ data }) => {
      if (!data || data.id === yo.id) return;
      if (data.tipo === 'hola') {
        const nuevo = !vistos.has(data.id);
        vistos.set(data.id, { t: data.t, visto: Date.now() });
        if (nuevo) { hola(); refrescar(); }
      } else if (data.tipo === 'chau') {
        vistos.delete(data.id);
        refrescar();
      } else recibido(data.tipo, data.payload);
    };
    setInterval(() => {
      hola();
      const antes = vistos.size;
      for (const [id, v] of vistos) if (Date.now() - v.visto > VIVO_MS) vistos.delete(id);
      if (vistos.size !== antes) refrescar();
    }, 2000);
    addEventListener('pagehide', () => bc.postMessage({ tipo: 'chau', id: yo.id }));
    hola();
    return { enviar: (event, payload) => bc.postMessage({ tipo: event, id: yo.id, payload }) };
  }

  if (modo !== 'no') {
    try {
      transporte = modo === 'local' ? local() : supabase();
    } catch (e) {
      console.warn('Sala multijugador no disponible.', e);
      transporte = null;
    }
  }
  if (transporte) setInterval(() => { if (presentes.size) enviarEstado(true); }, LATIDO_MS);

  return {
    yo,
    otros,
    get activa() { return !!transporte; },
    /** Cambios de estado (en, mira, personaje, parada, desde): van por broadcast si cambió algo. */
    actualizar(cambios) {
      let cambio = false;
      for (const [k, v] of Object.entries(cambios)) if (yo[k] !== v) { yo[k] = v; cambio = true; }
      if (cambio) enviarEstado(cambios.en !== undefined || cambios.personaje !== undefined);
    },
    mover(pos) { transporte?.enviar('pos', { id: yo.id, ...pos }); },
    gesto(g) { transporte?.enviar('gesto', { id: yo.id, g }); },
    tiro(t) { transporte?.enviar('tiro', { id: yo.id, ...t }); },
    /** Le pegué a otro jugador: { a: id del que recibió, tipo }. */
    golpe(g) { transporte?.enviar('golpe', { id: yo.id, ...g }); },
  };
}
