// ruta-3d.js — la Ruta del ingresante en 3D (three.js, sin build): maqueta
// isométrica low-poly con el mismo estilo que la Oficina. Una línea de subte con
// los 4 tramos de colores y 13 andenes, del totem del QR al local de bienvenida.
//
// - Cada andén muestra cuánta gente pasó por la estación en el período (cartel)
//   y la gente que está esperando ahí ahora (muñequitos: más muñequitos, más gente;
//   crecen en escala logarítmica para que entren de 1 a 10.000).
// - Los trencitos repiten los últimos movimientos reales (de una estación a la siguiente).
// - Los 6 agentes cuidan su tramo: cuentan números reales de la ruta, lo último
//   que hicieron (bitácora) y de vez en cuando visitan sus estaciones.
// - Clic en un andén: lo elige en el panel (evento ruta:elegir). Clic en un
//   agente: ficha con lo último que hizo y botón para preguntarle por el chat.
//
// Datos: escucha "ruta:datos" (ruta.js) y lee la bitácora de los agentes cada 30 s.
// Sin WebGL o si three.js no carga, la maqueta se oculta y queda la línea 2D.
const THREE_URL = './vendor/three.min.js?v=0.186.1';
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const escena = document.getElementById('rutaEscena');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function fallo(e) {
  if (e) console.warn('Ruta 3D no disponible; queda la línea 2D.', e);
  escena.innerHTML = '';
  escena.classList.add('sin-3d');
}

if (escena && window.RUTA) {
  if (hayWebGL()) iniciar().catch(fallo);
  else fallo();
}

/* ───────────────────────── Configuración ───────────────────────── */

const PALETA = {
  fondo: '#eef2f6',
  base: '#e3e8ef',
  grilla: '#cdd5e0',
  blanco: '#ffffff',
  patas: '#d5dbe4',
  oscuro: '#3b4352',
  gris: '#b8c1ce',
  grisSuave: '#e6e9ee',
  menta: '#5ee0b5',
  cian: '#45d3ec',
  ambar: '#f5b748',
  hoja: '#7fd3a8',
  hojaOscura: '#45b386',
  terracota: '#e9a07a',
  amarilloSuave: '#ffe7a3',
  coral: '#ffb4a2',
};
const ESTADOS = {
  trabajando: { label: 'Trabajando', color: PALETA.cian },
  activo: { label: 'En horario', color: PALETA.menta },
  alerta: { label: 'Con aviso', color: PALETA.ambar },
  durmiendo: { label: 'Durmiendo', color: PALETA.gris },
};
const ROPA = ['#f4a261', '#e9c46a', '#8ecae6', '#cdb4db', '#ffafcc', '#a3c4bc', '#f6bd60', '#90be6d', '#bde0fe'];
const PIEL = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

// Plano de la maqueta (u: hacia la derecha de la pantalla, v: hacia abajo).
// Tres filas en zigzag: tramos 1-2 arriba, 3 al medio (vuelve), 4 abajo.
const POS = {
  POSTULADO: [-14, -8], CITADO_ENTREVISTA: [-7, -8], CONFIRMO_ENTREVISTA: [0, -8], ASISTIO_ENTREVISTA: [7, -8], APROBADO: [14, -8],
  COMPARTIDO_ZONAL: [14, 0], VACANTE_ASIGNADA: [0, 0], APROBADO_ZONAL: [-14, 0],
  CITADO_ONB: [-14, 8], CONFIRMA_ONB: [-7, 8], HIZO_ONB: [0, 8], ALTA_ICHECK: [7, 8], INGRESO: [14, 8],
};
const ORDEN = Object.keys(POS);
const SALIDAS = [-19.6, 10.3]; // andén de salidas, en la esquina de abajo a la izquierda
const TORRE = [20.3, -10.2]; // torre de control (Coordinador y Analista), arriba a la derecha
const ANDEN_V = -1.75; // el andén queda detrás de la vía
const MEDIDA = { u: 46, v: 23.5 };

// Dónde vive cada agente ([u, v, altura]), sus estaciones, forma y horario (como en la Oficina).
const PUESTOS = {
  screening: { casa: [-19.5, -8, 2.6], forma: 'esfera', color: '#9b87f5', dias: [1, 2, 3, 4, 5, 6], estaciones: ['POSTULADO', 'APROBADO'] },
  agenda: { casa: [-3.5, -11.2, 2.4], forma: 'cubo', color: '#f5c842', dias: [1, 2, 3, 4, 5], estaciones: ['CITADO_ENTREVISTA', 'CONFIRMO_ENTREVISTA', 'ASISTIO_ENTREVISTA'] },
  vacantes: { casa: [20.5, -4, 2.4], forma: 'cubo', color: '#e85a5a', dias: [1, 2, 3, 4, 5], estaciones: ['COMPARTIDO_ZONAL', 'VACANTE_ASIGNADA', 'APROBADO_ZONAL'] },
  onboarding: { casa: [-20.5, 4, 2.4], forma: 'capsula', color: '#8a3b45', dias: [1, 2, 3, 4, 5], estaciones: ['CITADO_ONB', 'CONFIRMA_ONB', 'HIZO_ONB', 'ALTA_ICHECK', 'INGRESO'] },
  coordinador: { casa: [TORRE[0], TORRE[1], 4.3], forma: 'capsula', color: PALETA.blanco, dias: [1, 2, 3, 4, 5], estaciones: [] },
  analista: { casa: [TORRE[0] - 2.7, TORRE[1] - 1.0, 2.4], forma: 'esfera', color: '#5b8def', dias: [1, 2, 3, 4, 5], estaciones: [] },
};
const DESPIERTOS = [8, 18];
const ACCION_EMOJI = { ok: '✅', error: '⚠️', pendiente: '⏳', resuelto: '✅' };

/* ───────────────────────── Utilidades ───────────────────────── */

let T;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

function horaBA() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { dia: { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday], hora: Number(p.hour) };
}
const despierto = (p) => {
  const t = horaBA();
  return p.dias.includes(t.dia) && t.hora >= DESPIERTOS[0] && t.hora < DESPIERTOS[1];
};
// Muñequitos en el andén: 0 → 0, 1 → 1, 10 → 4, 100 → 7, 1.000 → 10, 10.000 → 14.
const munecos = (n) => (n > 0 ? Math.min(15, Math.max(1, Math.round(Math.log10(n + 1) * 3.3))) : 0);

/* ───────────────────────── Geometría low-poly ───────────────────────── */

const materiales = new Map();
const geometrias = new Map();
function mate(color, plano = false) {
  const clave = color + (plano ? ':plano' : '');
  if (!materiales.has(clave)) materiales.set(clave, new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: plano }));
  return materiales.get(clave);
}
function malla(geo, mat, { sombra = true, recibe = true } = {}) {
  const m = new T.Mesh(geo, mat);
  m.castShadow = sombra;
  m.receiveShadow = recibe;
  return m;
}
function en(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}
function caja(w, h, d, color, { r = 0.05, sombra = true, recibe = true } = {}) {
  const clave = `${w}|${h}|${d}|${r}`;
  if (!geometrias.has(clave)) geometrias.set(clave, new T.RoundedBoxGeometry(w, h, d, 3, r));
  return malla(geometrias.get(clave), typeof color === 'string' ? mate(color) : color, { sombra, recibe });
}
function cilindro(rt, rb, h, seg, color, opciones) {
  return malla(new T.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mate(color) : color, opciones);
}

function planta(escala = 1) {
  const g = new T.Group();
  g.add(en(cilindro(0.3, 0.24, 0.6, 10, PALETA.blanco), 0, 0.3, 0));
  g.add(en(malla(new T.IcosahedronGeometry(0.45, 0), mate('#9be6c9', true)), 0, 0.95, 0));
  g.add(en(malla(new T.IcosahedronGeometry(0.27, 0), mate(PALETA.menta, true)), 0.2, 1.32, 0.05));
  g.scale.setScalar(escala);
  return g;
}
function arbol(escala = 1) {
  const g = new T.Group();
  g.add(en(cilindro(0.08, 0.11, 0.9, 6, '#8d6e4f'), 0, 0.45, 0));
  [[0, 1.25, 0, 0.55, PALETA.hojaOscura], [0.25, 1.0, 0.1, 0.4, PALETA.hoja], [-0.2, 1.55, -0.05, 0.36, PALETA.hoja]]
    .forEach(([x, y, z, r, c]) => g.add(en(malla(new T.IcosahedronGeometry(r, 0), mate(c, true)), x, y, z)));
  g.scale.setScalar(escala);
  return g;
}

/** Totem del QR donde empieza la ruta. */
function totemQR() {
  const g = new T.Group();
  g.add(en(caja(0.9, 0.12, 0.7, PALETA.patas, { r: 0.04 }), 0, 0.06, 0));
  g.add(en(caja(0.7, 1.9, 0.18, PALETA.blanco, { r: 0.06 }), 0, 1.05, 0));
  g.add(en(caja(0.56, 0.56, 0.02, PALETA.oscuro, { r: 0.01, sombra: false }), 0, 1.45, 0.1));
  [[-0.17, 0.17], [0.17, 0.17], [-0.17, -0.17], [0.05, -0.05], [0.17, -0.17]].forEach(([x, y]) => {
    g.add(en(caja(0.12, 0.12, 0.02, PALETA.blanco, { r: 0.005, sombra: false }), x, 1.45 + y, 0.115));
  });
  return g;
}

/** Local de bienvenida al final de la línea (toldo verde y bandera). */
function local() {
  const g = new T.Group();
  g.add(en(caja(3, 2, 2.4, PALETA.blanco, { r: 0.08 }), 0, 1, 0));
  g.add(en(caja(3.2, 0.18, 2.6, '#d5dbe4', { r: 0.05 }), 0, 2.08, 0));
  const toldo = en(caja(3.1, 0.12, 0.9, '#2c9356', { r: 0.04 }), 0, 1.55, 1.45);
  toldo.rotation.x = 0.35;
  g.add(toldo);
  g.add(en(caja(1.0, 1.1, 0.06, '#9fd8b8', { r: 0.03, sombra: false }), -0.7, 0.75, 1.21));
  g.add(en(caja(0.7, 1.3, 0.06, PALETA.oscuro, { r: 0.03, sombra: false }), 0.75, 0.65, 1.21));
  g.add(en(cilindro(0.04, 0.04, 1.4, 6, PALETA.oscuro), 1.2, 2.85, -0.8));
  const bandera = en(caja(0.7, 0.42, 0.03, '#2c9356', { r: 0.02, sombra: false }), 1.57, 3.3, -0.8);
  g.add(bandera);
  return { grupo: g, bandera };
}

/** Torre de control (Coordinador y Analista). */
function torre() {
  const g = new T.Group();
  g.add(en(cilindro(1.1, 1.3, 0.3, 20, PALETA.patas), 0, 0.15, 0));
  g.add(en(cilindro(0.55, 0.7, 2.4, 16, PALETA.blanco), 0, 1.5, 0));
  g.add(en(cilindro(1.05, 0.9, 0.7, 20, PALETA.blanco), 0, 3.0, 0));
  const vidrio = new T.MeshStandardMaterial({ color: '#bfe9f5', emissive: PALETA.cian, emissiveIntensity: 0.35, roughness: 0.3 });
  g.add(en(malla(new T.CylinderGeometry(1.0, 1.0, 0.36, 20), vidrio), 0, 3.0, 0));
  g.add(en(cilindro(1.15, 1.15, 0.1, 20, PALETA.oscuro), 0, 3.4, 0));
  return { grupo: g, vidrio };
}

/** Un muñequito que espera en el andén. */
function muneco(i) {
  const g = new T.Group();
  g.add(en(malla(new T.CapsuleGeometry(0.17, 0.26, 4, 10), mate(ROPA[i % ROPA.length]), { recibe: false }), 0, 0.33, 0));
  g.add(en(malla(new T.SphereGeometry(0.14, 12, 10), mate(PIEL[(i * 3) % PIEL.length]), { recibe: false }), 0, 0.76, 0));
  return g;
}

/** Vagón de los trencitos (mira hacia +x). */
function vagon() {
  const g = new T.Group();
  const franja = new T.MeshStandardMaterial({ color: '#0f8b8d', roughness: 0.6 });
  g.add(en(caja(1.2, 0.5, 0.62, PALETA.blanco, { r: 0.16 }), 0, 0.42, 0));
  g.add(en(caja(1.22, 0.12, 0.64, franja, { r: 0.05, sombra: false }), 0, 0.3, 0));
  [-0.3, 0.05, 0.4].forEach((x) => g.add(en(caja(0.24, 0.18, 0.66, PALETA.oscuro, { r: 0.04, sombra: false }), x, 0.52, 0)));
  return { grupo: g, franja };
}

/* ───────────────────────── Robots (los de la Oficina) ───────────────────────── */

const FORMAS = { esfera: { visor: 0.36, tope: 0.42 }, cubo: { visor: 0.36, tope: 0.36 }, capsula: { visor: 0.29, tope: 0.47 } };
function crearBot(forma, color) {
  const raiz = new T.Group();
  const giro = new T.Group(); // el plano ya está girado 45°: así quedan de frente a la cámara
  giro.scale.setScalar(1.35);
  raiz.add(giro);
  const flota = new T.Group();
  giro.add(flota);
  const dims = FORMAS[forma] || FORMAS.esfera;
  let cuerpo;
  if (forma === 'cubo') cuerpo = caja(0.72, 0.72, 0.72, color, { r: 0.18, recibe: false });
  else if (forma === 'capsula') cuerpo = malla(new T.CapsuleGeometry(0.3, 0.34, 6, 14), mate(color), { recibe: false });
  else cuerpo = malla(new T.IcosahedronGeometry(0.42, 1), mate(color, true), { recibe: false });
  flota.add(cuerpo);
  flota.add(en(caja(0.5, 0.22, 0.1, new T.MeshStandardMaterial({ color: PALETA.oscuro, roughness: 0.5 }), { r: 0.05, sombra: false }), 0, 0.04, dims.visor));
  const luz = ESTADOS.activo.color;
  const ojoMat = new T.MeshStandardMaterial({ color: luz, emissive: luz, emissiveIntensity: 1.2 });
  const ojos = en(new T.Group(), 0, 0.04, dims.visor + 0.055);
  [-0.11, 0.11].forEach((x) => ojos.add(en(new T.Mesh(new T.SphereGeometry(0.045, 12, 12), ojoMat), x, 0, 0)));
  flota.add(ojos);
  flota.add(en(cilindro(0.015, 0.015, 0.2, 6, PALETA.patas, { sombra: false }), 0, dims.tope + 0.1, 0));
  const puntaMat = new T.MeshStandardMaterial({ color: luz, emissive: luz, emissiveIntensity: 0.9 });
  flota.add(en(new T.Mesh(new T.SphereGeometry(0.055, 12, 12), puntaMat), 0, dims.tope + 0.22, 0));
  const anilloMat = new T.MeshStandardMaterial({ color: luz, emissive: luz, emissiveIntensity: 0.7, roughness: 0.6 });
  const anillo = en(new T.Mesh(new T.TorusGeometry(0.38, 0.035, 8, 36), anilloMat), 0, -0.62, 0);
  anillo.rotation.x = Math.PI / 2;
  flota.add(anillo);
  return { raiz, flota, ojos, ojoMat, puntaMat, anillo, anilloMat };
}

/* ───────────────────────── Escena ───────────────────────── */

async function iniciar() {
  T = await import(THREE_URL);
  const { TRAMOS, AGENTES, ESTACIONES } = window.RUTA;
  const tramoDe = (etapa) => TRAMOS[(ESTACIONES[etapa] || {}).tramo] || TRAMOS.x;

  escena.classList.add('o3d');
  escena.innerHTML = '';
  escena.setAttribute('role', 'region');
  escena.setAttribute('aria-label', 'Maqueta 3D de la ruta del ingresante: cada andén es una estación del proceso con la gente que está esperando ahí. Tocá un andén para ver el detalle o un agente para preguntarle.');

  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  escena.appendChild(renderer.domElement);
  const capa = document.createElement('div');
  capa.className = 'o3d-capa';
  escena.appendChild(capa);

  const mundo = new T.Scene();
  mundo.background = new T.Color(PALETA.fondo);
  const camara = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  mundo.add(new T.AmbientLight(0xffffff, 0.55));
  mundo.add(new T.HemisphereLight(0xffffff, 0xd9e1ec, 0.55));
  const sol = new T.DirectionalLight(0xffffff, 1.5);
  sol.position.set(14, 26, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.radius = 4;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  Object.assign(sol.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 100 });
  mundo.add(sol);

  // Todo se arma en coordenadas del plano (u, altura, v); el grupo gira 45° para
  // que u quede horizontal en la pantalla isométrica.
  const plano = new T.Group();
  plano.rotation.y = Math.PI / 4;
  mundo.add(plano);
  plano.updateMatrixWorld(true);
  const P = (u, v, y = 0) => new T.Vector3(u, y, v);
  const aMundo = (vLocal) => plano.localToWorld(vLocal.clone());

  plano.add(en(caja(MEDIDA.u, 0.8, MEDIDA.v, PALETA.base, { r: 0.3 }), 0, -0.4, 0));
  plano.add(en(caja(MEDIDA.u - 0.5, 0.06, MEDIDA.v - 0.5, '#f4f7fa', { r: 0.2, sombra: false }), 0, 0.03, 0));

  const anclas = [];
  function etiqueta(clase, html, pos, ajuste = 'translate(-50%, -50%)') {
    const el = document.createElement('div');
    el.className = clase;
    el.innerHTML = html;
    capa.appendChild(el);
    anclas.push({ el, pos, ajuste });
    return el;
  }

  /* ── La línea: una curva por todo el recorrido, coloreada por tramo ── */
  const giro = (cu, cv, desde, hasta, r = 4) => {
    const pts = [];
    for (let k = 1; k < 6; k++) {
      const a = desde + ((hasta - desde) * k) / 6;
      pts.push(P(cu + r * Math.cos(a), cv + r * Math.sin(a), 0.34));
    }
    return pts;
  };
  const puntos = [
    P(-18.2, -8, 0.34),
    ...ORDEN.slice(0, 5).map((e) => P(POS[e][0], POS[e][1], 0.34)),
    P(17, -8, 0.34), ...giro(17, -4, -Math.PI / 2, Math.PI / 2), P(17, 0, 0.34),
    ...ORDEN.slice(5, 8).map((e) => P(POS[e][0], POS[e][1], 0.34)),
    P(-17, 0, 0.34), ...giro(-17, 4, -Math.PI / 2, -Math.PI * 1.5), P(-17, 8, 0.34),
    ...ORDEN.slice(8).map((e) => P(POS[e][0], POS[e][1], 0.34)),
    P(17.6, 8, 0.34),
  ];
  const curva = new T.CatmullRomCurve3(puntos, false, 'centripetal');
  // Dónde cae cada estación sobre la curva (0 a 1).
  const MUESTRAS = 1200;
  const muestras = curva.getSpacedPoints(MUESTRAS);
  const tDe = {};
  ORDEN.forEach((e) => {
    const p = P(POS[e][0], POS[e][1], 0.34);
    let mejor = 0;
    let dist = Infinity;
    muestras.forEach((m, i) => { const d = m.distanceToSquared(p); if (d < dist) { dist = d; mejor = i; } });
    tDe[e] = mejor / MUESTRAS;
  });
  // Cada tramo de vía tiene el color de la estación a la que llega.
  const tramoEnT = (t) => {
    const e = ORDEN.find((x) => tDe[x] >= t - 1e-4);
    return (ESTACIONES[e || 'INGRESO'] || {}).tramo || 4;
  };
  const SEG = 600;
  const RAD = 10;
  const tubo = new T.TubeGeometry(curva, SEG, 0.24, RAD, false);
  const colores = [];
  const c = new T.Color();
  for (let i = 0; i <= SEG; i++) {
    c.set(TRAMOS[tramoEnT(i / SEG)].color);
    for (let j = 0; j <= RAD; j++) colores.push(c.r, c.g, c.b);
  }
  tubo.setAttribute('color', new T.Float32BufferAttribute(colores, 3));
  plano.add(malla(tubo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), { recibe: false }));
  // Durmientes debajo de la vía.
  const durmiente = mate('#d3d9e2');
  for (let k = 0; k <= 160; k++) {
    const t = k / 160;
    const p = curva.getPointAt(t);
    const tg = curva.getTangentAt(t);
    const d = caja(0.18, 0.08, 0.9, durmiente, { r: 0.02, sombra: false });
    d.position.set(p.x, 0.12, p.z);
    d.rotation.y = Math.atan2(-tg.z, tg.x);
    plano.add(d);
  }

  /* ── Andenes ── */
  const andenes = new Map();
  const clicables = [];
  ORDEN.forEach((etapa, i) => {
    const [u, v] = POS[etapa];
    const tr = tramoDe(etapa);
    const g = en(new T.Group(), u, 0, v + ANDEN_V);
    const matPiso = new T.MeshStandardMaterial({ color: tr.suave, roughness: 0.7 });
    const matBorde = new T.MeshStandardMaterial({ color: tr.color, roughness: 0.6 });
    const piso = en(caja(4.4, 0.36, 2.2, matPiso, { r: 0.12 }), 0, 0.18, 0);
    const borde = en(caja(4.4, 0.1, 0.24, matBorde, { r: 0.04, sombra: false }), 0, 0.39, 0.95);
    g.add(piso, borde);
    g.add(en(cilindro(0.05, 0.05, 1.3, 6, PALETA.oscuro), -1.95, 1.0, -0.85));
    g.add(en(caja(0.7, 0.42, 0.07, matBorde, { r: 0.04 }), -1.95, 1.75, -0.85));
    const gente = [];
    for (let k = 0; k < 15; k++) {
      const m = muneco(i * 7 + k);
      const col = k % 5;
      const fila = Math.floor(k / 5);
      m.position.set(-1.4 + col * 0.72 + (fila % 2) * 0.3, 0.36, -0.55 + fila * 0.5);
      m.visible = false;
      m.userData.fase = Math.random() * 6;
      g.add(m);
      gente.push(m);
    }
    g.traverse((h) => { h.userData.etapa = etapa; });
    plano.add(g);
    clicables.push(g);
    // El cartel va en el piso, delante de la vía, para no tapar la fila de arriba.
    const cartel = etiqueta('ru3-cartel', '', () => aMundo(P(u, v + 0.85, 0.05)), 'translate(-50%, 0)');
    cartel.style.setProperty('--c', tr.color);
    andenes.set(etapa, { etapa, g, matPiso, matBorde, gente, cartel, tr, n: 0, elevar: 0, pulso: -10 });
  });

  // Salidas: andén rojo aparte, sin vía (se puede salir de cualquier estación).
  const salidas = (() => {
    const tr = TRAMOS.x;
    const g = en(new T.Group(), SALIDAS[0], 0, SALIDAS[1]);
    g.add(en(caja(4.4, 0.3, 2.0, tr.suave, { r: 0.12 }), 0, 0.15, 0));
    for (let k = 0; k < 5; k++) g.add(en(caja(0.1, 0.5, 0.1, tr.color, { r: 0.03 }), -1.9 + k * 0.95, 0.5, 0.85));
    g.add(en(caja(4.0, 0.08, 0.08, tr.color, { r: 0.03, sombra: false }), 0, 0.72, 0.85));
    const gente = [];
    for (let k = 0; k < 10; k++) {
      const m = muneco(k + 3);
      m.position.set(-1.5 + (k % 5) * 0.75, 0.3, -0.35 + Math.floor(k / 5) * 0.5);
      m.visible = false;
      m.userData.fase = Math.random() * 6;
      g.add(m);
      gente.push(m);
    }
    g.traverse((h) => { h.userData.etapa = 'SALIDAS'; });
    plano.add(g);
    clicables.push(g);
    const cartel = etiqueta('ru3-cartel is-salida', '', () => aMundo(P(SALIDAS[0], SALIDAS[1] - 1.1, 1.0)), 'translate(-50%, -100%)');
    cartel.style.setProperty('--c', tr.color);
    return { g, gente, cartel };
  })();

  // Principio y fin de la línea, torre de control y algo de verde.
  plano.add(en(totemQR(), -19.6, 0, -9.6));
  const meta = local();
  meta.grupo.position.set(20, 0, 9.5);
  plano.add(meta.grupo);
  etiqueta('ru3-hito', '📱 Formulario QR', () => aMundo(P(-19.6, -9.6, 2.4)), 'translate(-50%, -100%)');
  etiqueta('ru3-hito is-meta', '🎉 ¡Bienvenido al equipo!', () => aMundo(P(20, 11.1, 0.1)), 'translate(-50%, 0)');
  const tw = torre();
  tw.grupo.position.set(TORRE[0], 0, TORRE[1]);
  plano.add(tw.grupo);
  [[-21.5, -11], [-10.5, -11.2], [-3.5, 11], [21.8, 3.5], [-10.5, -4], [3, -4], [3, 4], [12, 4.2]].forEach(([u, v], k) => {
    plano.add(en(k % 3 === 2 ? planta(0.9) : arbol(0.8 + (k % 2) * 0.25), u, 0, v));
  });

  /* ── Trencitos con los últimos movimientos ── */
  const trenes = Array.from({ length: 4 }, () => {
    const v = vagon();
    v.grupo.visible = false;
    plano.add(v.grupo);
    return { ...v, viaje: null };
  });

  /* ── Agentes ── */
  const agentes = new Map();
  Object.entries(PUESTOS).forEach(([id, p], i) => {
    const bot = crearBot(p.forma, p.color);
    const casa = P(p.casa[0], p.casa[1], p.casa[2]);
    plano.add(bot.raiz);
    bot.raiz.traverse((h) => { h.userData.agente = id; });
    clicables.push(bot.raiz);
    const a = {
      id, p, bot, casa, pos: casa.clone(), vuelo: null, salto: -10, fase: i * 1.7, ocupado: false,
      datos: AGENTES[id], ultima: null, estado: 'activo', sueno: 0,
    };
    a.tag = etiqueta('o3d-tag', `<i></i>${a.datos.emoji}<span>${esc(a.datos.nombre)}</span>`, () => aMundo(a.pos.clone().add(new T.Vector3(0, -1.2, 0))), 'translate(-50%, 0)');
    a.globo = etiqueta('o3d-globo', '', () => aMundo(a.pos.clone().add(new T.Vector3(0, 1.2, 0))), 'translate(-50%, -100%)');
    a.zzz = etiqueta('o3d-zzz', '<i>z</i><i>z</i><i>Z</i>', () => aMundo(a.pos.clone().add(new T.Vector3(0.5, 0.7, 0))), 'translate(-50%, -100%)');
    agentes.set(id, a);
  });

  /* ── Datos de la ruta ── */
  let datos = window.RUTA.datos;
  let elegida = null;
  const est = (etapa) => (datos && datos.estaciones || []).find((e) => e.etapa === etapa) || null;

  function pintarDatos() {
    if (!datos) return;
    andenes.forEach((a) => {
      const e = est(a.etapa) || { personas: 0, hoy: 0, ahora: 0, nombre: a.etapa };
      const vacia = !e.personas;
      a.matPiso.color.set(vacia ? PALETA.grisSuave : a.tr.suave);
      a.matBorde.color.set(vacia ? PALETA.gris : a.tr.color);
      a.n = munecos(e.ahora);
      a.gente.forEach((m, k) => { m.visible = k < a.n; });
      a.cartel.classList.toggle('is-vacia', vacia);
      a.cartel.innerHTML = `<b>${esc((ESTACIONES[a.etapa] || {}).corto || e.nombre)}</b><span>${vacia ? 'Sin datos' : fmt(e.personas)}${e.hoy ? ` <em>+${fmt(e.hoy)}</em>` : ''}</span>`;
      a.cartel.title = `${e.nombre}: ${vacia ? 'sin datos' : `${fmt(e.personas)} en el período, ${fmt(e.ahora)} esperando acá`}`;
    });
    const out = (datos.estaciones || []).filter((e) => e.es_salida);
    const totalOut = out.reduce((s, e) => s + (e.personas || 0), 0);
    salidas.gente.forEach((m, k) => { m.visible = k < Math.min(10, munecos(totalOut)); });
    salidas.cartel.innerHTML = `<b>Salidas</b><span>${fmt(totalOut)}</span>`;
    salidas.cartel.title = out.map((e) => `${e.nombre}: ${fmt(e.personas)}`).join(' · ');
  }

  /* ── Globitos: uno solo a la vez ── */
  let hablando = null;
  function callar(a) {
    clearTimeout(a.globoTimer);
    a.globo.classList.remove('on');
    if (hablando === a) hablando = null;
  }
  function decir(a, texto, ms = 3800, importante = false) {
    if (hablando && hablando !== a) {
      if (!importante) return;
      callar(hablando);
    }
    clearTimeout(a.globoTimer);
    a.globo.textContent = texto;
    a.globo.classList.add('on');
    hablando = a;
    a.globoTimer = setTimeout(() => callar(a), ms);
  }

  function volar(a, destino, dur = 1.9) {
    return new Promise((res) => {
      if (reduce) {
        a.pos.copy(destino);
        res();
        return;
      }
      a.vuelo = { desde: a.pos.clone(), hasta: destino.clone(), t0: performance.now() / 1000, dur, res };
    });
  }

  // Lo que cuenta cada agente, con los números de la ruta.
  function frase(a) {
    if (!datos) return null;
    const n = (etapa, k = 'personas') => fmt((est(etapa) || {})[k]);
    const pasosHoy = (datos.estaciones || []).filter((e) => e.etapa !== 'POSTULADO').reduce((s, e) => s + (e.hoy || 0), 0);
    const masGente = [...(datos.estaciones || [])].filter((e) => !e.es_salida && e.etapa !== 'POSTULADO').sort((x, y) => y.ahora - x.ahora)[0];
    const opciones = {
      screening: [`🔎 ${n('POSTULADO', 'hoy')} postulaciones hoy`, `🔎 ${n('APROBADO')} aprobados en el período`],
      agenda: [`📅 ${n('CITADO_ENTREVISTA')} citados a entrevista`, `📅 ${n('CONFIRMO_ENTREVISTA')} confirmaron la entrevista`, `📅 ${n('ASISTIO_ENTREVISTA')} vinieron a la entrevista`],
      vacantes: [`📌 ${n('VACANTE_ASIGNADA', 'ahora')} esperan el OK del zonal`, `📌 ${n('COMPARTIDO_ZONAL')} compartidos a los zonales`],
      onboarding: [`🤝 ${n('ALTA_ICHECK')} cargados en iCheck`, `🤝 ${n('INGRESO')} ingresaron${(est('INGRESO') || {}).programados ? ` · ${n('INGRESO', 'programados')} programados` : ''}`],
      coordinador: [masGente ? `🧭 Donde más gente espera: ${masGente.nombre} (${fmt(masGente.ahora)})` : '🧭 Reviso la ruta'],
      analista: [`📊 ${fmt(pasosHoy)} pasos hoy en la ruta`],
    };
    return azar(opciones[a.id] || []);
  }
  const textoAccion = (u) => `${ACCION_EMOJI[u.estado] || '✅'} ${u.accion}${u.cantidad > 1 ? ' · ' + fmt(u.cantidad) : ''}`;

  async function rutina() {
    const libres = [...agentes.values()].filter((a) => a.estado !== 'durmiendo' && !a.ocupado && !a.vuelo);
    if (!libres.length || !datos) return;
    const a = azar(libres);
    a.ocupado = true;
    try {
      const r = Math.random();
      if (r < 0.45 || reduce || !a.p.estaciones.length) {
        decir(a, a.ultima && Math.random() < 0.35 ? `${textoAccion(a.ultima)} (${SB.hace(a.ultima.created_at)})` : frase(a) || '👋');
      } else {
        // Visita una de sus estaciones y cuenta cuánta gente hay.
        const etapa = azar(a.p.estaciones);
        const [u, v] = POS[etapa];
        await volar(a, P(u + 1.2, v + ANDEN_V - 0.4, 2.6), 2.2);
        const e = est(etapa);
        decir(a, e && e.personas ? `${a.datos.emoji} ${e.nombre}: ${fmt(e.ahora)} esperando` : `${a.datos.emoji} ${e ? e.nombre : etapa}: sin datos todavía`, 3600);
        await espera(4200);
        await volar(a, a.casa, 2.2);
      }
    } finally {
      a.ocupado = false;
    }
  }
  setInterval(rutina, 6500);

  /* ── Trencitos ── */
  let movIdx = 0;
  function largarTren() {
    if (reduce || !datos || !(datos.movimientos || []).length) return;
    const movs = datos.movimientos.filter((m) => ORDEN.indexOf(m.etapa) > 0).slice(0, 30);
    if (!movs.length) return;
    const m = movs[movIdx++ % movs.length];
    const k = ORDEN.indexOf(m.etapa);
    const libre = trenes.find((t) => !t.viaje);
    if (!libre) return;
    const t0 = tDe[ORDEN[k - 1]];
    const t1 = tDe[m.etapa];
    libre.franja.color.set(tramoDe(m.etapa).color);
    libre.viaje = { t0, t1, inicio: performance.now() / 1000, dur: Math.max(1.8, (t1 - t0) * 30), etapa: m.etapa };
    libre.grupo.visible = true;
  }
  setInterval(largarTren, 2600);

  /* ── Bitácora de los agentes ── */
  let ultimoId = 0;
  function calcularEstado(a) {
    if (!despierto(a.p)) return 'durmiendo';
    const u = a.ultima;
    if (u && u.estado === 'error' && Date.now() - new Date(u.created_at) < 24 * 3600e3) return 'alerta';
    if (u && Date.now() - new Date(u.created_at) < 15 * 60e3) return 'trabajando';
    return 'activo';
  }
  function aplicarEstados() {
    agentes.forEach((a) => {
      a.estado = calcularEstado(a);
      const color = new T.Color(ESTADOS[a.estado].color);
      [a.bot.ojoMat, a.bot.puntaMat, a.bot.anilloMat].forEach((m) => { m.color.copy(color); m.emissive.copy(color); });
      a.tag.dataset.estado = a.estado;
      a.zzz.classList.toggle('on', a.estado === 'durmiendo');
    });
    refrescarFicha();
  }
  async function leerBitacora(primeraVez) {
    try {
      const acciones = await SB.pedir('rpc/oficina_ultimas_acciones', { limite: 40 });
      acciones.forEach((x) => {
        const a = agentes.get(x.agente_id);
        if (a && (!a.ultima || x.id > a.ultima.id)) a.ultima = x;
      });
      if (!primeraVez) {
        const nuevas = acciones.filter((x) => x.id > ultimoId && agentes.has(x.agente_id) && agentes.get(x.agente_id).estado !== 'durmiendo');
        nuevas.forEach((x) => { agentes.get(x.agente_id).salto = performance.now() / 1000; });
        if (nuevas[0]) decir(agentes.get(nuevas[0].agente_id), `✨ ${nuevas[0].accion}${nuevas[0].cantidad > 1 ? ' · ' + fmt(nuevas[0].cantidad) : ''}`, 5000, true);
      }
      if (acciones.length) ultimoId = Math.max(ultimoId, ...acciones.map((x) => x.id));
      aplicarEstados();
    } catch (e) {
      console.warn('No se pudo leer la bitácora', e);
    }
  }

  /* ── Ficha de un agente ── */
  const ficha = document.createElement('div');
  ficha.className = 'o3d-ficha';
  ficha.setAttribute('role', 'dialog');
  ficha.hidden = true;
  capa.appendChild(ficha);
  let sobre = null; // { tipo: 'agente' | 'anden', id }
  let fijado = null; // id del agente con la ficha fija
  function refrescarFicha() {
    const id = fijado || (sobre && sobre.tipo === 'agente' ? sobre.id : null);
    if (!id) {
      ficha.hidden = true;
      return;
    }
    const a = agentes.get(id);
    const u = a.ultima;
    const nombres = a.p.estaciones.map((e) => (est(e) || {}).nombre || e);
    ficha.classList.toggle('fija', !!fijado);
    ficha.innerHTML = `
      <div class="o3d-ficha-head">
        <span class="o3d-ficha-emoji">${esc(a.datos.emoji)}</span>
        <div><strong>${esc(a.datos.nombre)}</strong><small>${nombres.length ? `Cuida: ${esc(nombres.join(', '))}` : 'Torre de control: mira toda la ruta'}</small></div>
        <span class="o3d-pill" data-estado="${a.estado}">${esc(ESTADOS[a.estado].label)}</span>
      </div>
      <div class="o3d-ficha-box">
        <span>Última acción</span>
        <p>${u ? `${esc(textoAccion(u))} <em>${esc(SB.hace(u.created_at))}</em>` : 'Todavía sin actividad registrada'}</p>
      </div>
      ${fijado
        ? `<div class="o3d-ficha-acciones"><button type="button" class="o3d-btn" data-preguntar="${esc(a.datos.pregunta)}">Preguntale →</button></div>`
        : '<p class="o3d-ficha-hint">Hacé clic para fijar la ficha y preguntarle</p>'}`;
    ficha.hidden = false;
  }
  ficha.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preguntar]');
    if (!b) return;
    document.dispatchEvent(new CustomEvent('oficina:preguntar', { detail: { texto: b.dataset.preguntar } }));
    document.getElementById('ofiChatInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fijado = null;
    refrescarFicha();
  });

  /* ── Puntero ── */
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  let pendiente = null;
  let abajo = null;
  const queHay = (clientX, clientY) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camara);
    const hit = raycaster.intersectObjects(clicables, true)[0];
    if (!hit) return null;
    const d = hit.object.userData;
    if (d.agente) return { tipo: 'agente', id: d.agente };
    if (d.etapa) return { tipo: 'anden', id: d.etapa };
    return null;
  };
  const lienzo = renderer.domElement;
  const igual = (x, y) => (x && y ? x.tipo === y.tipo && x.id === y.id : x === y);
  lienzo.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pendiente = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerleave', () => { pendiente = null; if (sobre) { sobre = null; lienzo.style.cursor = ''; refrescarFicha(); } });
  lienzo.addEventListener('pointerdown', (e) => { abajo = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerup', (e) => {
    if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 6) return;
    const x = queHay(e.clientX, e.clientY);
    if (x && x.tipo === 'agente') {
      fijado = x.id !== fijado ? x.id : null;
    } else {
      fijado = null;
      // El andén de salidas abre la salida con más gente.
      const salida = () => [...(datos && datos.estaciones || [])].filter((s) => s.es_salida).sort((p, q) => q.personas - p.personas)[0];
      const etapa = x && x.tipo === 'anden' ? (x.id === 'SALIDAS' ? (salida() || {}).etapa || 'NO_AVANZA' : x.id) : null;
      document.dispatchEvent(new CustomEvent('ruta:elegir', { detail: { etapa } }));
    }
    refrescarFicha();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fijado) { fijado = null; refrescarFicha(); } });

  document.addEventListener('ruta:datos', (e) => { datos = e.detail; pintarDatos(); refrescarFicha(); });
  document.addEventListener('ruta:elegida', (e) => { elegida = (e.detail || {}).etapa || null; });

  /* ── Tamaño y cámara ── */
  let ancho = 1;
  let alto = 1;
  function ajustar() {
    ancho = Math.max(1, escena.clientWidth);
    alto = Math.max(1, escena.clientHeight);
    renderer.setSize(ancho, alto);
    Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: alto / 2, bottom: -alto / 2 });
    // La maqueta proyectada mide ≈ 48 u × 18 u (con carteles y robots); el centro
    // sube un poco porque arriba quedan los robots y abajo los carteles.
    camara.zoom = Math.max(4, Math.min(ancho / 48, alto / 18.5));
    const centro = new T.Vector3(-1, 2, -1).normalize().multiplyScalar(0.4);
    camara.position.set(30, 30, 30).add(centro);
    camara.lookAt(centro);
    camara.updateProjectionMatrix();
    escena.classList.toggle('is-chica', ancho < 640);
  }
  new ResizeObserver(ajustar).observe(escena);
  ajustar();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(escena);

  /* ── Loop ── */
  const v3 = new T.Vector3();
  const proyectar = (pos) => {
    v3.copy(pos).project(camara);
    return [((v3.x + 1) / 2) * ancho, ((1 - v3.y) / 2) * alto];
  };
  function posicionarOverlays() {
    anclas.forEach((x) => {
      let [px, py] = proyectar(typeof x.pos === 'function' ? x.pos() : x.pos);
      // Los globitos no se salen de la maqueta (los robots de los bordes hablan hacia adentro).
      if (x.el.classList.contains('on')) {
        const mitad = x.el.offsetWidth / 2;
        px = Math.min(Math.max(px, mitad + 6), ancho - mitad - 6);
      }
      x.el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) ${x.ajuste}`;
    });
    const id = fijado || (sobre && sobre.tipo === 'agente' ? sobre.id : null);
    if (id && !ficha.hidden) {
      const a = agentes.get(id);
      const [px, py] = proyectar(aMundo(a.pos.clone().add(new T.Vector3(0, 1.2, 0))));
      const w = ficha.offsetWidth;
      const h = ficha.offsetHeight;
      const x = Math.min(Math.max(px - w / 2, 8), ancho - w - 8);
      const y = py - h - 14 < 0 ? proyectar(aMundo(a.pos.clone().add(new T.Vector3(0, -1.0, 0))))[1] + 12 : py - h - 14;
      ficha.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px, 0)`;
    }
  }

  const reloj = new T.Timer();
  function loop(ms) {
    requestAnimationFrame(loop);
    reloj.update(ms);
    if (!visible || document.hidden) return;
    const dt = Math.min(reloj.getDelta(), 0.1);
    const t = reloj.getElapsed();
    const ahora = performance.now() / 1000;

    if (pendiente) {
      const x = queHay(pendiente[0], pendiente[1]);
      pendiente = null;
      if (!igual(x, sobre)) {
        sobre = x;
        lienzo.style.cursor = x ? 'pointer' : '';
        refrescarFicha();
      }
    }

    andenes.forEach((a) => {
      const marcado = elegida === a.etapa;
      const encima = sobre && sobre.tipo === 'anden' && sobre.id === a.etapa;
      a.elevar = T.MathUtils.damp(a.elevar, marcado ? 0.35 : encima ? 0.15 : 0, 10, dt);
      a.g.position.y = a.elevar;
      a.cartel.classList.toggle('is-elegida', marcado);
      a.cartel.classList.toggle('is-pulso', ahora - a.pulso < 1.2);
      if (!reduce) a.gente.forEach((m, k) => { if (m.visible) m.position.y = 0.36 + Math.abs(Math.sin(t * 2.2 + m.userData.fase + k)) * 0.05; });
    });
    salidas.cartel.classList.toggle('is-elegida', !!elegida && (ESTACIONES[elegida] || {}).tramo === 'x');

    trenes.forEach((tr) => {
      if (!tr.viaje) return;
      const k = Math.min(1, (ahora - tr.viaje.inicio) / tr.viaje.dur);
      const tt = tr.viaje.t0 + (tr.viaje.t1 - tr.viaje.t0) * suave(k);
      const p = curva.getPointAt(tt);
      const tg = curva.getTangentAt(tt);
      tr.grupo.position.set(p.x, 0.2, p.z);
      tr.grupo.rotation.y = Math.atan2(-tg.z, tg.x);
      if (k >= 1) {
        const a = andenes.get(tr.viaje.etapa);
        if (a) a.pulso = ahora;
        tr.viaje = null;
        tr.grupo.visible = false;
      }
    });

    agentes.forEach((a) => {
      if (a.vuelo) {
        const k = Math.min(1, (ahora - a.vuelo.t0) / a.vuelo.dur);
        a.pos.lerpVectors(a.vuelo.desde, a.vuelo.hasta, suave(k));
        a.pos.y += Math.sin(Math.PI * k) * 1.0;
        if (k >= 1) {
          const res = a.vuelo.res;
          a.vuelo = null;
          res();
        }
      }
      a.sueno = T.MathUtils.damp(a.sueno, a.estado === 'durmiendo' ? 1 : 0, 2.5, dt);
      const amp = reduce ? 0.02 : 0.13 * (1 - 0.85 * a.sueno);
      const bob = Math.sin(t * (1.7 - 1.1 * a.sueno) + a.fase) * amp;
      a.bot.raiz.position.set(a.pos.x, a.pos.y + bob - 0.3 * a.sueno, a.pos.z);
      a.bot.flota.rotation.y = reduce ? 0 : Math.sin(t * 0.6 + a.fase) * 0.28 * (1 - a.sueno);
      a.bot.flota.rotation.z = 0.24 * a.sueno;
      const desde = ahora - a.salto;
      a.bot.flota.position.y = !reduce && desde < 0.9 ? Math.abs(Math.sin((desde / 0.9) * Math.PI * 2)) * 0.5 : 0;
      const encima = fijado === a.id || (sobre && sobre.tipo === 'agente' && sobre.id === a.id);
      a.bot.flota.scale.setScalar(T.MathUtils.damp(a.bot.flota.scale.x, encima ? 1.12 : 1, 12, dt));
      a.bot.ojos.scale.y = a.sueno > 0.5 ? 0.12 : (t + a.fase) % 4 < 0.12 ? 0.15 : 1;
      if (!reduce && a.sueno < 0.5) a.bot.anillo.rotation.z += dt * (a.estado === 'trabajando' ? 2.4 : 0.6);
    });

    if (!reduce) {
      meta.bandera.rotation.y = Math.sin(t * 2.4) * 0.25;
      tw.vidrio.emissiveIntensity = 0.3 + 0.15 * Math.sin(t * 1.6);
    }

    renderer.render(mundo, camara);
    posicionarOverlays();
  }

  /* ── Arranque ── */
  pintarDatos();
  aplicarEstados();
  await leerBitacora(true);
  setInterval(() => leerBitacora(false), 30000);
  setInterval(aplicarEstados, 60000);
  requestAnimationFrame(loop);
}
