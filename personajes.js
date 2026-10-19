// personajes.js — "Elegí tu personaje" (personajes.html): selección estilo
// arcade del equipo y, al elegir, la azotea 3D de esa persona (three.js, sin
// build, el mismo vendor/three.min.js de la oficina).
//
// 1. Selección: las fotos abajo y, arriba, la tortuga de cada uno (la misma
//    imagen de index.html) con sus números de los últimos 12 meses. Se elige
//    con flechas + Enter, el mouse o el dedo.
// 2. Aparición: la foto vuela al centro y de ahí sale el personaje 3D: Kevin
//    es Splinter, cada tortuga lleva su bandana y su arma, Albana es April y
//    "Otros" un fantasma ninja.
// 3. Azotea: el personaje se mueve con flechas/WASD, clic o toque en el piso
//    (joystick en celulares). Al pisar una parada se abre su panel: altas,
//    presentismo, cumplimiento, cada marca, ranking y la guarida, que lleva
//    al dashboard completo. Los demás integrantes esperan en la azotea: se
//    dan vuelta y saludan cuando te acercás, y tocándolos se juega con ellos.
//
// Los números salen de data.js con los mismos criterios que app.js:
// presentismo sin las altas sin dato de ingreso, cumplimiento = enviados /
// vacantes (tope 100%), y si el período no tiene cumplimiento cargado se usan
// todos los meses disponibles. El ranking compara presentismo y cumplimiento
// (nunca volumen de altas), igual que el resumen del año.
// Sin WebGL, o si three.js no carga, las paradas se muestran como tarjetas.
const THREE_URL = './vendor/three.min.js?v=0.186.1';
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/* ───────────────────────── Equipo ───────────────────────── */

// Mismos integrantes, colores, fotos y textos que index.html y MEMBER_MAP de
// app.js. selectores: null = todo el equipo (panel de Kevin).
const EQUIPO = [
  { key: 'kevin', label: 'Kevin García', puesto: 'Coordinador de Selección', frase: 'Autómata y estratégico', color: '#5c2430', foto: 'images/kevin-garcia.jpg', arte: 'images/tortuga-kevin.jpg', personaje: 'rata', selectores: null, dashboard: 'dashboard.html' },
  { key: 'agustin', label: 'Agustín Márquez', puesto: 'Selector', frase: 'El innovador', color: '#5b2d78', foto: 'images/agustin-marquez.jpg', arte: 'images/tortuga-agustin.jpg', personaje: 'tortuga', arma: 'bo', selectores: ['Agustin'] },
  { key: 'agustina', label: 'Agustina Castillo', puesto: 'Selector Jr', frase: 'La creativa', color: '#cc2f2f', foto: 'images/agustina-castillo.jpg', arte: 'images/tortuga-agustina.jpg', personaje: 'tortuga', arma: 'sai', selectores: ['Agustina'] },
  { key: 'rafael', label: 'Rafael Barberi', puesto: 'Selector Jr', frase: 'El compañero confiable', color: '#e2721f', foto: 'images/rafael-barberi.jpg', arte: 'images/tortuga-rafael.jpg', personaje: 'tortuga', arma: 'nunchaku', selectores: ['Rafael'] },
  { key: 'gustavo', label: 'Gustavo Sotelo', puesto: 'Selector Jr', frase: 'El más versátil', color: '#4f8fc9', foto: 'images/gustavo-sotelo.jpg', arte: 'images/tortuga-gustavo.jpg', personaje: 'tortuga', arma: 'katana', selectores: ['Gustavo'] },
  { key: 'albana', label: 'Albana Pais', puesto: 'Selectora Jr', frase: 'La estructurada', color: '#d4a017', foto: 'images/Albana-pais.jpeg', arte: 'images/tortuga-albana2.jpg', personaje: 'april', selectores: ['Albana'] },
  { key: 'otros', label: 'Otros', puesto: 'Selectores adicionales', frase: 'Los que caminaron en el infierno y no salieron', color: '#a9714a', foto: null, arte: 'images/muertos en el camino.jpg', personaje: 'fantasma', selectores: ['Emiliano', 'Mariano', 'Facundo', 'Alexis', 'Agustin Monte', 'Luana', 'Araceli', 'Giselle', 'Balbina'] },
];
EQUIPO.forEach((m) => { m.dashboard = m.dashboard || `dashboard.html?miembro=${m.key}`; });

// Selectores que hoy forman el equipo (el ranking de Kevin y de cada uno).
const ACTIVOS = ['Agustin', 'Agustina', 'Rafael', 'Gustavo', 'Albana'];
const NOMBRE_SELECTOR = { Agustin: 'Agustín Márquez', Agustina: 'Agustina Castillo', Rafael: 'Rafael Barberi', Gustavo: 'Gustavo Sotelo', Albana: 'Albana Pais', Emiliano: 'Emiliano Pravato', 'Agustin Monte': 'Agustín Monte' };
const COLOR_SELECTOR = { Agustin: '#5b2d78', Agustina: '#cc2f2f', Rafael: '#e2721f', Gustavo: '#4f8fc9', Albana: '#d4a017', Facundo: '#3fbf7f', Mariano: '#f0a94c', Emiliano: '#06b6d4' };
const EX_EQUIPO = new Set(EQUIPO.find((m) => m.key === 'otros').selectores);

// Paradas de la azotea: `pos` es el círculo que hay que pisar; el objeto queda
// detrás, del lado del borde. `lejos`: distancia del objeto al círculo.
const PARADAS = [
  { id: 'altas', icono: '👥', titulo: 'Altas', pos: [-5.2, -4.2], objeto: 'pizzas' },
  { id: 'presentismo', icono: '⏰', titulo: 'Presentismo día 1', pos: [0, -6], objeto: 'reloj' },
  { id: 'cumplimiento', icono: '🎯', titulo: 'Cumplimiento', pos: [5.2, -4.2], objeto: 'diana' },
  { id: 'sabores', icono: '🍽️', titulo: 'Sabores Express', pos: [-6.4, 1.6], objeto: 'carrito', marca: 'Sabores' },
  { id: 'extremas', icono: '🍔', titulo: 'Hamburguesas Extremas', pos: [6.4, 1.6], objeto: 'hamburguesa', marca: 'Extremas' },
  { id: 'ranking', icono: '🏆', titulo: 'Ranking', pos: [-3.6, 5.8], objeto: 'podio' },
  { id: 'guarida', icono: '🕳️', titulo: 'Dashboard completo', pos: [3.6, 5.8], objeto: 'alcantarilla', lejos: 0 },
];

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
    get activo() { return activo; },
    alternar() { activo = !activo; guardar('pj-sonido', activo ? 'si' : 'no'); return activo; },
  };
})();

/* ───────────────────────── 1. Selección ───────────────────────── */

const pantalla = $('#pjSelect');
const mundoEl = $('#pjMundo');
const slotsEl = $('#pjSlots');
const DOCE = EQUIPO.map((m) => calcular(m, '12'));
let indice = 0;

function tematizar(m) {
  const s = document.body.style;
  s.setProperty('--c', m.color);
  s.setProperty('--c-osc', paraOscuro(m.color));
  s.setProperty('--c-tinta', tintaSobre(m.color));
}

/* Retratos pixelados estilo Metal Slug: la foto se recorta vertical (3:4) y
   cerca de la cara, se
   achica a 36×48 px, se le sube contraste y saturación con un toque cálido,
   se reduce la paleta, el fondo pasa a negro y la figura lleva contorno
   oscuro. Se calcula una vez en un canvas y se muestra ampliada sin suavizar
   (image-rendering: pixelated). Si algo falla, queda la foto original. */
const retratos = new Map();
function retrato(m) {
  if (!m.foto) return Promise.resolve(null);
  if (!retratos.has(m.key)) retratos.set(m.key, pixelar(m.foto).catch(() => m.foto));
  return retratos.get(m.key);
}
function pixelar(src, ancho = 36, alto = 48, niveles = 6) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onerror = mal;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = ancho;
      c.height = alto;
      const g = c.getContext('2d', { willReadFrequently: true });
      const W = img.naturalWidth, H = img.naturalHeight;
      const sh = Math.min(H, (W * alto) / ancho) * 0.72; // primer plano: cara y hombros
      const sw = (sh * ancho) / alto;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (W - sw) / 2, H * 0.04, sw, sh, 0, 0, ancho, alto);
      const datos = g.getImageData(0, 0, ancho, alto);
      const px = datos.data;
      const at = (x, y) => (y * ancho + x) * 4;
      const dist = (i, r) => Math.hypot(px[i] - r[0], px[i + 1] - r[1], px[i + 2] - r[2]);
      // Color del fondo: el del medio (por brillo) entre el borde de arriba y los costados.
      const borde = [];
      for (let x = 0; x < ancho; x++) borde.push(at(x, 0));
      for (let y = 0; y < alto; y++) borde.push(at(0, y), at(ancho - 1, y));
      borde.sort((a, b) => (px[a] + px[a + 1] + px[a + 2]) - (px[b] + px[b + 1] + px[b + 2]));
      const medio = borde[borde.length >> 1];
      const ref = [px[medio], px[medio + 1], px[medio + 2]];
      // Fondo = lo parecido a ese color y conectado con los bordes.
      const fondo = new Uint8Array(ancho * alto);
      const pila = [];
      for (let x = 0; x < ancho; x++) pila.push([x, 0]);
      for (let y = 0; y < alto; y++) pila.push([0, y], [ancho - 1, y]);
      while (pila.length) {
        const [x, y] = pila.pop();
        if (x < 0 || y < 0 || x >= ancho || y >= alto || fondo[y * ancho + x] || dist(at(x, y), ref) > 38) continue;
        fondo[y * ancho + x] = 1;
        pila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      const tocaFondo = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const X = x + dx, Y = y + dy;
        return X >= 0 && Y >= 0 && X < ancho && Y < alto && fondo[Y * ancho + X] === 1;
      });
      // El halo claro del recorte (y lo que quedó suelto en los bordes) también es fondo.
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        const halo = [];
        for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
          const enBorde = x === 0 || x === ancho - 1;
          // La fila de arriba mezcla pelo y fondo al recortar: siempre va de fondo.
          if (!fondo[y * ancho + x] && (y === 0 || ((tocaFondo(x, y) || enBorde) && dist(at(x, y), ref) < 75))) halo.push(y * ancho + x);
        }
        halo.forEach((k) => { fondo[k] = 1; });
      }
      const paso = 255 / (niveles - 1);
      const nivel = (v) => Math.max(0, Math.min(255, Math.round(v / paso) * paso));
      for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
        const i = at(x, y);
        if (fondo[y * ancho + x]) { px[i] = 6; px[i + 1] = 4; px[i + 2] = 3; continue; }
        if (tocaFondo(x, y)) { px[i] = 26; px[i + 1] = 14; px[i + 2] = 8; continue; }
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const sat = (v) => (l + (v - l) * 1.15 - 128) * 1.15 + 128;
        px[i] = nivel(sat(px[i]) + 4);
        px[i + 1] = nivel(sat(px[i + 1]));
        px[i + 2] = nivel(sat(px[i + 2]) - 6);
      }
      g.putImageData(datos, 0, 0);
      ok(c.toDataURL());
    };
    img.src = src;
  });
}

function pintarSlots() {
  slotsEl.innerHTML = EQUIPO.map((m, i) => `
    <button class="pj-slot" type="button" role="radio" data-i="${i}" aria-checked="false" aria-label="${esc(m.label)}" style="--sc:${paraOscuro(m.color, '#070b18', 3)}">
      <span class="pj-slot-pantalla" aria-hidden="true"></span>
      <span class="pj-slot-marco">${m.foto ? '<img alt="" />' : '<span class="pj-slot-mas">+9</span>'}</span>
      <span class="pj-slot-nombre" aria-hidden="true">${esc(m.label.split(' ')[0])}</span>
    </button>`).join('');
  slotsEl.querySelectorAll('.pj-slot').forEach((b) => {
    const i = Number(b.dataset.i);
    const img = b.querySelector('img');
    if (img) retrato(EQUIPO[i]).then((url) => { img.src = url; });
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && i !== indice) previsualizar(i, true); });
    b.addEventListener('click', () => { if (i === indice) confirmar(); else previsualizar(i, true); });
  });
}

function stat(etiqueta, valor, ancho) {
  if (ancho == null) return `<div class="pj-stat pj-stat--num"><dt>${etiqueta}</dt><dd>${valor}</dd></div>`;
  return `<div class="pj-stat"><dt>${etiqueta}</dt><div class="pj-stat-barra" aria-hidden="true"><i style="width:${(ancho * 100).toFixed(1)}%"></i></div><dd>${valor}</dd></div>`;
}

function previsualizar(i, sonar) {
  indice = (i + EQUIPO.length) % EQUIPO.length;
  const m = EQUIPO[indice];
  const d = DOCE[indice];
  tematizar(m);
  slotsEl.querySelectorAll('.pj-slot').forEach((b, k) => {
    b.setAttribute('aria-checked', String(k === indice));
    b.tabIndex = k === indice ? 0 : -1;
  });
  const prev = $('#pjPreview');
  const arte = $('#pjArte');
  if (!reduce) prev.classList.add('pj--cambio');
  const aplicar = () => {
    arte.style.backgroundImage = `url("${encodeURI(m.arte)}")`;
    arte.setAttribute('aria-label', `Personaje de ${m.label}`);
    $('#pjNombre').textContent = m.label;
    $('#pjPuesto').textContent = m.puesto;
    $('#pjFrase').textContent = m.frase;
    $('#pjStats').innerHTML =
      stat('Altas', fmtInt(d.altas)) +
      stat('Presentismo', fmtPct(d.presentismo), d.presentismo || 0) +
      stat('Cumplimiento', fmtPct(d.cumplimiento), d.cumplimiento || 0);
    $('#pjPeriodoSel').textContent = `${m.selectores ? '' : 'Todo el equipo · '}Últimos 12 meses (${rango(d.meses)})`;
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
  confirmando = true;
  const m = EQUIPO[indice];
  const slot = slotsEl.querySelectorAll('.pj-slot')[indice];
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
    img.src = (await retrato(m)) || m.arte;
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
  tematizar(m);
  datos = calcular(m, periodo);
  pantalla.hidden = true;
  mundoEl.hidden = false;
  document.body.classList.add('pj--jugando');
  const foto = $('#pjHudFoto');
  foto.removeAttribute('src');
  foto.classList.toggle('pj--sin', !m.foto);
  retrato(m).then((url) => { if (actual === m && url) foto.src = url; });
  $('#pjHudNombre').textContent = m.label;
  pintarNav();
  cerrarPanel();
  if (con3d) {
    Mundo.iniciarPersonaje(m);
    pintarEtiquetas();
    $('#pjJoy').hidden = !tactil;
    if (!ayudaMostrada) {
      ayudaMostrada = true;
      ayuda.textContent = tactil ? 'Mové el joystick o tocá el piso para caminar' : 'Caminá con las flechas o WASD · o hacé clic en el piso';
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

$('#pjCambiar').addEventListener('click', () => {
  Mundo.pausar();
  cerrarPanel();
  mundoEl.hidden = true;
  pantalla.hidden = false;
  document.body.classList.remove('pj--jugando');
  history.replaceState(null, '', location.pathname);
  previsualizar(indice, false);
  slotsEl.querySelectorAll('.pj-slot')[indice].focus({ preventScroll: true });
});

$('#pjPeriodo').addEventListener('change', (e) => {
  periodo = e.target.value;
  datos = calcular(actual, periodo);
  pintarEtiquetas();
  if (mundoEl.classList.contains('pj--plano')) modoPlano();
  else if (paradaActiva && !panel.hidden) abrirPanel(paradaActiva);
});

function pintarNav() {
  navParadas.innerHTML = PARADAS.map((p) => `
    <button class="pj-parada-btn" type="button" data-id="${p.id}"><span aria-hidden="true">${p.icono}</span>${esc(p.titulo)}</button>`).join('');
  navParadas.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => Mundo.irA(b.dataset.id)));
}

// Dato corto que se ve en el cartel flotante de cada parada.
function titular(id) {
  const d = datos;
  switch (id) {
    case 'altas': return fmtInt(d.altas);
    case 'presentismo': return fmtPct(d.presentismo);
    case 'cumplimiento': return fmtPct(d.cumplimiento);
    case 'sabores': return fmtInt(d.Sabores.n);
    case 'extremas': return fmtInt(d.Extremas.n);
    case 'ranking': {
      if (actual.selectores && actual.selectores.length === 1) {
        const i = d.rankCum.findIndex((r) => r.sel === actual.selectores[0]);
        return i >= 0 ? `#${i + 1} cumpl.` : 'S/D';
      }
      return d.rankCum[0] ? `🥇 ${esc((NOMBRE_SELECTOR[d.rankCum[0].sel] || d.rankCum[0].sel).split(' ')[0])}` : 'S/D';
    }
    default: return 'Ver todo';
  }
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
  navParadas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  capaEtiquetas.querySelectorAll('.pj-etiqueta').forEach((el) => el.classList.toggle('pj--activa', el.dataset.id === id));
  if (id) {
    Sonido.parada();
    if (cerradaAMano !== id) abrirPanel(id);
  } else {
    cerradaAMano = null;
    cerrarPanel();
  }
}

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
  const p = PARADAS.find((x) => x.id === id);
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
  plano.innerHTML = '<p>Tu navegador no muestra 3D: acá tenés las mismas paradas de la azotea.</p>' +
    PARADAS.map((p) => `<section class="pj-glass pj-tarjeta">${contenidoParada(p.id)}</section>`).join('');
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

function tortuga(m) {
  const P = esqueleto();
  const piel = '#63a347', pielOsc = '#4b8535', hocico = '#79b65c', panza = '#e2cf8a', capa = '#7b5a2c', borde = '#a5803f', cuero = '#6b4423';
  const banda = mate(m.color);
  for (const s of [-1, 1]) {
    const g = grupo(0.17 * s, 0.52, 0);
    g.add(cil(0.115, 0.125, 0.44, piel, 0, -0.22, 0));
    g.add(caja(0.24, 0.12, 0.34, pielOsc, 0, -0.46, 0.05));
    P.raiz.add(g);
    P.piernas.push(g);
  }
  const t = P.torso;
  t.add(ovoide([0.36, 0.42, 0.3], piel, 0, 0.88, 0));
  t.add(ovoide([0.29, 0.34, 0.14], panza, 0, 0.88, 0.2));
  t.add(ovoide([0.4, 0.47, 0.25], capa, 0, 0.9, -0.14));
  const reborde = anillo(0.39, 0.045, borde, 0, 0.9, -0.08);
  reborde.scale.set(1, 1.17, 1);
  t.add(reborde);
  const cinto = rot(anillo(0.335, 0.04, cuero, 0, 0.62, 0), Math.PI / 2);
  cinto.scale.set(1, 0.88, 1);
  t.add(cinto);
  t.add(rot(cil(0.075, 0.075, 0.03, banda, 0, 0.62, 0.3, 16), Math.PI / 2));
  // Cabeza con la máscara del color de cada uno.
  const cabeza = grupo(0, 1.36, 0.02);
  cabeza.add(esfera(0.27, piel, 0, 0, 0, 22));
  cabeza.add(ovoide([0.2, 0.13, 0.16], hocico, 0, -0.1, 0.14));
  const mascara = new T.MeshStandardMaterial({ color: m.color, roughness: 0.6, side: T.DoubleSide });
  cabeza.add(malla(new T.CylinderGeometry(0.277, 0.277, 0.11, 26, 1, true), mascara, 0, 0.05, 0));
  for (const s of [-1, 1]) {
    cabeza.add(esfera(0.058, '#ffffff', 0.095 * s, 0.05, 0.235));
    cabeza.add(esfera(0.028, '#16181f', 0.1 * s, 0.05, 0.288));
    cabeza.add(rot(caja(0.07, 0.34, 0.025, banda, 0.07 * s, -0.08, -0.29, 0.01), 0.35, 0, 0.3 * s));
  }
  cabeza.add(esfera(0.065, banda, 0, 0.05, -0.28));
  t.add(cabeza);
  for (const s of [-1, 1]) {
    const g = grupo(0.37 * s, 1.1, 0);
    g.rotation.z = 0.12 * s;
    g.add(cil(0.085, 0.08, 0.42, piel, 0, -0.21, 0));
    g.add(cil(0.095, 0.095, 0.07, '#e9dcc2', 0, -0.36, 0));
    g.add(esfera(0.1, pielOsc, 0, -0.45, 0));
    t.add(g);
    P.brazos.push(g);
  }
  armas(m.arma, P);
  return P;
}

function armas(tipo, P) {
  const madera = '#8b5a2b', metal = '#d6dbe4', mango = '#2a2a33';
  const t = P.torso;
  if (tipo === 'bo') {
    t.add(rot(cil(0.032, 0.032, 1.9, madera, 0, 0.98, -0.42, 8), 0, 0, 0.85));
  } else if (tipo === 'katana') {
    for (const s of [-1, 1]) {
      const k = grupo(0.12 * s, 1.0, -0.38);
      k.add(cil(0.028, 0.028, 0.26, mango, 0, 0.5, 0, 8));
      k.add(cil(0.07, 0.07, 0.02, '#c9a227', 0, 0.37, 0, 12));
      k.add(caja(0.05, 0.76, 0.014, metal, 0, -0.02, 0, 0.006));
      k.rotation.z = -0.55 * s;
      t.add(k);
    }
  } else if (tipo === 'sai') {
    for (const s of [-1, 1]) {
      const k = grupo(0.3 * s, 0.52, 0.12);
      k.add(cil(0.026, 0.026, 0.16, '#8e2b2b', 0, 0.08, 0, 8));
      k.add(cil(0.014, 0.014, 0.46, metal, 0, -0.22, 0, 6));
      for (const q of [-1, 1]) k.add(rot(cil(0.012, 0.012, 0.13, metal, 0.05 * q, -0.04, 0, 6), 0, 0, 0.7 * q));
      k.rotation.z = 0.3 * s;
      t.add(k);
    }
  } else if (tipo === 'nunchaku') {
    for (const s of [-1, 1]) t.add(rot(cil(0.035, 0.035, 0.26, madera, 0.31 * s, 0.5, 0.13, 8), 0.2, 0, 0.25 * s));
    t.add(rot(anillo(0.05, 0.008, metal, 0, 0.36, 0.2), Math.PI / 2));
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
  t.add(cabeza);
  for (const s of [-1, 1]) {
    const g = grupo(0.33 * s, 1.06, 0);
    g.rotation.z = 0.15 * s;
    g.add(cil(0.09, 0.13, 0.44, tunica, 0, -0.22, 0));
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
  return P;
}

const PERSONAJES = { tortuga, rata, april, fantasma };

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
    g.add(caja(0.022, 0.17, 0.012, '#111111', 0, 1.585, 0.235, 0.004));
    g.add(rot(caja(0.13, 0.022, 0.012, '#111111', 0.05, 1.52, 0.235, 0.004), 0, 0, -0.5));
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
    g.add(cil(0.13, 0.15, 0.06, '#f4d35e', 0, 0.93, 0, 16));
    g.add(cil(0.03, 0.03, 0.14, '#f4d35e', 0, 1.03, 0, 8));
    g.add(cil(0.2, 0.1, 0.26, '#f4d35e', 0, 1.22, 0, 20));
    for (const s of [-1, 1]) g.add(rot(anillo(0.08, 0.02, '#f4d35e', 0.21 * s, 1.24, 0), 0, Math.PI / 2));
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
  const anclas = [];
  // Los demás integrantes, quietos en lugares que no tapan paradas ni caminos.
  const esperando = [];
  const LUGARES = [[-2.8, -8.9], [2.8, -8.9], [-9.0, -1.6], [9.0, -1.4], [-8.6, 4.4], [7.4, 8.7], [-6.6, 9.0]];
  const camPos = { x: 0, y: 0, z: 0 };
  const camMira = { x: 0, y: 0, z: 0 };

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
    // Equipos de aire, antena, salida de la escalera y caños.
    [[8.7, -8.6], [8.9, -6.2]].forEach(([x, z]) => {
      escena.add(caja(1.4, 0.9, 1.0, '#9aa3b2', x, 0.45, z, 0.06));
      escena.add(cil(0.32, 0.32, 0.02, '#2b2f3a', x, 0.91, z, 20));
      obstaculos.push({ x, z, r: 0.85 });
    });
    escena.add(cil(0.04, 0.05, 3.6, '#9aa3b2', 9.2, 1.8, 9.2, 8));
    [2.6, 3.1].forEach((y) => escena.add(rot(cil(0.02, 0.02, 1.0, '#9aa3b2', 9.2, y, 9.2, 6), 0, 0, Math.PI / 2)));
    escena.add(esfera(0.07, brilla('#ff4d4d', 2), 9.2, 3.65, 9.2, 8));
    obstaculos.push({ x: 9.2, z: 9.2, r: 0.4 });
    escena.add(caja(2.6, 2.2, 1.6, '#5a4a46', 0, 1.1, 9.9, 0.05));
    escena.add(caja(0.8, 1.5, 0.05, '#3a2f2c', 0, 0.75, 9.08, 0.02));
    escena.add(esfera(0.08, brilla('#ffd27a', 2), 0, 1.75, 9.0, 10));
    const lampara = new T.PointLight('#ffd27a', 5, 4, 2);
    lampara.position.set(0, 1.7, 8.7);
    escena.add(lampara);
    obstaculos.push({ x: -0.7, z: 9.9, r: 0.95 }, { x: 0.7, z: 9.9, r: 0.95 });
    [[-9.4, 6.4], [-9.4, 7.4]].forEach(([x, z]) => { escena.add(cil(0.18, 0.18, 0.8, '#7d8594', x, 0.4, z, 12)); obstaculos.push({ x, z, r: 0.3 }); });
    // Guirnaldas de luces en tres bordes.
    [[[-10.4, -10.4], [10.4, -10.4]], [[-10.4, -10.4], [-10.4, 10.4]], [[10.4, -10.4], [10.4, 3.6]]].forEach(([a, b]) => guirnalda(a, b));
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
    const altura = { pizzas: 1.9, reloj: 2.4, diana: 2.4, carrito: 2.8, hamburguesa: 2.0, podio: 1.9, alcantarilla: 1.3 }[p.objeto];
    anclas.push({ el, v: new T.Vector3(ox, altura, oz) });
  }

  function iniciarPersonaje(m) {
    if (P) {
      escena.remove(P.raiz);
      P.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    P = PERSONAJES[m.personaje](m);
    P.raiz.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    escena.add(P.raiz);
    pintarCielo(m.color);
    const acento = paraOscuro(m.color, '#262c47', 3);
    Object.values(anillos).forEach((a) => a.material.color.set(acento));
    marcador.material.color.set(acento);
    pos.x = 0; pos.z = 1.2;
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

  function armarEsperando(elegido) {
    for (const n of esperando) {
      escena.remove(n.P.raiz);
      n.P.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      n.el.remove();
    }
    esperando.length = 0;
    EQUIPO.filter((m) => m !== elegido).forEach((m, i) => {
      const [x, z] = LUGARES[i];
      const Q = PERSONAJES[m.personaje](m);
      Q.raiz.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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
      esperando.push({ m, P: Q, x, z, yaw0, yaw: yaw0, desfase: i * 1.7, saludo: 0, cerca: false, golpe, el, v: new T.Vector3(x, Q.flota ? 2.4 : 2.0, z) });
    });
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
    camara.position.set(camPos.x, camPos.y, camPos.z);
    camara.lookAt(camMira.x, camMira.y, camMira.z);
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
      if (e.key === 'Escape' && !panel.hidden) { cerradaAMano = paradaActiva; cerrarPanel(); return; }
      if (e.target.closest('select, input, textarea')) return;
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
    if (aparicionT >= 0) return;
    const r = lienzo.getBoundingClientRect();
    const ndc = new T.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = rayo();
    ray.setFromCamera(ndc, camara);
    const quien = ray.intersectObjects(esperando.map((n) => n.golpe), false)[0];
    if (quien) { cambiarA(EQUIPO.find((m) => m.key === quien.object.userData.integrante)); return; }
    const hit = ray.intersectObjects(golpes, false)[0];
    if (hit) { irA(hit.object.userData.parada); return; }
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
    for (const o of [...obstaculos, ...esperando.map((n) => ({ x: n.x, z: n.z, r: 0.45 }))]) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + 0.35;
      if (d < min && d > 0.0001) { pos.x = o.x + (dx / d) * min; pos.z = o.z + (dz / d) * min; }
    }
  }

  // Piernas y brazos al caminar, respiración quieto y, si saluda, el brazo
  // derecho arriba moviéndose de lado a lado.
  function animarCuerpo(Q, t, dt, caminando, saluda = false) {
    Q.fase += dt * (caminando ? 11 : 0);
    const balanceo = caminando ? Math.sin(Q.fase) : 0;
    const f = 1 - Math.exp(-dt * 14);
    Q.piernas.forEach((g, i) => { g.rotation.x += ((i ? -1 : 1) * balanceo * 0.7 - g.rotation.x) * f; });
    Q.brazos.forEach((g, i) => {
      if (g.userData.z0 === undefined) g.userData.z0 = g.rotation.z;
      const arriba = saluda && i === 1;
      g.rotation.x += ((arriba ? -2.7 : (i ? 1 : -1) * balanceo * 0.6) - g.rotation.x) * f;
      g.rotation.z = arriba ? g.userData.z0 + Math.sin(t * 12) * 0.35 : g.rotation.z + (g.userData.z0 - g.rotation.z) * f;
    });
    let y = caminando ? Math.abs(Math.cos(Q.fase)) * 0.06 : Math.sin(t * 2.2) * 0.015;
    if (Q.flota) y = 0.22 + Math.sin(t * 2.4) * 0.09;
    Q.torso.position.y = y;
  }

  // Los que esperan miran a su alrededor; si te acercás se dan vuelta y saludan.
  function animarEsperando(t, dt) {
    for (const n of esperando) {
      const cerca = aparicionT < 0 && Math.hypot(pos.x - n.x, pos.z - n.z) < 2.6;
      if (cerca && !n.cerca) n.saludo = 1.8;
      n.cerca = cerca;
      n.el.classList.toggle('pj--cerca', cerca);
      n.saludo = Math.max(0, n.saludo - dt);
      const objetivo = cerca ? Math.atan2(pos.x - n.x, pos.z - n.z) : n.yaw0 + Math.sin((t + n.desfase) * 0.45) * 0.5;
      let dif = objetivo - n.yaw;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      n.yaw += dif * (1 - Math.exp(-dt * (cerca ? 8 : 2)));
      n.P.raiz.rotation.y = n.yaw;
      animarCuerpo(n.P, t + n.desfase, dt, false, n.saludo > 0);
    }
  }

  function animarPersonaje(t, dt, caminando) {
    animarCuerpo(P, t, dt, caminando);
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
    for (const a of [...anclas, ...esperando]) {
      proy.v.copy(a.v).project(camara);
      const fuera = proy.v.z > 1 || proy.v.x < -1.2 || proy.v.x > 1.2 || proy.v.y < -1.2 || proy.v.y > 1.2;
      a.el.classList.toggle('pj--oculta', fuera);
      if (fuera) continue;
      const x = ((proy.v.x + 1) / 2) * r.width;
      const y = Math.max(a.el.offsetHeight + 4, ((1 - proy.v.y) / 2) * r.height); // que no se corte arriba
      a.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  // Con el panel abierto la imagen se corre para que el personaje no quede
  // tapado: a la izquierda en pantallas anchas, hacia arriba en celulares.
  function ajustarVista(dt) {
    const angosta = innerWidth <= 760;
    const abierto = !panel.hidden;
    const objetivo = {
      x: abierto && !angosta ? (panel.offsetWidth + 24) / 2 : 0,
      y: abierto && angosta ? panel.offsetHeight / 2 : 0,
    };
    const f = 1 - Math.exp(-dt * 8);
    vista.x += (objetivo.x - vista.x) * f;
    vista.y += (objetivo.y - vista.y) * f;
    const r = lienzo.getBoundingClientRect();
    if (Math.abs(vista.x) < 0.5 && Math.abs(vista.y) < 0.5) camara.clearViewOffset();
    else camara.setViewOffset(r.width, r.height, vista.x, vista.y, r.width, r.height);
  }

  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000);
    ultimo = ahora;
    const t = ahora / 1000;

    let mx = 0, mz = 0, fuerza = 1;
    if (teclas.has('izq')) mx -= 1;
    if (teclas.has('der')) mx += 1;
    if (teclas.has('arr')) mz -= 1;
    if (teclas.has('aba')) mz += 1;
    if (!mx && !mz && (joy.x || joy.z)) {
      mx = joy.x; mz = joy.z;
      fuerza = Math.min(1, Math.hypot(mx, mz));
      if (fuerza < 0.15) mx = mz = 0;
    }
    if (!mx && !mz && destino) {
      mx = destino.x - pos.x; mz = destino.z - pos.z;
      const d = Math.hypot(mx, mz);
      if (d < 0.08) { destino = null; mx = mz = 0; }
      else fuerza = Math.min(1, d * 2.5);
    }
    const caminando = (mx || mz) && aparicionT < 0;
    if (caminando) {
      const largo = Math.hypot(mx, mz);
      const paso = VEL * fuerza * dt;
      const antes = { x: pos.x, z: pos.z };
      pos.x += (mx / largo) * paso;
      pos.z += (mz / largo) * paso;
      chocar();
      // Trabado contra algo camino a un destino: se da por llegado.
      if (destino && Math.hypot(pos.x - antes.x, pos.z - antes.z) < paso * 0.3) {
        atascado += dt;
        if (atascado > 0.4) { destino = null; atascado = 0; }
      } else atascado = 0;
      yawObjetivo = Math.atan2(mx, mz);
    } else if (paradaActiva && !destino) {
      yawObjetivo = 0; // quieto en una parada: mira a la cámara
    }
    let dif = yawObjetivo - yaw;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    yaw += dif * (1 - Math.exp(-dt * 12));

    animarPersonaje(t, dt, !!caminando);
    animarEsperando(t, dt);
    animarEfectos(dt);
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
    armar, iniciarPersonaje, irA, pausar, puntoEnPantalla,
  };
})();

/* ───────────────────────── Arranque ───────────────────────── */

pintarSlots();
const pedido = new URLSearchParams(location.search).get('miembro');
const inicial = Math.max(0, EQUIPO.findIndex((m) => m.key === pedido));
previsualizar(inicial, false);
if (WEBGL) (window.requestIdleCallback || ((fn) => setTimeout(fn, 800)))(() => cargarThree().catch(() => {}));
if (pedido && EQUIPO.some((m) => m.key === pedido)) {
  // Link directo (personajes.html?miembro=agustina): sale el personaje sin pasar por la selección.
  setTimeout(() => confirmar(), reduce ? 0 : 500);
}
