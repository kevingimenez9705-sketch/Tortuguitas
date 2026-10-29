// ruta-3d.js — la Ruta del ingresante en 3D (three.js, sin build): una oficina
// por paso del proceso, como un dojo de las tortugas ninja (tatami, paredes de
// papel con postes de madera, bonsái, armero con katana y bo, pergamino 忍 y la
// pizza en el escritorio), con el mismo estilo low-poly de la Oficina digital.
// Las oficinas están una al lado de la otra, unidas por un pasillo; se recorren
// con las flechas de los costados (o ← → del teclado), con la barra de pasos de
// arriba o tocando la oficina de al lado.
//
// Cada oficina tiene:
// - la pantalla con cuánta gente pasó por el paso en el período (o desde que hay
//   fechas), en los últimos 7 días y hoy (rpc/ruta_estaciones, vía ruta.js);
// - su referente: un personaje del equipo (tortuga, Splinter o April, los de
//   personajes-3d.js) que saluda al llegar y dice en qué planilla se hace el paso;
// - la sala de espera con tortuguitas, sin máscara (más tortuguitas, más gente
//   llegó en los últimos 7 días; escala logarítmica para que entren de 1 a 10.000)
//   y una que entra por la puerta cuando hubo movimiento hoy;
// - un objeto propio del paso (totem del QR, calendario, mesa de entrevista,
//   buzón al zonal, lector de huella, servidores de iCheck, globos de bienvenida…).
// Los datos en vivo y los accesos a las planillas están en ruta.js, debajo de la maqueta.
//
// Eventos: escucha "ruta:datos" y "ruta:elegida"; pide "ruta:elegir" al navegar.
// Sin WebGL o si three.js no carga, la maqueta se oculta y queda el panel.
import { crearPersonajes } from './personajes-3d.js?v=20261029';

const THREE_URL = './vendor/three.min.js?v=0.186.1';

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
  fondo: '#f1ece2',
  base: '#e2d9c6',
  blanco: '#ffffff',
  pared: '#f8f3e6',
  patas: '#d5dbe4',
  silla: '#c6cfdb',
  oscuro: '#3b4352',
  rack: '#7f8a9c',
  rackPanel: '#939dae',
  gris: '#b8c1ce',
  grisSuave: '#e6e9ee',
  pasillo: '#c9a77a',
  menta: '#5ee0b5',
  cian: '#45d3ec',
  ambar: '#f5b748',
  amarilloSuave: '#ffe7a3',
  coral: '#ffb4a2',
  corcho: '#d8b48a',
  madera: '#c99a6b',
};
// Dojo: madera, papel de arroz y tatami.
const DOJO = {
  madera: '#7a5232',
  maderaClara: '#b98a5a',
  tatami: '#d9cf98',
  borde: '#3e4a2c',
  papel: '#f6efdc',
};
// El público: tortuguitas sin máscara (piel y caparazón varían).
const TORTUGA_PIEL = ['#6cb33f', '#5aa33a', '#7cc24e', '#4f9a3a', '#86c95a'];
const TORTUGA_CAPARAZON = ['#7d7038', '#6f6331', '#8a6a3a', '#5f5a2a', '#94793f'];

// Las oficinas, en orden: los 13 pasos y al final la de salidas.
const PASOS = ['POSTULADO', 'CITADO_ENTREVISTA', 'CONFIRMO_ENTREVISTA', 'ASISTIO_ENTREVISTA', 'APROBADO',
  'COMPARTIDO_ZONAL', 'VACANTE_ASIGNADA', 'APROBADO_ZONAL', 'CITADO_ONB', 'CONFIRMA_ONB', 'HIZO_ONB', 'ALTA_ICHECK', 'INGRESO'];
const SALAS = [...PASOS, 'SALIDAS'];
const SALIDAS = ['NO_AVANZA', 'NO_SE_PRESENTO', 'DESISTIO', 'RECHAZADO_ZONAL'];

// Medidas (u: a lo largo del pasillo, v: hacia la cámara).
const PASO = 14; // distancia entre oficinas
const ANCHO = 10;
const FONDO = 8;
const PISO_Y = 0.14;
const PARED_H = 1.7;
const PARED_T = 0.22;
const PUERTA = 2.2;

/* ───────────────────────── Utilidades ───────────────────────── */

let T;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
const suave = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// Tortuguitas en la sala de espera: 0 → 0, 1 → 1, 10 → 3, 100 → 6, 1.000 → 9, 10.000 → 12.
const munecos = (n) => (n > 0 ? Math.min(12, Math.max(1, Math.round(Math.log10(n + 1) * 3))) : 0);
const ICONO_TUTOR = { tortuga: '🐢', rata: '🐀', april: '🎙️' };

// Referente: respira y, durante 2 s después de llegar a su oficina, saluda con la mano.
const SALUDO = 2;
function animarTutor(s, t, ahora) {
  const P = s.tutor;
  P.torso.position.y = Math.sin(t * 2 + s.i) * 0.015;
  const k = (ahora - s.saludo) / SALUDO;
  const brazo = P.brazos[1];
  if (!brazo) return;
  brazo.rotation.z = k >= 0 && k < 1
    ? P.base[1] + Math.sin(k * Math.PI) * (2.3 + Math.sin(ahora * 14) * 0.25)
    : P.base[1];
}

/* ───────────────────────── Geometría low-poly ───────────────────────── */

const materiales = new Map();
const geometrias = new Map();
function mate(color, plano = false) {
  const clave = color + (plano ? ':plano' : '');
  if (!materiales.has(clave)) materiales.set(clave, new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: plano }));
  return materiales.get(clave);
}
function brilla(color, intensidad = 0.8) {
  return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.5 });
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
// Geometría compartida por clave (las tortuguitas del público son muchas).
function forma(clave, crear) {
  if (!geometrias.has(clave)) geometrias.set(clave, crear());
  return geometrias.get(clave);
}
// Texturas pintadas en un canvas, una sola vez.
const texturas = {};
function textura(nombre, ancho, alto, pintar) {
  if (!texturas[nombre]) {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    pintar(lienzo.getContext('2d'));
    const tex = new T.CanvasTexture(lienzo);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    texturas[nombre] = tex;
  }
  return texturas[nombre];
}
// Piso de tatami para una oficina de ANCHO × FONDO: esteras de 2 × 1 que se
// alternan de a pares (acostadas / paradas) con su borde de tela oscura.
function texTatami() {
  const px = 100; // por unidad
  return textura('tatami', ANCHO * px, FONDO * px, (c) => {
    c.fillStyle = DOJO.borde;
    c.fillRect(0, 0, ANCHO * px, FONDO * px);
    const estera = (x, y, w, h) => {
      const g = 5;
      c.fillStyle = (x + y) % 3 ? DOJO.tatami : '#d2c890';
      c.fillRect(x + g, y + g, w - 2 * g, h - 2 * g);
      c.strokeStyle = 'rgba(120, 110, 60, .22)';
      c.lineWidth = 2;
      const largo = w >= h;
      for (let k = 12; k < (largo ? h : w) - 8; k += 9) {
        c.beginPath();
        if (largo) { c.moveTo(x + g, y + k); c.lineTo(x + w - g, y + k); } else { c.moveTo(x + k, y + g); c.lineTo(x + k, y + h - g); }
        c.stroke();
      }
    };
    for (let cx = 0; cx < ANCHO / 2; cx++) {
      for (let cy = 0; cy < FONDO / 2; cy++) {
        const x = cx * 2 * px, y = cy * 2 * px;
        if ((cx + cy) % 2) { estera(x, y, 2 * px, px); estera(x, y + px, 2 * px, px); } else { estera(x, y, px, 2 * px); estera(x + px, y, px, 2 * px); }
      }
    }
  });
}
// Pergamino colgante con 忍 ("shinobi", ninja) en tinta y el sello rojo.
function texPergamino() {
  return textura('pergamino', 160, 320, (c) => {
    c.fillStyle = DOJO.papel;
    c.fillRect(0, 0, 160, 320);
    c.strokeStyle = '#c9b88f';
    c.lineWidth = 8;
    c.strokeRect(10, 10, 140, 300);
    c.fillStyle = '#1d1a16';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 110px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", "MS Mincho", serif';
    c.fillText('忍', 80, 140);
    c.fillStyle = '#c0392b';
    c.fillRect(98, 246, 34, 34);
    c.fillStyle = DOJO.papel;
    c.fillRect(106, 254, 18, 4);
    c.fillRect(113, 254, 4, 18);
  });
}

function pared(largo, acento, conPuerta) {
  const g = new T.Group();
  const tramos = conPuerta
    ? [{ l: (largo - PUERTA) / 2, x: -(largo + PUERTA) / 4 }, { l: (largo - PUERTA) / 2, x: (largo + PUERTA) / 4 }]
    : [{ l: largo, x: 0 }];
  tramos.forEach((t) => {
    g.add(en(caja(t.l, PARED_H, PARED_T, PALETA.pared, { r: 0.06 }), t.x, PARED_H / 2, 0));
    g.add(en(caja(t.l, 0.07, PARED_T + 0.02, acento, { r: 0.025, sombra: false }), t.x, PARED_H + 0.01, 0));
    // Dojo: zócalo y postes de madera cada ~2,5.
    g.add(en(caja(t.l, 0.14, PARED_T + 0.04, DOJO.madera, { r: 0.02, sombra: false }), t.x, 0.07, 0));
    const n = Math.max(1, Math.ceil(t.l / 2.6));
    for (let k = 0; k <= n; k++) g.add(en(caja(0.14, PARED_H, PARED_T + 0.08, DOJO.madera, { r: 0.03 }), t.x - t.l / 2 + 0.07 + k * (t.l - 0.14) / n, PARED_H / 2, 0));
  });
  return g;
}
function silla(color = PALETA.silla) {
  const g = new T.Group();
  g.add(en(cilindro(0.3, 0.34, 0.08, 10, PALETA.patas), 0, 0.05, 0));
  g.add(en(cilindro(0.05, 0.05, 0.44, 8, PALETA.patas, { recibe: false }), 0, 0.3, 0));
  g.add(en(caja(0.7, 0.12, 0.66, color), 0, 0.55, 0));
  g.add(en(caja(0.66, 0.6, 0.12, color), 0, 0.92, 0.3));
  return g;
}
/** Escritorio con monitor (de frente a la cámara) y silla. */
function escritorio(colorSilla, colorPantalla) {
  const g = new T.Group();
  g.add(en(caja(2.4, 0.12, 1.1, PALETA.blanco), 0, 0.9, 0));
  [-1, 1].forEach((s) => g.add(en(caja(0.1, 0.84, 1, PALETA.patas, { r: 0.04 }), s * 1.08, 0.42, 0)));
  g.add(en(cilindro(0.05, 0.09, 0.2, 8, PALETA.patas), 0.45, 1.06, -0.3));
  g.add(en(caja(0.95, 0.6, 0.07, PALETA.oscuro, { r: 0.03 }), 0.45, 1.44, -0.32));
  g.add(en(new T.Mesh(new T.PlaneGeometry(0.84, 0.48), brilla(colorPantalla, 0.45)), 0.45, 1.44, -0.28));
  g.add(en(caja(0.6, 0.04, 0.22, PALETA.patas, { r: 0.015, sombra: false }), 0.42, 0.98, 0.15));
  g.add(en(silla(colorSilla), 0.3, 0, 0.95));
  return g;
}
/** Banco bajo de madera con almohadones (zabuton) del color del tramo. */
function banco(color) {
  const g = new T.Group();
  g.add(en(caja(2.2, 0.1, 0.7, DOJO.maderaClara, { r: 0.03 }), 0, 0.42, 0));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => g.add(en(caja(0.1, 0.38, 0.1, DOJO.madera, { r: 0.02 }), sx * 0.98, 0.19, sz * 0.26))));
  [-0.68, 0, 0.68].forEach((x) => g.add(en(caja(0.6, 0.08, 0.55, color, { r: 0.04 }), x, 0.51, 0)));
  return g;
}
/** Bonsái sobre una mesita. */
function planta(escala = 1) {
  const g = new T.Group();
  g.add(en(caja(0.7, 0.36, 0.55, DOJO.madera, { r: 0.03 }), 0, 0.18, 0));
  g.add(en(caja(0.6, 0.16, 0.4, '#3d4757', { r: 0.04 }), 0, 0.44, 0));
  const tronco = en(cilindro(0.045, 0.08, 0.5, 6, '#5b3d24'), -0.04, 0.72, 0);
  tronco.rotation.z = 0.3;
  g.add(tronco);
  const rama = en(cilindro(0.03, 0.045, 0.34, 6, '#5b3d24'), 0.1, 0.84, 0);
  rama.rotation.z = -1.0;
  g.add(rama);
  [[-0.14, 1.0, 0, 0.3], [0.26, 0.92, 0.03, 0.22], [0.02, 1.18, -0.02, 0.2]].forEach(([x, y, z, r], k) => {
    const copa = en(malla(new T.IcosahedronGeometry(r, 0), mate(k ? '#6aa85f' : '#5a9752', true)), x, y, z);
    copa.scale.y = 0.5;
    g.add(copa);
  });
  g.scale.setScalar(escala);
  return g;
}
/** Tortuguita del público: parada, sin máscara ni nada. Mira hacia +v. */
function tortuguita(i) {
  const g = new T.Group();
  const piel = mate(TORTUGA_PIEL[i % TORTUGA_PIEL.length]);
  const sin = { recibe: false };
  [-1, 1].forEach((s) => g.add(en(malla(forma('t-pata', () => new T.CapsuleGeometry(0.07, 0.08, 3, 8)), piel, sin), s * 0.1, 0.11, 0.01)));
  const panza = en(malla(forma('t-esfera', () => new T.SphereGeometry(1, 12, 10)), mate('#e3c770'), sin), 0, 0.4, 0.03);
  panza.scale.set(0.2, 0.25, 0.15);
  g.add(panza);
  const caparazon = en(malla(forma('t-caparazon', () => new T.SphereGeometry(1, 9, 7)), mate(TORTUGA_CAPARAZON[(i * 3) % TORTUGA_CAPARAZON.length], true), sin), 0, 0.42, -0.05);
  caparazon.scale.set(0.24, 0.28, 0.17);
  g.add(caparazon);
  [-1, 1].forEach((s) => {
    const brazo = en(malla(forma('t-brazo', () => new T.CapsuleGeometry(0.05, 0.12, 3, 8)), piel, sin), s * 0.22, 0.42, 0.03);
    brazo.rotation.z = s * 0.5;
    g.add(brazo);
  });
  g.add(en(malla(forma('t-cabeza', () => new T.SphereGeometry(0.15, 14, 12)), piel, sin), 0, 0.74, 0.03));
  [-1, 1].forEach((s) => g.add(en(malla(forma('t-ojo', () => new T.SphereGeometry(0.028, 8, 6)), mate('#1b1e2c'), { sombra: false, recibe: false }), s * 0.06, 0.77, 0.165)));
  return g;
}
/** Armero contra la pared: katana arriba, bo abajo. */
function armero() {
  const g = new T.Group();
  [-1, 1].forEach((s) => g.add(en(caja(0.1, 1.3, 0.12, DOJO.madera, { r: 0.02 }), s * 0.6, 0.65, 0)));
  g.add(en(caja(1.4, 0.08, 0.2, DOJO.madera, { r: 0.02 }), 0, 0.04, 0.02));
  [0.55, 0.98].forEach((y) => g.add(en(caja(1.3, 0.05, 0.08, DOJO.maderaClara, { r: 0.015 }), 0, y, 0.06)));
  const bo = en(cilindro(0.035, 0.035, 1.5, 8, '#8b5a2b'), 0, 0.62, 0.12);
  bo.rotation.z = Math.PI / 2;
  g.add(bo);
  const katana = new T.Group();
  katana.add(en(cilindro(0.035, 0.035, 0.75, 8, '#24242e'), 0.12, 0, 0)); // vaina
  katana.add(en(cilindro(0.07, 0.07, 0.025, 12, '#c9a227'), -0.27, 0, 0)); // guarda
  katana.add(en(cilindro(0.03, 0.03, 0.28, 8, '#6b1f1f'), -0.42, 0, 0)); // mango
  katana.children.forEach((m) => { m.rotation.z = Math.PI / 2; });
  g.add(en(katana, 0, 1.05, 0.12));
  return g;
}
/** Caja de pizza (con la mancha de grasa de rigor). */
function cajaPizza() {
  const g = new T.Group();
  g.add(en(caja(0.5, 0.06, 0.5, '#efdcb6', { r: 0.01 }), 0, 0.03, 0));
  g.add(en(cilindro(0.13, 0.13, 0.006, 16, '#c0392b', { sombra: false }), 0, 0.063, 0));
  g.add(en(cilindro(0.06, 0.06, 0.007, 10, '#e1b56a', { sombra: false }), 0.15, 0.064, 0.14));
  return g;
}

/* ── Objetos propios de cada paso (miran hacia la cámara, +v) ── */
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
function calendario(color) {
  const g = new T.Group();
  g.add(caja(1.2, 1.0, 0.06, PALETA.blanco, { r: 0.03, sombra: false }));
  g.add(en(caja(1.2, 0.22, 0.07, color, { r: 0.03, sombra: false }), 0, 0.39, 0.01));
  for (let f = 0; f < 3; f++) {
    for (let c = 0; c < 4; c++) {
      const marcado = (f * 4 + c) % 5 === 2;
      g.add(en(caja(0.18, 0.14, 0.02, marcado ? color : PALETA.grisSuave, { r: 0.01, sombra: false }), -0.39 + c * 0.26, 0.12 - f * 0.22, 0.04));
    }
  }
  return g;
}
function tableroChecks(color) {
  const g = new T.Group();
  [-1, 1].forEach((s) => g.add(en(caja(0.08, 1.3, 0.08, PALETA.patas, { r: 0.03 }), s * 0.75, 0.65, 0)));
  g.add(en(caja(1.7, 1.05, 0.07, PALETA.blanco, { r: 0.03 }), 0, 1.35, 0));
  for (let k = 0; k < 4; k++) {
    g.add(en(caja(0.16, 0.16, 0.02, k < 3 ? color : PALETA.grisSuave, { r: 0.01, sombra: false }), -0.55, 1.68 - k * 0.22, 0.05));
    g.add(en(caja(0.8, 0.06, 0.02, PALETA.grisSuave, { r: 0.01, sombra: false }), 0.05, 1.68 - k * 0.22, 0.05));
  }
  return g;
}
function mesaEntrevista() {
  const g = new T.Group();
  g.add(en(cilindro(0.75, 0.75, 0.1, 24, PALETA.blanco), 0, 0.8, 0));
  g.add(en(cilindro(0.1, 0.14, 0.78, 10, PALETA.patas), 0, 0.4, 0));
  g.add(en(cilindro(0.45, 0.5, 0.06, 16, PALETA.patas), 0, 0.03, 0));
  [-1, 1].forEach((s) => {
    const sl = en(silla(PALETA.coral), s * 1.15, 0, 0);
    sl.rotation.y = s * Math.PI / 2;
    g.add(sl);
  });
  g.add(en(caja(0.4, 0.02, 0.3, PALETA.blanco, { r: 0.01, sombra: false }), 0.15, 0.86, 0.1));
  return g;
}
function sello(color) {
  const g = new T.Group();
  g.add(en(caja(1.0, 0.8, 0.7, PALETA.blanco, { r: 0.06 }), 0, 0.4, 0));
  g.add(en(caja(0.5, 0.16, 0.36, color, { r: 0.04 }), 0, 0.88, 0));
  g.add(en(cilindro(0.06, 0.06, 0.3, 8, PALETA.madera), 0, 1.1, 0));
  g.add(en(malla(new T.SphereGeometry(0.12, 12, 10), mate(PALETA.madera)), 0, 1.3, 0));
  g.add(en(caja(0.7, 0.02, 0.5, PALETA.blanco, { r: 0.01, sombra: false }), 0.15, 0.81, 0.05));
  return g;
}
function buzon(color) {
  const g = new T.Group();
  g.add(en(cilindro(0.06, 0.06, 1.0, 8, PALETA.oscuro), 0, 0.5, 0));
  g.add(en(caja(0.8, 0.6, 0.55, color, { r: 0.12 }), 0, 1.25, 0));
  g.add(en(caja(0.45, 0.05, 0.02, PALETA.oscuro, { r: 0.01, sombra: false }), 0, 1.35, 0.28));
  g.add(en(caja(0.05, 0.35, 0.05, PALETA.coral, { r: 0.02 }), 0.43, 1.45, 0.1));
  [-0.2, 0.05].forEach((x, k) => {
    const sobre = en(caja(0.42, 0.04, 0.3, PALETA.blanco, { r: 0.01 }), x, 0.04 + k * 0.05, 0.6);
    sobre.rotation.y = k * 0.4;
    g.add(sobre);
  });
  return g;
}
function mapaPines() {
  const g = new T.Group();
  g.add(caja(1.6, 1.0, 0.05, PALETA.corcho, { r: 0.02, sombra: false }));
  g.add(en(caja(1.4, 0.82, 0.02, '#e8f1e4', { r: 0.01, sombra: false }), 0, 0, 0.03));
  [[-0.45, 0.2, '#e85a5a'], [-0.1, -0.15, '#3e5bd8'], [0.3, 0.22, '#e85a5a'], [0.5, -0.2, '#2c9356'], [0.05, 0.28, '#f5b748'], [-0.55, -0.25, '#3e5bd8']]
    .forEach(([x, y, c]) => g.add(en(malla(new T.SphereGeometry(0.05, 10, 8), mate(c), { sombra: false }), x, y, 0.07)));
  return g;
}
function lectorHuella() {
  const g = new T.Group();
  g.add(en(cilindro(0.35, 0.42, 1.0, 14, PALETA.blanco), 0, 0.5, 0));
  g.add(en(caja(0.6, 0.12, 0.5, PALETA.oscuro, { r: 0.04 }), 0, 1.06, 0));
  g.add(en(caja(0.3, 0.03, 0.3, brilla('#5ee0b5', 1.0), { r: 0.04, sombra: false }), 0, 1.13, 0.02));
  return g;
}
const leds = []; // LEDs de los servidores de iCheck (parpadean en el loop)
function rack() {
  const g = new T.Group();
  g.add(en(caja(1.0, 2.0, 0.9, PALETA.rack, { r: 0.08 }), 0, 1.0, 0));
  for (let s = 0; s < 4; s++) {
    const fila = en(new T.Group(), 0, 0.45 + s * 0.4, 0.46);
    fila.add(caja(0.82, 0.26, 0.04, PALETA.rackPanel, { r: 0.015, sombra: false }));
    [0, 1].forEach((k) => {
      const mat = brilla(k ? PALETA.cian : PALETA.menta, 1);
      leds.push({ mat, fase: Math.random() * Math.PI * 2, vel: 1.5 + ((s + k) % 3) });
      fila.add(en(new T.Mesh(new T.BoxGeometry(0.07, 0.07, 0.02), mat), -0.28 + k * 0.14, 0, 0.03));
    });
    g.add(fila);
  }
  return g;
}
const globos = []; // globos de bienvenida (flotan en el loop)
function globosBienvenida() {
  const g = new T.Group();
  g.add(en(caja(0.6, 0.45, 0.6, '#2c9356', { r: 0.05 }), 0, 0.23, 0));
  g.add(en(caja(0.64, 0.1, 0.14, PALETA.amarilloSuave, { r: 0.02 }), 0, 0.48, 0));
  [['#ff8fab', -0.3, 1.9], ['#45d3ec', 0.1, 2.1], ['#f5c842', 0.4, 1.8]].forEach(([c, x, y], k) => {
    const globo = en(malla(new T.SphereGeometry(0.28, 14, 12), mate(c), { recibe: false }), x, y, 0);
    globo.scale.y = 1.15;
    g.add(globo);
    g.add(en(cilindro(0.008, 0.008, y - 0.5, 4, PALETA.gris, { sombra: false }), x * 0.5, (y + 0.5) / 2 - 0.1, 0));
    globos.push({ m: globo, y, fase: k * 1.3 });
  });
  return g;
}
function puertaSalida() {
  const g = new T.Group();
  g.add(en(caja(1.3, 2.0, 0.12, '#b7473f', { r: 0.04 }), 0, 1.0, 0));
  g.add(en(caja(1.05, 1.8, 0.06, '#f6e0de', { r: 0.03 }), 0, 0.95, 0.05));
  g.add(en(caja(0.7, 0.22, 0.06, brilla('#2c9356', 0.9), { r: 0.03, sombra: false }), 0, 2.25, 0.03));
  return g;
}

/* ───────────────────────── Escena ───────────────────────── */

async function iniciar() {
  T = await import(THREE_URL);
  const { PERSONAJES } = crearPersonajes(T);
  const { TRAMOS, TUTORES, ESTACIONES } = window.RUTA;
  const metaDe = (sala) => (sala === 'SALIDAS' ? { tramo: 'x', tutor: ESTACIONES.NO_AVANZA.tutor, donde: 'Proceso de Selección y Solicitudes' } : ESTACIONES[sala] || {});
  const tramoDe = (sala) => TRAMOS[metaDe(sala).tramo] || TRAMOS.x;
  const nombreCorto = (sala) => (sala === 'SALIDAS' ? 'Salidas' : (ESTACIONES[sala] || {}).corto || sala);

  escena.classList.add('o3d');
  escena.innerHTML = '';
  escena.tabIndex = 0;
  escena.setAttribute('role', 'region');
  escena.setAttribute('aria-label', 'Oficinas de la ruta del ingresante: una oficina por paso. Usá las flechas para pasar al paso anterior o al siguiente.');

  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  escena.appendChild(renderer.domElement);
  const capa = document.createElement('div');
  capa.className = 'o3d-capa';
  escena.appendChild(capa);

  // Navegación (DOM sobre el canvas): barra de pasos y flechas a los costados.
  const barra = document.createElement('div');
  barra.className = 'ru3-pasos';
  barra.setAttribute('role', 'group');
  barra.setAttribute('aria-label', 'Pasos de la ruta');
  barra.innerHTML = SALAS.map((s, i) => `<button type="button" class="ru3-paso" data-ir="${s}" style="--c:${tramoDe(s).color}"
      aria-label="${s === 'SALIDAS' ? 'Salidas' : `Paso ${i + 1}: ${esc(nombreCorto(s))}`}"><i></i><span>${esc(nombreCorto(s))}</span></button>`).join('');
  const flechaAnt = document.createElement('button');
  flechaAnt.type = 'button';
  flechaAnt.className = 'ru3-flecha is-ant';
  const flechaSig = document.createElement('button');
  flechaSig.type = 'button';
  flechaSig.className = 'ru3-flecha is-sig';
  escena.append(barra, flechaAnt, flechaSig);

  const mundo = new T.Scene();
  mundo.background = new T.Color(PALETA.fondo);
  const camara = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  mundo.add(new T.AmbientLight(0xffffff, 0.55));
  mundo.add(new T.HemisphereLight(0xffffff, 0xd9e1ec, 0.55));
  // La luz del sol acompaña a la cámara: las sombras solo hacen falta cerca.
  const sol = new T.DirectionalLight(0xffffff, 1.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.radius = 4;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  mundo.add(sol, sol.target);

  // Todo se arma en coordenadas del plano (u, altura, v); el grupo gira 45° para
  // que u quede horizontal en la pantalla isométrica.
  const plano = new T.Group();
  plano.rotation.y = Math.PI / 4;
  mundo.add(plano);
  plano.updateMatrixWorld(true);
  const P = (u, v, y = 0) => new T.Vector3(u, y, v);
  const aMundo = (vLocal) => plano.localToWorld(vLocal.clone());

  const largo = (SALAS.length - 1) * PASO;
  plano.add(en(caja(largo + ANCHO + 4, 0.6, FONDO + 3, PALETA.base, { r: 0.25 }), largo / 2, -0.3, 0));

  const anclas = [];
  function etiqueta(clase, html, pos, ajuste = 'translate(-50%, -50%)') {
    const el = document.createElement('div');
    el.className = clase;
    el.innerHTML = html;
    capa.appendChild(el);
    anclas.push({ el, pos, ajuste });
    return el;
  }

  /* ── Oficinas ── */
  const salas = SALAS.map((sala, i) => {
    const meta = metaDe(sala);
    const tr = tramoDe(sala);
    const u0 = i * PASO;
    const g = en(new T.Group(), u0, 0, 0);
    const matPiso = new T.MeshStandardMaterial({ color: '#ffffff', map: texTatami(), roughness: 0.85 });
    g.add(en(caja(ANCHO, PISO_Y, FONDO, matPiso, { r: 0.05, sombra: false }), 0, PISO_Y / 2, 0));
    g.add(en(pared(ANCHO, tr.color, false), 0, PISO_Y, -FONDO / 2 + PARED_T / 2));
    const izq = en(pared(FONDO, tr.color, true), -ANCHO / 2 + PARED_T / 2, PISO_Y, 0);
    izq.rotation.y = Math.PI / 2;
    g.add(izq);
    // Pasillo hacia la oficina siguiente, con una flecha en el piso del color del paso que sigue.
    if (i < SALAS.length - 1) {
      const sig = tramoDe(SALAS[i + 1]);
      const largoPasillo = PASO - ANCHO;
      g.add(en(caja(largoPasillo + 0.4, 0.1, PUERTA, PALETA.pasillo, { r: 0.03, sombra: false }), ANCHO / 2 + largoPasillo / 2, 0.05, 0));
      [-1, 1].forEach((s) => {
        const tramo = en(caja(0.9, 0.04, 0.16, sig.color, { r: 0.02, sombra: false }), ANCHO / 2 + largoPasillo / 2 - 0.1, 0.12, s * 0.28);
        tramo.rotation.y = s * 0.7; // las dos patas forman una flecha ">" hacia la oficina siguiente
        g.add(tramo);
      });
    }
    // Pantalla en la pared del fondo (el número va en un cartel HTML encima).
    g.add(en(caja(3.4, 1.25, 0.08, PALETA.oscuro, { r: 0.04 }), -1.5, PISO_Y + 1.0, -FONDO / 2 + PARED_T + 0.05));
    // Escritorio, sala de espera y plantas.
    g.add(en(escritorio('#8ea3d1', tr.color), 2.6, PISO_Y, -1.9));
    g.add(en(banco(tr.suave), -3.2, PISO_Y, 3.1));
    g.add(en(planta(0.9), 4.35, PISO_Y, -3.35));
    g.add(en(planta(0.75), 4.3, PISO_Y, 3.4));
    // Dojo: armero y pergamino en la pared del fondo (a los lados de la pantalla) y pizza en el escritorio.
    const fondo = -FONDO / 2 + PARED_T;
    g.add(en(armero(), -4.15, PISO_Y, fondo + 0.12));
    g.add(en(new T.Mesh(forma('pergamino', () => new T.PlaneGeometry(0.56, 1.12)), new T.MeshStandardMaterial({ map: texPergamino(), roughness: 0.9 })), 0.62, PISO_Y + 1.0, fondo + 0.03));
    [-1, 1].forEach((s) => {
      const vara = en(cilindro(0.022, 0.022, 0.66, 8, DOJO.madera), 0.62, PISO_Y + 1.0 + s * 0.57, fondo + 0.05);
      vara.rotation.z = Math.PI / 2;
      g.add(vara);
    });
    g.add(en(cajaPizza(), 2.6 - 0.68, PISO_Y + 0.96, -1.9 + 0.08));
    // Objeto propio del paso.
    const enPared = (obj, x) => en(obj, x, PISO_Y + 1.0, -FONDO / 2 + PARED_T + 0.04);
    const props = {
      POSTULADO: () => en(totemQR(), 3.2, PISO_Y, 2.4),
      CITADO_ENTREVISTA: () => enPared(calendario(tr.color), 1.8),
      CONFIRMO_ENTREVISTA: () => en(tableroChecks(tr.color), 3.0, PISO_Y, 2.2),
      ASISTIO_ENTREVISTA: () => en(mesaEntrevista(), 2.6, PISO_Y, 2.0),
      APROBADO: () => en(sello('#2c9356'), 3.0, PISO_Y, 2.3),
      COMPARTIDO_ZONAL: () => en(buzon(tr.color), 3.1, PISO_Y, 2.2),
      VACANTE_ASIGNADA: () => enPared(mapaPines(), 1.8),
      APROBADO_ZONAL: () => en(sello(tr.color), 3.0, PISO_Y, 2.3),
      CITADO_ONB: () => enPared(calendario(tr.color), 1.8),
      CONFIRMA_ONB: () => en(tableroChecks(tr.color), 3.0, PISO_Y, 2.2),
      HIZO_ONB: () => en(lectorHuella(), 3.1, PISO_Y, 2.3),
      ALTA_ICHECK: () => en(rack(), 3.4, PISO_Y, 2.0),
      INGRESO: () => en(globosBienvenida(), 3.1, PISO_Y, 2.3),
      SALIDAS: () => en(puertaSalida(), 1.8, PISO_Y, -FONDO / 2 + PARED_T + 0.1),
    };
    if (props[sala]) g.add(props[sala]());

    // Gente esperando (de 0 a 12) y alguien que entra por la puerta.
    const gente = [];
    for (let k = 0; k < 12; k++) {
      const m = tortuguita(i * 5 + k);
      m.position.set(-3.7 + (k % 6) * 0.78 + (Math.floor(k / 6) % 2) * 0.3, PISO_Y, 0.6 + Math.floor(k / 6) * 0.85);
      m.visible = false;
      m.userData.fase = Math.random() * 6;
      g.add(m);
      gente.push(m);
    }
    const caminante = tortuguita(i + 2);
    caminante.visible = false;
    g.add(caminante);
    // El referente, parado delante del escritorio, mirando hacia la sala de espera.
    const tu = TUTORES[meta.tutor];
    const tutor = tu ? PERSONAJES[tu.personaje]({ color: tu.color, arma: tu.arma }) : null;
    if (tutor) {
      tutor.raiz.scale.setScalar(0.85);
      tutor.raiz.position.set(1.3, PISO_Y, -0.3);
      tutor.raiz.rotation.y = -0.45;
      tutor.base = tutor.brazos.map((b) => b.rotation.z);
      g.add(tutor.raiz);
    }
    g.traverse((h) => { h.userData.sala = sala; });
    plano.add(g);

    const s = { sala, i, u0, tr, meta, matPiso, gente, caminante, tutor, saludo: 0, paseo: null, n: 0 };
    // El cartel va arriba de la pantalla.
    s.cartel = etiqueta('ru3-sala', '', () => aMundo(P(u0 - 1.5, -FONDO / 2, PISO_Y + PARED_H + 0.3)), 'translate(-50%, -100%)');
    s.cartel.style.setProperty('--c', tr.color);
    s.pantalla = etiqueta('ru3-pantalla', '', () => aMundo(P(u0 - 1.5, -FONDO / 2 + PARED_T + 0.1, PISO_Y + 1.0)));
    s.pantalla.style.setProperty('--c', tr.color);
    if (tu) {
      s.globo = etiqueta('ru3-tutor', `<b>${ICONO_TUTOR[tu.personaje] || '🤖'} ${esc(tu.nombre)}</b><span>Se hace en ${esc(meta.donde || 'la planilla')}</span>`,
        () => aMundo(P(u0 + 1.3, -0.3, PISO_Y + 1.75)), 'translate(-22px, -100%)'); // hacia la derecha: a la izquierda está la pantalla
      s.globo.style.setProperty('--c', tu.color);
    }
    return s;
  });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(escena);

  /* ── Datos de la ruta ── */
  const corta = (iso) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
  let datos = window.RUTA.datos;
  let actual = 0; // índice de la oficina a la vista
  let camU = 0;
  const est = (etapa) => (datos && datos.estaciones || []).find((e) => e.etapa === etapa) || null;
  // La oficina de salidas suma todas las salidas.
  function numeros(sala) {
    if (sala !== 'SALIDAS') return est(sala) || { personas: 0, hoy: 0, semana: 0, sin_fecha: 0, nombre: (ESTACIONES[sala] || {}).corto || sala };
    const out = SALIDAS.map(est).filter(Boolean);
    const suma = (k) => out.reduce((a, e) => a + (e[k] || 0), 0);
    const desdes = out.map((e) => e.datos_desde).filter(Boolean).sort();
    return { nombre: 'Salidas', personas: suma('personas'), hoy: suma('hoy'), semana: suma('semana'), sin_fecha: suma('sin_fecha'), datos_desde: desdes[0] || null };
  }

  function pintarDatos() {
    const dias = datos ? Math.round((new Date(datos.hasta) - new Date(datos.desde)) / 864e5) + 1 : 30;
    salas.forEach((s) => {
      const e = numeros(s.sala);
      const vacia = !e.personas;
      s.matPiso.color.set(vacia ? '#c4c2bb' : '#ffffff'); // tatami gris si no llegó nadie
      s.n = munecos(e.semana);
      s.gente.forEach((m, k) => { m.visible = k < s.n; });
      const num = s.sala === 'SALIDAS' ? 'Fuera de la ruta · de cualquier paso' : `Paso ${s.i + 1} de ${PASOS.length} · ${esc(s.tr.nombre)}`;
      s.cartel.innerHTML = `<small>${num}</small><b>${esc(e.nombre)}</b>`;
      s.pantalla.classList.toggle('is-vacia', vacia);
      const desde = datos && e.datos_desde && e.datos_desde > datos.desde && e.datos_desde <= datos.hasta ? e.datos_desde : null;
      s.pantalla.innerHTML = vacia
        ? (e.programados ? `<b>${fmt(e.programados)}</b><span>con fecha programada</span>`
          : e.sin_fecha ? `<b>Sin fechas</b><span>${fmt(e.sin_fecha)} en la planilla sin fecha del paso</span>`
            : '<b>Sin datos</b><span>todavía no llega nada</span>')
        : `<b>${fmt(e.personas)}</b><span>${desde ? `pasaron desde el ${esc(corta(desde))}` : `pasaron en ${fmt(dias)} días`}</span><em>${fmt(e.semana)} en 7 días${e.hoy ? ` · +${fmt(e.hoy)} hoy` : ''}</em>`;
    });
    pintarNavegacion();
  }

  function pintarNavegacion() {
    barra.querySelectorAll('[data-ir]').forEach((b, i) => {
      b.classList.toggle('is-actual', i === actual);
      b.classList.toggle('is-hecho', i < actual);
      if (i === actual) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    const ant = salas[actual - 1];
    const sig = salas[actual + 1];
    flechaAnt.hidden = !ant;
    flechaSig.hidden = !sig;
    if (ant) {
      flechaAnt.style.setProperty('--c', ant.tr.color);
      flechaAnt.innerHTML = `<span class="ru3-flecha-ico" aria-hidden="true">‹</span><span class="ru3-flecha-txt"><small>Anterior</small>${esc(nombreCorto(ant.sala))}</span>`;
      flechaAnt.setAttribute('aria-label', `Paso anterior: ${nombreCorto(ant.sala)}`);
    }
    if (sig) {
      flechaSig.style.setProperty('--c', sig.tr.color);
      flechaSig.innerHTML = `<span class="ru3-flecha-txt"><small>Siguiente</small>${esc(nombreCorto(sig.sala))}</span><span class="ru3-flecha-ico" aria-hidden="true">›</span>`;
      flechaSig.setAttribute('aria-label', `Paso siguiente: ${nombreCorto(sig.sala)}`);
    }
    salas.forEach((x, i) => {
      const lejos = Math.abs(i - actual);
      x.cartel.hidden = lejos > 0;
      x.pantalla.hidden = lejos > 0;
      if (x.globo) x.globo.hidden = lejos > 0;
    });
  }

  // Pide a ruta.js que elija la oficina (la de salidas abre la salida con más gente).
  function irA(i) {
    const k = Math.max(0, Math.min(salas.length - 1, i));
    let etapa = SALAS[k];
    if (etapa === 'SALIDAS') {
      const out = SALIDAS.map(est).filter(Boolean).sort((a, b) => b.personas - a.personas)[0];
      etapa = out ? out.etapa : 'NO_AVANZA';
    }
    document.dispatchEvent(new CustomEvent('ruta:elegir', { detail: { etapa } }));
  }
  flechaAnt.addEventListener('click', () => irA(actual - 1));
  flechaSig.addEventListener('click', () => irA(actual + 1));
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (b) irA(SALAS.indexOf(b.dataset.ir));
  });
  escena.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); irA(actual - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1); }
  });

  /* ── Alguien entra por la puerta cuando hubo movimiento hoy ── */
  function entraAlguien() {
    const s = salas[actual];
    if (reduce || !s || s.paseo || !numeros(s.sala).hoy) return;
    const k = Math.floor(Math.random() * 12);
    const destino = new T.Vector3(-3.7 + (k % 6) * 0.78, PISO_Y, 0.6 + Math.floor(k / 6) * 0.85 + 0.4);
    s.paseo = { desde: new T.Vector3(-ANCHO / 2 - 1.2, PISO_Y, 0), hasta: destino, t0: performance.now() / 1000, dur: 2.6 };
    s.caminante.visible = true;
  }
  setInterval(entraAlguien, 4500);

  /* ── Puntero: tocar otra oficina va hacia ella ── */
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  let abajo = null;
  let pendiente = null;
  const queHay = (x, y) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camara);
    const hit = raycaster.intersectObject(plano, true).find((h) => h.object.userData.sala);
    return hit ? hit.object.userData : null;
  };
  const lienzo = renderer.domElement;
  lienzo.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pendiente = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerdown', (e) => { abajo = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerup', (e) => {
    if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 6) return;
    const x = queHay(e.clientX, e.clientY);
    if (x && x.sala !== SALAS[actual]) irA(SALAS.indexOf(x.sala));
  });

  function mostrar(etapa) {
    const i = SALAS.indexOf(SALIDAS.includes(etapa) ? 'SALIDAS' : etapa);
    if (i < 0 || i === actual) return;
    actual = i;
    salas[i].saludo = performance.now() / 1000; // el referente saluda al que llega
    pintarNavegacion();
  }
  document.addEventListener('ruta:datos', (e) => { datos = e.detail; pintarDatos(); });
  document.addEventListener('ruta:elegida', (e) => mostrar((e.detail || {}).etapa));

  /* ── Tamaño y cámara ── */
  let ancho = 1;
  let alto = 1;
  let chica = false;
  function ajustar() {
    ancho = Math.max(1, escena.clientWidth);
    alto = Math.max(1, escena.clientHeight);
    chica = ancho < 640;
    renderer.setSize(ancho, alto);
    Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: alto / 2, bottom: -alto / 2 });
    // Se ve la oficina entera y un poco de las de al lado (en celulares, solo la oficina).
    camara.zoom = Math.max(6, Math.min(ancho / (chica ? 12.5 : 19), alto / (chica ? 11 : 9.5)));
    camara.updateProjectionMatrix();
    escena.classList.toggle('is-chica', chica);
  }
  new ResizeObserver(ajustar).observe(escena);
  ajustar();


  /* ── Loop ── */
  const v3 = new T.Vector3();
  const proyectar = (pos) => {
    v3.copy(pos).project(camara);
    return [((v3.x + 1) / 2) * ancho, ((1 - v3.y) / 2) * alto];
  };
  function posicionarOverlays() {
    anclas.forEach((x) => {
      if (x.el.hidden) return;
      let [px, py] = proyectar(typeof x.pos === 'function' ? x.pos() : x.pos);
      // El cartel no se sale de la maqueta ni queda debajo de la barra de pasos.
      if (x.el.classList.contains('ru3-sala')) {
        const mitad = x.el.offsetWidth / 2;
        px = Math.min(Math.max(px, mitad + 6), ancho - mitad - 6);
        py = Math.max(py, 50 + x.el.offsetHeight);
      }
      x.el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) ${x.ajuste}`;
    });
  }

  const arriba = new T.Vector3(-1, 2, -1).normalize();
  const reloj = new T.Timer();
  function loop(ms) {
    requestAnimationFrame(loop);
    reloj.update(ms);
    const delta = reloj.getDelta();
    // La cámara avanza aunque la maqueta no esté a la vista (y aunque haya pocos cuadros por
    // segundo): al volver, ya está en el paso elegido.
    camU = reduce ? actual * PASO : T.MathUtils.damp(camU, actual * PASO, 4.5, Math.min(delta, 0.5));
    if (!visible || document.hidden) return;
    const t = reloj.getElapsed();
    const ahora = performance.now() / 1000;

    if (pendiente) {
      const x = queHay(pendiente[0], pendiente[1]);
      pendiente = null;
      lienzo.style.cursor = x && x.sala !== SALAS[actual] ? 'pointer' : '';
    }

    // La cámara se desliza hasta la oficina elegida.
    // El foco sube un poco: arriba quedan la pared, el cartel y la barra de pasos.
    const foco = aMundo(P(camU, 0, 0)).add(arriba.clone().multiplyScalar(chica ? 0.7 : 1.15));
    camara.position.copy(foco).add(new T.Vector3(30, 30, 30));
    camara.lookAt(foco);
    sol.position.copy(foco).add(new T.Vector3(14, 26, 9));
    sol.target.position.copy(foco);

    salas.forEach((s, i) => {
      const cerca = Math.abs(i - actual) <= 1;
      if (!reduce && cerca) s.gente.forEach((m, k) => { if (m.visible) m.position.y = PISO_Y + Math.abs(Math.sin(t * 2.2 + m.userData.fase + k)) * 0.05; });
      if (s.tutor && cerca && !reduce) animarTutor(s, t, ahora);
      if (s.paseo) {
        const k = Math.min(1, (ahora - s.paseo.t0) / s.paseo.dur);
        s.caminante.position.lerpVectors(s.paseo.desde, s.paseo.hasta, suave(k));
        s.caminante.position.y = PISO_Y + Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
        if (k >= 1) { s.paseo = null; s.caminante.visible = false; }
      }
    });
    leds.forEach((l) => { l.mat.emissiveIntensity = reduce || Math.sin(t * l.vel + l.fase) > 0.15 ? 1.1 : 0.12; });
    if (!reduce) globos.forEach((g) => { g.m.position.y = g.y + Math.sin(t * 1.4 + g.fase) * 0.08; });

    renderer.render(mundo, camara);
    posicionarOverlays();
  }

  /* ── Arranque ── */
  pintarDatos();
  if (window.RUTA.elegida) {
    mostrar(window.RUTA.elegida);
    camU = actual * PASO;
  }
  requestAnimationFrame(loop);
}
