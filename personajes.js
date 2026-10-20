// personajes.js — "Elegí tu personaje" (personajes.html): selección estilo
// arcade del equipo y, al elegir, la azotea 3D de esa persona (three.js, sin
// build, el mismo vendor/three.min.js de la oficina).
//
// 1. Selección: los retratos pixel art abajo y, arriba, la tortuga de cada uno (la misma
//    imagen de index.html) con sus stats de competencias (evaluación real). Se
//    elige con flechas + Enter, el mouse o el dedo.
// 2. Aparición: el retrato vuela al centro y de ahí sale el personaje 3D: Kevin
//    es Splinter, cada tortuga lleva su bandana y su arma, Albana es April y
//    "Otros" un fantasma ninja.
// 3. Azotea: el personaje se mueve con flechas/WASD, clic o toque en el piso
//    (joystick en celulares). Hay dos paradas: la terminal, donde la cámara
//    queda detrás del personaje frente a una consola y la pantalla
//    holográfica muestra todos los resultados (altas, presentismo,
//    cumplimiento, cada marca y ranking, navegables con ← →), y la guarida,
//    que lleva al dashboard completo. Lo demás de la azotea se puede tocar
//    (clic o tecla E): hace algo y dice algo. Los demás integrantes esperan en la azotea: se
//    dan vuelta y saludan cuando te acercás, y tocándolos se juega con ellos.
//
// 4. Multijugador (sala.js): los que abren la página a la vez entran a la
//    misma sala. El primero es 1P, el segundo 2P… En la selección se ve el
//    cursor del otro y los personajes que ya se están jugando no se pueden
//    elegir. En la azotea el otro aparece con su personaje (en lugar del que
//    esperaba), camina en vivo y se pueden mandar gestos (teclas 1 a 4).
// 5. Tirar cosas (teclas 5 a 7, espacio = pizza): 🍕 pizza, 🍔 hamburguesa y
//    💦 globo de agua. Apuntan solas al más cercano que tengas adelante (otro
//    jugador o alguien que espera); al que le pega se tambalea y, si era
//    alguien que espera, a veces te la devuelve. Entre jugadores decide el
//    que tira: si en su pantalla le pegó, se lo avisa a la sala.
// 6. Cementerio (cementerio.js, botón "Bajar al cementerio"): otra escena con
//    el mismo personaje. De las tumbas salen los fantasmas de los que ya no
//    están y te persiguen; hay que aguantar 60 s o te quedás con ellos. Los
//    otros jugadores ven el aviso y no te ven en la azotea mientras tanto.
//
// Los números salen de data.js con los mismos criterios que app.js:
// presentismo sin las altas sin dato de ingreso, cumplimiento = enviados /
// vacantes (tope 100%), y si el período no tiene cumplimiento cargado se usan
// todos los meses disponibles. El ranking compara presentismo y cumplimiento
// (nunca volumen de altas), igual que el resumen del año.
// Sin WebGL, o si three.js no carga, las paradas se muestran como tarjetas.
import { crearSala } from './sala.js?v=20261020b';
import { armarCementerio, DURACION as DURACION_CEM, BORDE as BORDE_CEM } from './cementerio.js?v=20261020';

const THREE_URL = './vendor/three.min.js?v=0.186.1';
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/* ───────────────────────── Equipo ───────────────────────── */

// Mismos integrantes, colores, imágenes y textos que index.html y MEMBER_MAP de
// app.js. selectores: null = todo el equipo (panel de Kevin).
// retrato: ilustración pixel art estilo Metal Slug para la selección;
// retratoElegido (opcional): la cara que pone al quedar elegido (con "1P").
const EQUIPO = [
  { key: 'kevin', label: 'Kevin García', puesto: 'Coordinador de Selección', frase: 'Autómata y estratégico', color: '#5c2430', retrato: 'images/retro-kevin.png', retratoElegido: 'images/retro-kevin-elegido.png', arte: 'images/tortuga-kevin.jpg', personaje: 'rata', selectores: null, dashboard: 'dashboard.html' },
  { key: 'agustin', label: 'Agustín Márquez', puesto: 'Selector', frase: 'El innovador', color: '#5b2d78', retrato: 'images/retro-agustin.png', retratoElegido: 'images/retro-agustin-elegido.png', arte: 'images/tortuga-agustin.jpg', personaje: 'tortuga', arma: 'bo', selectores: ['Agustin'] },
  { key: 'agustina', label: 'Agustina Castillo', puesto: 'Selector Jr', frase: 'La creativa', color: '#cc2f2f', retrato: 'images/retro-agustina.png', retratoElegido: 'images/retro-agustina-elegido.png', arte: 'images/tortuga-agustina.jpg', personaje: 'tortuga', arma: 'sai', selectores: ['Agustina'] },
  { key: 'rafael', label: 'Rafael Barberi', puesto: 'Selector Jr', frase: 'El compañero confiable', color: '#e2721f', retrato: 'images/retro-rafael.png', retratoElegido: 'images/retro-rafael-elegido.png', arte: 'images/tortuga-rafael.jpg', personaje: 'tortuga', arma: 'nunchaku', selectores: ['Rafael'] },
  { key: 'gustavo', label: 'Gustavo Sotelo', puesto: 'Selector Jr', frase: 'El más versátil', color: '#4f8fc9', retrato: 'images/retro-gustavo.png', retratoElegido: 'images/retro-gustavo-elegido.png', arte: 'images/tortuga-gustavo.jpg', personaje: 'tortuga', arma: 'katana', selectores: ['Gustavo'] },
  { key: 'albana', label: 'Albana Pais', puesto: 'Selectora Jr', frase: 'La estructurada', color: '#d4a017', retrato: 'images/retro-albana.png', retratoElegido: 'images/retro-albana-elegido.png?v=2', arte: 'images/tortuga-albana2.jpg', personaje: 'april', selectores: ['Albana'] },
  { key: 'otros', label: 'Otros', puesto: 'Selectores adicionales', frase: 'Los que caminaron en el infierno y no salieron', color: '#a9714a', arte: 'images/muertos en el camino.jpg', personaje: 'fantasma', selectores: ['Emiliano', 'Mariano', 'Facundo', 'Alexis', 'Agustin Monte', 'Luana', 'Araceli', 'Giselle', 'Balbina'] },
];
EQUIPO.forEach((m) => { m.dashboard = m.dashboard || `dashboard.html?miembro=${m.key}`; });

// Selectores que hoy forman el equipo (el ranking de Kevin y de cada uno).
const ACTIVOS = ['Agustin', 'Agustina', 'Rafael', 'Gustavo', 'Albana'];
const NOMBRE_SELECTOR = { Agustin: 'Agustín Márquez', Agustina: 'Agustina Castillo', Rafael: 'Rafael Barberi', Gustavo: 'Gustavo Sotelo', Albana: 'Albana Pais', Emiliano: 'Emiliano Pravato', 'Agustin Monte': 'Agustín Monte' };
const COLOR_SELECTOR = { Agustin: '#5b2d78', Agustina: '#cc2f2f', Rafael: '#e2721f', Gustavo: '#4f8fc9', Albana: '#d4a017', Facundo: '#3fbf7f', Mariano: '#f0a94c', Emiliano: '#06b6d4' };
const EX_EQUIPO = new Set(EQUIPO.find((m) => m.key === 'otros').selectores);

// Paradas de la azotea: `pos` es el círculo que hay que pisar; el objeto queda
// detrás, del lado del borde. `lejos`: distancia del objeto al círculo. Son
// dos: la terminal (consola con la pantalla holográfica de todos los
// resultados) y la guarida (dashboard completo).
const PARADAS = [
  { id: 'resultados', icono: '📊', titulo: 'Resultados', pos: [0, -5], objeto: 'terminal', lejos: 1.45 },
  { id: 'guarida', icono: '🕳️', titulo: 'Dashboard completo', pos: [3.6, 5.8], objeto: 'alcantarilla', lejos: 0 },
];
// Secciones del panel de la terminal (se navegan con ← →).
const SECCIONES = [
  { id: 'altas', icono: '👥', titulo: 'Altas' },
  { id: 'presentismo', icono: '⏰', titulo: 'Presentismo día 1' },
  { id: 'cumplimiento', icono: '🎯', titulo: 'Cumplimiento' },
  { id: 'sabores', icono: '🍽️', titulo: 'Sabores Express', marca: 'Sabores' },
  { id: 'extremas', icono: '🍔', titulo: 'Hamburguesas Extremas', marca: 'Extremas' },
  { id: 'ranking', icono: '🏆', titulo: 'Ranking' },
];
// Lo demás de la azotea se puede tocar: hace algo y dice algo (algunos con
// datos). `en`: dónde está; `alto`: altura del globito; `r`: radio para el clic.
// El tanque, los aires, la antena, la puerta y la barra de café se arman en la
// escena y se suman con la misma lógica.
const PROPS = [
  { id: 'pizzas', objeto: 'pizzas', en: [-6.56, -5.3], emoji: '🍕', anim: 'rebota', alto: 1.9, r: 0.9 },
  { id: 'reloj', objeto: 'reloj', en: [-3.2, -7.0], emoji: '⏰', anim: 'reloj', alto: 2.4, r: 0.6 },
  { id: 'diana', objeto: 'diana', en: [6.56, -5.3], emoji: '🎯', anim: 'gira', alto: 2.4, r: 0.8 },
  { id: 'carrito', objeto: 'carrito', en: [-8.1, 2.02], emoji: '🍽️', anim: 'tiembla', alto: 2.8, r: 1.05 },
  { id: 'hamburguesa', objeto: 'hamburguesa', en: [8.1, 2.02], emoji: '🍔', anim: 'rebota', alto: 2.0, r: 0.8 },
  { id: 'podio', objeto: 'podio', en: [-4.52, 7.29], emoji: '🏆', anim: 'copa', alto: 1.9, r: 1.3 },
];

// Multijugador: color de cada jugador (como en los arcades) y los gestos.
const COLOR_P = ['#ffcf3f', '#4fd6ff', '#7dff8a', '#ff7ad9'];
const colorP = (n) => COLOR_P[((n || 1) - 1) % COLOR_P.length];
const tagP = (n) => `${n || 1}P`;
const GESTOS = {
  hola: { e: '👋', t: '¡Hola!', corto: 'Hola', tecla: '1' },
  cinco: { e: '✋', t: '¡Chocá los cinco!', corto: 'Choque', tecla: '2' },
  cafe: { e: '☕', t: '¿Vamos por un café?', corto: 'Café', tecla: '3' },
  bien: { e: '🎉', t: '¡Bien ahí!', corto: '¡Bien!', tecla: '4' },
};

// Lo que se tira en la azotea (art: para el aviso "te tiró una pizza").
const TIROS = {
  pizza: { e: '🍕', corto: 'Pizza', art: 'una pizza', tecla: '5', mancha: '#e8553a' },
  burger: { e: '🍔', corto: 'Burger', art: 'una hamburguesa', tecla: '6', mancha: '#c98a3a' },
  globo: { e: '💦', corto: 'Globo', art: 'un globo de agua', tecla: '7', mancha: '#7fd0ff' },
};

/* ───────────────────────── Utilidades ───────────────────────── */

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = window.matchMedia('(pointer: coarse)').matches;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const rebote = (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);

function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin storage */ } }

// Colores: el acento de cada integrante se aclara sobre fondo oscuro hasta
// tener contraste >= 3:1 (marcas, barras y brillos); el texto encima de su
// color sólido va blanco o tinta según cuál contraste más.
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(c) { return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function mezclar(h, t, con = '#ffffff') { const a = rgb(h), b = rgb(con); return hex(a.map((v, i) => v + (b[i] - v) * t)); }
function luminancia(h) {
  return rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contraste(a, b) { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function paraOscuro(h, fondo = '#141a2e', min = 3) {
  let c = h;
  for (let t = 0.05; contraste(c, fondo) < min && t <= 1; t += 0.05) c = mezclar(h, t);
  return c;
}
const tintaSobre = (h) => (contraste('#ffffff', h) >= contraste('#0b1020', h) ? '#ffffff' : '#0b1020');

/* ───────────────────────── Datos ───────────────────────── */

const DATA = window.ALTAS_DATA || { altas: [], cumplimiento: [] };
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SEMANAS = ['Primer semana', 'Segunda semana', 'Tercer semana', 'Cuarta semana', 'Quinta semana'];
const mesCorto = (m) => { const [y, mm] = m.split('-'); return `${MES_ABBR[+mm - 1]} ${y.slice(2)}`; };
const mesLargo = (m) => { const [y, mm] = m.split('-'); return `${MES_LARGO[+mm - 1]} ${y}`; };
const pct = (n, d) => (d > 0 ? Math.min(1, n / d) : 0);
const fmtPct = (x) => (x == null ? 'S/D' : (x * 100).toFixed(1) + '%');
const fmtInt = (x) => Number(x || 0).toLocaleString('es-AR');
const suma = (filas, k) => filas.reduce((a, r) => a + (r[k] || 0), 0);
const rango = (meses) => (!meses.length ? 'sin datos' : meses.length === 1 ? mesCorto(meses[0]) : `${mesCorto(meses[0])} – ${mesCorto(meses[meses.length - 1])}`);
const MES_HOY = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
const nombreSel = (s) => (EX_EQUIPO.has(s) ? '🪦 ' : '') + esc(NOMBRE_SELECTOR[s] || s);

function top(filas, clave, n = 5) {
  const mapa = new Map();
  for (const r of filas) mapa.set(r[clave], (mapa.get(r[clave]) || 0) + 1);
  return [...mapa].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Todo lo que muestran la selección y las paradas, para un integrante y período. */
function calcular(m, periodo) {
  const set = m.selectores ? new Set(m.selectores) : null;
  const ALTAS = set ? DATA.altas.filter((r) => set.has(r.selector)) : DATA.altas;
  const CUMPL = set ? DATA.cumplimiento.filter((r) => set.has(r.selector)) : DATA.cumplimiento;

  const todos = [...new Set(ALTAS.map((r) => r.mes))].sort();
  const meses = periodo === 'historico' ? todos : todos.slice(-parseInt(periodo, 10));
  const enMeses = new Set(meses);
  const altas = ALTAS.filter((r) => enMeses.has(r.mes));

  const cumTodos = [...new Set(CUMPL.map((r) => r.mes))].sort();
  const cumEnPeriodo = cumTodos.filter((x) => enMeses.has(x));
  const cumMeses = cumEnPeriodo.length ? cumEnPeriodo : cumTodos;
  const enCum = new Set(cumMeses);
  const cumpl = CUMPL.filter((r) => enCum.has(r.mes));

  const conDato = altas.filter((r) => r.presente !== null);
  const presentes = conDato.filter((r) => r.presente).length;
  const env = suma(cumpl, 'enviados');
  const tot = suma(cumpl, 'total');

  const porMes = meses.map((mes) => {
    const f = altas.filter((r) => r.mes === mes);
    const cd = f.filter((r) => r.presente !== null);
    return { mes, altas: f.length, noPres: cd.length ? 1 - pct(cd.filter((r) => r.presente).length, cd.length) : null };
  });
  const cumPorMes = cumMeses.map((mes) => {
    const f = cumpl.filter((r) => r.mes === mes);
    return { mes, v: pct(suma(f, 'enviados'), suma(f, 'total')) };
  });
  const ultimoCum = cumMeses[cumMeses.length - 1] || null;
  const semanas = SEMANAS.map((semana) => {
    const f = cumpl.filter((r) => r.mes === ultimoCum && r.semana === semana);
    return f.length ? { semana, env: suma(f, 'enviados'), tot: suma(f, 'total') } : null;
  }).filter(Boolean);

  const marca = (k) => {
    const f = altas.filter((r) => r.marca === k);
    return { n: f.length, locales: top(f, 'local'), zonales: top(f, 'zonal') };
  };

  // Ranking en los mismos meses: el equipo actual (o los de "Otros" entre sí).
  const grupo = m.key === 'otros' ? m.selectores : ACTIVOS;
  const rankPres = grupo.map((s) => {
    const f = DATA.altas.filter((r) => r.selector === s && enMeses.has(r.mes) && r.presente !== null);
    return f.length ? { sel: s, v: pct(f.filter((r) => r.presente).length, f.length) } : null;
  }).filter(Boolean).sort((a, b) => b.v - a.v);
  const rankCum = grupo.map((s) => {
    const f = DATA.cumplimiento.filter((r) => r.selector === s && enCum.has(r.mes));
    const t = suma(f, 'total');
    return t ? { sel: s, v: pct(suma(f, 'enviados'), t) } : null;
  }).filter(Boolean).sort((a, b) => b.v - a.v);

  return {
    meses, cumMeses, cumFueraDePeriodo: !cumEnPeriodo.length && cumTodos.length > 0,
    altas: altas.length, conDato: conDato.length, presentes, noPres: conDato.length - presentes,
    presentismo: conDato.length ? pct(presentes, conDato.length) : null,
    env, tot, cumplimiento: tot ? pct(env, tot) : null,
    porMes, cumPorMes, ultimoCum, semanas,
    Sabores: marca('Sabores'), Extremas: marca('Extremas'),
    rankPres, rankCum,
  };
}

/* ───────────────────────── Sonido ───────────────────────── */

// Bips cortos de WebAudio (sin archivos). Se pueden apagar y queda guardado.
const Sonido = (() => {
  let ctx = null;
  let activo = leer('pj-sonido') !== 'no';
  function tono(f, dur, { tipo = 'square', vol = 0.03, en = 0, hasta = 0 } = {}) {
    // Sin un toque o una tecla antes (link directo) el navegador no deja sonar.
    if (!activo || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ctx.currentTime + en;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(f, t0);
      if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (e) { /* sin audio */ }
  }
  return {
    mover: () => tono(540, 0.05),
    elegir: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.14, { en: i * 0.07, vol: 0.035 })),
    aparecer: () => tono(160, 0.55, { tipo: 'sawtooth', vol: 0.025, hasta: 960 }),
    parada: () => { tono(880, 0.08, { tipo: 'triangle', vol: 0.05 }); tono(1320, 0.12, { tipo: 'triangle', vol: 0.04, en: 0.06 }); },
    cuenta: (ya) => tono(ya ? 880 : 440, ya ? 0.3 : 0.12, { tipo: 'square', vol: 0.03 }),
    susto: () => { tono(620, 0.9, { tipo: 'sawtooth', vol: 0.03, hasta: 70 }); tono(300, 0.9, { tipo: 'triangle', vol: 0.03, hasta: 50, en: 0.05 }); },
    escape: () => [392, 523, 659, 784, 1047].forEach((f, i) => tono(f, 0.16, { tipo: 'triangle', en: i * 0.09, vol: 0.04 })),
    get activo() { return activo; },
    alternar() { activo = !activo; guardar('pj-sonido', activo ? 'si' : 'no'); return activo; },
  };
})();

/* ───────────────────────── 1. Selección ───────────────────────── */

const pantalla = $('#pjSelect');
const mundoEl = $('#pjMundo');
const slotsEl = $('#pjSlots');
let indice = 0;

function tematizar(m) {
  const s = document.body.style;
  s.setProperty('--c', m.color);
  s.setProperty('--c-osc', paraOscuro(m.color));
  s.setProperty('--c-tinta', tintaSobre(m.color));
}

function pintarSlots() {
  slotsEl.innerHTML = EQUIPO.map((m, i) => `
    <button class="pj-slot" type="button" role="radio" data-i="${i}" aria-checked="false" aria-label="${esc(m.label)}" style="--sc:${paraOscuro(m.color, '#070b18', 3)};--abanico:${i - (EQUIPO.length - 1) / 2};--abanico-y:${Math.pow(i - (EQUIPO.length - 1) / 2, 2) * 3}">
      <span class="pj-slot-pantalla" aria-hidden="true"></span>
      <span class="pj-slot-jugando" aria-hidden="true">Jugando</span>
      <span class="pj-slot-marco">${m.retrato ? `<img src="${esc(m.retrato)}" data-normal="${esc(m.retrato)}" data-elegido="${esc(m.retratoElegido || m.retrato)}" alt="" />` : '<span class="pj-slot-mas">+9</span>'}</span>
      <span class="pj-slot-nombre" aria-hidden="true">${esc(m.label.split(' ')[0])}</span>
    </button>`).join('');
  EQUIPO.forEach((m) => { if (m.retratoElegido) new Image().src = m.retratoElegido; }); // sin parpadeo al cambiar de cara
  slotsEl.querySelectorAll('.pj-slot').forEach((b) => {
    const i = Number(b.dataset.i);
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && i !== indice) previsualizar(i, true); });
    b.addEventListener('click', () => { if (i === indice) confirmar(); else previsualizar(i, true); });
  });
}

/* ── Multijugador en la selección ── */
let sala = null;
const avisoEl = $('#pjAviso');
let avisoT = 0;
function aviso(texto, color = '#ffffff') {
  avisoEl.textContent = texto;
  avisoEl.style.setProperty('--pc', color);
  avisoEl.hidden = false;
  avisoEl.classList.remove('pj--sale');
  clearTimeout(avisoT);
  avisoT = setTimeout(() => avisoEl.classList.add('pj--sale'), 3200);
}
avisoEl.addEventListener('animationend', () => { if (avisoEl.classList.contains('pj--sale')) avisoEl.hidden = true; });

// Lo que llega de la sala se valida: solo claves conocidas y números.
const CLAVES = new Set(EQUIPO.map((m) => m.key));
function limpiarJugador(o) {
  const n = Number.isInteger(o.n) && o.n > 0 && o.n < 10 ? o.n : null;
  if (!n) return null;
  return {
    id: String(o.id).slice(0, 64), n,
    en: o.en === 'azotea' ? 'azotea' : 'seleccion',
    mira: CLAVES.has(o.mira) ? o.mira : null,
    personaje: CLAVES.has(o.personaje) ? o.personaje : null,
    parada: o.parada === 'cementerio' || PARADAS.some((p) => p.id === o.parada) ? o.parada : null,
    desde: Number(o.desde) || 0,
  };
}
let jugadores = []; // los otros, ya validados
const enAzotea = () => jugadores.filter((o) => o.en === 'azotea' && o.personaje);
const ocupadoPor = (key) => enAzotea().find((o) => o.personaje === key) || null;
const primerNombre = (key) => EQUIPO.find((m) => m.key === key).label.split(' ')[0];
const miN = () => (sala && sala.yo.n) || 1;

function pintarSala() {
  const yo = miN();
  document.body.style.setProperty('--pc', colorP(yo));
  $('.pj-jugador').textContent = tagP(yo);
  const hudP = $('#pjHudP');
  hudP.textContent = tagP(yo);
  hudP.hidden = !jugadores.length;
  // Quién está conectado (solo si hay alguien más).
  const barra = $('#pjSala');
  barra.hidden = !jugadores.length;
  barra.innerHTML = [{ n: yo, yo: true }, ...[...jugadores].sort((a, b) => a.n - b.n)].map((o) => {
    const donde = o.parada === 'cementerio' ? 'en el cementerio' : 'en la azotea';
    const que = o.yo ? 'vos' : o.en === 'azotea' && o.personaje ? `${donde} con ${esc(primerNombre(o.personaje))}` : o.mira ? `mirando a ${esc(primerNombre(o.mira))}` : 'eligiendo…';
    return `<span class="pj-sala-j"><b class="pj-p" style="--pc:${colorP(o.n)}">${tagP(o.n)}</b>${que}</span>`;
  }).join('');
  // Marcas en los casilleros: dónde está cada uno y qué personajes se están jugando.
  slotsEl.querySelectorAll('.pj-slot').forEach((b, k) => {
    const key = EQUIPO[k].key;
    const tags = [];
    if (k === indice) tags.push({ n: yo, mio: true });
    for (const o of jugadores) {
      if ((o.en === 'azotea' && o.personaje === key) || (o.en === 'seleccion' && o.mira === key)) tags.push({ n: o.n });
    }
    const pantallita = b.querySelector('.pj-slot-pantalla');
    pantallita.dataset.p = tags.map((t) => tagP(t.n)).join(' ');
    b.style.setProperty('--pp', colorP((tags.find((t) => t.mio) || tags[0] || { n: yo }).n));
    b.classList.toggle('pj--marcado', tags.length > 0);
    b.classList.toggle('pj--titila', tags.some((t) => t.mio));
    const ocupado = ocupadoPor(key);
    b.classList.toggle('pj--ocupado', !!ocupado);
    if (ocupado) b.style.setProperty('--po', colorP(ocupado.n));
    b.setAttribute('aria-label', EQUIPO[k].label + (ocupado ? ` (lo está jugando ${tagP(ocupado.n)})` : ''));
  });
}

let enAzoteaAntes = new Map();
function alCambiarSala(otros) {
  jugadores = [...otros.values()].map(limpiarJugador).filter(Boolean);
  // Avisos de quién llega o se va de la azotea.
  const ahora = new Map(enAzotea().map((o) => [o.id, o]));
  for (const [id, o] of ahora) {
    const antes = enAzoteaAntes.get(id);
    if (!antes) aviso(`${tagP(o.n)} llegó a la azotea con ${primerNombre(o.personaje)}`, colorP(o.n));
    else if (antes.personaje !== o.personaje) aviso(`${tagP(o.n)} ahora juega con ${primerNombre(o.personaje)}`, colorP(o.n));
    else if (antes.parada !== 'cementerio' && o.parada === 'cementerio') aviso(`${tagP(o.n)} bajó al cementerio 👻`, colorP(o.n));
    else if (antes.parada === 'cementerio' && o.parada !== 'cementerio') aviso(`${tagP(o.n)} volvió del cementerio`, colorP(o.n));
  }
  for (const [id, o] of enAzoteaAntes) if (!ahora.has(id) && !jugadores.some((j) => j.id === id && j.en === 'azotea')) aviso(`${tagP(o.n)} salió de la azotea`, colorP(o.n));
  enAzoteaAntes = ahora;
  // Dos con el mismo personaje (eligieron a la vez): lo conserva el que llegó primero.
  if (actual && !mundoEl.hidden && sala) {
    const otro = ocupadoPor(actual.key);
    if (otro && (otro.desde < sala.yo.desde || (otro.desde === sala.yo.desde && otro.id < sala.yo.id))) {
      aviso(`${tagP(otro.n)} ya está jugando con ${primerNombre(actual.key)}. Elegí otro personaje.`, colorP(otro.n));
      volverASeleccion();
    }
  }
  pintarSala();
  if (Mundo.ok) Mundo.sincronizarRemotos(enAzotea().filter((o) => o.parada !== 'cementerio')); // los del cementerio no se ven
}

// Stats de la selección: 5 competencias de la evaluación real (competencias.js,
// la misma del "Perfil de competencias" del dashboard), de 0 a 10. Sin
// evaluación cargada ("Otros") van con "?".
const STATS = [['equipo', 'Trabajo en equipo'], ['liderazgo', 'Liderazgo'], ['comunicacion', 'Comunicación'], ['creatividad', 'Creatividad'], ['adaptabilidad', 'Adaptabilidad']];
function competencias(m) {
  const c = window.COMPETENCIAS_DATA && window.COMPETENCIAS_DATA[m.key];
  const cats = window.COMPETENCIAS_CATEGORIAS || [];
  return STATS.map(([k, label]) => ({ label, v: c ? c.real[cats.findIndex((x) => x.key === k)] : null }));
}
function stat(etiqueta, v) {
  const lleno = v == null ? 0 : v * 10;
  return `<div class="pj-stat${v == null ? ' pj-stat--nd' : ''}"><dt>${etiqueta}</dt>
    <div class="pj-stat-barra" aria-hidden="true"><i style="clip-path:inset(0 ${100 - lleno}% 0 0)"></i></div>
    <dd>${v == null ? '?' : `${v}<small>/10</small>`}</dd></div>`;
}

function previsualizar(i, sonar) {
  indice = (i + EQUIPO.length) % EQUIPO.length;
  const m = EQUIPO[indice];
  tematizar(m);
  slotsEl.querySelectorAll('.pj-slot').forEach((b, k) => {
    b.setAttribute('aria-checked', String(k === indice));
    b.tabIndex = k === indice ? 0 : -1;
    const img = b.querySelector('img');
    if (img) img.src = k === indice ? img.dataset.elegido : img.dataset.normal;
  });
  pintarSala();
  if (sala && pantalla.hidden === false) sala.actualizar({ mira: m.key });
  const prev = $('#pjPreview');
  const arte = $('#pjArte');
  if (!reduce) prev.classList.add('pj--cambio');
  const aplicar = () => {
    arte.style.backgroundImage = `url("${encodeURI(m.arte)}")`;
    arte.setAttribute('aria-label', `Personaje de ${m.label}`);
    $('#pjNombre').textContent = m.label;
    $('#pjPuesto').textContent = m.puesto;
    $('#pjFrase').textContent = m.frase;
    const comp = competencias(m);
    const sinEvaluar = comp.every((c) => c.v == null);
    $('#pjStats').innerHTML = comp.map((c) => stat(c.label, c.v)).join('');
    const nota = $('#pjPeriodoSel');
    nota.textContent = !sinEvaluar ? 'Evaluación de competencias · escala de 0 a 10' : m.key === 'otros' ? 'Sin evaluación de competencias' : 'Próximamente…';
    nota.classList.toggle('pj--pronto', sinEvaluar && m.key !== 'otros');
    prev.classList.remove('pj--cambio');
  };
  if (reduce) aplicar(); else setTimeout(aplicar, 120);
  if (sonar) Sonido.mover();
}

document.addEventListener('keydown', (e) => {
  if (pantalla.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
  const paso = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
  if (paso) {
    e.preventDefault();
    previsualizar(indice + paso, true);
    slotsEl.querySelectorAll('.pj-slot')[indice].focus({ preventScroll: true });
  } else if (e.key === 'Enter' && !e.target.closest('a, .pj-sonido')) {
    e.preventDefault();
    confirmar();
  }
});
$('#pjJugar').addEventListener('click', () => confirmar());
const botonSonido = $('#pjSonido');
const pintarSonido = () => {
  botonSonido.setAttribute('aria-pressed', String(Sonido.activo));
  botonSonido.textContent = Sonido.activo ? '🔊' : '🔈';
  botonSonido.title = Sonido.activo ? 'Silenciar' : 'Activar sonido';
};
botonSonido.addEventListener('click', () => { Sonido.alternar(); pintarSonido(); });
pintarSonido();
if (tactil) $('#pjTip').textContent = 'Tocá una foto para elegir · tocala de nuevo para jugar';

/* ───────────────────────── 2. Confirmar y aparecer ───────────────────────── */

let confirmando = false;
async function confirmar() {
  if (confirmando) return;
  const m = EQUIPO[indice];
  const slot = slotsEl.querySelectorAll('.pj-slot')[indice];
  const otro = ocupadoPor(m.key);
  if (otro) {
    aviso(`${tagP(otro.n)} ya está jugando con ${primerNombre(m.key)}. Elegí otro personaje.`, colorP(otro.n));
    slot.classList.remove('pj--no');
    void slot.offsetWidth;
    slot.classList.add('pj--no');
    return;
  }
  confirmando = true;
  Sonido.elegir();
  history.replaceState(null, '', `?miembro=${m.key}`);
  const listo = prepararMundo();
  if (!reduce) {
    slot.classList.add('pj--elegido');
    await espera(380);
  }
  const ok = await listo;
  await aparicion(m, slot.getBoundingClientRect(), ok);
  slot.classList.remove('pj--elegido');
  confirmando = false;
}

// La foto vuela del casillero al centro de la pantalla; cuando ya está la
// azotea abajo, se achica hacia el personaje con un destello.
async function aparicion(m, desde, con3d) {
  const capa = $('#pjAparicion');
  const img = capa.querySelector('img');
  const lado = Math.round(Math.min(innerWidth, innerHeight) * 0.42); // alto del retrato (3:4)
  const x = (innerWidth - lado * 0.75) / 2;
  const y = (innerHeight - lado) / 2;
  if (!reduce) {
    img.src = m.retratoElegido || m.retrato || m.arte;
    Object.assign(img.style, { left: x + 'px', top: y + 'px', width: lado * 0.75 + 'px', height: lado + 'px' });
    capa.hidden = false;
    const esc0 = desde.width / (lado * 0.75);
    const dx = desde.left + desde.width / 2 - (x + (lado * 0.75) / 2);
    const dy = desde.top + desde.height / 2 - (y + lado / 2);
    await img.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${esc0})` },
      { transform: 'none', offset: 0.75 },
      { transform: 'scale(1.06)' },
    ], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished;
  }
  entrarAlMundo(m, con3d);
  if (reduce) return;
  Sonido.aparecer();
  capa.classList.add('pj--destello');
  const destino = Mundo.ok ? Mundo.puntoEnPantalla() : { x: innerWidth / 2, y: innerHeight / 2 };
  await img.animate([
    { transform: 'scale(1.06)', opacity: 1 },
    { transform: `translate(${destino.x - innerWidth / 2}px, ${destino.y - innerHeight / 2}px) scale(.05)`, opacity: 0.4 },
  ], { duration: 420, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }).finished;
  capa.hidden = true;
  capa.classList.remove('pj--destello');
  img.getAnimations().forEach((a) => a.cancel());
}

/* ───────────────────────── 3. Azotea ───────────────────────── */

let actual = null; // integrante elegido
let periodo = '12';
let datos = null;
let paradaActiva = null;
let cerradaAMano = null; // parada cuyo panel se cerró con la ×: no se reabre hasta salir

const panel = $('#pjPanel');
const panelCuerpo = $('#pjPanelCuerpo');
const capaEtiquetas = $('#pjCapa');
const navParadas = $('#pjParadas');
const ayuda = $('#pjAyuda');

let ayudaMostrada = false;
function entrarAlMundo(m, con3d) {
  actual = m;
  sala?.actualizar({ en: 'azotea', personaje: m.key, parada: null, mira: null, desde: Date.now() });
  tematizar(m);
  datos = calcular(m, periodo);
  pantalla.hidden = true;
  mundoEl.hidden = false;
  document.body.classList.add('pj--jugando');
  const foto = $('#pjHudFoto');
  foto.src = m.retrato || '';
  foto.classList.toggle('pj--sin', !m.retrato);
  $('#pjHudNombre').textContent = m.label;
  pintarNav();
  cerrarPanel();
  if (con3d) {
    Mundo.iniciarPersonaje(m, miN());
    Mundo.sincronizarRemotos(enAzotea());
    pintarEtiquetas();
    $('#pjJoy').hidden = !tactil;
    $('#pjGestos').hidden = false;
    if (!ayudaMostrada) {
      ayudaMostrada = true;
      ayuda.textContent = tactil ? 'Mové el joystick o tocá el piso para caminar · tocá 🍕 para tirar' : 'Caminá con las flechas o WASD · clic en el piso · espacio para tirar 🍕';
      ayuda.classList.remove('pj--fuera');
      setTimeout(() => ayuda.classList.add('pj--fuera'), 9000);
    }
  } else {
    modoPlano();
  }
}

// Tocar a alguien que espera en la azotea: se juega con esa persona.
function cambiarA(m) {
  indice = EQUIPO.indexOf(m);
  history.replaceState(null, '', `?miembro=${m.key}`);
  Sonido.elegir();
  entrarAlMundo(m, true);
}

function volverASeleccion() {
  Mundo.salirCementerio();
  Mundo.pausar();
  cerrarPanel();
  mundoEl.hidden = true;
  pantalla.hidden = false;
  document.body.classList.remove('pj--jugando');
  history.replaceState(null, '', location.pathname);
  sala?.actualizar({ en: 'seleccion', personaje: null, parada: null, mira: EQUIPO[indice].key });
  previsualizar(indice, false);
  slotsEl.querySelectorAll('.pj-slot')[indice].focus({ preventScroll: true });
}
$('#pjCambiar').addEventListener('click', volverASeleccion);

$('#pjPeriodo').addEventListener('change', (e) => {
  periodo = e.target.value;
  datos = calcular(actual, periodo);
  pintarEtiquetas();
  if (mundoEl.classList.contains('pj--plano')) modoPlano();
  else if (!holo.hidden) pintarTerminal();
  else if (paradaActiva && !panel.hidden) abrirPanel(paradaActiva);
});

function pintarNav() {
  navParadas.innerHTML = PARADAS.map((p) => `
    <button class="pj-parada-btn" type="button" data-id="${p.id}"><span aria-hidden="true">${p.icono}</span>${esc(p.titulo)}</button>`).join('') +
    '<button class="pj-parada-btn pj-cem-btn" type="button" data-cementerio><span aria-hidden="true">🪦</span>Bajar al cementerio</button>';
  navParadas.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => Mundo.irA(b.dataset.id)));
  navParadas.querySelector('[data-cementerio]').addEventListener('click', bajarAlCementerio);
}

// Dato corto que se ve en el cartel flotante de cada parada.
function titular(id) {
  return id === 'resultados' ? `${fmtInt(datos.altas)} altas · entrar` : 'Ver todo';
}

function pintarEtiquetas() {
  PARADAS.forEach((p) => {
    const el = capaEtiquetas.querySelector(`[data-id="${p.id}"]`);
    if (el) el.innerHTML = `<b><span aria-hidden="true">${p.icono}</span> ${esc(p.titulo)}</b><span>${titular(p.id)}</span>`;
  });
}

function activarParada(id) {
  if (id === paradaActiva) return;
  if (cerradaAMano && cerradaAMano !== id) cerradaAMano = null;
  paradaActiva = id;
  sala?.actualizar({ parada: id });
  navParadas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  capaEtiquetas.querySelectorAll('.pj-etiqueta').forEach((el) => el.classList.toggle('pj--activa', el.dataset.id === id));
  if (id) {
    Sonido.parada();
    if (id === 'resultados') abrirTerminal();
    else if (cerradaAMano !== id) abrirPanel(id);
  } else {
    cerradaAMano = null;
    cerrarTerminal();
    cerrarPanel();
  }
}

/* ───────────── Terminal: panel holográfico con todos los resultados ───────────── */

const holo = $('#pjHolo');
const holoCuerpo = $('#pjHoloCuerpo');
let seccion = 0;
function pintarTerminal(dir = 0) {
  const sec = SECCIONES[seccion];
  $('#pjHoloQuien').textContent = `${quien()} · ${rango(datos.meses)}`;
  $('#pjHoloTabs').innerHTML = SECCIONES.map((x, i) => `
    <button class="pj-holo-tab" type="button" role="tab" data-i="${i}" aria-selected="${i === seccion}"><span aria-hidden="true">${x.icono}</span><b>${esc(x.titulo)}</b></button>`).join('');
  holoCuerpo.innerHTML = contenidoParada(sec.id);
  // Pantalla ancha: el título arriba, el número grande a la izquierda y los
  // bloques a la derecha (en celulares queda todo en una columna).
  const izq = document.createElement('div');
  const der = document.createElement('div');
  izq.className = 'pj-holo-izq';
  der.className = 'pj-holo-der';
  for (const el of [...holoCuerpo.children]) {
    if (!el.matches('h2, .pj-sub')) (el.matches('.pj-heroe, .pj-heroe-sub') ? izq : der).appendChild(el);
  }
  if (izq.children.length) holoCuerpo.append(izq);
  holoCuerpo.append(der);
  holoCuerpo.classList.toggle('pj--sin-heroe', !izq.children.length);
  holoCuerpo.classList.remove('pj--der', 'pj--izq');
  if (dir && !reduce) { void holoCuerpo.offsetWidth; holoCuerpo.classList.add(dir > 0 ? 'pj--der' : 'pj--izq'); }
  holoCuerpo.scrollTop = 0;
  $('#pjHoloPos').textContent = `${seccion + 1} / ${SECCIONES.length}`;
  const tab = holo.querySelector('.pj-holo-tab[aria-selected="true"]');
  tab?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function abrirTerminal() {
  if (!holo.hidden) return;
  holo.hidden = false;
  mundoEl.classList.add('pj--terminal');
  Mundo.vistaFrente(true);
  Sonido.aparecer();
  pintarTerminal();
}
function cerrarTerminal() {
  if (holo.hidden) return;
  holo.hidden = true;
  mundoEl.classList.remove('pj--terminal');
  Mundo.vistaFrente(false);
  ocultarTooltip();
}
function salirTerminal() {
  cerrarTerminal();
  Mundo.salirDeParada();
}
function moverSeccion(d) {
  seccion = (seccion + d + SECCIONES.length) % SECCIONES.length;
  Sonido.mover();
  pintarTerminal(d);
}
$('#pjHoloTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.pj-holo-tab');
  if (!b || Number(b.dataset.i) === seccion) return;
  const i = Number(b.dataset.i);
  const d = i > seccion ? 1 : -1;
  seccion = i;
  Sonido.mover();
  pintarTerminal(d);
});
$('#pjHoloPrev').addEventListener('click', () => moverSeccion(-1));
$('#pjHoloNext').addEventListener('click', () => moverSeccion(1));
$('#pjHoloSalir').addEventListener('click', salirTerminal);
holoCuerpo.addEventListener('scroll', ocultarTooltip, { passive: true });
// En celulares: deslizar a los costados cambia de sección.
let deslizar = null;
holoCuerpo.addEventListener('pointerdown', (e) => { deslizar = { x: e.clientX, y: e.clientY }; });
holoCuerpo.addEventListener('pointerup', (e) => {
  if (!deslizar) return;
  const dx = e.clientX - deslizar.x, dy = e.clientY - deslizar.y;
  deslizar = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) moverSeccion(dx < 0 ? 1 : -1);
});

function abrirPanel(id) {
  panelCuerpo.innerHTML = contenidoParada(id);
  panel.hidden = false;
  mundoEl.classList.add('pj--con-panel');
}
function cerrarPanel() {
  panel.hidden = true;
  mundoEl.classList.remove('pj--con-panel');
  ocultarTooltip();
}
$('#pjPanelCerrar').addEventListener('click', () => { cerradaAMano = paradaActiva; cerrarPanel(); });

/* ───────────── Paneles (2D, legibles; nada de gráficos 3D) ───────────── */

const quien = () => (actual.selectores ? actual.label : 'Todo el equipo');

function cabecera(p) {
  const curso = datos.meses.includes(MES_HOY) ? ` · ${mesCorto(MES_HOY)} en curso` : '';
  return `<h2><span aria-hidden="true">${p.icono}</span>${esc(p.titulo)}</h2>
    <p class="pj-sub">${esc(quien())} · ${rango(datos.meses)}${curso}</p>`;
}

/** Columnas por mes en SVG: una serie, barras <= 24 px con punta redondeada,
 *  valor solo en la última y en la más alta; el resto, en el tooltip. */
function columnas(serie, { fmt, max, titulo }) {
  const n = serie.length;
  if (!n) return '<p class="pj-vacio">Sin datos en el período.</p>';
  const W = 320, H = 132, arriba = 18, abajo = 20;
  const ranura = W / n;
  const ancho = Math.min(24, ranura * 0.62);
  const tope = max || Math.max(...serie.map((s) => s.v || 0)) || 1;
  const base = H - abajo;
  const alto = base - arriba;
  let iMax = 0;
  serie.forEach((s, i) => { if ((s.v || 0) > (serie[iMax].v || 0)) iMax = i; });
  const cada = Math.ceil(n / 6);
  const conMax = ranura * (n - 1 - iMax) >= 40; // si la más alta está pegada a la última, solo va la última
  const color = paraOscuro(actual.color);
  let barras = '';
  let marcas = '';
  serie.forEach((s, i) => {
    const x = ranura * i + (ranura - ancho) / 2;
    const h = s.v == null ? 0 : Math.max(2, (s.v / tope) * alto);
    const y = base - h;
    const r = Math.min(4, ancho / 2, h);
    const tip = `${s.l} · ${s.v == null ? 'sin dato' : fmt(s.v)}`;
    barras += `<rect class="pj-hit" x="${(ranura * i).toFixed(1)}" y="0" width="${ranura.toFixed(1)}" height="${base}" data-tip="${esc(tip)}"/>`;
    if (h) barras += `<path class="pj-bar" fill="${color}" d="M${x.toFixed(1)},${base} V${(y + r).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} H${(x + ancho - r).toFixed(1)} Q${(x + ancho).toFixed(1)},${y.toFixed(1)} ${(x + ancho).toFixed(1)},${(y + r).toFixed(1)} V${base} Z" pointer-events="none"/>`;
    if (((i === iMax && conMax) || i === n - 1) && s.v != null) marcas += `<text class="pj-val" x="${(x + ancho / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${esc(fmt(s.v))}</text>`;
    if ((n - 1 - i) % cada === 0) marcas += `<text x="${(x + ancho / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(s.l)}</text>`;
  });
  const tabla = `<table class="pj-sr"><caption>${esc(titulo)}</caption><tbody>${serie.map((s) => `<tr><th>${esc(s.l)}</th><td>${s.v == null ? 'sin dato' : esc(fmt(s.v))}</td></tr>`).join('')}</tbody></table>`;
  return `<svg class="pj-cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}"><line class="pj-eje" x1="0" x2="${W}" y1="${base + 0.5}" y2="${base + 0.5}"/>${barras}${marcas}</svg>${tabla}`;
}

/** Lista con medidor: [{ nombre(html), valor(texto), t(0..1), color, yo }]. */
function lista(filas) {
  if (!filas.length) return '<p class="pj-vacio">Sin datos en el período.</p>';
  return `<ul class="pj-lista">${filas.map((f) => `
    <li class="${f.yo ? 'pj--yo' : ''}"><span class="pj-nom">${f.nombre}</span><span class="pj-num">${f.valor}</span>
    <span class="pj-medidor" aria-hidden="true"><i style="width:${(Math.max(0, Math.min(1, f.t)) * 100).toFixed(1)}%;background:${f.color}"></i></span></li>`).join('')}</ul>`;
}

function topLista(pares) {
  const color = paraOscuro(actual.color);
  const max = pares.length ? pares[0][1] : 1;
  return lista(pares.map(([nombre, n]) => ({ nombre: esc(nombre), valor: fmtInt(n), t: n / max, color })));
}

function rankLista(filas) {
  const mio = new Set(actual.selectores && actual.selectores.length === 1 ? actual.selectores : []);
  return lista(filas.map((r, i) => ({
    nombre: `<span class="pj-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1)}</span><span class="pj-punto" style="background:${paraOscuro(COLOR_SELECTOR[r.sel] || actual.color)}"></span>${nombreSel(r.sel)}`,
    valor: fmtPct(r.v), t: r.v, color: paraOscuro(COLOR_SELECTOR[r.sel] || actual.color), yo: mio.has(r.sel),
  })));
}

function contenidoParada(id) {
  const p = SECCIONES.find((x) => x.id === id) || PARADAS.find((x) => x.id === id);
  const d = datos;
  const head = cabecera(p);
  if (id === 'altas') {
    let mejor = '';
    if (d.porMes.length > 1) {
      const b = d.porMes.reduce((a, x) => (x.altas > a.altas ? x : a));
      mejor = `<p class="pj-nota">Mes con más altas: ${mesCorto(b.mes)} · ${fmtInt(b.altas)}.</p>`;
    }
    return `${head}
      <div class="pj-heroe">${fmtInt(d.altas)}</div>
      <p class="pj-heroe-sub">altas · ${fmtInt(d.Sabores.n)} en Sabores Express y ${fmtInt(d.Extremas.n)} en Hamburguesas Extremas</p>
      <div class="pj-bloque"><h3>Altas por mes</h3>${columnas(d.porMes.map((x) => ({ l: mesCorto(x.mes), v: x.altas })), { fmt: fmtInt, titulo: 'Altas por mes' })}${mejor}</div>`;
  }
  if (id === 'presentismo') {
    const sinDato = d.altas - d.conDato;
    return `${head}
      <div class="pj-heroe">${fmtPct(d.presentismo)}</div>
      <p class="pj-heroe-sub">${fmtInt(d.presentes)} se presentaron el primer día · ${fmtInt(d.noPres)} no</p>
      <div class="pj-bloque"><h3>Tasa de no presentados por mes</h3>${columnas(d.porMes.map((x) => ({ l: mesCorto(x.mes), v: x.noPres })), { fmt: fmtPct, titulo: 'Tasa de no presentados por mes' })}
      ${sinDato ? `<p class="pj-nota">${fmtInt(sinDato)} altas sin dato de ingreso no cuentan.</p>` : ''}</div>`;
  }
  if (id === 'cumplimiento') {
    const sem = d.semanas.map((s) => ({ nombre: esc(s.semana), valor: `${fmtInt(s.env)}/${fmtInt(s.tot)} · ${fmtPct(pct(s.env, s.tot))}`, t: pct(s.env, s.tot), color: paraOscuro(actual.color) }));
    return `${head}
      <div class="pj-heroe">${fmtPct(d.cumplimiento)}</div>
      <p class="pj-heroe-sub">${fmtInt(d.env)} enviados de ${fmtInt(d.tot)} vacantes</p>
      <div class="pj-bloque"><h3>Cumplimiento por mes</h3>${columnas(d.cumPorMes.map((x) => ({ l: mesCorto(x.mes), v: x.v })), { fmt: fmtPct, max: 1, titulo: 'Cumplimiento por mes' })}</div>
      ${d.ultimoCum ? `<div class="pj-bloque"><h3>Semanas de ${mesLargo(d.ultimoCum)}</h3>${lista(sem)}</div>` : ''}
      ${d.cumFueraDePeriodo ? '<p class="pj-nota">El período no tiene cumplimiento cargado: se muestran todos los meses disponibles.</p>' : ''}`;
  }
  if (id === 'sabores' || id === 'extremas') {
    const mk = d[p.marca];
    return `${head}
      <div class="pj-heroe">${fmtInt(mk.n)}</div>
      <p class="pj-heroe-sub">altas · ${fmtPct(pct(mk.n, d.altas))} del período</p>
      <div class="pj-bloque"><h3>Top 5 locales</h3>${topLista(mk.locales)}</div>
      <div class="pj-bloque"><h3>Top 5 zonales</h3>${topLista(mk.zonales)}</div>`;
  }
  if (id === 'ranking') {
    const grupo = actual.key === 'otros' ? 'a los selectores de "Otros"' : 'al equipo actual';
    return `${head}
      <div class="pj-bloque" style="border:0;margin-top:0;padding-top:0"><h3>Cumplimiento</h3>${rankLista(d.rankCum)}</div>
      <div class="pj-bloque"><h3>Presentismo día 1</h3>${rankLista(d.rankPres)}</div>
      <p class="pj-nota">Compara ${grupo} en los mismos meses. Sin ranking por volumen de altas.</p>`;
  }
  return `${head}
    <p>Bajá a la guarida: el dashboard completo de ${esc(quien() === 'Todo el equipo' ? 'todo el equipo' : actual.label)} con todos los gráficos, los rankings${actual.selectores ? '' : ', el mapa de zonas'} y el resumen del año.</p>
    <a class="pj-boton" href="${esc(actual.dashboard)}">Bajar a la guarida →</a>`;
}

// Tooltip de las columnas (mouse y toque).
const tooltip = $('#pjTooltip');
function mostrarTooltip(el) {
  const r = el.getBoundingClientRect();
  const [l, v] = el.dataset.tip.split(' · ');
  tooltip.innerHTML = `${esc(l)}<b>${esc(v)}</b>`;
  tooltip.style.left = r.left + r.width / 2 + 'px';
  tooltip.style.top = Math.max(40, r.top + 18) + 'px';
  tooltip.hidden = false;
  const bar = el.nextElementSibling;
  if (bar && bar.classList.contains('pj-bar')) bar.classList.add('pj--hover');
}
function ocultarTooltip() {
  tooltip.hidden = true;
  document.querySelectorAll('.pj-bar.pj--hover').forEach((b) => b.classList.remove('pj--hover'));
}
mundoEl.addEventListener('pointerover', (e) => { const h = e.target.closest('.pj-hit'); if (h) { ocultarTooltip(); mostrarTooltip(h); } });
mundoEl.addEventListener('pointerout', (e) => { if (e.target.closest('.pj-hit')) ocultarTooltip(); });
panel.addEventListener('scroll', ocultarTooltip, { passive: true });

// Sin WebGL: todas las paradas como tarjetas.
function modoPlano() {
  mundoEl.classList.add('pj--plano');
  document.body.classList.remove('pj--jugando');
  $('#pjCanvas').hidden = true;
  navParadas.hidden = true;
  ayuda.hidden = true;
  const plano = $('#pjPlano');
  plano.hidden = false;
  plano.innerHTML = '<p>Tu navegador no muestra 3D: acá tenés los mismos resultados de la terminal de la azotea.</p>' +
    [...SECCIONES.map((x) => x.id), 'guarida'].map((id) => `<section class="pj-glass pj-tarjeta">${contenidoParada(id)}</section>`).join('');
}

/* ───────────────────────── Motor 3D ───────────────────────── */

let T = null;
let cargaThree = null;
function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}
const WEBGL = hayWebGL();
function cargarThree() {
  if (!cargaThree) cargaThree = import(THREE_URL).then((mod) => { T = mod; return mod; });
  return cargaThree;
}

let armado = null;
function prepararMundo() {
  if (!WEBGL) return Promise.resolve(false);
  if (!armado) {
    armado = cargarThree().then(() => { Mundo.armar(); return true; }).catch((e) => {
      console.warn('Azotea 3D no disponible; quedan las tarjetas.', e);
      return false;
    });
  }
  return armado;
}

// Helpers de geometría (mismo estilo "arcilla" mate que oficina-3d.js).
const materiales = new Map();
function mate(color) {
  if (!materiales.has(color)) materiales.set(color, new T.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 }));
  return materiales.get(color);
}
function brilla(color, intensidad = 1) {
  return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.6 });
}
function malla(geo, mat, x = 0, y = 0, z = 0, sombra = true) {
  const m = new T.Mesh(geo, typeof mat === 'string' ? mate(mat) : mat);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = true;
  return m;
}
const esfera = (r, mat, x, y, z, seg = 16) => malla(new T.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), mat, x, y, z);
const ovoide = (escala, mat, x, y, z) => { const m = esfera(1, mat, x, y, z, 20); m.scale.set(...escala); return m; };
const caja = (w, h, d, mat, x, y, z, r = 0.04) => malla(new T.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), mat, x, y, z);
const cil = (rt, rb, h, mat, x, y, z, seg = 14) => malla(new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const anillo = (r, tubo, mat, x, y, z) => malla(new T.TorusGeometry(r, tubo, 8, 32), mat, x, y, z);
const rot = (obj, x = 0, y = 0, z = 0) => { obj.rotation.set(x, y, z); return obj; };
const grupo = (x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); return g; };

/* ───────────── Personajes ───────────── */

function esqueleto() {
  const raiz = new T.Group();
  const torso = new T.Group();
  raiz.add(torso);
  return { raiz, torso, piernas: [], brazos: [], fase: 0, flota: false };
}

// Estilo de los personajes jugables: sombreado de dibujo animado (tres
// tonos, MeshToonMaterial) y contorno oscuro (casco invertido), como los
// juegos de las tortugas. Los materiales y texturas se reusan entre todos.
let gradiente = null;
const toons = new Map();
function toon(color, map = null, side = T.FrontSide) {
  const clave = color + (map ? map.uuid : '') + side;
  if (!toons.has(clave)) {
    if (!gradiente) {
      gradiente = new T.DataTexture(new Uint8Array([105, 175, 235, 255]), 4, 1, T.RedFormat);
      gradiente.minFilter = gradiente.magFilter = T.NearestFilter;
      gradiente.needsUpdate = true;
    }
    toons.set(clave, new T.MeshToonMaterial({ color, map, side, gradientMap: gradiente }));
  }
  return toons.get(clave);
}
const tinta = () => toons.get('tinta') || toons.set('tinta', new T.MeshBasicMaterial({ color: '#10131c', side: T.BackSide })).get('tinta');
// Pasa a toon los materiales mate del personaje y le agrega el contorno a
// las piezas que no son finitas (las transparentes y las que brillan no).
function estilizar(P) {
  const piezas = [];
  P.raiz.traverse((o) => { if (o.isMesh) piezas.push(o); });
  for (const o of piezas) {
    const m = o.material;
    if (!m.isMeshToonMaterial) {
      if (!m.isMeshStandardMaterial || m.transparent || (m.emissiveIntensity > 0.05 && m.emissive.getHex())) continue;
      o.material = toon('#' + m.color.getHexString(), m.map, m.side);
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
    if (r < 0.045) continue;
    const borde = new T.Mesh(o.geometry, tinta());
    borde.position.copy(o.geometry.boundingSphere.center).multiplyScalar(-0.022 / r);
    borde.scale.setScalar(1 + 0.022 / r);
    borde.userData.contorno = true;
    borde.castShadow = false;
    borde.raycast = () => {};
    o.add(borde);
  }
  return P;
}

// Texturas pintadas una vez: placas del caparazón y surcos del plastrón
// (mapeadas sobre una esfera: el frente es u = 0.25 y la espalda u = 0.75).
const texturas = {};
function textura(nombre, pintar) {
  if (!texturas[nombre]) {
    const lienzo = document.createElement('canvas');
    lienzo.width = 512;
    lienzo.height = 256;
    pintar(lienzo.getContext('2d'));
    const tex = new T.CanvasTexture(lienzo);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    texturas[nombre] = tex;
  }
  return texturas[nombre];
}
function texCaparazon() {
  return textura('caparazon', (c) => {
    c.fillStyle = '#6f6331';
    c.fillRect(0, 0, 512, 256);
    // Placas hexagonales alrededor del centro de la espalda (x = 384).
    const r = 30, h = r * Math.sqrt(3);
    c.lineJoin = 'round';
    for (let col = -5; col <= 5; col++) {
      for (let fila = -1; fila <= 5; fila++) {
        const x = 384 + col * r * 1.5;
        const y = fila * h + (col % 2 ? h / 2 : 0) + 22;
        c.beginPath();
        for (let i = 0; i < 6; i++) c.lineTo(x + r * Math.cos((i * Math.PI) / 3), y + r * Math.sin((i * Math.PI) / 3));
        c.closePath();
        c.fillStyle = (col + fila) % 2 ? '#7d7038' : '#857740';
        c.fill();
        c.lineWidth = 7;
        c.strokeStyle = '#3d3519';
        c.stroke();
      }
    }
  });
}
function texPlastron() {
  return textura('plastron', (c) => {
    c.fillStyle = '#e6c873';
    c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#a7843b';
    c.lineWidth = 6;
    c.lineCap = 'round';
    for (const y of [82, 116, 150, 184]) { c.beginPath(); c.moveTo(40, y); c.lineTo(216, y); c.stroke(); }
    c.beginPath(); c.moveTo(128, 50); c.lineTo(128, 214); c.stroke();
  });
}

function tortuga(m) {
  const P = esqueleto();
  const piel = '#6cb33f', pielOsc = '#4f8f2c', hocico = '#86c95a', borde = '#b39a55', cuero = '#5a3a1e';
  const banda = mate(m.color);
  const venda = mate(mezclar(m.color, 0.25, '#e8dcc0'));
  // Piernas: muslo, rodillera del color de la máscara, canilla, venda y pie de dos dedos.
  for (const s of [-1, 1]) {
    const g = grupo(0.19 * s, 0.68, 0);
    g.add(malla(new T.CapsuleGeometry(0.13, 0.17, 4, 14), piel, 0, -0.15, 0));
    g.add(rot(ovoide([0.1, 0.085, 0.07], banda, 0, -0.33, 0.09), 0.2));
    g.add(malla(new T.CapsuleGeometry(0.1, 0.15, 4, 12), piel, 0, -0.45, -0.01));
    g.add(cil(0.106, 0.11, 0.07, venda, 0, -0.56, -0.01, 14));
    g.add(caja(0.23, 0.1, 0.31, pielOsc, 0, -0.63, 0.05, 0.045));
    for (const d of [-1, 1]) g.add(esfera(0.05, pielOsc, 0.055 * d, -0.64, 0.205, 10));
    P.raiz.add(g);
    P.piernas.push(g);
  }
  const t = P.torso;
  t.add(ovoide([0.37, 0.46, 0.3], piel, 0, 1.06, 0));
  t.add(cil(0.12, 0.14, 0.14, piel, 0, 1.5, 0.03, 14)); // cuello
  // Plastrón con surcos y caparazón con placas.
  t.add(ovoide([0.3, 0.38, 0.14], toon('#ffffff', texPlastron()), 0, 1.05, 0.19));
  t.add(ovoide([0.42, 0.5, 0.27], toon('#ffffff', texCaparazon()), 0, 1.07, -0.15));
  const reborde = anillo(0.4, 0.05, borde, 0, 1.07, -0.06);
  reborde.scale.set(1.02, 1.2, 1);
  t.add(reborde);
  // Cinturón del color de la máscara, con hebilla y las puntas del nudo.
  const cinto = rot(anillo(0.335, 0.05, banda, 0, 0.73, 0), Math.PI / 2);
  cinto.scale.set(1, 0.9, 1);
  t.add(cinto);
  t.add(rot(cil(0.075, 0.075, 0.04, cuero, 0, 0.73, 0.3, 16), Math.PI / 2));
  t.add(rot(cil(0.045, 0.045, 0.045, '#c9a24a', 0, 0.73, 0.315, 12), Math.PI / 2));
  for (const s of [-1, 1]) t.add(rot(caja(0.07, 0.22, 0.025, banda, 0.26 + s * 0.035, 0.6, 0.17, 0.01), 0.15, 0, 0.25 + s * 0.12));
  if (m.arma === 'katana' || m.arma === 'bo') { // correa cruzada que sostiene las armas
    const correa = anillo(0.4, 0.03, cuero, 0, 1.08, -0.03);
    correa.rotation.order = 'ZYX';
    correa.rotation.set(0, Math.PI / 2, -0.75);
    correa.scale.set(0.93, 1.22, 1);
    t.add(correa);
  }
  // Cabeza: cráneo ancho, hocico, boca, máscara con cejas en V y ojos
  // blancos rasgados (sin pupila, como en los juegos).
  const cabeza = grupo(0, 1.62, 0.07);
  const craneo = esfera(0.27, piel, 0, 0, 0, 24);
  craneo.scale.set(1.06, 0.96, 1.02);
  cabeza.add(craneo);
  cabeza.add(ovoide([0.235, 0.145, 0.21], hocico, 0, -0.11, 0.1));
  cabeza.add(rot(malla(new T.TorusGeometry(0.11, 0.013, 6, 18, Math.PI), '#20301a', 0, -0.1, 0.275), 0, 0, Math.PI));
  const mascara = new T.MeshStandardMaterial({ color: m.color, roughness: 0.6, side: T.DoubleSide });
  const cinta = malla(new T.CylinderGeometry(0.278, 0.278, 0.13, 28, 1, true), mascara, 0, 0.04, 0);
  cinta.scale.set(1.07, 1, 1.04);
  cabeza.add(cinta);
  for (const s of [-1, 1]) {
    cabeza.add(rot(ovoide([0.07, 0.04, 0.03], '#ffffff', 0.098 * s, 0.035, 0.258), 0, 0.3 * s, -0.28 * s));
    cabeza.add(rot(caja(0.15, 0.045, 0.035, banda, 0.095 * s, 0.095, 0.252, 0.012), 0, 0.3 * s, -0.34 * s));
    cabeza.add(rot(caja(0.075, 0.5, 0.022, banda, 0.09 * s, -0.14, -0.36, 0.01), 0.85, 0, 0.42 * s)); // puntas de la máscara
  }
  cabeza.add(esfera(0.07, banda, 0, 0.05, -0.29));
  t.add(cabeza);
  // Brazos: hombro, bíceps, codera, antebrazo, venda y puño.
  for (const s of [-1, 1]) {
    const g = grupo(0.41 * s, 1.3, 0);
    g.rotation.z = 0.16 * s;
    g.add(esfera(0.14, piel, 0, -0.02, 0, 16));
    g.add(malla(new T.CapsuleGeometry(0.1, 0.13, 4, 12), piel, 0, -0.17, 0));
    g.add(rot(ovoide([0.08, 0.075, 0.06], banda, 0, -0.3, -0.07), -0.3));
    g.add(malla(new T.CapsuleGeometry(0.088, 0.12, 4, 12), piel, 0, -0.4, 0.01));
    g.add(cil(0.095, 0.098, 0.08, venda, 0, -0.49, 0.01, 14));
    g.add(ovoide([0.105, 0.1, 0.095], pielOsc, 0, -0.59, 0.01));
    g.add(esfera(0.04, pielOsc, -0.07 * s, -0.56, 0.07, 10));
    t.add(g);
    P.brazos.push(g);
  }
  armas(m.arma, P);
  P.mano = -0.59; // altura de la mano (brazo), para la taza de café
  return P;
}

function armas(tipo, P) {
  const madera = '#8b5a2b', metal = '#d6dbe4', mango = '#2a2a33';
  const t = P.torso;
  if (tipo === 'bo') {
    t.add(rot(cil(0.034, 0.034, 1.95, madera, 0, 1.13, -0.45, 8), 0, 0, 0.85));
    for (const y of [-0.7, 0.7]) t.add(rot(cil(0.04, 0.04, 0.12, '#3a2a1a', -Math.sin(0.85) * y, 1.13 + Math.cos(0.85) * y, -0.45, 8), 0, 0, 0.85));
  } else if (tipo === 'katana') {
    for (const s of [-1, 1]) {
      const k = grupo(0.13 * s, 1.15, -0.43);
      k.add(cil(0.03, 0.03, 0.28, mango, 0, 0.52, 0, 8));
      k.add(cil(0.075, 0.075, 0.025, '#c9a227', 0, 0.37, 0, 12));
      k.add(cil(0.042, 0.042, 0.72, '#24242e', 0, -0.02, 0, 10)); // vaina
      k.rotation.z = -0.55 * s;
      t.add(k);
    }
  } else if (tipo === 'sai') {
    for (const s of [-1, 1]) {
      const k = grupo(0.31 * s, 0.66, 0.13);
      k.add(cil(0.028, 0.028, 0.17, '#8e2b2b', 0, 0.08, 0, 8));
      k.add(cil(0.015, 0.015, 0.48, metal, 0, -0.23, 0, 6));
      for (const q of [-1, 1]) k.add(rot(cil(0.013, 0.013, 0.14, metal, 0.05 * q, -0.04, 0, 6), 0, 0, 0.7 * q));
      k.rotation.z = 0.3 * s;
      t.add(k);
    }
  } else if (tipo === 'nunchaku') {
    for (const s of [-1, 1]) t.add(rot(cil(0.037, 0.037, 0.27, madera, 0.32 * s, 0.63, 0.14, 8), 0.2, 0, 0.25 * s));
    t.add(rot(anillo(0.05, 0.008, metal, 0, 0.49, 0.21), Math.PI / 2));
  }
}

function rata(m) {
  const P = esqueleto();
  const pelo = '#8d7160', claro = '#c4a78f', rosa = '#e9a3a3';
  const tunica = mezclar(m.color, 0.14);
  for (const s of [-1, 1]) {
    const g = grupo(0.13 * s, 0.12, 0.04);
    g.add(caja(0.16, 0.08, 0.26, pelo, 0, -0.08, 0.06));
    P.raiz.add(g);
    P.piernas.push(g);
  }
  const t = P.torso;
  t.add(cil(0.26, 0.44, 0.9, tunica, 0, 0.52, 0, 20));
  t.add(ovoide([0.3, 0.26, 0.26], tunica, 0, 0.98, 0));
  t.add(rot(anillo(0.29, 0.04, '#c9a46a', 0, 0.78, 0), Math.PI / 2, 0, 0.18));
  const cabeza = grupo(0, 1.34, 0.02);
  cabeza.add(esfera(0.25, pelo, 0, 0, 0, 22));
  cabeza.add(rot(malla(new T.ConeGeometry(0.12, 0.3, 14), claro, 0, -0.05, 0.27), Math.PI / 2));
  cabeza.add(esfera(0.045, '#2c2222', 0, -0.05, 0.42));
  for (const s of [-1, 1]) {
    cabeza.add(rot(cil(0.13, 0.13, 0.035, pelo, 0.17 * s, 0.2, -0.03, 18), Math.PI / 2));
    cabeza.add(rot(cil(0.085, 0.085, 0.04, rosa, 0.17 * s, 0.2, -0.01, 18), Math.PI / 2));
    cabeza.add(esfera(0.036, '#16181f', 0.09 * s, 0.06, 0.21));
    for (const k of [-1, 1]) cabeza.add(rot(caja(0.24, 0.012, 0.012, '#f5efe6', 0.13 * s, -0.07 + 0.03 * k, 0.32, 0.004), 0, 0.3 * s, 0.12 * k * s));
  }
  cabeza.add(rot(malla(new T.ConeGeometry(0.06, 0.18, 10), '#e6e0d6', 0, -0.22, 0.17), Math.PI));
  for (const s of [-1, 1]) cabeza.add(rot(caja(0.1, 0.025, 0.02, '#e6e0d6', 0.09 * s, 0.13, 0.215, 0.008), 0, 0.3 * s, 0.25 * s)); // cejas
  t.add(cabeza);
  // Kimono: cuello cruzado más claro y el nudo del obi adelante.
  const cuello = mezclar(m.color, 0.45);
  for (const s of [-1, 1]) t.add(rot(caja(0.07, 0.42, 0.02, cuello, 0.07 * s, 0.99, 0.27, 0.01), -0.12, 0, -0.42 * s));
  t.add(esfera(0.06, '#c9a46a', 0.06, 0.79, 0.28, 12));
  for (const s of [-1, 1]) t.add(rot(caja(0.05, 0.2, 0.02, '#c9a46a', 0.06 + 0.04 * s, 0.68, 0.29, 0.008), 0, 0, 0.2 * s));
  for (const s of [-1, 1]) {
    const g = grupo(0.33 * s, 1.06, 0);
    g.rotation.z = 0.15 * s;
    g.add(cil(0.09, 0.13, 0.44, tunica, 0, -0.22, 0));
    g.add(cil(0.15, 0.15, 0.04, mezclar(m.color, 0.45), 0, -0.43, 0, 16)); // borde de la manga
    g.add(esfera(0.085, pelo, 0, -0.47, 0));
    if (s === 1) {
      g.add(cil(0.03, 0.03, 1.3, '#7a5230', 0.02, -0.5, 0.1, 8));
      g.add(esfera(0.05, '#7a5230', 0.02, 0.16, 0.1));
    }
    t.add(g);
    P.brazos.push(g);
  }
  const cola = new T.CatmullRomCurve3([[0, 0.32, -0.3], [0, 0.12, -0.62], [0.22, 0.05, -0.92], [0.48, 0.1, -1.04]].map((p) => new T.Vector3(...p)));
  P.raiz.add(malla(new T.TubeGeometry(cola, 20, 0.032, 6), rosa));
  P.mano = -0.47; // altura de la mano (brazo), para la taza de café
  return P;
}

function april() {
  const P = esqueleto();
  const piel = '#f1c7a1', pelo = '#c4471d', mono = '#e6b422', bota = '#5b3a22';
  for (const s of [-1, 1]) {
    const g = grupo(0.13 * s, 0.52, 0);
    g.add(cil(0.1, 0.11, 0.32, mono, 0, -0.16, 0));
    g.add(cil(0.11, 0.12, 0.2, bota, 0, -0.38, 0));
    g.add(caja(0.2, 0.08, 0.28, bota, 0, -0.47, 0.04));
    P.raiz.add(g);
    P.piernas.push(g);
  }
  const t = P.torso;
  t.add(malla(new T.CapsuleGeometry(0.22, 0.32, 6, 16), mono, 0, 0.9, 0));
  t.add(cil(0.235, 0.235, 0.07, '#6b4423', 0, 0.66, 0, 20));
  t.add(caja(0.08, 0.06, 0.03, '#d8c48a', 0, 0.66, 0.235, 0.01));
  t.add(caja(0.016, 0.36, 0.01, '#b98d12', 0, 0.92, 0.222, 0.004));
  const cabeza = grupo(0, 1.38, 0);
  cabeza.add(esfera(0.24, piel, 0, 0, 0, 22));
  cabeza.add(ovoide([0.27, 0.27, 0.26], pelo, 0, 0.04, -0.05));
  cabeza.add(rot(ovoide([0.25, 0.1, 0.15], pelo, 0, 0.16, 0.12), -0.3));
  for (const s of [-1, 1]) {
    cabeza.add(malla(new T.CapsuleGeometry(0.075, 0.22, 4, 10), pelo, 0.2 * s, -0.07, -0.02));
    cabeza.add(esfera(0.03, '#222222', 0.08 * s, 0.03, 0.215));
  }
  cabeza.add(caja(0.07, 0.016, 0.01, '#b44a4a', 0, -0.08, 0.226, 0.004));
  t.add(cabeza);
  for (const s of [-1, 1]) {
    const g = grupo(0.3 * s, 1.08, 0);
    g.rotation.z = 0.12 * s;
    g.add(cil(0.07, 0.065, 0.4, mono, 0, -0.2, 0));
    g.add(esfera(0.075, piel, 0, -0.43, 0));
    if (s === 1) g.add(rot(cil(0.03, 0.03, 0.72, '#8b5a2b', 0, -0.45, 0.22, 8), 1.2));
    t.add(g);
    P.brazos.push(g);
  }
  P.mano = -0.43; // altura de la mano (brazo), para la taza de café
  return P;
}

function fantasma(m) {
  const P = esqueleto();
  P.flota = true;
  const cuerpo = new T.MeshStandardMaterial({ color: '#eef2ff', transparent: true, opacity: 0.88, emissive: '#93a8ff', emissiveIntensity: 0.3, roughness: 0.45 });
  const t = P.torso;
  t.add(malla(new T.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), cuerpo, 0, 1.15, 0));
  t.add(malla(new T.CylinderGeometry(0.42, 0.47, 0.55, 24, 1, true), cuerpo, 0, 0.875, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    t.add(esfera(0.11, cuerpo, Math.sin(a) * 0.4, 0.62, Math.cos(a) * 0.4, 10));
  }
  for (const s of [-1, 1]) t.add(ovoide([0.06, 0.09, 0.04], '#1b1e2c', 0.13 * s, 1.2, 0.39));
  t.add(ovoide([0.05, 0.06, 0.03], '#1b1e2c', 0, 1.03, 0.43));
  const mascara = new T.MeshStandardMaterial({ color: m.color, roughness: 0.6, side: T.DoubleSide });
  t.add(malla(new T.CylinderGeometry(0.425, 0.425, 0.1, 26, 1, true), mascara, 0, 1.22, 0));
  for (const s of [-1, 1]) t.add(rot(caja(0.08, 0.36, 0.025, mascara, 0.08 * s, 1.06, -0.43, 0.01), 0.35, 0, 0.3 * s));
  for (const s of [-1, 1]) {
    const g = grupo(0.46 * s, 0.98, 0);
    g.add(esfera(0.11, cuerpo, 0, -0.05, 0, 12));
    t.add(g);
    P.brazos.push(g);
  }
  P.mano = -0.05; // altura de la mano (brazo), para la taza de café
  return P;
}

const PERSONAJES = Object.fromEntries(Object.entries({ tortuga, rata, april, fantasma }).map(([k, f]) => [k, (m) => estilizar(f(m))]));

function tacita() {
  const g = new T.Group();
  g.add(cil(0.06, 0.05, 0.09, '#f5efe6', 0, 0.045, 0, 12));
  g.add(cil(0.052, 0.052, 0.006, '#3b2416', 0, 0.088, 0, 12));
  g.add(rot(anillo(0.028, 0.008, '#f5efe6', 0.07, 0.05, 0), 0, 0, Math.PI / 2));
  return g;
}

// Lo que dicen los que esperan en la azotea (un globito a la vez).
// Frases de cada integrante (las que pasó Kevin): las dicen cuando esperan en
// la azotea, mezcladas con las de cada actividad.
const PREGUNTA_ALTAS = '¿Cuántas altas tuvimos en el mes?';
const FRASES_EQUIPO = {
  kevin: ['Antes de preguntar… ¿pensaste?', PREGUNTA_ALTAS, '¿Me explico?', '¿Ya terminaron de jugar?'],
  agustin: ['¿Qué harías vos?', 'Pensando qué automatizar…'],
  agustina: ['¿Alguno tiene gerencial de Sur?', '¿Salimos al break?', '¿Trajeron comida?'],
  rafael: ['Mientras menos pregunten, mejor…', 'Qué tranquilo que está Oeste…'],
  gustavo: ['Tengo hambre…'],
  albana: ['En busca de gerente de tienda…', '¿Salimos así puedo fumar?'],
};
const FRASES = {
  cafe: ['☕ Pausa de café', '☕ ¿Alguien quiere uno?', '¿Quién trajo facturas? 🥐', '☕ Este me salva la tarde'],
  charla: ['¿Cómo venís con las búsquedas?', 'Jajaja 😂', '¡No sabés lo que me pasó!', '¿Arrancaron los ingresos de hoy?', 'Hoy no para el teléfono 📞', '¿Y esa búsqueda cómo va?', '¿Viste el ranking? 👀'],
  ciudad: ['Qué vista 🌃', 'Mañana arranco temprano', 'Se viene el finde 😎', '🌙 …'],
  fantasma: ['Buuu 👻', 'Yo antes trabajaba acá…', '¿Siguen con la planilla vieja? 👻'],
};
// Con sus números reales del mes en curso (si ya tiene altas este mes).
function frasesPropias(m) {
  const d = calcular(m, '1');
  if (d.meses[0] !== MES_HOY || !d.altas) return [];
  if (!m.selectores) return [`El equipo lleva ${fmtInt(d.altas)} altas este mes 🙌`];
  const lista = [`Este mes llevo ${fmtInt(d.altas)} altas 💪`];
  if (d.cumplimiento != null && !d.cumFueraDePeriodo) lista.push(`Cumplimiento del mes: ${fmtPct(d.cumplimiento)} 🎯`);
  return lista;
}
const entre = (a, b) => a + Math.random() * (b - a);
const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];

/* ───────────── Objetos de cada parada ───────────── */

function objeto(tipo) {
  const g = new T.Group();
  if (tipo === 'pizzas') {
    g.add(caja(1.3, 0.5, 1.0, '#8a5a32', 0, 0.25, 0, 0.05));
    for (let i = 0; i < 6; i++) g.add(rot(caja(0.95, 0.11, 0.95, '#f3ede0', ((i * 37) % 7 - 3) * 0.02, 0.56 + i * 0.12, ((i * 53) % 5 - 2) * 0.02, 0.02), 0, ((i * 29) % 9 - 4) * 0.05));
    g.add(cil(0.24, 0.24, 0.012, '#c0392b', 0, 1.22, 0, 24));
  } else if (tipo === 'reloj') {
    g.add(cil(0.06, 0.06, 1.0, '#6b7280', 0, 0.5, 0, 10));
    g.add(caja(0.72, 0.9, 0.4, '#d9dde6', 0, 1.35, 0, 0.06));
    g.add(rot(cil(0.25, 0.25, 0.03, '#ffffff', 0, 1.52, 0.21, 28), Math.PI / 2));
    g.add(anillo(0.25, 0.025, '#3b4352', 0, 1.52, 0.22));
    // Agujas con el eje en el centro de la esfera (giran al tocar el reloj).
    const minutero = grupo(0, 1.52, 0.235);
    minutero.add(caja(0.022, 0.17, 0.012, '#111111', 0, 0.065, 0, 0.004));
    const horaria = grupo(0, 1.52, 0.235);
    horaria.add(caja(0.13, 0.022, 0.012, '#111111', 0.05, 0, 0, 0.004));
    horaria.rotation.z = -0.5;
    g.add(minutero, horaria);
    g.userData.agujas = [minutero, horaria];
    g.add(caja(0.32, 0.04, 0.02, '#333333', 0, 1.06, 0.205, 0.01));
    g.add(rot(caja(0.18, 0.26, 0.012, '#f0c419', 0.03, 1.14, 0.215, 0.005), 0, 0, 0.12));
  } else if (tipo === 'diana') {
    for (const s of [-1, 1]) g.add(rot(caja(0.08, 1.35, 0.08, '#7a5230', 0.35 * s, 0.66, -0.12, 0.02), 0.12, 0, -0.14 * s));
    [[0.62, '#e8e2d0'], [0.5, '#c0392b'], [0.38, '#e8e2d0'], [0.26, '#c0392b'], [0.14, '#e8e2d0'], [0.06, '#c0392b']].forEach(([r, c], i) => {
      g.add(rot(cil(r, r, 0.06, c, 0, 1.36, i * 0.008, 32), Math.PI / 2));
    });
    for (let k = 0; k < 4; k++) g.add(rot(caja(0.26, 0.05, 0.02, '#9aa3b2', 0.16, 1.46, 0.09, 0.01), 0, 0, (k * Math.PI) / 4));
  } else if (tipo === 'carrito') {
    g.add(caja(1.6, 0.8, 0.9, '#d8473f', 0, 0.68, 0, 0.06));
    g.add(caja(1.72, 0.06, 1.0, '#f3ede0', 0, 1.1, 0, 0.02));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(rot(cil(0.22, 0.22, 0.1, '#2b2f3a', 0.55 * sx, 0.22, 0.47 * sz, 16), Math.PI / 2));
      g.add(cil(0.03, 0.03, 1.0, '#cfd4dd', 0.76 * sx, 1.62, 0.44 * sz, 8));
    }
    for (let i = 0; i < 6; i++) g.add(rot(caja(0.29, 0.06, 1.12, i % 2 ? '#ffffff' : '#d8473f', -0.72 + i * 0.29, 2.14, 0, 0.01), 0.12));
  } else if (tipo === 'hamburguesa') {
    g.add(cil(0.6, 0.7, 0.5, '#3b4352', 0, 0.25, 0, 20));
    g.add(cil(0.62, 0.58, 0.18, '#d9973f', 0, 0.6, 0, 24));
    g.add(cil(0.66, 0.66, 0.16, '#5b3418', 0, 0.77, 0, 24));
    g.add(rot(caja(1.2, 0.04, 1.2, '#f4c430', 0, 0.87, 0, 0.01), 0, Math.PI / 4));
    g.add(cil(0.7, 0.68, 0.05, '#6fbf4a', 0, 0.91, 0, 24));
    const pan = malla(new T.SphereGeometry(0.64, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#e0a24a', 0, 0.94, 0);
    pan.scale.y = 0.75;
    g.add(pan);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = 0.18 + (i % 3) * 0.13;
      g.add(esfera(0.025, '#fff3d6', Math.sin(a) * r, 1.36 - r * r * 0.7, Math.cos(a) * r, 6));
    }
  } else if (tipo === 'podio') {
    g.add(caja(0.8, 0.9, 0.8, '#d4af37', 0, 0.45, 0, 0.04));
    // Mira al centro de la azotea: +x queda a la izquierda de quien lo mira.
    g.add(caja(0.8, 0.6, 0.8, '#aeb6c2', 0.84, 0.3, 0, 0.04));
    g.add(caja(0.8, 0.4, 0.8, '#c27c45', -0.84, 0.2, 0, 0.04));
    const copa = new T.Group(); // gira y sube al tocar el podio
    copa.add(cil(0.13, 0.15, 0.06, '#f4d35e', 0, 0.93, 0, 16));
    copa.add(cil(0.03, 0.03, 0.14, '#f4d35e', 0, 1.03, 0, 8));
    copa.add(cil(0.2, 0.1, 0.26, '#f4d35e', 0, 1.22, 0, 20));
    for (const s of [-1, 1]) copa.add(rot(anillo(0.08, 0.02, '#f4d35e', 0.21 * s, 1.24, 0), 0, Math.PI / 2));
    g.add(copa);
    g.userData.copa = copa;
  } else if (tipo === 'terminal') {
    // Consola de computadora: escritorio con un tablero de teclas de luz y,
    // atrás, el emisor de la pantalla holográfica (barras que suben y bajan
    // y una línea que la recorre). En la terminal la pantalla crece hasta
    // quedar justo detrás del panel de datos (Mundo.animarPantalla).
    const metal = '#1d2440', borde = '#2c355c', cian = '#5ef2ff';
    const luzCian = new T.MeshBasicMaterial({ color: cian });
    g.add(caja(2.5, 0.92, 0.85, metal, 0, 0.46, 0, 0.06));
    g.add(caja(2.62, 0.06, 0.95, borde, 0, 0.95, 0, 0.02));
    g.add(caja(2.3, 0.035, 0.02, luzCian, 0, 0.74, 0.43, 0.005));
    const tablero = new T.Group(); // inclinado hacia el que está parado (+z)
    tablero.position.set(0, 1.06, 0.14);
    tablero.rotation.x = 0.32;
    tablero.add(caja(2.2, 0.06, 0.5, borde, 0, 0, 0, 0.02));
    for (let f = 0; f < 2; f++) {
      for (let i = 0; i < 9; i++) tablero.add(caja(0.17, 0.02, 0.11, luzCian, -0.88 + i * 0.22, 0.04, -0.09 + f * 0.17, 0.008));
    }
    g.add(tablero);
    g.add(caja(1.7, 0.1, 0.18, borde, 0, 1.03, -0.3, 0.03));
    g.add(caja(1.5, 0.03, 0.08, luzCian, 0, 1.095, -0.3, 0.01));
    const plano = document.createElement('canvas');
    plano.width = 256;
    plano.height = 160;
    const c = plano.getContext('2d');
    c.strokeStyle = 'rgba(94,242,255,.18)';
    c.lineWidth = 1;
    for (let x = 0; x < 256; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 160); c.stroke(); }
    for (let y = 0; y < 160; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    c.strokeStyle = 'rgba(94,242,255,.9)'; // esquinas del marco
    c.lineWidth = 4;
    for (const [x, y, dx, dy] of [[3, 3, 1, 1], [253, 3, -1, 1], [3, 157, 1, -1], [253, 157, -1, -1]]) {
      c.beginPath(); c.moveTo(x + dx * 30, y); c.lineTo(x, y); c.lineTo(x, y + dy * 24); c.stroke();
    }
    const tex = new T.CanvasTexture(plano);
    tex.colorSpace = T.SRGBColorSpace;
    const pantalla = new T.Group();
    pantalla.position.set(0, 2.2, -0.3);
    const holo = new T.MeshBasicMaterial({ map: tex, color: cian, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false });
    pantalla.add(malla(new T.PlaneGeometry(1.8, 1.12), holo, 0, 0, 0, false));
    const barraMat = new T.MeshBasicMaterial({ color: cian, transparent: true, opacity: 0.75, depthWrite: false });
    const barras = [];
    for (let i = 0; i < 6; i++) {
      const b = malla(new T.BoxGeometry(0.16, 1, 0.02), barraMat, -0.6 + i * 0.24, -0.45, 0.02, false);
      b.geometry.translate(0, 0.5, 0); // crece desde abajo
      barras.push(b);
      pantalla.add(b);
    }
    const linea = malla(new T.PlaneGeometry(1.7, 0.02), barraMat, 0, 0, 0.03, false);
    pantalla.add(linea);
    g.add(pantalla);
    const luz = new T.PointLight(cian, 6, 5, 2);
    luz.position.set(0, 1.9, 0.5);
    g.add(luz);
    g.userData.pantalla = pantalla;
    // s: cuánto está abierta la terminal (0 a 1); con el panel encima las
    // barras se apagan y el holograma queda como un brillo detrás.
    g.userData.anim = (t, s = 0) => {
      barras.forEach((b, i) => { b.scale.y = 0.25 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 0.9)); });
      barraMat.opacity = 0.75 * (1 - s);
      linea.position.y = -0.54 + ((t * 0.35) % 1) * 1.08;
      holo.opacity = (0.5 + Math.sin(t * 9) * 0.04 + (Math.sin(t * 2.3) > 0.97 ? -0.25 : 0)) * (1 - s * 0.45);
    };
  } else if (tipo === 'alcantarilla') {
    g.add(cil(0.98, 0.98, 0.08, '#4a5163', 0, 0.04, 0, 32));
    const luz = new T.MeshBasicMaterial({ color: '#39ff8f' });
    g.add(rot(malla(new T.CircleGeometry(0.8, 32), luz, 0, 0.085, 0, false), -Math.PI / 2));
    const tapa = cil(0.8, 0.8, 0.06, '#5d6577', 0.55, 0.3, -0.35, 32);
    tapa.rotation.set(0.35, 0, 0.5);
    g.add(tapa);
    const verde = new T.PointLight('#39ff8f', 6, 4, 2);
    verde.position.set(0, 0.6, 0);
    g.add(verde);
  }
  return g;
}

/* ───────────── Escena ───────────── */

const Mundo = (() => {
  const VEL = 4.4;
  const BORDE = 10.2;
  let renderer, escena, camara, foco, cielo, lienzo;
  let P = null;
  let raf = 0;
  let ultimo = 0;
  const pos = { x: 0, z: 1.2 };
  let yaw = 0;
  let yawObjetivo = 0;
  let destino = null;
  let paradaDestino = null;
  let salto = 0;
  let atascado = 0;
  let aparicionT = -1;
  let introT = -1;
  let efectos = null;
  const vista = { x: 0, y: 0 };
  let marcador = null;
  const teclas = new Set();
  const joy = { x: 0, z: 0 };
  const obstaculos = [];
  const golpes = []; // mallas invisibles para el clic en cada parada
  const anillos = {};
  const animados = []; // objetos con animación propia (la terminal)
  // Cosas de la azotea que se pueden tocar: id → { g, x, z, alto, r, anim, t, base, refs, el, v }.
  const props = new Map();
  const golpesProps = [];
  let textoProp = null; // personajes.js arma el texto (algunos con datos)
  // Vista de la terminal: k va de 0 (cámara de siempre) a 1 (detrás del
  // personaje, frente a la consola). punto: dónde se para.
  const frente = { on: false, k: 0, punto: { x: 0, z: 0 } };
  let terminal = null; // la consola de la parada de resultados
  // El panel de la terminal en píxeles del lienzo (x, y, w, h; W, H: lienzo).
  const marco = { x: 0, y: 0, w: 0, h: 0, W: 0, H: 0 };
  let alTeclaTerminal = null;
  const anclas = [];
  // Los demás integrantes, quietos en lugares que no tapan paradas ni caminos.
  const esperando = [];
  const LUGARES = [[-2.8, -8.9], [2.8, -8.9], [-9.0, -1.6], [9.0, -1.4], [-8.6, 4.4], [7.4, 8.7], [-6.6, 9.0]];
  // Mientras esperan van a la barra de café, se juntan de a dos a charlar o
  // se asoman al borde a mirar la ciudad (como los robots de la oficina 3D).
  const CAFE = { x: -9.3, z: -4.3 };
  const PUESTOS_CAFE = [[-8.15, -4.3], [-8.5, -3.35], [-8.5, -5.25]].map(([x, z]) => ({ x, z, yaw: Math.atan2(CAFE.x - x, CAFE.z - z), libre: true }));
  const RONDAS = [
    [[-4.4, -9.4], [-5.7, -9.4]], [[6.0, -9.4], [7.3, -9.4]], [[9.4, 4.6], [9.4, 5.9]],
    [[-4.0, 9.6], [-5.3, 9.6]], [[4.6, 9.5], [5.9, 9.5]],
  ].map((par) => ({ par: par.map(([x, z]) => ({ x, z, yaw: 0 })), libre: true }));
  const VISTAS = [[-10.1, 0.8], [10.1, -3.2], [-1.2, -10.1], [4.3, -10.1], [-10.1, -6.4]].map(([x, z]) => ({
    x, z, libre: true, yaw: Math.abs(x) > Math.abs(z) ? Math.sign(x) * Math.PI / 2 : (z > 0 ? 0 : Math.PI),
  }));
  const globo = { el: null, n: null, ultimo: null, hasta: 0, proximo: 0, v: null };
  // Multijugador: los otros jugadores (id → personaje que mueve la red), sus
  // últimas posiciones, los globitos de gestos y las chispas del choque.
  const remotos = new Map();
  const ultimasPos = new Map();
  const burbujas = [];
  const chispazos = [];
  let miKey = null;
  let saludoYo = 0;
  let tiraYo = 0; // brazo que tira
  let golpeYo = 0; // tambaleo cuando me pegan
  let recarga = 0;
  const proyectiles = [];
  let alRecibir = null; // aviso cuando me pegan
  let alPegar = null; // le pegué a otro jugador: avisar a la sala
  let alMoverme = null;
  let enviado = { t: 0, x: 0, z: 0, c: false };
  let forzarPos = false;
  const camPos = { x: 0, y: 0, z: 0 };
  const camMira = { x: 0, y: 0, z: 0 };
  // Cementerio (cementerio.js): otra escena con el mismo personaje. estado:
  // cuenta (3, 2, 1), corre, atrapado o escapo; tiempo: segundos corridos.
  let cem = null;
  const juego = { on: false, estado: 'cuenta', t0: 0, tiempo: 0, cuenta: 0, hundir: 0 };
  let alCementerio = null; // avisos a la pantalla (cuenta, tiempo, fin, salir, otra, fuera)

  function armar() {
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    lienzo = renderer.domElement;
    lienzo.tabIndex = 0;
    lienzo.setAttribute('aria-label', 'Azotea 3D: mové el personaje con las flechas o WASD para visitar cada parada');
    $('#pjCanvas').appendChild(lienzo);

    escena = new T.Scene();
    escena.fog = new T.Fog('#141c40', 32, 95);
    camara = new T.PerspectiveCamera(42, 1, 0.1, 220);

    escena.add(new T.AmbientLight('#9fb0e8', 0.5));
    escena.add(new T.HemisphereLight('#8fa2e0', '#2a2238', 0.9));
    const luna = new T.DirectionalLight('#e4e9ff', 1.6);
    luna.position.set(-8, 20, 12);
    luna.castShadow = true;
    luna.shadow.mapSize.set(2048, 2048);
    luna.shadow.radius = 4;
    luna.shadow.bias = -0.0004;
    luna.shadow.normalBias = 0.03;
    Object.assign(luna.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    escena.add(luna);
    foco = new T.PointLight('#ffd9a8', 10, 7, 2);
    escena.add(foco);

    azotea();
    ciudad();
    PARADAS.forEach(parada);
    PROPS.forEach((d) => {
      const [x, z] = d.en;
      const l = Math.hypot(x, z) || 1;
      const obj = objeto(d.objeto);
      obj.position.set(x, 0, z);
      obj.rotation.y = Math.atan2(-x / l, -z / l); // mirando al centro
      escena.add(obj);
      registrarProp(d.id, obj, { x, z, alto: d.alto, r: d.r, anim: d.anim, emoji: d.emoji, refs: { agujas: obj.userData.agujas, copa: obj.userData.copa } });
    });
    cafeteria();
    globo.el = document.createElement('div');
    globo.el.className = 'pj-globo';
    globo.el.hidden = true;
    capaEtiquetas.appendChild(globo.el);
    globo.v = new T.Vector3();
    marcador = rot(malla(new T.RingGeometry(0.22, 0.32, 28), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }), 0, 0.03, 0, false), -Math.PI / 2);
    escena.add(marcador);

    controles();
    new ResizeObserver(medir).observe($('#pjCanvas'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); else if (!mundoEl.hidden && P) reanudar(); });
  }

  function lienzoCanvas(w, h, pintar) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    pintar(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  // Ventanas iluminadas al azar (una textura compartida por todos los edificios).
  let ventanas = null;
  function texturaVentanas() {
    if (ventanas) return ventanas;
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    ventanas = lienzoCanvas(64, 128, (g, w, h) => {
      g.fillStyle = '#05070f';
      g.fillRect(0, 0, w, h);
      for (let y = 4; y < h - 4; y += 10) {
        for (let x = 4; x < w - 4; x += 10) {
          const r = azar();
          g.fillStyle = r < 0.3 ? '#ffd27a' : r < 0.36 ? '#a8d8ff' : '#141a2c';
          g.fillRect(x, y, 6, 7);
        }
      }
    });
    ventanas.wrapS = ventanas.wrapT = T.RepeatWrapping;
    return ventanas;
  }
  function edificio(w, h, d, x, y, z, color = '#1a1f33') {
    const tex = texturaVentanas().clone();
    tex.repeat.set(Math.max(1, Math.round(w / 2.5)), Math.max(1, Math.round(h / 5)));
    tex.needsUpdate = true;
    const mat = new T.MeshStandardMaterial({ color, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.85, roughness: 0.9 });
    const b = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    return b;
  }

  function azotea() {
    // Edificio propio + techo con membrana asfáltica.
    escena.add(edificio(22.6, 40, 22.6, 0, -20.12, 0, '#3a2a2a'));
    const membrana = lienzoCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#343a52';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a2f44';
      g.lineWidth = 3;
      for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    membrana.wrapS = membrana.wrapT = T.RepeatWrapping;
    membrana.repeat.set(5, 5);
    const piso = new T.Mesh(new T.PlaneGeometry(22, 22), new T.MeshStandardMaterial({ map: membrana, roughness: 0.95 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    escena.add(piso);
    // Pretil de ladrillo con su remate.
    for (const s of [-1, 1]) {
      escena.add(caja(23, 0.6, 0.45, '#6e3a30', 0, 0.3, 11.25 * s, 0.03));
      escena.add(caja(23.2, 0.08, 0.6, '#8d857e', 0, 0.64, 11.25 * s, 0.02));
      escena.add(caja(0.45, 0.6, 23, '#6e3a30', 11.25 * s, 0.3, 0, 0.03));
      escena.add(caja(0.6, 0.08, 23.2, '#8d857e', 11.25 * s, 0.64, 0, 0.02));
    }
    // Tanque de agua (bien de azotea de Nueva York).
    const tanque = grupo(-8.6, 0, -8.6);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tanque.add(cil(0.07, 0.07, 2.2, '#4a3a2e', 0.7 * sx, 1.1, 0.7 * sz, 8));
    tanque.add(cil(1.2, 1.2, 0.1, '#3d3029', 0, 2.2, 0, 20));
    tanque.add(cil(1.1, 1.1, 1.8, '#8a5d3b', 0, 3.15, 0, 22));
    [2.6, 3.2, 3.8].forEach((y) => tanque.add(rot(anillo(1.11, 0.04, '#3b3b40', 0, y, 0), Math.PI / 2)));
    tanque.add(malla(new T.ConeGeometry(1.25, 0.8, 22), '#5b3c28', 0, 4.45, 0));
    escena.add(tanque);
    obstaculos.push({ x: -8.6, z: -8.6, r: 1.5 });
    registrarProp('tanque', tanque, { x: -8.6, z: -8.6, alto: 4.9, r: 1.4, h: 5, anim: 'tiembla', emoji: '💧' });
    // Equipos de aire, antena, salida de la escalera y caños.
    [[8.7, -8.6], [8.9, -6.2]].forEach(([x, z], i) => {
      const aire = grupo(x, 0, z);
      aire.add(caja(1.4, 0.9, 1.0, '#9aa3b2', 0, 0.45, 0, 0.06));
      aire.add(cil(0.32, 0.32, 0.02, '#2b2f3a', 0, 0.91, 0, 20));
      const helice = grupo(0, 0.93, 0); // gira al tocarlo
      for (let k = 0; k < 3; k++) helice.add(rot(caja(0.5, 0.015, 0.09, '#cfd4dd', 0, 0, 0, 0.01), 0, (k * Math.PI * 2) / 3));
      aire.add(helice);
      escena.add(aire);
      obstaculos.push({ x, z, r: 0.85 });
      registrarProp('aire' + (i + 1), aire, { x, z, alto: 1.3, r: 0.8, h: 1.2, anim: 'aire', emoji: '❄️', refs: { helice }, clave: 'aire', obstaculo: false });
    });
    const antena = grupo(9.2, 0, 9.2);
    antena.add(cil(0.04, 0.05, 3.6, '#9aa3b2', 0, 1.8, 0, 8));
    [2.6, 3.1].forEach((y) => antena.add(rot(cil(0.02, 0.02, 1.0, '#9aa3b2', 0, y, 0, 6), 0, 0, Math.PI / 2)));
    const luzAntena = brilla('#ff4d4d', 2);
    antena.add(esfera(0.07, luzAntena, 0, 3.65, 0, 8));
    escena.add(antena);
    obstaculos.push({ x: 9.2, z: 9.2, r: 0.4 });
    registrarProp('antena', antena, { x: 9.2, z: 9.2, alto: 3.9, r: 0.5, h: 3.8, anim: 'antena', emoji: '📡', refs: { luz: luzAntena }, obstaculo: false });
    // Salida de la escalera: la puerta se abre al tocarla (adentro hay luz).
    const escalera = grupo(0, 0, 9.9);
    escalera.add(caja(2.6, 2.2, 1.6, '#5a4a46', 0, 1.1, 0, 0.05));
    escalera.add(caja(0.78, 1.48, 0.02, brilla('#ffd27a', 1.2), 0, 0.75, -0.8, 0.01));
    const hoja = grupo(-0.4, 0, -0.84);
    hoja.add(caja(0.8, 1.5, 0.05, '#3a2f2c', 0.4, 0.75, 0, 0.02));
    escalera.add(hoja);
    escena.add(escalera);
    registrarProp('puerta', escalera, { x: 0, z: 9.9, alto: 2.6, r: 1.3, h: 2.3, anim: 'puerta', emoji: '🚪', refs: { hoja }, obstaculo: false });
    escena.add(esfera(0.08, brilla('#ffd27a', 2), 0, 1.75, 9.0, 10));
    const lampara = new T.PointLight('#ffd27a', 5, 4, 2);
    lampara.position.set(0, 1.7, 8.7);
    escena.add(lampara);
    obstaculos.push({ x: -0.7, z: 9.9, r: 0.95 }, { x: 0.7, z: 9.9, r: 0.95 });
    [[-9.4, 6.4], [-9.4, 7.4]].forEach(([x, z]) => { escena.add(cil(0.18, 0.18, 0.8, '#7d8594', x, 0.4, z, 12)); obstaculos.push({ x, z, r: 0.3 }); });
    // Guirnaldas de luces en tres bordes.
    [[[-10.4, -10.4], [10.4, -10.4]], [[-10.4, -10.4], [-10.4, 10.4]], [[10.4, -10.4], [10.4, 3.6]]].forEach(([a, b]) => guirnalda(a, b));
  }

  // Mesa alta con cafetera, termo, tazas y cartel de neón.
  function cafeteria() {
    const g = grupo(CAFE.x, 0, CAFE.z);
    g.add(cil(0.34, 0.4, 0.05, '#3b3b40', 0, 0.025, 0, 16));
    g.add(cil(0.07, 0.09, 0.9, '#3b3b40', 0, 0.47, 0, 10));
    g.add(cil(0.72, 0.72, 0.07, '#8a5a32', 0, 0.94, 0, 28));
    g.add(caja(0.32, 0.44, 0.3, '#c0392b', -0.25, 1.2, -0.2, 0.05));
    g.add(caja(0.18, 0.05, 0.1, '#2b2f3a', -0.25, 1.06, -0.02, 0.02));
    g.add(esfera(0.035, brilla('#7cfc9a', 2), -0.15, 1.34, -0.04, 8));
    g.add(cil(0.08, 0.08, 0.34, '#d6dbe4', 0.28, 1.15, -0.22, 12));
    [[0.22, 0.24], [0.42, 0.04], [-0.02, 0.38]].forEach(([x, z]) => { const t = tacita(); t.position.set(x, 0.975, z); g.add(t); });
    g.add(cil(0.03, 0.03, 2.4, '#3b3b40', -0.55, 1.2, -0.55, 8));
    const neon = lienzoCanvas(256, 104, (c, w, h) => {
      c.fillStyle = '#1a0f0a';
      c.fillRect(0, 0, w, h);
      c.font = 'bold 58px "Bungee", "Arial Black", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = '#ffb36b';
      c.shadowBlur = 18;
      c.fillStyle = '#ffd9a8';
      c.fillText('☕ CAFÉ', w / 2, h / 2 + 4);
    });
    const neonMat = new T.MeshBasicMaterial({ map: neon });
    const cartel = new T.Mesh(new T.PlaneGeometry(1.1, 0.45), neonMat);
    cartel.position.set(-0.55, 2.25, -0.55);
    cartel.rotation.y = Math.PI / 4; // mirando a la cámara y al centro
    g.add(cartel);
    const luz = new T.PointLight('#ffb36b', 5, 4, 2);
    luz.position.set(0, 1.7, 0);
    g.add(luz);
    escena.add(g);
    obstaculos.push({ x: CAFE.x, z: CAFE.z, r: 0.8 });
    registrarProp('cafe', g, { x: CAFE.x, z: CAFE.z, alto: 2.7, r: 0.8, anim: 'cafe', emoji: '☕', refs: { neon: neonMat }, obstaculo: false });
  }

  function guirnalda([ax, az], [bx, bz]) {
    const ALTO = 2.6;
    [[ax, az], [bx, bz]].forEach(([x, z]) => escena.add(cil(0.05, 0.05, ALTO, '#3b3b40', x, ALTO / 2, z, 8)));
    const largo = Math.hypot(bx - ax, bz - az);
    const n = Math.round(largo / 0.9);
    const puntos = [];
    const colores = ['#ffd27a', '#ff9a7a', '#9fe0ff', '#b8ffb0'];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const y = ALTO - Math.sin(k * Math.PI) * 0.7;
      const p = new T.Vector3(ax + (bx - ax) * k, y, az + (bz - az) * k);
      puntos.push(p);
      if (i > 0 && i < n) escena.add(esfera(0.07, new T.MeshBasicMaterial({ color: colores[i % colores.length] }), p.x, p.y - 0.08, p.z, 8));
    }
    escena.add(new T.Line(new T.BufferGeometry().setFromPoints(puntos), new T.LineBasicMaterial({ color: '#23263a' })));
  }

  function ciudad() {
    // Edificios vecinos con ventanas, luna y estrellas (siempre igual: semilla fija).
    let semilla = 42;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2 + azar() * 0.08;
      const r = 20 + azar() * 26;
      const w = 3 + azar() * 5;
      const d = 3 + azar() * 5;
      const tope = -12 + azar() * 30;
      const alto = tope + 45;
      escena.add(edificio(w, alto, d, Math.cos(a) * r, tope - alto / 2, Math.sin(a) * r, ['#161b2e', '#1b2036', '#20263d'][i % 3]));
    }
    const luna = new T.Mesh(new T.SphereGeometry(3.2, 24, 16), new T.MeshBasicMaterial({ color: '#fdf6d8', fog: false }));
    luna.position.set(-36, 40, -64);
    escena.add(luna);
    const n = 600;
    const estrellas = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = azar() * Math.PI * 2;
      const e = 0.12 + azar() * 1.3;
      estrellas.set([Math.cos(a) * Math.cos(e) * 110, Math.sin(e) * 110, Math.sin(a) * Math.cos(e) * 110], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(estrellas, 3));
    escena.add(new T.Points(geo, new T.PointsMaterial({ color: '#dfe6ff', size: 0.45, fog: false })));
  }

  function pintarCielo(color) {
    if (cielo) cielo.dispose();
    cielo = lienzoCanvas(4, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#04060f');
      grad.addColorStop(0.55, '#111a3e');
      grad.addColorStop(1, mezclar(mezclar(color, 0.25), 0.55, '#141c40'));
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    escena.background = cielo;
  }

  function parada(p) {
    const [px, pz] = p.pos;
    const largo = Math.hypot(px, pz) || 1;
    const dx = px / largo, dz = pz / largo;
    const lejos = p.lejos ?? 1.75;
    const ox = px + dx * lejos, oz = pz + dz * lejos;
    if (lejos) {
      escena.add(cil(1.05, 1.05, 0.05, '#262c47', px, 0.025, pz, 36));
      obstaculos.push({ x: ox, z: oz, r: p.objeto === 'podio' ? 1.3 : p.objeto === 'carrito' ? 1.05 : 0.9 });
    }
    const aro = rot(malla(new T.RingGeometry(0.86, 1.05, 48), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }), px, 0.06, pz, false), -Math.PI / 2);
    escena.add(aro);
    anillos[p.id] = aro;
    const obj = objeto(p.objeto);
    obj.position.set(ox, 0, oz);
    obj.rotation.y = Math.atan2(-dx, -dz);
    escena.add(obj);
    if (p.objeto === 'terminal') {
      terminal = obj;
      frente.punto = { x: px, z: pz };
      for (const s of [-1, 1]) obstaculos.push({ x: ox + s * 0.9, z: oz, r: 0.45 }); // el escritorio es ancho
    }
    if (obj.userData.anim) animados.push(obj);
    const golpe = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 2.4, 12), new T.MeshBasicMaterial({ visible: false }));
    golpe.position.set(ox, 1.2, oz);
    golpe.userData.parada = p.id;
    escena.add(golpe);
    golpes.push(golpe);
    const el = document.createElement('div');
    el.className = 'pj-etiqueta';
    el.dataset.id = p.id;
    el.addEventListener('click', () => irA(p.id));
    capaEtiquetas.appendChild(el);
    const altura = { terminal: 3.1, alcantarilla: 1.3 }[p.objeto];
    anclas.push({ el, v: new T.Vector3(ox, altura, oz) });
  }

  /* ── Cosas que se tocan ── */
  // clave: qué texto le toca (los dos aires dicen lo mismo).
  function registrarProp(id, g, { x, z, alto, r = 0.9, h = 2.4, anim, emoji, refs = {}, clave = id, obstaculo = true }) {
    const golpe = new T.Mesh(new T.CylinderGeometry(r, r, h, 10), new T.MeshBasicMaterial({ visible: false }));
    golpe.position.set(x, h / 2, z);
    golpe.userData.prop = id;
    escena.add(golpe);
    golpesProps.push(golpe);
    if (obstaculo && !obstaculos.some((o) => Math.hypot(o.x - x, o.z - z) < 0.3)) obstaculos.push({ x, z, r: Math.min(r, 1.5) });
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pj-prop';
    el.textContent = emoji;
    el.setAttribute('aria-label', 'Tocar');
    el.addEventListener('click', () => tocarProp(id));
    capaEtiquetas.appendChild(el);
    props.set(id, {
      id, clave, g, x, z, alto, r, anim, refs, el, t: -1, dur: 1.3, v: new T.Vector3(x, alto + 0.35, z),
      base: { x: g.position.x, y: g.position.y, z: g.position.z, ry: g.rotation.y },
    });
  }
  function tocarProp(id) {
    const p = props.get(id);
    if (!p || (p.t >= 0 && p.t < 0.4) || frente.on) return;
    p.t = 0;
    if (P) yawObjetivo = Math.atan2(p.x - pos.x, p.z - pos.z);
    const chispas = { pizzas: ['#f2c14e', 1.4], hamburguesa: ['#e0a24a', 1.5], tanque: ['#7fd0ff', 4.6], aire1: ['#e8f4ff', 1.2], aire2: ['#e8f4ff', 1.2], cafe: ['#d9d9d9', 1.7] }[id];
    if (chispas) salpicar(p.x, chispas[1], p.z, chispas[0], 30);
    if (id === 'podio') chispazo(p.x, p.z);
    burbuja('prop:' + id, (textoProp && textoProp(p.clave)) || '✨');
    Sonido.parada();
  }
  function animarProps(t, dt) {
    for (const p of props.values()) {
      if (P) p.el.classList.toggle('pj--cerca', Math.hypot(pos.x - p.x, pos.z - p.z) < p.r + 2.2);
      if (p.t < 0) continue;
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const { g, base, refs } = p;
      if (p.anim === 'rebota') {
        const sq = Math.sin(k * Math.PI * 3) * 0.12 * (1 - k);
        g.position.y = base.y + Math.sin(k * Math.PI) * 0.7;
        g.scale.set(1 + sq, 1 - sq, 1 + sq);
      } else if (p.anim === 'gira') g.rotation.y = base.ry + suave(k) * Math.PI * 2;
      else if (p.anim === 'tiembla') {
        g.position.x = base.x + Math.sin(p.t * 55) * 0.07 * (1 - k);
        g.position.z = base.z + Math.cos(p.t * 47) * 0.05 * (1 - k);
      } else if (p.anim === 'reloj') refs.agujas.forEach((a, i) => { a.rotation.z -= dt * (i ? 6 : 24); });
      else if (p.anim === 'copa') {
        refs.copa.rotation.y = suave(k) * Math.PI * 4;
        refs.copa.position.y = Math.sin(k * Math.PI) * 0.5;
      } else if (p.anim === 'aire') refs.helice.rotation.y += dt * 40;
      else if (p.anim === 'antena') refs.luz.emissiveIntensity = Math.sin(p.t * 30) > 0 ? 5 : 0.3;
      else if (p.anim === 'puerta') refs.hoja.rotation.y = -Math.sin(k * Math.PI) * 1.3;
      else if (p.anim === 'cafe') refs.neon.color.setScalar(Math.sin(p.t * 35) > -0.3 ? 1 : 0.35);
      if (k < 1) continue;
      g.position.set(base.x, base.y, base.z);
      g.rotation.y = base.ry;
      g.scale.setScalar(1);
      if (refs.copa) refs.copa.rotation.y = refs.copa.position.y = 0;
      if (refs.luz) refs.luz.emissiveIntensity = 2;
      if (refs.hoja) refs.hoja.rotation.y = 0;
      if (refs.neon) refs.neon.color.setScalar(1);
      p.t = -1;
    }
  }
  // Lo más cercano para tocar con la tecla E.
  function tocarCerca() {
    let mejor = null;
    let dist = Infinity;
    for (const p of props.values()) {
      const d = Math.hypot(pos.x - p.x, pos.z - p.z) - p.r;
      if (d < 2 && d < dist) { dist = d; mejor = p; }
    }
    if (mejor) tocarProp(mejor.id);
  }

  /* ── Vista de la terminal ── */
  // Al entrar camina hasta el centro del círculo y se da vuelta hacia la
  // consola; mientras tanto no se mueve con teclas ni joystick.
  function vistaFrente(on) {
    frente.on = on;
    if (!on) return;
    destino = { ...frente.punto };
    paradaDestino = null;
    teclas.clear();
    joy.x = joy.z = 0;
  }
  // Cámara de la terminal: detrás del personaje (sobre el hombro en
  // pantallas anchas), mirando derecho a la consola. La distancia y la altura
  // salen del panel: la cabeza queda justo debajo y se ve de los hombros
  // para arriba (de la cintura, en pantallas angostas).
  const CABEZA = 1.7; // alto de la cabeza de los personajes, con margen
  const tanFov = () => Math.tan((camara.fov * Math.PI) / 360);
  function poseTerminal() {
    const t = tanFov();
    const abajo = marco.H ? 1 - (2 * (marco.y + marco.h)) / marco.H : -0.35; // borde de abajo del panel, de -1 a 1
    const angosta = camara.aspect < 1;
    const tramo = angosta ? 0.9 : 0.62;
    const dist = Math.min(6, Math.max(1.8, tramo / (Math.max(0.05, abajo + 0.97) * t)));
    return { x: frente.punto.x + (angosta ? 0 : 0.45), y: CABEZA - tramo + dist * t, z: frente.punto.z + dist };
  }
  // La pantalla holográfica crece desde la consola hasta quedar exactamente
  // detrás del panel (un rectángulo de la pantalla a la distancia de la
  // consola, visto desde la cámara final).
  function animarPantalla(s) {
    const pan = terminal?.userData.pantalla;
    if (!pan) return;
    let x = 0, y = 2.2, sx = 1, sy = 1;
    if (s > 0.001 && marco.W) {
      const c = poseTerminal();
      const ta = tanFov(), a = marco.W / marco.H;
      const d = c.z - (terminal.position.z + pan.position.z);
      const x0 = (2 * marco.x) / marco.W - 1, x1 = (2 * (marco.x + marco.w)) / marco.W - 1;
      const y1 = 1 - (2 * marco.y) / marco.H, y0 = 1 - (2 * (marco.y + marco.h)) / marco.H;
      const mez = (u, v) => u + (v - u) * s;
      x = mez(x, c.x + ((x0 + x1) / 2) * d * ta * a - terminal.position.x);
      y = mez(y, c.y + ((y0 + y1) / 2) * d * ta);
      sx = mez(sx, ((x1 - x0) * d * ta * a * 0.97) / 1.8);
      sy = mez(sy, ((y1 - y0) * d * ta * 0.97) / 1.12);
    }
    pan.position.x = x;
    pan.position.y = y;
    pan.scale.set(sx, sy, 1);
  }
  // Al salir de una parada camina unos pasos hacia el centro.
  function salirDeParada() {
    vistaFrente(false);
    const p = PARADAS.find((x) => x.id === paradaActiva);
    if (!p) return;
    const [px, pz] = p.pos;
    const l = Math.hypot(px, pz) || 1;
    destino = { x: px - (px / l) * 2.3, z: pz - (pz / l) * 2.3 };
  }

  // n: número de jugador; cada uno aparece en su lugar para no pisarse.
  function iniciarPersonaje(m, n = 1) {
    salirCementerio();
    if (P) {
      escena.remove(P.raiz);
      P.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    P = PERSONAJES[m.personaje](m);
    P.raiz.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.contorno; });
    escena.add(P.raiz);
    pintarCielo(m.color);
    const acento = paraOscuro(m.color, '#262c47', 3);
    Object.values(anillos).forEach((a) => a.material.color.set(acento));
    marcador.material.color.set(acento);
    pos.x = [0, 1.5, -1.5, 3][(n - 1) % 4]; pos.z = 1.2;
    yaw = yawObjetivo = 0;
    destino = paradaDestino = null;
    teclas.clear();
    joy.x = joy.z = 0;
    activarParada(null);
    armarEsperando(m);
    medir();
    colocarCamara(1);
    if (reduce) {
      aparicionT = -1;
      introT = -1;
    } else {
      aparicionT = performance.now();
      introT = aparicionT;
      P.raiz.scale.setScalar(0.001);
      efectosAparicion(acento);
    }
    reanudar();
    lienzo.focus({ preventScroll: true });
  }

  function quitarNpc(n) {
    soltar(n);
    if (globo.n === n) { globo.n = null; globo.el.hidden = true; }
    if (globo.ultimo === n) globo.ultimo = null;
    escena.remove(n.P.raiz);
    n.P.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    n.el.remove();
    esperando.splice(esperando.indexOf(n), 1);
  }
  function crearNpc(m) {
    const i = EQUIPO.indexOf(m); // cada integrante tiene su lugar fijo en la azotea
    const [x, z] = LUGARES[i];
    const Q = PERSONAJES[m.personaje](m);
    Q.raiz.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.contorno; });
    const golpe = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 2, 10), new T.MeshBasicMaterial({ visible: false }));
    golpe.position.y = 1;
    golpe.userData.integrante = m.key;
    Q.raiz.add(golpe);
    const yaw0 = Math.atan2(-x, -z); // mirando al centro de la azotea
    Q.raiz.position.set(x, 0, z);
    Q.raiz.rotation.y = yaw0;
    escena.add(Q.raiz);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pj-npc';
    el.innerHTML = `<span><i style="background:${paraOscuro(m.color)}"></i>${esc(m.label.split(' ')[0])}</span><small>Tocá para jugar</small>`;
    el.setAttribute('aria-label', `Jugar con ${m.label}`);
    el.addEventListener('click', () => cambiarA(m));
    capaEtiquetas.appendChild(el);
    const taza = tacita();
    taza.position.set(0, Q.mano - 0.02, 0.1);
    taza.visible = false;
    Q.brazos[0].add(taza);
    esperando.push({
      m, P: Q, x, z, yaw: yaw0, casa: { x, z, yaw: yaw0 }, desfase: i * 1.7, saludo: 0, cerca: false, golpe, el, taza,
      alto: Q.flota ? 2.4 : 2.0, v: new T.Vector3(x, Q.flota ? 2.4 : 2.0, z), propias: frasesPropias(m),
      // Arrancan quietos y al ratito cada uno se va a hacer algo.
      estado: 'quieto', hasta: reduce ? Infinity : performance.now() + entre(800, 5000), destino: null, luego: null, lugar: null, ronda: null, compa: null, rumbo: yaw0, tCamino: 0, mejor: Infinity, sinAvance: 0,
    });
  }
  // Esperan todos menos mi personaje y los que mueven otros jugadores.
  function ajustarNpcs() {
    if (!miKey) return;
    const fuera = new Set([miKey, ...[...remotos.values()].map((r) => r.key)]);
    for (const n of [...esperando]) if (fuera.has(n.m.key)) quitarNpc(n);
    for (const m of EQUIPO) if (!fuera.has(m.key) && !esperando.some((n) => n.m === m)) crearNpc(m);
  }
  function armarEsperando(elegido) {
    for (const n of [...esperando]) quitarNpc(n);
    [...PUESTOS_CAFE, ...RONDAS, ...VISTAS].forEach((l) => { l.libre = true; });
    globo.n = globo.ultimo = null;
    if (globo.el) globo.el.hidden = true;
    miKey = elegido.key;
    ajustarNpcs();
  }

  /* ── Multijugador ── */
  function quitarRemoto(id) {
    const r = remotos.get(id);
    if (!r) return;
    escena.remove(r.Q.raiz);
    r.Q.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    r.el.remove();
    remotos.delete(id);
  }
  // lista: los otros jugadores que están en la azotea (ya validados).
  function sincronizarRemotos(lista) {
    if (!escena) return;
    const ids = new Set(lista.map((o) => o.id));
    for (const [id, r] of remotos) {
      const o = lista.find((x) => x.id === id);
      if (!ids.has(id) || o.personaje !== r.key) quitarRemoto(id);
    }
    for (const o of lista) {
      let r = remotos.get(o.id);
      if (!r) {
        const m = EQUIPO.find((x) => x.key === o.personaje);
        const Q = PERSONAJES[m.personaje](m);
        Q.raiz.traverse((x) => { if (x.isMesh) x.castShadow = !x.userData.contorno; });
        const p = ultimasPos.get(o.id);
        Q.raiz.visible = !!p;
        escena.add(Q.raiz);
        const el = document.createElement('div');
        el.className = 'pj-remoto';
        capaEtiquetas.appendChild(el);
        r = { id: o.id, key: m.key, m, Q, el, x: p ? p.x : 0, z: p ? p.z : 4, yaw: p ? p.yaw : 0, obj: p || null, c: false, saludo: 0, tira: 0, golpe: 0, alto: Q.flota ? 2.45 : 2.05, v: new T.Vector3() };
        remotos.set(o.id, r);
        forzarPos = true; // que el nuevo me vea enseguida
      }
      r.n = o.n;
      const p = PARADAS.find((x) => x.id === o.parada);
      r.el.style.setProperty('--pc', colorP(o.n));
      r.el.innerHTML = `<span><b class="pj-p">${tagP(o.n)}</b>${esc(r.m.label.split(' ')[0])}</span>${p ? `<small>${p.icono} ${esc(p.titulo)}</small>` : ''}`;
    }
    ajustarNpcs();
    $('#pjGestos').classList.toggle('pj--solo', remotos.size === 0); // los gestos, solo con alguien más
  }
  function moverRemoto(id, p) {
    const x = Number(p.x), z = Number(p.z), yawR = Number(p.yaw);
    if (![x, z, yawR].every(Number.isFinite)) return;
    const pos2 = { x: Math.max(-BORDE, Math.min(BORDE, x)), z: Math.max(-BORDE, Math.min(BORDE, z)), yaw: yawR, c: !!p.c };
    ultimasPos.set(id, pos2);
    const r = remotos.get(id);
    if (!r) return;
    r.obj = pos2;
    if (!r.Q.raiz.visible) { r.x = pos2.x; r.z = pos2.z; r.yaw = pos2.yaw; r.Q.raiz.visible = true; }
  }
  function animarRemotos(t, dt) {
    const f = 1 - Math.exp(-dt * 10);
    for (const r of remotos.values()) {
      const antes = { x: r.x, z: r.z };
      let caminando = false;
      if (r.obj) {
        const dx = r.obj.x - r.x, dz = r.obj.z - r.z;
        caminando = r.obj.c || Math.hypot(dx, dz) > 0.06;
        r.x += dx * f;
        r.z += dz * f;
        let dif = r.obj.yaw - r.yaw;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        r.yaw += dif * (1 - Math.exp(-dt * 12));
      }
      r.saludo = Math.max(0, r.saludo - dt);
      if (r.salto > 0) r.salto = Math.max(0, r.salto - dt);
      r.Q.raiz.position.set(r.x, r.salto > 0 ? Math.sin((1 - r.salto / 0.4) * Math.PI) * 0.45 : 0, r.z);
      r.Q.raiz.rotation.y = r.yaw;
      r.v.set(r.x, r.alto, r.z);
      velocidad(r, antes, dt);
      r.tira = Math.max(0, r.tira - dt);
      r.golpe = Math.max(0, r.golpe - dt);
      animarCuerpo(r.Q, t, dt, caminando, { saluda: r.saludo > 0, tira: r.tira, golpe: r.golpe });
    }
  }
  // Mi posición a la sala: hasta 8 veces por segundo mientras camino, una vez
  // al frenar y cada 2 s para los que recién llegan.
  function avisarPosicion(ahora, caminando) {
    if (!alMoverme) return;
    const movido = Math.hypot(pos.x - enviado.x, pos.z - enviado.z) > 0.02;
    const toca = forzarPos || (caminando && movido && ahora - enviado.t > 125) || (!caminando && enviado.c) || ahora - enviado.t > 2000;
    if (!toca) return;
    forzarPos = false;
    enviado = { t: ahora, x: pos.x, z: pos.z, c: !!caminando };
    alMoverme({ x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), yaw: +yaw.toFixed(2), c: !!caminando });
  }

  // Gestos: globito arriba del personaje y saludo; "chocá los cinco" con
  // alguien cerca: se miran, saltan y salen chispas entre los dos.
  function burbuja(de, texto) {
    const vieja = burbujas.find((b) => b.de === de);
    if (vieja) { vieja.el.remove(); burbujas.splice(burbujas.indexOf(vieja), 1); }
    const el = document.createElement('div');
    el.className = 'pj-globo pj-globo--jugador';
    el.textContent = texto;
    capaEtiquetas.appendChild(el);
    burbujas.push({ de, el, hasta: performance.now() + 2800, v: new T.Vector3() });
  }
  function chispazo(x, z) {
    const n = 40;
    const posiciones = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 2.5;
      vel.push([Math.cos(a) * v, 2 + Math.random() * 3, Math.sin(a) * v]);
      posiciones.set([x, 1.6, z], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(posiciones, 3));
    const puntos = new T.Points(geo, new T.PointsMaterial({ color: '#ffe27a', size: 0.14, transparent: true, depthWrite: false }));
    escena.add(puntos);
    chispazos.push({ puntos, vel, t: 0 });
  }
  function animarChispazos(dt) {
    for (const c of [...chispazos]) {
      c.t += dt;
      const arr = c.puntos.geometry.attributes.position;
      for (let i = 0; i < c.vel.length; i++) {
        const v = c.vel[i];
        v[1] -= 8 * dt;
        arr.setXYZ(i, arr.getX(i) + v[0] * dt, Math.max(0.05, arr.getY(i) + v[1] * dt), arr.getZ(i) + v[2] * dt);
      }
      arr.needsUpdate = true;
      c.puntos.material.opacity = Math.max(0, 1 - c.t / 1.1);
      if (c.t > 1.2) {
        escena.remove(c.puntos);
        c.puntos.geometry.dispose();
        c.puntos.material.dispose();
        chispazos.splice(chispazos.indexOf(c), 1);
      }
    }
  }
  // de: null = yo; si no, el id del otro jugador.
  function gesto(de, g) {
    const G = GESTOS[g];
    const r = de ? remotos.get(de) : null;
    if (!G || (de && !r)) return;
    const yoX = pos.x, yoZ = pos.z;
    if (g === 'cinco') {
      // ¿Con quién? El otro jugador más cerca (a menos de 2,4).
      let compa = r;
      if (!de) {
        let mejor = 2.4;
        compa = null;
        for (const o of remotos.values()) {
          const d = Math.hypot(o.x - yoX, o.z - yoZ);
          if (d < mejor) { mejor = d; compa = o; }
        }
      }
      if (compa && Math.hypot(compa.x - yoX, compa.z - yoZ) < 2.4) {
        yawObjetivo = Math.atan2(compa.x - yoX, compa.z - yoZ);
        salto = 0.35;
        saludoYo = 1.2;
        compa.saludo = 1.2;
        compa.salto = 0.4;
        chispazo((yoX + compa.x) / 2, (yoZ + compa.z) / 2);
        burbuja(de || 'yo', '✋ ¡Choque!');
        Sonido.elegir();
        return;
      }
    }
    if (de) r.saludo = 1.6;
    else saludoYo = 1.6;
    burbuja(de || 'yo', `${G.e} ${G.t}`);
    if (de) Sonido.parada();
  }
  function posicionarBurbujas(r) {
    const ahora = performance.now();
    for (const b of [...burbujas]) {
      const quien = b.de === 'yo' ? { x: pos.x, z: pos.z, alto: P.flota ? 2.45 : 2.05 }
        : b.de.startsWith('npc:') ? esperando.find((n) => 'npc:' + n.m.key === b.de)
        : b.de.startsWith('prop:') ? props.get(b.de.slice(5)) : remotos.get(b.de);
      if (!quien || ahora > b.hasta) { b.el.remove(); burbujas.splice(burbujas.indexOf(b), 1); continue; }
      proy.v.copy(b.v.set(quien.x, quien.alto + 0.75, quien.z)).project(camara);
      const x = ((proy.v.x + 1) / 2) * r.width;
      const y = Math.max(b.el.offsetHeight + 4, ((1 - proy.v.y) / 2) * r.height);
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  /* ── Tirar cosas ── */
  const G_TIRO = 9;
  const RADIO_GOLPE = 0.75;
  // Velocidad suavizada de cada uno, para apuntar adonde va a estar.
  function velocidad(o, antes, dt) {
    if (!dt) return;
    o.vel = o.vel || { x: 0, z: 0 };
    o.vel.x += ((o.x - antes.x) / dt - o.vel.x) * 0.3;
    o.vel.z += ((o.z - antes.z) / dt - o.vel.z) * 0.3;
  }
  function modeloTiro(tipo) {
    const g = new T.Group();
    if (tipo === 'pizza') {
      const porcion = cil(0.3, 0.3, 0.05, '#f2c14e', 0, 0, 0, 3);
      porcion.scale.set(1, 1, 0.8);
      g.add(porcion);
      g.add(rot(cil(0.05, 0.05, 0.36, '#c98a3a', -0.15, 0.01, 0, 8), 0, 0, Math.PI / 2));
      [[0.05, 0.06], [-0.02, -0.08], [0.12, -0.04]].forEach(([x, z]) => g.add(cil(0.045, 0.045, 0.02, '#c0392b', x, 0.035, z, 10)));
    } else if (tipo === 'burger') {
      g.add(esfera(0.18, '#e0a24a', 0, 0.08, 0, 14));
      g.add(cil(0.2, 0.2, 0.07, '#5b3418', 0, -0.02, 0, 16));
      g.add(cil(0.21, 0.21, 0.02, '#6fbf4a', 0, 0.03, 0, 16));
      g.add(cil(0.18, 0.18, 0.06, '#d9973f', 0, -0.08, 0, 16));
      g.children[0].scale.y = 0.6;
    } else {
      g.add(malla(new T.SphereGeometry(0.2, 16, 12), new T.MeshStandardMaterial({ color: '#4fb3ff', transparent: true, opacity: 0.85, roughness: 0.2 }), 0, 0, 0));
      g.add(cil(0.03, 0.05, 0.08, '#2f7dc4', 0, 0.21, 0, 8));
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function lanzar(de, tipo, p) {
    const mesh = modeloTiro(tipo);
    mesh.position.set(p.x, p.y, p.z);
    escena.add(mesh);
    proyectiles.push({ de, tipo, mesh, x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz, t: 0, giro: 6 + Math.random() * 6 });
  }
  // Velocidad para que caiga sobre (tx, tz) a la altura del pecho.
  function apuntar(x, y, z, tx, tz) {
    const d = Math.hypot(tx - x, tz - z);
    const T0 = Math.max(0.3, Math.min(1.1, d / 10));
    return { vx: (tx - x) / T0, vz: (tz - z) / T0, vy: (1.1 - y + 0.5 * G_TIRO * T0 * T0) / T0 };
  }
  // Tiro mío: apunta solo al más cercano que tenga adelante (otro jugador
  // primero); si no hay nadie, derecho hacia donde miro. Devuelve el tiro
  // para mandarlo a la sala.
  function tirar(tipo) {
    if (!TIROS[tipo] || !P || recarga > 0 || aparicionT >= 0) return null;
    recarga = 0.45;
    tiraYo = 0.35;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const candidatos = [...[...remotos.values()].map((r) => ({ o: r, peso: 0.7 })), ...esperando.map((n) => ({ o: n, peso: 1 }))].map((c) => ({ ...c, x: c.o.x, z: c.o.z }));
    let mejor = null;
    let puntaje = Infinity;
    for (const c of candidatos) {
      const dx = c.x - pos.x, dz = c.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6 || d > 12 || (dx * fx + dz * fz) / d < 0.45) continue; // adelante: menos de ~63°
      if (d * c.peso < puntaje) { puntaje = d * c.peso; mejor = c; }
    }
    const x = pos.x + fx * 0.5, y = 1.5, z = pos.z + fz * 0.5;
    let v = { vx: fx * 9, vz: fz * 9, vy: 3.4 };
    if (mejor) {
      // Adonde va a estar cuando llegue el tiro (dos pasadas alcanzan).
      const vel = mejor.o.vel || { x: 0, z: 0 };
      let tx = mejor.x, tz = mejor.z;
      for (let k = 0; k < 2; k++) {
        const T0 = Math.max(0.3, Math.min(1.1, Math.hypot(tx - x, tz - z) / 10));
        tx = mejor.x + vel.x * T0;
        tz = mejor.z + vel.z * T0;
      }
      yawObjetivo = Math.atan2(tx - pos.x, tz - pos.z);
      v = apuntar(x, y, z, tx, tz);
    }
    const tiro = { tipo, x: +x.toFixed(2), y, z: +z.toFixed(2), vx: +v.vx.toFixed(2), vy: +v.vy.toFixed(2), vz: +v.vz.toFixed(2) };
    lanzar('yo', tipo, tiro);
    Sonido.mover();
    return tiro;
  }
  function tiroRemoto(id, p) {
    const r = remotos.get(id);
    const n = ['x', 'y', 'z', 'vx', 'vy', 'vz'].map((k) => Number(p[k]));
    if (!r || !TIROS[p.tipo] || !n.every(Number.isFinite) || n.slice(3).some((v) => Math.abs(v) > 40)) return;
    r.tira = 0.35;
    lanzar(id, p.tipo, { x: Math.max(-12, Math.min(12, n[0])), y: Math.max(0, Math.min(4, n[1])), z: Math.max(-12, Math.min(12, n[2])), vx: n[3], vy: n[4], vz: n[5] });
  }
  // Mancha al pegar o al caer al piso.
  function salpicar(x, y, z, color, cantidad = 26) {
    const posiciones = new Float32Array(cantidad * 3);
    const vel = [];
    for (let i = 0; i < cantidad; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.8 + Math.random() * 2;
      vel.push([Math.cos(a) * v, 1 + Math.random() * 2.5, Math.sin(a) * v]);
      posiciones.set([x, y, z], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(posiciones, 3));
    const puntos = new T.Points(geo, new T.PointsMaterial({ color, size: 0.13, transparent: true, depthWrite: false }));
    escena.add(puntos);
    chispazos.push({ puntos, vel, t: 0 });
  }
  const QUEJAS = ['¡Ay! 😵', '¡Ey! 😠', '¡Paf! 💥', '¡No vale! 😤', '¡Me la vas a pagar! 😈'];
  function impacto(pr, blanco) {
    const T0 = TIROS[pr.tipo];
    salpicar(pr.x, pr.y, pr.z, T0.mancha);
    if (blanco.tipo === 'yo') {
      golpeYo = 0.7;
      salto = 0.3;
      Sonido.parada();
      alRecibir?.(pr.de, pr.tipo);
    } else if (blanco.tipo === 'remoto') {
      blanco.r.golpe = 0.7;
      blanco.r.salto = 0.3;
      if (pr.de === 'yo') { burbuja(blanco.r.id, `💥 ¡Le diste! ${T0.e}`); Sonido.elegir(); alPegar?.(blanco.r.id, pr.tipo); }
    } else {
      const n = blanco.n;
      n.saludo = 0;
      n.aturdido = 0.7; // (n.golpe es la malla para el clic)
      burbuja('npc:' + n.m.key, alAzar(QUEJAS));
      // Si se lo tiré yo, a veces me la devuelve.
      if (pr.de === 'yo' && !reduce && Math.random() < 0.5) {
        setTimeout(() => {
          if (!esperando.includes(n) || !P) return;
          n.yaw = Math.atan2(pos.x - n.x, pos.z - n.z);
          n.tira = 0.35;
          const x = n.x + Math.sin(n.yaw) * 0.5, z = n.z + Math.cos(n.yaw) * 0.5;
          lanzar('npc:' + n.m.key, alAzar(Object.keys(TIROS)), { x, y: 1.5, z, ...apuntar(x, 1.5, z, pos.x, pos.z) });
        }, 700 + Math.random() * 500);
      }
    }
  }
  // Otro jugador le pegó a alguien (lo decidió en su pantalla): a mí (a =
  // null) o a un tercero. Se borra su tiro en vuelo y se muestra el golpe.
  function golpeRemoto(de, a, tipo) {
    if (!TIROS[tipo] || (!a && juego.on)) return; // en el cementerio no te llegan
    const victima = a ? remotos.get(a) : null;
    if (a && !victima) return;
    const pr = proyectiles.find((x) => x.de === de && x.tipo === tipo);
    if (pr) {
      escena.remove(pr.mesh);
      pr.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      proyectiles.splice(proyectiles.indexOf(pr), 1);
    }
    const quien = victima || { x: pos.x, z: pos.z };
    impacto({ de, tipo, x: quien.x, y: 1.3, z: quien.z }, victima ? { tipo: 'remoto', r: victima } : { tipo: 'yo' });
  }
  function animarProyectiles(dt) {
    recarga = Math.max(0, recarga - dt);
    for (const pr of [...proyectiles]) {
      pr.t += dt;
      pr.vy -= G_TIRO * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.mesh.position.set(pr.x, pr.y, pr.z);
      pr.mesh.rotation.x += pr.giro * dt;
      pr.mesh.rotation.y += pr.giro * 0.6 * dt;
      // ¿Le pegó a alguien? Los míos, a los otros jugadores y a los que
      // esperan; los de los que esperan, a mí. Los tiros de otro jugador solo
      // a los que esperan (a los jugadores los decide él y llega por "golpe").
      let blanco = null;
      if (pr.y > 0.15 && pr.y < 2.2 && pr.t > 0.08) {
        const cerca = (x, z) => Math.hypot(pr.x - x, pr.z - z) < RADIO_GOLPE;
        const deNpc = pr.de.startsWith('npc:');
        if (deNpc && P && cerca(pos.x, pos.z)) blanco = { tipo: 'yo' };
        if (!blanco && pr.de === 'yo') for (const r of remotos.values()) if (cerca(r.x, r.z)) { blanco = { tipo: 'remoto', r }; break; }
        if (!blanco && !deNpc) for (const n of esperando) if (cerca(n.x, n.z)) { blanco = { tipo: 'npc', n }; break; }
      }
      const fuera = pr.y < 0.05 || pr.t > 3 || Math.abs(pr.x) > 30 || Math.abs(pr.z) > 30;
      if (!blanco && !fuera) continue;
      if (blanco) impacto(pr, blanco);
      else if (pr.y < 0.05) salpicar(pr.x, 0.1, pr.z, TIROS[pr.tipo].mancha, 14);
      escena.remove(pr.mesh);
      pr.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      proyectiles.splice(proyectiles.indexOf(pr), 1);
    }
  }

  // Columna de luz, onda en el piso y chispas del color del personaje.
  function efectosAparicion(color) {
    limpiarEfectos();
    const g = new T.Group();
    g.position.set(pos.x, 0, pos.z);
    const columna = malla(new T.CylinderGeometry(0.7, 0.9, 6, 24, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }), 0, 3, 0, false);
    const onda = rot(malla(new T.RingGeometry(0.6, 0.85, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }), 0, 0.05, 0, false), -Math.PI / 2);
    const n = 70;
    const posiciones = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 3;
      vel.push([Math.cos(a) * v, 3 + Math.random() * 4, Math.sin(a) * v]);
      posiciones.set([0, 0.6, 0], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(posiciones, 3));
    const chispas = new T.Points(geo, new T.PointsMaterial({ color: mezclar(color, 0.4), size: 0.16, transparent: true, depthWrite: false }));
    g.add(columna, onda, chispas);
    escena.add(g);
    efectos = { g, columna, onda, chispas, vel };
  }
  function limpiarEfectos() {
    if (!efectos) return;
    escena.remove(efectos.g);
    efectos.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    efectos = null;
  }

  function medir() {
    if (!renderer) return;
    const caja0 = $('#pjCanvas').getBoundingClientRect();
    if (!caja0.width || !caja0.height) return;
    renderer.setSize(caja0.width, caja0.height, false);
    camara.aspect = caja0.width / caja0.height;
    camara.updateProjectionMatrix();
  }

  // Cámara en tercera persona, alta y de frente; más lejos en pantallas angostas.
  function offsetCamara() {
    const k = camara.aspect < 1 ? Math.min(2.3, 1.05 / camara.aspect) : 1;
    return { y: 7.2 * k, z: 9.4 * k };
  }
  function colocarCamara(f) {
    const o = offsetCamara();
    camMira.x += (pos.x - camMira.x) * f;
    camMira.z += (pos.z - 1.8 - camMira.z) * f; // mira un poco adelante: se ven mejor las paradas del fondo
    camMira.y = 0.9;
    let { y, z } = o;
    if (introT >= 0) {
      const k = suave(Math.min(1, (performance.now() - introT) / 1500));
      y += (1 - k) * 9;
      z += (1 - k) * 6;
      if (k >= 1) introT = -1;
    }
    camPos.x = camMira.x;
    camPos.y += (y - camPos.y) * (introT >= 0 ? 1 : f);
    camPos.z = camMira.z + z;
    // En la terminal la cámara baja detrás del personaje, mirando la consola.
    const s = suave(Math.min(1, Math.max(0, frente.k)));
    const c = s > 0.001 ? poseTerminal() : camPos;
    const mez = (a, b) => a + (b - a) * s;
    camara.position.set(mez(camPos.x, c.x), mez(camPos.y, c.y), mez(camPos.z, c.z));
    camara.lookAt(mez(camMira.x, c.x), mez(camMira.y, c.y), mez(camMira.z, c.z - 10));
    animarPantalla(s);
  }

  function irA(id) {
    const p = PARADAS.find((x) => x.id === id);
    if (!p) return;
    destino = { x: p.pos[0], z: p.pos[1] };
    paradaDestino = id;
    ocultarAyuda();
  }
  let ayudaVista = false;
  function ocultarAyuda() {
    if (ayudaVista) return;
    ayudaVista = true;
    setTimeout(() => ayuda.classList.add('pj--fuera'), 1500);
  }

  const MAPA_TECLAS = { ArrowUp: 'arr', KeyW: 'arr', ArrowDown: 'aba', KeyS: 'aba', ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der' };
  function controles() {
    document.addEventListener('keydown', (e) => {
      if (mundoEl.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
      if (frente.on) { alTeclaTerminal?.(e); return; } // en la terminal las teclas navegan el panel
      if (e.key === 'Escape' && !panel.hidden) { cerradaAMano = paradaActiva; cerrarPanel(); return; }
      if (e.target.closest('select, input, textarea')) return;
      if (juego.on) { // en el cementerio: Esc sube; terminado, Enter o espacio vuelven a correr
        const fin = juego.estado === 'atrapado' || juego.estado === 'escapo';
        if (e.code === 'Escape' || (fin && (e.code === 'Enter' || e.code === 'Space') && !e.target.closest('button, a'))) {
          e.preventDefault();
          alCementerio?.({ tipo: e.code === 'Escape' ? 'salir' : 'otra' });
          return;
        }
      }
      const g = !juego.on && Object.keys(GESTOS).find((x) => `Digit${GESTOS[x].tecla}` === e.code || `Numpad${GESTOS[x].tecla}` === e.code);
      if (g && remotos.size) { e.preventDefault(); hacerGesto(g); return; }
      const tiro = !juego.on && (Object.keys(TIROS).find((x) => `Digit${TIROS[x].tecla}` === e.code || `Numpad${TIROS[x].tecla}` === e.code)
        || ((e.code === 'Space' || e.code === 'KeyF') && !e.target.closest('button, a') ? 'pizza' : null));
      if (tiro) { e.preventDefault(); hacerTiro(tiro); return; }
      if (e.code === 'KeyE' && !juego.on) { e.preventDefault(); tocarCerca(); return; }
      const k = MAPA_TECLAS[e.code];
      if (!k) return;
      e.preventDefault();
      teclas.add(k);
      destino = null;
      ocultarAyuda();
    });
    document.addEventListener('keyup', (e) => { const k = MAPA_TECLAS[e.code]; if (k) teclas.delete(k); });
    window.addEventListener('blur', () => teclas.clear());

    let abajo = null;
    lienzo.addEventListener('pointerdown', (e) => { abajo = { x: e.clientX, y: e.clientY }; });
    lienzo.addEventListener('pointerup', (e) => {
      if (!abajo) return;
      const movio = Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y);
      abajo = null;
      if (movio < 10) tocar(e.clientX, e.clientY);
    });

    // Joystick táctil.
    const base = $('#pjJoy');
    const perilla = base.firstElementChild;
    let id = null;
    const mover = (e) => {
      const r = base.getBoundingClientRect();
      let x = e.clientX - (r.left + r.width / 2);
      let y = e.clientY - (r.top + r.height / 2);
      const largo = Math.hypot(x, y);
      const max = r.width / 2 - 12;
      if (largo > max) { x *= max / largo; y *= max / largo; }
      perilla.style.transform = `translate(${x}px, ${y}px)`;
      joy.x = x / max;
      joy.z = y / max;
    };
    base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); destino = null; mover(e); ocultarAyuda(); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) mover(e); });
    const soltar = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.z = 0; perilla.style.transform = ''; };
    base.addEventListener('pointerup', soltar);
    base.addEventListener('pointercancel', soltar);
  }

  const rayo = () => new T.Raycaster();
  function tocar(cx, cy) {
    if (aparicionT >= 0 || frente.on) return;
    const r = lienzo.getBoundingClientRect();
    const ndc = new T.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = rayo();
    ray.setFromCamera(ndc, camara);
    if (juego.on) { // en el cementerio solo se camina
      const p = new T.Vector3();
      if (juego.estado === 'corre' && ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) {
        destino = { x: Math.max(-BORDE_CEM, Math.min(BORDE_CEM, p.x)), z: Math.max(-BORDE_CEM, Math.min(BORDE_CEM, p.z)) };
      }
      return;
    }
    const quien = ray.intersectObjects(esperando.map((n) => n.golpe), false)[0];
    if (quien) { cambiarA(EQUIPO.find((m) => m.key === quien.object.userData.integrante)); return; }
    const hit = ray.intersectObjects(golpes, false)[0];
    if (hit) { irA(hit.object.userData.parada); return; }
    const cosa = ray.intersectObjects(golpesProps, false)[0];
    if (cosa) { tocarProp(cosa.object.userData.prop); return; }
    const p = new T.Vector3();
    if (ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) {
      destino = { x: Math.max(-BORDE, Math.min(BORDE, p.x)), z: Math.max(-BORDE, Math.min(BORDE, p.z)) };
      paradaDestino = null;
      marcador.position.set(destino.x, 0.03, destino.z);
      marcador.material.opacity = 0.9;
      marcador.scale.setScalar(1);
      ocultarAyuda();
    }
  }

  function chocar() {
    pos.x = Math.max(-BORDE, Math.min(BORDE, pos.x));
    pos.z = Math.max(-BORDE, Math.min(BORDE, pos.z));
    for (const o of [...obstaculos, ...esperando.map((n) => ({ x: n.x, z: n.z, r: 0.45 })), ...[...remotos.values()].map((n) => ({ x: n.x, z: n.z, r: 0.45 }))]) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + 0.35;
      if (d < min && d > 0.0001) { pos.x = o.x + (dx / d) * min; pos.z = o.z + (dz / d) * min; }
    }
  }

  // Piernas y brazos al caminar y respiración quieto. pose: saluda (brazo
  // derecho arriba de lado a lado), taza (izquierdo con la taza; sorbo = a la
  // boca) y gesto (el derecho acompaña mientras habla).
  function animarCuerpo(Q, t, dt, caminando, pose = {}) {
    Q.fase += dt * (caminando ? 11 : 0);
    const balanceo = caminando ? Math.sin(Q.fase) : 0;
    const f = 1 - Math.exp(-dt * 14);
    Q.piernas.forEach((g, i) => { g.rotation.x += ((i ? -1 : 1) * balanceo * 0.7 - g.rotation.x) * f; });
    Q.brazos.forEach((g, i) => {
      if (g.userData.z0 === undefined) g.userData.z0 = g.rotation.z;
      let x = (i ? 1 : -1) * balanceo * 0.6;
      if (i === 0 && pose.taza) x = pose.sorbo ? -1.9 : -0.75;
      if (i === 1 && pose.gesto) x = -0.55 + Math.sin(t * 7) * 0.3;
      if (i === 1 && pose.tira > 0) x = pose.tira > 0.2 ? -2.8 : -0.5; // levanta y suelta
      const arriba = pose.saluda && i === 1;
      if (arriba) x = -2.7;
      g.rotation.x += (x - g.rotation.x) * f;
      g.rotation.z = arriba ? g.userData.z0 + Math.sin(t * 12) * 0.35 : g.rotation.z + (g.userData.z0 - g.rotation.z) * f;
    });
    let y = caminando ? Math.abs(Math.cos(Q.fase)) * 0.06 : Math.sin(t * 2.2) * 0.015;
    if (Q.flota) y = 0.22 + Math.sin(t * 2.4) * 0.09;
    Q.torso.position.y = y;
    // Tambaleo cuando le pegan.
    Q.torso.rotation.z = pose.golpe > 0 ? Math.sin(pose.golpe * 30) * 0.3 * pose.golpe : Q.torso.rotation.z * (1 - f);
  }

  // ── Actividades de los que esperan ──
  function ir(n, lugar, actividad, seg) {
    n.estado = 'yendo';
    n.destino = lugar;
    n.luego = { actividad, seg };
    n.tCamino = 0;
    n.mejor = Infinity;
    n.sinAvance = 0;
  }
  function reservar(n, lugar, actividad, seg) {
    lugar.libre = false;
    n.lugar = lugar;
    ir(n, lugar, actividad, seg);
  }
  function soltar(n) {
    if (n.lugar) { n.lugar.libre = true; n.lugar = null; }
    if (n.ronda) {
      n.ronda.libre = true;
      if (n.compa) { n.compa.ronda = null; n.compa.compa = null; }
      n.ronda = null;
      n.compa = null;
    }
  }
  function llegar(n, ahora) {
    n.estado = n.luego.actividad;
    n.hasta = ahora + n.luego.seg * 1000;
    n.luego = null;
  }
  // Elige qué hacer: café, charla con alguien libre, mirar la ciudad o volver a su lugar.
  function pensar(n, ahora) {
    soltar(n);
    const r = Math.random();
    const cafe = PUESTOS_CAFE.filter((p) => p.libre);
    const rondas = RONDAS.filter((p) => p.libre);
    const vistas = VISTAS.filter((p) => p.libre);
    const compas = esperando.filter((o) => o !== n && o.estado === 'quieto' && !o.cerca);
    if (r < 0.34 && cafe.length) reservar(n, alAzar(cafe), 'cafe', entre(9, 14));
    else if (r < 0.72 && compas.length && rondas.length) {
      const o = alAzar(compas);
      const ronda = alAzar(rondas);
      soltar(o);
      ronda.libre = false;
      n.ronda = o.ronda = ronda;
      n.compa = o;
      o.compa = n;
      const seg = entre(10, 15);
      ir(n, ronda.par[0], 'charla', seg);
      ir(o, ronda.par[1], 'charla', seg);
    } else if (r < 0.88 && vistas.length) reservar(n, alAzar(vistas), 'ciudad', entre(6, 10));
    else ir(n, n.casa, 'quieto', entre(4, 8));
  }
  function terminar(n, ahora) {
    const o = n.estado === 'charla' ? n.compa : null;
    pensar(n, ahora);
    if (o && o.estado === 'charla') pensar(o, ahora);
  }
  // Camina hacia su destino esquivando objetos, compañeros y al personaje.
  function caminarNpc(n, dt, ahora) {
    const dx = n.destino.x - n.x, dz = n.destino.z - n.z;
    const d = Math.hypot(dx, dz);
    n.tCamino += dt;
    // Trabado (por ejemplo, detrás del personaje en un paso angosto): hace lo suyo ahí mismo.
    if (d < n.mejor - 0.05) { n.mejor = d; n.sinAvance = 0; } else n.sinAvance += dt;
    if (d < 0.1 || n.sinAvance > 3 || n.tCamino > 25) { llegar(n, ahora); return false; }
    let vx = dx / d, vz = dz / d;
    const suave = Math.min(1, d); // cerca del destino casi no se desvía
    const desviar = (x, z, lim, peso) => {
      const ex = n.x - x, ez = n.z - z;
      const e = Math.hypot(ex, ez);
      if (e >= lim || e < 0.001) return;
      const f = ((lim - e) / lim) * peso * suave;
      const lado = dx * ez - dz * ex >= 0 ? 1 : -1; // rodea siempre para el mismo lado
      vx += (ex / e) * f + (-ez / e) * f * 0.7 * lado;
      vz += (ez / e) * f + (ex / e) * f * 0.7 * lado;
    };
    for (const o of obstaculos) desviar(o.x, o.z, o.r + 0.9, 1.6);
    for (const o of esperando) if (o !== n) desviar(o.x, o.z, 0.75, 1);
    desviar(pos.x, pos.z, 0.9, 1.2);
    const v = Math.hypot(vx, vz) || 1;
    n.x += (vx / v) * 1.5 * dt;
    n.z += (vz / v) * 1.5 * dt;
    for (const o of obstaculos) {
      const ex = n.x - o.x, ez = n.z - o.z;
      const e = Math.hypot(ex, ez);
      const min = o.r + 0.3;
      if (e < min && e > 0.0001) { n.x = o.x + (ex / e) * min; n.z = o.z + (ez / e) * min; }
    }
    n.x = Math.max(-BORDE, Math.min(BORDE, n.x));
    n.z = Math.max(-BORDE, Math.min(BORDE, n.z));
    n.rumbo = Math.atan2(vx, vz);
    return true;
  }

  // Un globito a la vez; en una charla se van turnando.
  function frase(n) {
    if (n.m.key === 'otros') return alAzar(FRASES.fantasma);
    // Si Kevin preguntó por las altas del mes, el de la charla le contesta con el dato.
    if (globo.ultimoTexto === PREGUNTA_ALTAS && globo.ultimo && globo.ultimo.compa === n) {
      const d = calcular(EQUIPO[0], '1');
      if (d.meses[0] === MES_HOY) return `Este mes vamos ${fmtInt(d.altas)} altas 📈`;
    }
    const suyas = FRASES_EQUIPO[n.m.key];
    if (suyas && Math.random() < 0.5) return alAzar(suyas);
    if (n.estado === 'charla' && n.propias.length && Math.random() < 0.4) return alAzar(n.propias);
    return alAzar(FRASES[n.estado]);
  }
  function globos(ahora) {
    const n0 = globo.n;
    if (n0 && (ahora > globo.hasta || n0.cerca || !['cafe', 'charla', 'ciudad'].includes(n0.estado))) {
      globo.el.hidden = true;
      globo.ultimo = n0;
      globo.ultimoTexto = globo.el.textContent;
      globo.n = null;
      globo.proximo = ahora + entre(900, 2600);
    }
    if (globo.n || ahora < globo.proximo) return;
    const ultimo = globo.ultimo;
    const quienes = esperando.filter((n) => !n.cerca && (n.estado === 'cafe' || n.estado === 'ciudad' || (n.estado === 'charla' && n.compa && n.compa.estado === 'charla')));
    if (!quienes.length) { globo.proximo = ahora + 1000; return; }
    const responde = ultimo && ultimo.estado === 'charla' && ultimo.compa && quienes.includes(ultimo.compa) && Math.random() < 0.75;
    const n = responde ? ultimo.compa : alAzar(quienes);
    globo.n = n;
    globo.hasta = ahora + 3400;
    globo.el.textContent = frase(n);
    globo.el.hidden = false;
  }

  // Cada uno con su actividad; si te acercás dejan lo que hacen, se dan vuelta y saludan.
  function animarEsperando(t, dt) {
    const ahora = performance.now();
    for (const n of esperando) {
      const antes = { x: n.x, z: n.z };
      const cerca = aparicionT < 0 && Math.hypot(pos.x - n.x, pos.z - n.z) < 2.6;
      if (cerca && !n.cerca) n.saludo = 1.8;
      n.cerca = cerca;
      n.el.classList.toggle('pj--cerca', cerca);
      n.saludo = Math.max(0, n.saludo - dt);
      let caminando = false;
      if (n.estado === 'yendo') caminando = caminarNpc(n, dt, ahora); // si pasa cerca, saluda sin frenar
      else if (cerca) n.hasta += dt * 1000; // la actividad espera mientras te atiende
      else if (n.estado === 'charla' && n.compa && n.compa.estado === 'yendo') n.hasta += dt * 1000; // espera al otro
      else if (ahora > n.hasta) terminar(n, ahora);
      let objetivo;
      if (caminando) objetivo = n.rumbo;
      else if (cerca) objetivo = Math.atan2(pos.x - n.x, pos.z - n.z);
      else if (n.estado === 'charla' && n.compa) objetivo = Math.atan2(n.compa.x - n.x, n.compa.z - n.z);
      else if (n.estado === 'quieto') objetivo = n.casa.yaw + Math.sin((t + n.desfase) * 0.45) * 0.5;
      else objetivo = n.destino.yaw;
      let dif = objetivo - n.yaw;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      n.yaw += dif * (1 - Math.exp(-dt * (cerca || caminando ? 8 : 3)));
      n.P.raiz.position.set(n.x, 0, n.z);
      n.P.raiz.rotation.y = n.yaw;
      n.v.set(n.x, n.alto, n.z);
      velocidad(n, antes, dt);
      const tomando = n.estado === 'cafe' && !cerca;
      n.taza.visible = tomando;
      n.aturdido = Math.max(0, (n.aturdido || 0) - dt);
      n.tira = Math.max(0, (n.tira || 0) - dt);
      animarCuerpo(n.P, t + n.desfase, dt, caminando, {
        golpe: n.aturdido,
        tira: n.tira,
        saluda: n.saludo > 0,
        taza: tomando,
        sorbo: (t + n.desfase) % 4 < 1.1,
        gesto: n.estado === 'charla' && !cerca && globo.n === n,
      });
    }
    if (!reduce) globos(ahora);
  }

  function animarPersonaje(t, dt, caminando) {
    saludoYo = Math.max(0, saludoYo - dt);
    tiraYo = Math.max(0, tiraYo - dt);
    golpeYo = Math.max(0, golpeYo - dt);
    animarCuerpo(P, t, dt, caminando, { saluda: saludoYo > 0, tira: tiraYo, golpe: golpeYo });
    let sube = 0;
    if (salto > 0) { salto = Math.max(0, salto - dt); sube = Math.sin((1 - salto / 0.35) * Math.PI) * 0.35; }
    if (aparicionT >= 0) {
      const k = Math.min(1, (performance.now() - aparicionT) / 750);
      P.raiz.scale.setScalar(Math.max(0.001, rebote(k)));
      sube = Math.sin(k * Math.PI) * 1.2;
      if (k >= 1) { aparicionT = -1; P.raiz.scale.setScalar(1); }
    }
    P.raiz.position.set(pos.x, sube, pos.z);
    P.raiz.rotation.y = yaw;
  }

  function animarEfectos(dt) {
    if (!efectos) return;
    efectos.t = (efectos.t || 0) + dt;
    const k = efectos.t;
    efectos.columna.material.opacity = Math.max(0, 0.6 * (1 - k / 0.9));
    efectos.columna.scale.set(1 - Math.min(0.7, k * 0.6), 1, 1 - Math.min(0.7, k * 0.6));
    efectos.onda.scale.setScalar(1 + k * 6);
    efectos.onda.material.opacity = Math.max(0, 0.9 * (1 - k / 0.8));
    const arr = efectos.chispas.geometry.attributes.position;
    for (let i = 0; i < efectos.vel.length; i++) {
      const v = efectos.vel[i];
      v[1] -= 9 * dt;
      arr.setXYZ(i, arr.getX(i) + v[0] * dt, Math.max(0.05, arr.getY(i) + v[1] * dt), arr.getZ(i) + v[2] * dt);
    }
    arr.needsUpdate = true;
    efectos.chispas.material.opacity = Math.max(0, 1 - k / 1.4);
    if (k > 1.5) limpiarEfectos();
  }

  function proximidad() {
    let cerca = null;
    for (const p of PARADAS) {
      if (Math.hypot(pos.x - p.pos[0], pos.z - p.pos[1]) < 1.15) { cerca = p.id; break; }
    }
    if (cerca !== paradaActiva) {
      if (cerca) salto = 0.35;
      activarParada(cerca);
    }
  }

  const v3 = () => new T.Vector3();
  const proy = { v: null };
  function etiquetas() {
    const r = lienzo.getBoundingClientRect();
    proy.v = proy.v || v3();
    for (const a of [...anclas, ...esperando, ...remotos.values(), ...props.values()]) {
      proy.v.copy(a.v).project(camara);
      const fuera = proy.v.z > 1 || proy.v.x < -1.2 || proy.v.x > 1.2 || proy.v.y < -1.2 || proy.v.y > 1.2;
      a.el.classList.toggle('pj--oculta', fuera);
      if (fuera) continue;
      const x = ((proy.v.x + 1) / 2) * r.width;
      const y = Math.max(a.el.offsetHeight + 4, ((1 - proy.v.y) / 2) * r.height); // que no se corte arriba
      a.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (globo.n) {
      proy.v.copy(globo.v.set(globo.n.x, globo.n.alto + 0.75, globo.n.z)).project(camara);
      const x = ((proy.v.x + 1) / 2) * r.width;
      const y = Math.max(globo.el.offsetHeight + 4, ((1 - proy.v.y) / 2) * r.height);
      globo.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    posicionarBurbujas(r);
  }

  // Con el panel abierto la imagen se corre para que el personaje no quede
  // tapado: a la izquierda en pantallas anchas, hacia arriba en celulares.
  // La terminal no corre la imagen: ahí se mide su panel (marco), que es
  // la pantalla de la consola.
  function ajustarVista(dt) {
    const angosta = innerWidth <= 760;
    const holo = $('#pjHolo');
    const r = lienzo.getBoundingClientRect();
    if (!holo.hidden && holo.offsetWidth) {
      const m = mundoEl.getBoundingClientRect(); // el panel se ubica dentro de la azotea
      Object.assign(marco, { x: m.left + holo.offsetLeft - r.left, y: m.top + holo.offsetTop - r.top, w: holo.offsetWidth, h: holo.offsetHeight, W: r.width, H: r.height });
    }
    const caja1 = holo.hidden && !panel.hidden ? panel : null;
    const objetivo = {
      x: caja1 && !angosta ? (caja1.offsetWidth + 24) / 2 : 0,
      y: caja1 && angosta ? caja1.offsetHeight / 2 : 0,
    };
    const f = 1 - Math.exp(-dt * 8);
    vista.x += (objetivo.x - vista.x) * f;
    vista.y += (objetivo.y - vista.y) * f;
    if (Math.abs(vista.x) < 0.5 && Math.abs(vista.y) < 0.5) camara.clearViewOffset();
    else camara.setViewOffset(r.width, r.height, vista.x, vista.y, r.width, r.height);
  }

  // Un paso del personaje: teclas o joystick (si está libre) y si no, el
  // destino del clic. Devuelve si caminó.
  function caminar(dt, libre, choque) {
    let mx = 0, mz = 0, fuerza = 1;
    if (libre) {
      if (teclas.has('izq')) mx -= 1;
      if (teclas.has('der')) mx += 1;
      if (teclas.has('arr')) mz -= 1;
      if (teclas.has('aba')) mz += 1;
      if (!mx && !mz && (joy.x || joy.z)) {
        mx = joy.x; mz = joy.z;
        fuerza = Math.min(1, Math.hypot(mx, mz));
        if (fuerza < 0.15) mx = mz = 0;
      }
    }
    if (!mx && !mz && destino) {
      mx = destino.x - pos.x; mz = destino.z - pos.z;
      const d = Math.hypot(mx, mz);
      if (d < 0.08) { destino = null; mx = mz = 0; }
      else fuerza = Math.min(1, d * 2.5);
    }
    if (!(mx || mz) || aparicionT >= 0) return false;
    const largo = Math.hypot(mx, mz);
    const paso = VEL * fuerza * dt;
    const antes = { x: pos.x, z: pos.z };
    pos.x += (mx / largo) * paso;
    pos.z += (mz / largo) * paso;
    choque();
    // Trabado contra algo camino a un destino: se da por llegado.
    if (destino && Math.hypot(pos.x - antes.x, pos.z - antes.z) < paso * 0.3) {
      atascado += dt;
      if (atascado > 0.4) { destino = null; atascado = 0; }
    } else atascado = 0;
    yawObjetivo = Math.atan2(mx, mz);
    return true;
  }
  function girar(dt) {
    let dif = yawObjetivo - yaw;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    yaw += dif * (1 - Math.exp(-dt * 12));
  }

  /* ── Cementerio ── */
  function entrarCementerio() {
    if (!P || juego.on || aparicionT >= 0) return false;
    if (!cem) cem = armarCementerio({ T, malla, caja, cil, esfera, rot, grupo, fantasma: PERSONAJES.fantasma, animarCuerpo, capa: $('#pjCemCapa') });
    vistaFrente(false);
    frente.k = 0;
    juego.on = true;
    cem.escena.add(P.raiz);
    camara.clearViewOffset();
    vista.x = vista.y = 0;
    empezarCementerio();
    return true;
  }
  // Entra por la reja, de espaldas a la cámara, y cuenta 3, 2, 1.
  function empezarCementerio() {
    pos.x = cem.salida.x;
    pos.z = cem.salida.z;
    yaw = yawObjetivo = Math.PI;
    destino = paradaDestino = null;
    teclas.clear();
    joy.x = joy.z = 0;
    golpeYo = salto = 0;
    camMira.x = pos.x;
    camMira.z = pos.z - 1.8;
    introT = performance.now();
    cem.reiniciar();
    juego.estado = 'cuenta';
    juego.t0 = performance.now();
    juego.tiempo = juego.hundir = 0;
    juego.cuenta = -1;
  }
  // Sube por la escalera: aparece en la azotea al lado de la puerta.
  function salirCementerio() {
    if (!juego.on) return;
    juego.on = false;
    cem.callar();
    escena.add(P.raiz);
    pos.x = 0;
    pos.z = 8.4;
    yaw = yawObjetivo = Math.PI;
    destino = paradaDestino = null;
    teclas.clear();
    camMira.x = pos.x;
    camMira.z = pos.z - 1.8;
    forzarPos = true;
    alCementerio?.({ tipo: 'fuera' });
  }
  function chocarCementerio() {
    pos.x = Math.max(-BORDE_CEM, Math.min(BORDE_CEM, pos.x));
    pos.z = Math.max(-BORDE_CEM, Math.min(BORDE_CEM, pos.z));
    for (const o of cem.obstaculos) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + 0.35;
      if (d < min && d > 0.0001) { pos.x = o.x + (dx / d) * min; pos.z = o.z + (dz / d) * min; }
    }
  }
  function terminarCementerio(quien, t) {
    juego.estado = quien ? 'atrapado' : 'escapo';
    destino = null;
    if (quien) {
      cem.decir(quien, '¡Te quedás con nosotros! 👻', t, 600);
      yawObjetivo = Math.atan2(quien.x - pos.x, quien.z - pos.z);
      golpeYo = 0.6;
    } else salto = 0.35;
    alCementerio?.({ tipo: 'fin', gano: !quien, quien: quien && quien.nombre, color: quien && quien.color, tiempo: quien ? juego.tiempo : DURACION_CEM });
  }
  function cuadroCementerio(ahora, dt, t) {
    const corre = juego.estado === 'corre';
    if (!corre) destino = null;
    const caminando = corre && caminar(dt, true, chocarCementerio);
    girar(dt);
    animarPersonaje(t, dt, caminando);
    if (juego.estado === 'cuenta') {
      const k = (ahora - juego.t0) / 1000;
      const n = Math.max(0, 3 - Math.floor(k));
      if (n !== juego.cuenta) { juego.cuenta = n; alCementerio?.({ tipo: 'cuenta', n }); }
      if (k >= 3) juego.estado = 'corre';
    } else if (corre) {
      juego.tiempo += dt; // tiempo del juego (no del reloj): en una pantalla lenta los fantasmas también van lentos
      alCementerio?.({ tipo: 'tiempo', resta: Math.max(0, DURACION_CEM - juego.tiempo) });
      if (juego.tiempo >= DURACION_CEM) terminarCementerio(null, t);
    }
    const quien = cem.animar(t, dt, pos, juego.estado === 'corre' ? juego.tiempo : null);
    if (quien && juego.estado === 'corre') terminarCementerio(quien, t);
    if (juego.estado === 'atrapado') { // te quedás con ellos: te hundís en la tierra
      juego.hundir = Math.min(1, juego.hundir + dt / 2.2);
      P.raiz.position.y -= 1.9 * suave(juego.hundir);
    }
    cem.escena.fog.density = camara.aspect < 1 ? 0.022 : 0.04; // en celulares la cámara queda más lejos
    colocarCamara(1 - Math.exp(-dt * 5));
    cem.etiquetas(camara, lienzo.getBoundingClientRect());
    renderer.render(cem.escena, camara);
  }

  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000);
    ultimo = ahora;
    const t = ahora / 1000;

    if (juego.on) { cuadroCementerio(ahora, dt, t); return; }

    frente.k += ((frente.on ? 1 : 0) - frente.k) * (1 - Math.exp(-dt * 3.5));
    const caminando = caminar(dt, !frente.on, chocar); // caminando mira hacia donde va
    if (!caminando && frente.on && terminal) {
      yawObjetivo = Math.atan2(terminal.position.x - pos.x, terminal.position.z - pos.z); // mira la consola
    } else if (!caminando && paradaActiva && !destino) {
      yawObjetivo = 0; // quieto en una parada: mira a la cámara
    }
    girar(dt);

    animarPersonaje(t, dt, !!caminando);
    animarEsperando(t, dt);
    animarRemotos(t, dt);
    animarEfectos(dt);
    animarProyectiles(dt);
    animarChispazos(dt);
    animarProps(t, dt);
    const sTerminal = suave(Math.min(1, Math.max(0, frente.k)));
    for (const o of animados) o.userData.anim(t, o === terminal ? sTerminal : 0);
    if (aparicionT < 0) avisarPosicion(ahora, !!caminando);
    if (aparicionT < 0) proximidad();

    for (const [id, aro] of Object.entries(anillos)) {
      const on = id === paradaActiva;
      aro.material.opacity += ((on ? 1 : 0.45) - aro.material.opacity) * 0.15;
      aro.scale.setScalar(on ? 1 + Math.sin(t * 5) * 0.05 : 1);
    }
    if (marcador.material.opacity > 0) {
      marcador.material.opacity = Math.max(0, marcador.material.opacity - dt * 1.2);
      marcador.scale.multiplyScalar(1 + dt * 0.8);
    }
    foco.position.set(pos.x, 2.6, pos.z + 1.2);

    ajustarVista(dt);
    colocarCamara(1 - Math.exp(-dt * 5));
    etiquetas();
    renderer.render(escena, camara);
  }

  function reanudar() {
    if (raf) return;
    ultimo = 0;
    raf = requestAnimationFrame(cuadro);
  }
  function pausar() {
    cancelAnimationFrame(raf);
    raf = 0;
    teclas.clear();
  }

  // Dónde cae el personaje en la pantalla (para que la foto vuele hasta ahí).
  function puntoEnPantalla() {
    colocarCamara(1);
    const v = new T.Vector3(pos.x, 0.9, pos.z).project(camara);
    const r = lienzo.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  return {
    get ok() { return !!renderer; },
    set alMoverme(fn) { alMoverme = fn; },
    set alRecibir(fn) { alRecibir = fn; },
    set alPegar(fn) { alPegar = fn; },
    set textoProp(fn) { textoProp = fn; },
    set alTeclaTerminal(fn) { alTeclaTerminal = fn; },
    set alCementerio(fn) { alCementerio = fn; },
    get enCementerio() { return juego.on; },
    entrarCementerio, salirCementerio, otraVezCementerio: () => { if (juego.on) empezarCementerio(); },
    armar, iniciarPersonaje, irA, pausar, puntoEnPantalla, sincronizarRemotos, moverRemoto, gesto, tirar, tiroRemoto, golpeRemoto, vistaFrente, salirDeParada, tocarProp,
  };
})();

/* ───────────────────────── Arranque ───────────────────────── */

pintarSlots();
sala = crearSala({
  alCambiar: alCambiarSala,
  alMover: (id, p) => { if (Mundo.ok) Mundo.moverRemoto(id, p); },
  alGesto: (id, g) => { if (Mundo.ok && !mundoEl.hidden && GESTOS[g]) Mundo.gesto(id, g); },
  alTiro: (id, t) => { if (Mundo.ok && !mundoEl.hidden) Mundo.tiroRemoto(id, t); },
  alGolpe: (id, g) => { if (Mundo.ok && !mundoEl.hidden) Mundo.golpeRemoto(id, g.a === sala.yo.id ? null : String(g.a), g.tipo); },
});
sala.actualizar({ mira: EQUIPO[indice].key });
Mundo.alMoverme = (p) => sala.mover(p);
// Gestos (teclas 1 a 4, solo con otro jugador) y tiros (teclas 5 a 7 o
// espacio): los ve el otro jugador.
function hacerGesto(g) {
  Mundo.gesto(null, g);
  sala.gesto(g);
}
function hacerTiro(tipo) {
  const tiro = Mundo.tirar(tipo);
  if (tiro) sala.tiro(tiro);
}
Mundo.alPegar = (a, tipo) => sala.golpe({ a, tipo });
// En la terminal: ← → (o A/D) cambian de sección, 1 a 6 van directo y Esc
// (o ↓/S) sale.
/* ───────────── Cementerio (cementerio.js) ───────────── */
// Botón "Bajar al cementerio": se corre de los fantasmas DURACION_CEM
// segundos. El récord (lo más que aguantó) queda en este navegador.
const cemEl = $('#pjCem');
const cemCartel = $('#pjCemCartel');
const cemTiempo = $('#pjCemTiempo');
const cemRecordEl = $('#pjCemRecord');
let cemRecord = Number(leer('pj-cementerio-record')) || 0;
const fmtSeg = (s) => s.toFixed(1).replace('.', ',') + ' s';
function pintarRecord() {
  cemRecordEl.textContent = cemRecord >= DURACION_CEM ? 'Récord: ¡escapaste! 🏃' : cemRecord ? `Récord: ${fmtSeg(cemRecord)}` : 'Sin récord todavía';
}
function bajarAlCementerio() {
  if (!Mundo.ok || mundoEl.hidden || Mundo.enCementerio) return;
  activarParada(null);
  if (!Mundo.entrarCementerio()) return;
  cemEl.hidden = false;
  mundoEl.classList.add('pj--cementerio');
  cemTiempo.textContent = fmtSeg(DURACION_CEM);
  pintarRecord();
  sala?.actualizar({ parada: 'cementerio' });
  Sonido.aparecer();
}
function cartelCem(html, fin = false) {
  cemCartel.innerHTML = html;
  cemCartel.hidden = false;
  cemCartel.classList.toggle('pj--fin', fin);
  cemCartel.style.animation = 'none';
  void cemCartel.offsetWidth;
  cemCartel.style.animation = '';
  if (fin) cemCartel.querySelector('button')?.focus({ preventScroll: true });
}
Mundo.alCementerio = (ev) => {
  if (ev.tipo === 'cuenta') {
    if (ev.n) cartelCem(`<b class="pj-cem-num">${ev.n}</b><p>Aguantá ${DURACION_CEM} segundos sin que te alcancen los fantasmas, o te quedás con ellos.</p>`);
    else { cartelCem('<b class="pj-cem-num">¡Corré!</b>'); setTimeout(() => { if (!cemCartel.classList.contains('pj--fin')) cemCartel.hidden = true; }, 900); }
    Sonido.cuenta(!ev.n);
  } else if (ev.tipo === 'tiempo') {
    cemTiempo.textContent = fmtSeg(ev.resta);
    cemTiempo.classList.toggle('pj--poco', ev.resta < 10);
  } else if (ev.tipo === 'fin') {
    const nuevo = ev.tiempo > cemRecord;
    if (nuevo) { cemRecord = Math.min(DURACION_CEM, ev.tiempo); guardar('pj-cementerio-record', cemRecord.toFixed(1)); }
    pintarRecord();
    const botones = '<div class="pj-cem-botones"><button type="button" data-cem="otra">Correr de nuevo</button><button type="button" data-cem="salir">Subir a la azotea ↑</button></div>';
    if (ev.gano) {
      cartelCem(`<b class="pj-cem-fin">🏃 ¡Escapaste!</b><p>Aguantaste los ${DURACION_CEM} segundos: no te quedaste con ellos.</p>${botones}`, true);
      Sonido.escape();
    } else {
      cartelCem(`<b class="pj-cem-fin">👻 Te quedaste con <span style="color:${esc(ev.color)}">${esc(ev.quien)}</span></b><p>Aguantaste ${fmtSeg(ev.tiempo)}${nuevo ? ' · ¡nuevo récord!' : ''}</p>${botones}`, true);
      Sonido.susto();
    }
  } else if (ev.tipo === 'salir' || ev.tipo === 'otra') accionCem(ev.tipo); // Esc, Enter o espacio
  else if (ev.tipo === 'fuera') {
    cemEl.hidden = cemCartel.hidden = true;
    cemCartel.classList.remove('pj--fin');
    mundoEl.classList.remove('pj--cementerio');
    if (!mundoEl.hidden) sala?.actualizar({ parada: null });
  }
};
function accionCem(tipo) {
  if (tipo === 'salir') { Mundo.salirCementerio(); return; }
  cemCartel.hidden = true;
  cemCartel.classList.remove('pj--fin');
  cemTiempo.textContent = fmtSeg(DURACION_CEM);
  cemTiempo.classList.remove('pj--poco');
  Mundo.otraVezCementerio();
}
cemCartel.addEventListener('click', (e) => { const b = e.target.closest('[data-cem]'); if (b) accionCem(b.dataset.cem); });
$('#pjCemSalir').addEventListener('click', () => Mundo.salirCementerio());

Mundo.alTeclaTerminal = (e) => {
  if (e.target.closest('select, input, textarea')) return;
  const n = Number(e.key);
  if (['ArrowLeft', 'KeyA'].includes(e.code)) moverSeccion(-1);
  else if (['ArrowRight', 'KeyD'].includes(e.code)) moverSeccion(1);
  else if (['Escape', 'ArrowDown', 'KeyS', 'Backspace'].includes(e.code)) salirTerminal();
  else if (n >= 1 && n <= SECCIONES.length && n - 1 !== seccion) { const d = n - 1 > seccion ? 1 : -1; seccion = n - 1; Sonido.mover(); pintarTerminal(d); }
  else return;
  e.preventDefault();
};
// Lo que dice cada cosa de la azotea al tocarla (algunas con datos del período).
Mundo.textoProp = (clave) => {
  const d = datos;
  if (!d) return '✨';
  const lider = d.rankCum[0];
  const textos = {
    pizzas: [`🍕 ${fmtInt(d.altas)} altas en ${rango(d.meses)}. ¡Pizza para todos!`, '🍕 Quedan pocas porciones… ¿quién se comió la de muzza?'],
    reloj: [`⏰ Presentismo día 1: ${fmtPct(d.presentismo)}`, '⏰ ¡Uh, qué tarde se hizo!'],
    diana: [`🎯 Cumplimiento: ${fmtPct(d.cumplimiento)}`, '🎯 ¡Justo en el centro!'],
    carrito: [`🍽️ Sabores Express: ${fmtInt(d.Sabores.n)} altas`, '🍽️ Hoy hay menú del día'],
    hamburguesa: [`🍔 Hamburguesas Extremas: ${fmtInt(d.Extremas.n)} altas`, '🍔 Doble cheddar, por favor'],
    podio: [lider ? `🏆 Más cumplimiento: ${(NOMBRE_SELECTOR[lider.sel] || lider.sel).split(' ')[0]} · ${fmtPct(lider.v)}` : '🏆 Todavía sin ranking', '🏆 El que llega primero, elige la pizza'],
    tanque: ['💧 Lleno, como la agenda de entrevistas', '💧 Glu glu glu…'],
    aire: ['❄️ ¡Aire a full!', '❄️ Brrr… ¿quién lo puso en 16?'],
    antena: [`📡 ${jugadores.length + 1} en la sala ahora`, '📡 Señal de la oficina: 5 rayitas'],
    puerta: ['🚪 Esta escalera baja al cementerio… 👻 (botón 🪦 de abajo)', '🚪 Dicen que abajo hay fantasmas que repiten "Hoy tenemos ONB"…'],
    cafe: ['☕ Café recién hecho. ¿Quién se suma?', '☕ El tercero del día, como siempre'],
  }[clave];
  return textos ? alAzar(textos) : '✨';
};
Mundo.alRecibir = (de, tipo) => {
  const T0 = TIROS[tipo];
  if (de.startsWith('npc:')) {
    const key = de.slice(4);
    aviso(`¡${key === 'otros' ? 'El fantasma' : primerNombre(key)} te devolvió ${T0.art}! ${T0.e}`);
    return;
  }
  const o = jugadores.find((j) => j.id === de);
  if (o) aviso(`¡${tagP(o.n)}${o.personaje ? ` (${primerNombre(o.personaje)})` : ''} te tiró ${T0.art}! ${T0.e}`, colorP(o.n));
};
const boton = (clase, dato, valor, icono, texto, titulo) =>
  `<button class="pj-gesto ${clase}" type="button" data-${dato}="${valor}" title="${esc(titulo)}"><span aria-hidden="true">${icono}</span><small>${esc(texto)}</small></button>`;
$('#pjGestos').innerHTML =
  Object.entries(TIROS).map(([k, T0]) => boton('pj-gesto--tiro', 't', k, T0.e, T0.corto, `Tirar ${T0.art} (tecla ${T0.tecla}${k === 'pizza' ? ' o espacio' : ''})`)).join('') +
  '<span class="pj-gestos-sep" aria-hidden="true"></span>' +
  Object.entries(GESTOS).map(([g, G]) => boton('pj-gesto--saludo', 'g', g, G.e, G.corto, `${G.t} (tecla ${G.tecla})`)).join('');
$('#pjGestos').addEventListener('click', (e) => {
  const b = e.target.closest('.pj-gesto');
  if (b && b.dataset.t) hacerTiro(b.dataset.t);
  else if (b) hacerGesto(b.dataset.g);
});
const pedido = new URLSearchParams(location.search).get('miembro');
const inicial = Math.max(0, EQUIPO.findIndex((m) => m.key === pedido));
previsualizar(inicial, false);
if (WEBGL) (window.requestIdleCallback || ((fn) => setTimeout(fn, 800)))(() => cargarThree().catch(() => {}));
if (pedido && EQUIPO.some((m) => m.key === pedido)) {
  // Link directo (personajes.html?miembro=agustina): sale el personaje sin pasar por la selección.
  setTimeout(() => confirmar(), reduce ? 0 : 500);
}
