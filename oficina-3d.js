// oficina-3d.js — la Oficina digital en 3D (three.js, sin build): maqueta
// isométrica low-poly con los 6 agentes reales, cada uno en su escritorio.
//
// Datos reales (Supabase, cada 30 s): última acción de cada agente, actividad
// de las últimas 24 h y notas del equipo. Cuando un agente registra algo nuevo,
// salta y lo cuenta en un globito.
// Chat (oficina-viva.js, por eventos): el Coordinador piensa, los agentes que
// ayudaron vuelan a la mesa de reunión y, si se anota algo, va a la pizarra.
// Clic en un agente: ficha con lo último que hizo y botón para preguntarle.
//
// Horario de la oficina: de 8 a 18 h (días de cada agente) están despiertos y,
// cuando están libres, van a tomar un café, charlan o visitan a un compañero.
// Fuera de ese horario duermen sobre el escritorio (💤) y solo se despiertan
// si les hablamos por el chat.
//
// Si el navegador no tiene WebGL o three.js no carga, avisa con el evento
// "oficina:3d-fallo" y queda la oficina 2D de oficina-viva.js.
const THREE_URL = './vendor/three.min.js?v=0.186.1';
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
const N8N_AGENTES = 'https://kevin9705.app.n8n.cloud/projects/MzRtqNwNuk7fWtaT/agents/';

const escena = document.getElementById('ofiEscena');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

if (escena && hayWebGL()) {
  // oficina-viva.js mira esta marca al cargar la página: si está, no arma la 2D.
  window.__oficina3d = 'cargando';
  iniciar().catch(fallo);
}

function fallo(e) {
  console.warn('Oficina 3D no disponible; queda la versión 2D.', e);
  window.__oficina3d = null;
  escena.classList.remove('o3d');
  escena.innerHTML = '';
  document.dispatchEvent(new CustomEvent('oficina:3d-fallo'));
}

/* ───────────────────────── Configuración ───────────────────────── */

const PALETA = {
  fondo: '#eef2f6',
  base: '#e3e8ef',
  grilla: '#cdd5e0',
  blanco: '#ffffff',
  pared: '#fbfcfd',
  patas: '#d5dbe4',
  silla: '#c6cfdb',
  oscuro: '#3b4352',
  rack: '#7f8a9c',
  rackPanel: '#939dae',
  menta: '#5ee0b5',
  mentaSuave: '#d5f6ea',
  cian: '#45d3ec',
  cianSuave: '#d4f2f9',
  gris: '#b8c1ce',
  grisSuave: '#edf0f4',
  acero: '#e2e7ee',
  lila: '#cbc6f4',
  ambar: '#f5b748',
  coral: '#ffb4a2',
  amarilloSuave: '#ffe7a3',
  lavanda: '#d9d0ff',
  lavandaSuave: '#efeafc',
  cielo: '#cfe8ff',
  arena: '#f8efe2',
  terracota: '#e9a07a',
  madera: '#c99a6b',
  hoja: '#7fd3a8',
  hojaOscura: '#45b386',
  corcho: '#d8b48a',
};

// Estado visual de cada agente (color de ojos, antena, anillo y pantalla).
const ESTADOS = {
  trabajando: { label: 'Trabajando', color: PALETA.cian },
  activo: { label: 'En horario', color: PALETA.menta },
  alerta: { label: 'Con aviso', color: PALETA.ambar },
  durmiendo: { label: 'Durmiendo', color: PALETA.gris },
};

// Maqueta: 4 zonas de 10 × 10 con pasillos.
const SALA = 10;
const MITAD = SALA / 2;
const DESVIO = MITAD + 0.25;
const PISO_Y = 0.12;
const PARED_H = 1.3;
const PARED_T = 0.22;
const PUERTA = 1.9;
const BASE = SALA * 2 + 0.5 + 1.6;
const ESCALA_BOT = 1.5;
const BOT_Y = PISO_Y + 2.15; // altura de vuelo sobre el escritorio

const ZONAS = [
  { id: 'seleccion', nombre: 'Selección', centro: [-DESVIO, -DESVIO], tinte: PALETA.mentaSuave, acento: PALETA.menta, puertas: {} },
  { id: 'entrevistas', nombre: 'Entrevistas e ingresos', centro: [DESVIO, -DESVIO], tinte: PALETA.cianSuave, acento: PALETA.cian, puertas: { izq: true } },
  { id: 'coordinacion', nombre: 'Coordinación', centro: [-DESVIO, DESVIO], tinte: PALETA.arena, acento: PALETA.lila, puertas: { fondo: true } },
  { id: 'servidores', nombre: 'Servidores y descanso', centro: [DESVIO, DESVIO], tinte: PALETA.lavandaSuave, acento: PALETA.cian, puertas: { izq: true, fondo: true } },
];
const ZONA_POR_ID = Object.fromEntries(ZONAS.map((z) => [z.id, z]));

// Color del cuerpo de cada robot (el Coordinador queda con el blanco original).
// La silla de su escritorio y la manta de su cama usan el mismo color.
const COLORES = {
  coordinador: PALETA.blanco,
  screening: '#9b87f5', // violeta
  analista: '#5b8def', // azul
  vacantes: '#e85a5a', // rojo
  agenda: '#f5c842', // amarillo
  onboarding: '#8a3b45', // marrón bordó
};
const color2 = (id) => (id === 'coordinador' ? '#8ea3d1' : COLORES[id]); // silla y manta

// Puesto de cada agente (posición dentro de su zona), silueta, horario
// (dias: 1 = lunes … 7 = domingo; horas: [inicio, fin) en Buenos Aires),
// frases de relleno y la pregunta que se le hace desde la ficha.
const PUESTOS = {
  screening: { zona: 'seleccion', asiento: [-1.8, -1.6], forma: 'esfera', nombre: 'Screening', emoji: '🔎', dias: [1, 2, 3, 4, 5, 6], horas: [8, 21],
    frases: ['Leyendo postulaciones nuevas', 'Marcando duplicados', 'Este perfil está muy bien'],
    pregunta: '¿Cuántas postulaciones recomendó avanzar el Screening en las últimas 48 horas y de qué zonas?' },
  vacantes: { zona: 'seleccion', asiento: [1.8, -1.6], forma: 'cubo', nombre: 'Vacantes', emoji: '📌', dias: [1, 2, 3, 4, 5], horas: [8, 20],
    frases: ['Repasando búsquedas abiertas', '¿Qué local está trabado?', 'Busco candidatos de la zona'],
    pregunta: '¿Qué búsquedas siguen abiertas o trabadas y de quién son?' },
  agenda: { zona: 'entrevistas', asiento: [-1.8, -1.6], forma: 'cubo', nombre: 'Agenda', emoji: '📅', dias: [1, 2, 3, 4, 5], horas: [8, 20],
    frases: ['Ordenando las entrevistas', 'Busco un hueco libre', 'Recordatorio listo'],
    pregunta: '¿Qué entrevistas hay hoy y mañana?' },
  onboarding: { zona: 'entrevistas', asiento: [1.8, -1.6], forma: 'capsula', nombre: 'Onboarding', emoji: '🤝', dias: [1, 2, 3, 4, 5], horas: [8, 20],
    frases: ['Preparando bienvenidas', 'Chequeo legajos', '¡Se viene un ingreso!'],
    pregunta: '¿Qué ingresos hay en los próximos días?' },
  coordinador: { zona: 'coordinacion', asiento: [-1.8, -1.6], forma: 'capsula', ancho: true, nombre: 'Coordinador', emoji: '🧭', dias: [1, 2, 3, 4, 5], horas: [8, 20],
    frases: ['Reviso cómo viene cada uno', 'Armo el parte del día', '¿Alguien necesita algo?'],
    pregunta: '¿Qué hizo la oficina hoy?' },
  analista: { zona: 'coordinacion', asiento: [1.8, -1.6], forma: 'esfera', nombre: 'Analista', emoji: '📊', dias: [1, 2, 3, 4, 5], horas: [8, 20],
    frases: ['Cruzando números por zona', 'Comparando con la semana pasada', 'Este gráfico sube 📈'],
    pregunta: '¿Cómo vienen las postulaciones hoy comparado con ayer?' },
};
const ORDEN = ['coordinador', 'screening', 'analista', 'vacantes', 'agenda', 'onboarding'];

// Lugares a donde vuelan (coordenadas de mundo).
const zonaMundo = (zonaId, x, z) => {
  const c = ZONA_POR_ID[zonaId].centro;
  return [c[0] + x, c[1] + z];
};
const MESA = zonaMundo('coordinacion', 1.4, 2.0);
const PIZARRA = zonaMundo('coordinacion', -3.75, 1.9);
const RACKS = zonaMundo('servidores', -1.4, -2.3);
// Sala de descanso (frente de la zona de servidores): una cama por agente, en el orden de ORDEN.
const CAMAS = [[-2.6, 0.75], [0, 0.75], [2.6, 0.75], [-2.6, 3.15], [0, 3.15], [2.6, 3.15]];
const CAFE = zonaMundo('seleccion', -2.4, 2.2); // frente a la mesada del café
const DESPIERTOS = [8, 18]; // horario de la oficina (Buenos Aires)

const ACCION_EMOJI = { ok: '✅', error: '⚠️', pendiente: '⏳', resuelto: '✅' };

/* ───────────────────────── Utilidades ───────────────────────── */

let T; // namespace de three.js (import dinámico)
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const entre = (a, b) => a + Math.random() * (b - a);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
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
// De día cada agente vive en su escritorio; de noche, en su cama de la sala de descanso.
const hogar = (a) => (despierto(a.p) ? a.casa : a.cama);
const textoHorario = (p) => {
  const dias = p.dias.length === 6 ? 'L-S' : 'L-V';
  return `${dias} ${DESPIERTOS[0]} a ${DESPIERTOS[1]} h`;
};

/* ───────────────────────── Geometría low-poly ───────────────────────── */

const materiales = new Map();
const geometrias = new Map();

/** Material "arcilla": mate, sin metal (compartido por color). */
function mate(color, plano = false) {
  const clave = color + (plano ? ':plano' : '');
  if (!materiales.has(clave)) {
    materiales.set(clave, new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: plano }));
  }
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
/** Caja redondeada (geometría compartida por medida). */
function caja(w, h, d, color, { r = 0.05, sombra = true, recibe = true } = {}) {
  const clave = `${w}|${h}|${d}|${r}`;
  if (!geometrias.has(clave)) geometrias.set(clave, new T.RoundedBoxGeometry(w, h, d, 3, r));
  return malla(geometrias.get(clave), typeof color === 'string' ? mate(color) : color, { sombra, recibe });
}
function cilindro(rt, rb, h, seg, color, opciones) {
  return malla(new T.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mate(color) : color, opciones);
}

function pared(largo, acento, conPuerta) {
  const g = new T.Group();
  const tramos = conPuerta
    ? [{ l: (largo - PUERTA) / 2, x: -(largo + PUERTA) / 4 }, { l: (largo - PUERTA) / 2, x: (largo + PUERTA) / 4 }]
    : [{ l: largo, x: 0 }];
  tramos.forEach((t) => {
    g.add(en(caja(t.l, PARED_H, PARED_T, PALETA.pared, { r: 0.06 }), t.x, PARED_H / 2, 0));
    g.add(en(caja(t.l, 0.06, PARED_T + 0.02, acento, { r: 0.025, sombra: false }), t.x, PARED_H + 0.01, 0));
  });
  return g;
}

/** Silla: mira hacia -z (el respaldo queda en +z). */
function silla(color = PALETA.silla) {
  const g = new T.Group();
  g.add(en(cilindro(0.3, 0.34, 0.08, 10, PALETA.patas), 0, 0.05, 0));
  g.add(en(cilindro(0.05, 0.05, 0.44, 8, PALETA.patas, { recibe: false }), 0, 0.3, 0));
  g.add(en(caja(0.7, 0.12, 0.66, color), 0, 0.55, 0));
  g.add(en(caja(0.66, 0.6, 0.12, color), 0, 0.92, 0.3));
  return g;
}

/** Escritorio con monitor (pantalla con material propio), teclado y silla. */
function escritorio({ ancho = false, pantalla = PALETA.grisSuave, brillo = 0, colorSilla = PALETA.silla, decorado = false } = {}) {
  const w = ancho ? 2.8 : 2.2;
  const g = new T.Group();
  g.add(en(caja(w, 0.12, 1.1, PALETA.blanco), 0, 0.9, 0));
  [-1, 1].forEach((s) => g.add(en(caja(0.1, 0.84, 1, PALETA.patas, { r: 0.04 }), s * (w / 2 - 0.12), 0.42, 0)));
  g.add(en(cilindro(0.05, 0.09, 0.2, 8, PALETA.patas), 0.45, 1.06, -0.3));
  g.add(en(caja(0.95, 0.6, 0.07, PALETA.oscuro, { r: 0.03 }), 0.45, 1.44, -0.32));
  const matPantalla = new T.MeshStandardMaterial({ color: pantalla, emissive: pantalla, emissiveIntensity: brillo, roughness: 0.45 });
  g.add(en(new T.Mesh(new T.PlaneGeometry(0.84, 0.48), matPantalla), 0.45, 1.44, -0.28));
  g.add(en(caja(0.6, 0.04, 0.22, PALETA.patas, { r: 0.015, sombra: false }), 0.42, 0.98, 0.15));
  g.add(en(silla(colorSilla), 0.3, 0, 0.95));
  if (decorado) {
    g.add(en(taza(), -w / 2 + 0.25, 0.96, 0.3)); // taza (izquierda, adelante)
    g.add(en(lamparaEscritorio(), w / 2 - 0.2, 0.96, 0.32)); // lámpara (derecha, adelante)
  }
  return { grupo: g, matPantalla };
}

function lamparaEscritorio() {
  const g = new T.Group();
  g.add(en(cilindro(0.11, 0.13, 0.04, 12, PALETA.oscuro), 0, 0.02, 0));
  g.add(en(cilindro(0.018, 0.018, 0.36, 6, PALETA.oscuro, { sombra: false }), 0, 0.2, 0));
  const luz = new T.MeshStandardMaterial({ color: PALETA.amarilloSuave, emissive: '#ffd166', emissiveIntensity: 0.6, roughness: 0.6 });
  g.add(en(malla(new T.CylinderGeometry(0.05, 0.14, 0.14, 12), luz), 0, 0.42, 0));
  return g;
}

const leds = []; // materiales de LEDs de los racks (parpadean en el loop)
function rack() {
  const g = new T.Group();
  g.add(en(caja(1.1, 2.6, 1, PALETA.rack, { r: 0.08 }), 0, 1.3, 0));
  for (let s = 0; s < 6; s++) {
    const fila = en(new T.Group(), 0, 0.45 + s * 0.36, 0.51);
    fila.add(caja(0.9, 0.24, 0.04, PALETA.rackPanel, { r: 0.015, sombra: false }));
    [0, 1].forEach((k) => {
      const color = k ? PALETA.cian : PALETA.menta;
      const mat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, roughness: 0.5 });
      leds.push({ mat, fase: Math.random() * Math.PI * 2, vel: 1.5 + ((s + k) % 3) });
      fila.add(en(new T.Mesh(new T.BoxGeometry(0.07, 0.07, 0.02), mat), -0.3 + k * 0.14, 0, 0.03));
    });
    g.add(fila);
  }
  return g;
}

function planta(escala = 1) {
  const g = new T.Group();
  g.add(en(cilindro(0.3, 0.24, 0.6, 10, PALETA.blanco), 0, 0.3, 0));
  g.add(en(malla(new T.IcosahedronGeometry(0.45, 0), mate('#9be6c9', true)), 0, 0.95, 0));
  g.add(en(malla(new T.IcosahedronGeometry(0.27, 0), mate(PALETA.menta, true)), 0.2, 1.32, 0.05));
  g.scale.setScalar(escala);
  return g;
}

/** Planta alta: maceta de color, tronco y copas low-poly. */
function plantaAlta(maceta = PALETA.terracota, escala = 1) {
  const g = new T.Group();
  g.add(en(cilindro(0.3, 0.24, 0.55, 10, maceta), 0, 0.275, 0));
  g.add(en(cilindro(0.05, 0.07, 1.2, 6, '#8d6e4f', { recibe: false }), 0, 1.1, 0));
  [[0, 1.75, 0, 0.5, PALETA.hojaOscura], [0.28, 1.45, 0.1, 0.36, PALETA.hoja], [-0.25, 1.35, -0.1, 0.34, '#9be6c9'], [0.05, 2.1, 0.05, 0.3, PALETA.hoja]]
    .forEach(([x, y, z, r, c]) => g.add(en(malla(new T.IcosahedronGeometry(r, 0), mate(c, true)), x, y, z)));
  g.scale.setScalar(escala);
  return g;
}

/** Cactus en maceta. */
function cactus(maceta = PALETA.amarilloSuave) {
  const g = new T.Group();
  g.add(en(cilindro(0.24, 0.2, 0.4, 10, maceta), 0, 0.2, 0));
  g.add(en(cilindro(0.15, 0.17, 0.75, 8, PALETA.hojaOscura), 0, 0.75, 0));
  g.add(en(malla(new T.SphereGeometry(0.15, 8, 6), mate(PALETA.hojaOscura, true)), 0, 1.12, 0));
  g.add(en(cilindro(0.07, 0.07, 0.3, 6, PALETA.hojaOscura), 0.22, 0.85, 0));
  g.add(en(cilindro(0.07, 0.07, 0.24, 6, PALETA.hojaOscura), -0.2, 0.7, 0));
  g.add(en(malla(new T.SphereGeometry(0.06, 8, 6), mate('#ff8fab', true)), 0, 1.28, 0)); // florcita
  return g;
}

/** Alfombra rectangular o redonda, apenas sobre el piso. */
function alfombra(ancho, largo, color) {
  return en(caja(ancho, 0.03, largo, color, { r: 0.012, sombra: false }), 0, 0.016, 0);
}
function alfombraRedonda(radio, color) {
  return en(cilindro(radio, radio, 0.03, 32, color, { sombra: false }), 0, 0.016, 0);
}

/** Cuadro para colgar en la pared (mira hacia +z). */
function cuadro(ancho, alto, color, color2b = PALETA.blanco) {
  const g = new T.Group();
  g.add(caja(ancho, alto, 0.05, PALETA.blanco, { r: 0.02, sombra: false }));
  g.add(en(caja(ancho - 0.12, alto - 0.12, 0.02, color, { r: 0.01, sombra: false }), 0, 0, 0.03));
  g.add(en(malla(new T.CircleGeometry(Math.min(ancho, alto) * 0.18, 16), mate(color2b), { sombra: false }), ancho * 0.15, alto * 0.05, 0.045));
  return g;
}

/** Cartelera de corcho con notas de colores (mira hacia +z). */
function cartelera() {
  const g = new T.Group();
  g.add(caja(1.6, 0.75, 0.05, PALETA.corcho, { r: 0.02, sombra: false }));
  [[-0.55, 0.15, PALETA.amarilloSuave], [-0.2, -0.12, PALETA.coral], [0.15, 0.16, PALETA.cielo], [0.5, -0.1, PALETA.mentaSuave], [-0.5, -0.18, PALETA.lavanda]]
    .forEach(([x, y, c]) => g.add(en(caja(0.24, 0.24, 0.02, c, { r: 0.008, sombra: false }), x, y, 0.035)));
  return g;
}

/** Reloj de pared (mira hacia +z). */
function relojPared() {
  const g = new T.Group();
  const disco = (r, h, c, z) => {
    const m = en(cilindro(r, r, h, 24, c, { sombra: false }), 0, 0, z);
    m.rotation.x = Math.PI / 2;
    return m;
  };
  g.add(disco(0.34, 0.06, PALETA.oscuro, 0));
  g.add(disco(0.3, 0.02, PALETA.blanco, 0.035));
  g.add(en(caja(0.03, 0.2, 0.01, PALETA.oscuro, { r: 0.004, sombra: false }), 0, 0.09, 0.05));
  const minutero = en(caja(0.02, 0.26, 0.01, PALETA.coral, { r: 0.004, sombra: false }), 0.08, 0.06, 0.055);
  minutero.rotation.z = -1.1;
  g.add(minutero);
  return g;
}

/** Biblioteca baja con libros de colores (mira hacia +z). */
function biblioteca() {
  const g = new T.Group();
  g.add(en(caja(1.5, 1.2, 0.4, PALETA.blanco, { r: 0.04 }), 0, 0.6, 0));
  const colores = [PALETA.coral, PALETA.cian, PALETA.amarilloSuave, PALETA.lavanda, PALETA.menta, '#ff8fab'];
  [0.38, 0.85].forEach((y, fila) => {
    for (let i = 0; i < 7; i++) {
      const h = 0.26 + ((i * 7 + fila * 3) % 4) * 0.03;
      g.add(en(caja(0.14, h, 0.28, colores[(i + fila * 2) % colores.length], { r: 0.015, sombra: false }), -0.55 + i * 0.18, y + h / 2 - 0.13, 0.08));
    }
  });
  return g;
}

/** Sillón de espera. */
function sillon(color) {
  const g = new T.Group();
  g.add(en(caja(2.1, 0.42, 0.9, color, { r: 0.1 }), 0, 0.3, 0));
  g.add(en(caja(2.1, 0.6, 0.25, color, { r: 0.1 }), 0, 0.68, -0.34));
  [-1, 1].forEach((sx) => g.add(en(caja(0.22, 0.55, 0.9, color, { r: 0.08 }), sx * 1.0, 0.5, 0)));
  [[-0.5, PALETA.amarilloSuave], [0.5, PALETA.coral]].forEach(([x, c]) => {
    const almohadon = en(caja(0.45, 0.4, 0.12, c, { r: 0.06 }), x, 0.72, -0.18);
    almohadon.rotation.x = -0.25;
    g.add(almohadon);
  });
  return g;
}

/** Cama de la sala de descanso, con la manta del color del robot (cabecera hacia -z). */
function cama(manta) {
  const g = new T.Group();
  g.add(en(caja(1.15, 0.28, 1.7, PALETA.madera, { r: 0.06 }), 0, 0.14, 0));
  g.add(en(caja(1.15, 0.6, 0.12, PALETA.madera, { r: 0.05 }), 0, 0.44, -0.82));
  g.add(en(caja(1.05, 0.16, 1.55, PALETA.blanco, { r: 0.06 }), 0, 0.36, 0.02));
  g.add(en(caja(0.7, 0.12, 0.32, PALETA.blanco, { r: 0.05 }), 0, 0.5, -0.55));
  g.add(en(caja(1.09, 0.1, 0.98, manta, { r: 0.04 }), 0, 0.47, 0.3));
  return g;
}

/** Lámpara de pie con luz cálida. */
function lamparaPie() {
  const g = new T.Group();
  g.add(en(cilindro(0.16, 0.18, 0.05, 12, PALETA.oscuro), 0, 0.025, 0));
  g.add(en(cilindro(0.025, 0.025, 1.1, 6, PALETA.oscuro, { sombra: false }), 0, 0.6, 0));
  const luz = new T.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd166', emissiveIntensity: 0.7, roughness: 0.6 });
  g.add(en(malla(new T.CylinderGeometry(0.16, 0.24, 0.28, 14), luz), 0, 1.2, 0));
  return g;
}

function mesaRedonda(radio = 1.1, sillas = 4, colorSilla = PALETA.lila) {
  const g = new T.Group();
  g.add(en(cilindro(radio, radio, 0.1, 24, PALETA.blanco), 0, 0.8, 0));
  g.add(en(cilindro(0.12, 0.16, 0.78, 10, PALETA.patas), 0, 0.4, 0));
  g.add(en(cilindro(0.5, 0.55, 0.06, 16, PALETA.patas), 0, 0.03, 0));
  for (let i = 0; i < sillas; i++) {
    const a = (i / sillas) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * (radio + 0.45);
    const z = Math.cos(a) * (radio + 0.45);
    const s = en(silla(colorSilla), x, 0, z);
    s.rotation.y = Math.atan2(x, z); // la silla mira al centro
    g.add(s);
  }
  return g;
}

function pizarra() {
  const g = new T.Group();
  [-1, 1].forEach((s) => g.add(en(caja(0.08, 1.3, 0.08, PALETA.patas, { r: 0.03 }), s * 1.05, 0.65, 0)));
  g.add(en(caja(2.3, 1.15, 0.07, PALETA.blanco, { r: 0.03 }), 0, 1.35, 0));
  [[-0.7, 0.25, PALETA.menta], [-0.25, 0.3, PALETA.cian], [0.25, 0.2, PALETA.lila], [0.7, 0.28, PALETA.menta],
    [-0.5, -0.2, PALETA.cian], [0.1, -0.22, PALETA.lila]].forEach(([x, y, c]) => {
    g.add(en(caja(0.3, 0.3, 0.02, c, { r: 0.008, sombra: false }), x, 1.35 + y, 0.05));
  });
  return g;
}

function taza() {
  const g = new T.Group();
  g.add(en(cilindro(0.08, 0.065, 0.14, 12, PALETA.blanco), 0, 0.07, 0));
  g.add(en(cilindro(0.07, 0.07, 0.01, 12, '#7a4a2e', { sombra: false }), 0, 0.142, 0));
  return g;
}

/** Rincón del café: mesada con cafetera y tazas. */
function cafetera() {
  const g = new T.Group();
  g.add(en(caja(1.9, 0.9, 0.7, PALETA.blanco), 0, 0.45, 0));
  g.add(en(caja(1.94, 0.06, 0.74, PALETA.patas, { r: 0.025, sombra: false }), 0, 0.92, 0));
  g.add(en(caja(0.55, 0.7, 0.5, PALETA.oscuro, { r: 0.06 }), -0.45, 1.3, -0.05));
  const luz = new T.MeshStandardMaterial({ color: PALETA.cian, emissive: PALETA.cian, emissiveIntensity: 0.9 });
  g.add(en(new T.Mesh(new T.BoxGeometry(0.16, 0.05, 0.02), luz), -0.45, 1.5, 0.21));
  g.add(en(taza(), -0.45, 0.95, 0.12));
  g.add(en(taza(), 0.35, 0.95, 0.12));
  g.add(en(taza(), 0.62, 0.95, -0.12));
  g.add(en(cilindro(0.15, 0.15, 0.24, 10, '#c9a27e'), 0.05, 1.07, -0.16));
  return g;
}

function mueble() {
  const g = new T.Group();
  g.add(en(caja(1.8, 0.75, 0.55, PALETA.blanco), 0, 0.375, 0));
  [PALETA.menta, PALETA.cian, PALETA.lila].forEach((c, i) => g.add(en(caja(0.14, 0.42, 0.36, c, { r: 0.02 }), -0.55 + i * 0.2, 0.96, 0)));
  return g;
}

function puffs() {
  const g = new T.Group();
  g.add(en(cilindro(0.55, 0.55, 0.1, 18, PALETA.blanco), 0, 0.35, 0));
  g.add(en(cilindro(0.08, 0.08, 0.32, 8, PALETA.patas), 0, 0.17, 0));
  g.add(en(cilindro(0.42, 0.46, 0.48, 14, PALETA.menta), -1.05, 0.24, 0.2));
  g.add(en(cilindro(0.42, 0.46, 0.48, 14, PALETA.cian), 0.95, 0.24, -0.35));
  return g;
}

/* ───────────────────────── Robots ───────────────────────── */

const FORMAS = { esfera: { visor: 0.36, tope: 0.42 }, cubo: { visor: 0.36, tope: 0.36 }, capsula: { visor: 0.29, tope: 0.47 } };

function crearBot(forma, color = PALETA.blanco) {
  const raiz = new T.Group();
  const giro = new T.Group();
  giro.rotation.y = Math.PI / 4; // de frente a la cámara isométrica
  giro.scale.setScalar(ESCALA_BOT);
  raiz.add(giro);
  const flota = new T.Group();
  giro.add(flota);
  const dims = FORMAS[forma] || FORMAS.esfera;

  let cuerpo;
  if (forma === 'cubo') cuerpo = caja(0.72, 0.72, 0.72, color, { r: 0.18, recibe: false });
  else if (forma === 'capsula') cuerpo = malla(new T.CapsuleGeometry(0.3, 0.34, 6, 14), mate(color), { recibe: false });
  else cuerpo = malla(new T.IcosahedronGeometry(0.42, 1), mate(color, true), { recibe: false });
  flota.add(cuerpo);

  const visor = caja(0.5, 0.22, 0.1, new T.MeshStandardMaterial({ color: PALETA.oscuro, roughness: 0.5 }), { r: 0.05, sombra: false });
  flota.add(en(visor, 0, 0.04, dims.visor));

  const luz = ESTADOS.activo.color; // ojos, antena y anillo: color del estado
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

  // Taza que lleva un rato después de tomar café.
  const tazaBot = en(taza(), 0.52, -0.22, 0.2);
  tazaBot.visible = false;
  flota.add(tazaBot);

  return { raiz, flota, ojos, ojoMat, puntaMat, anillo, anilloMat, taza: tazaBot };
}

/* ───────────────────────── Escena ───────────────────────── */

async function iniciar() {
  T = await import(THREE_URL);

  escena.classList.add('o3d');
  escena.innerHTML = '';
  escena.setAttribute('role', 'region'); // tiene contenido interactivo (la ficha con botones)
  escena.setAttribute('aria-label', 'Oficina 3D: cada agente trabaja en su escritorio y muestra lo último que hizo. Hacé clic en un agente para ver su ficha.');

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

  // Cámara ortográfica fija en isométrico clásico: (d, d, d) mirando al origen.
  const camara = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camara.position.set(30, 30, 30);
  camara.lookAt(0, 0, 0);

  // Luz de estudio suave.
  mundo.add(new T.AmbientLight(0xffffff, 0.55));
  mundo.add(new T.HemisphereLight(0xffffff, 0xd9e1ec, 0.55));
  const sol = new T.DirectionalLight(0xffffff, 1.5);
  sol.position.set(14, 26, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.radius = 4;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  Object.assign(sol.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 80 });
  mundo.add(sol);

  // Zócalo + piso cuadriculado.
  mundo.add(en(caja(BASE, 0.8, BASE, PALETA.base, { r: 0.25 }), 0, -0.4, 0));
  const grilla = new T.GridHelper(BASE - 0.6, Math.round(BASE - 0.6), PALETA.grilla, PALETA.grilla);
  grilla.material.transparent = true;
  grilla.material.opacity = 0.65;
  grilla.position.y = PISO_Y + 0.006;
  mundo.add(grilla);

  // DOM sobre el canvas: carteles, nombres, globitos y ficha.
  // `ajuste`: cómo se acomoda el elemento respecto del punto proyectado.
  const anclas = []; // { el, pos: Vector3 | () => Vector3, ajuste }
  function etiqueta(clase, html, pos, ajuste = 'translate(-50%, -50%)') {
    const el = document.createElement('div');
    el.className = clase;
    el.innerHTML = html;
    capa.appendChild(el);
    anclas.push({ el, pos, ajuste });
    return el;
  }

  // Zonas con paredes, carteles y mobiliario.
  ZONAS.forEach((z) => {
    const g = en(new T.Group(), z.centro[0], 0, z.centro[1]);
    g.add(en(caja(SALA - 0.15, PISO_Y, SALA - 0.15, z.tinte, { r: 0.04, sombra: false }), 0, PISO_Y / 2, 0));
    g.add(en(pared(SALA, z.acento, z.puertas.fondo), 0, PISO_Y, -MITAD + PARED_T / 2));
    const izq = en(pared(SALA, z.acento, z.puertas.izq), -MITAD + PARED_T / 2, PISO_Y, 0);
    izq.rotation.y = Math.PI / 2;
    g.add(izq);
    mundo.add(g); // sin cartel: en la oficina solo se ven los robots y sus globitos
  });

  const ubicar = (obj, zonaId, x, z, rotY = 0) => {
    const [wx, wz] = zonaMundo(zonaId, x, z);
    obj.position.set(wx, PISO_Y, wz);
    obj.rotation.y = rotY;
    mundo.add(obj);
    return obj;
  };
  // Cuadros y carteleras sobre la cara interna de las paredes (fondo: z, izquierda: x).
  const enParedFondo = (obj, zonaId, x, y = 0.8) => ubicar(obj, zonaId, x, -MITAD + PARED_T + 0.03).position.setY(PISO_Y + y);
  const enParedIzq = (obj, zonaId, z, y = 0.8) => ubicar(obj, zonaId, -MITAD + PARED_T + 0.03, z, Math.PI / 2).position.setY(PISO_Y + y);

  // Selección: rincón del café y descanso con puffs.
  ubicar(cafetera(), 'seleccion', -3.6, 2.2, Math.PI / 2);
  ubicar(alfombra(3.4, 2.6, PALETA.amarilloSuave), 'seleccion', 1.6, 2.3);
  ubicar(puffs(), 'seleccion', 1.6, 2.3);
  ubicar(plantaAlta(PALETA.terracota), 'seleccion', -4.05, -4.05);
  ubicar(planta(), 'seleccion', 3.8, -3.9);
  ubicar(cactus(PALETA.coral), 'seleccion', 4.0, 4.0);
  ubicar(planta(0.8), 'seleccion', -4.0, 4.0);
  enParedFondo(cartelera(), 'seleccion', 0);
  enParedIzq(cuadro(0.9, 0.6, PALETA.coral, PALETA.amarilloSuave), 'seleccion', -2.0);

  // Entrevistas e ingresos: mesa de entrevista, sillón de espera y reloj.
  ubicar(alfombra(3.2, 2.8, PALETA.cielo), 'entrevistas', 0.2, 2.2);
  ubicar(mesaRedonda(0.75, 2, PALETA.coral), 'entrevistas', 0.2, 2.2);
  ubicar(sillon('#7fd8e6'), 'entrevistas', 3.7, 1.9, -Math.PI / 2);
  ubicar(plantaAlta('#ffffff'), 'entrevistas', -4.05, -4.05);
  ubicar(planta(), 'entrevistas', -3.8, 3.8);
  ubicar(planta(0.9), 'entrevistas', 3.9, -3.9);
  ubicar(cactus(PALETA.lavanda), 'entrevistas', 3.9, 4.0);
  enParedFondo(relojPared(), 'entrevistas', 0, 0.85);
  enParedFondo(cuadro(0.8, 0.55, PALETA.cielo, PALETA.coral), 'entrevistas', -3.5);
  enParedFondo(cuadro(0.8, 0.55, PALETA.lavanda, PALETA.menta), 'entrevistas', 3.5);

  // Coordinación: mesa de reunión sobre alfombra, pizarra y biblioteca.
  const mesaLocal = [MESA[0] - ZONA_POR_ID.coordinacion.centro[0], MESA[1] - ZONA_POR_ID.coordinacion.centro[1]];
  ubicar(alfombraRedonda(2.3, PALETA.lavanda), 'coordinacion', mesaLocal[0], mesaLocal[1]);
  ubicar(mesaRedonda(), 'coordinacion', mesaLocal[0], mesaLocal[1]);
  ubicar(pizarra(), 'coordinacion', -3.75, 1.9, Math.PI / 2);
  ubicar(biblioteca(), 'coordinacion', 3.4, -4.5);
  ubicar(plantaAlta(PALETA.amarilloSuave, 1.1), 'coordinacion', -4.0, -4.0);
  ubicar(plantaAlta(PALETA.coral), 'coordinacion', 4.0, 4.0);
  ubicar(cactus(PALETA.blanco), 'coordinacion', -4.0, 4.1);
  enParedFondo(cuadro(0.9, 0.6, PALETA.amarilloSuave, PALETA.coral), 'coordinacion', -3.2);

  // Servidores (fondo) y sala de descanso con una cama por agente (frente).
  [-2.9, -1.6, -0.3, 1].forEach((x) => ubicar(rack(), 'servidores', x, -3.85));
  ubicar(alfombra(8.4, 5.4, PALETA.lavanda), 'servidores', 0, 1.95);
  ORDEN.forEach((id, i) => ubicar(cama(color2(id)), 'servidores', CAMAS[i][0], CAMAS[i][1]));
  [-1.3, 1.3].forEach((x) => ubicar(lamparaPie(), 'servidores', x, 1.95));
  ubicar(planta(0.9), 'servidores', 4.0, -2.6);
  ubicar(plantaAlta(PALETA.lavanda, 0.9), 'servidores', 3.95, 4.05);
  ubicar(cactus(PALETA.coral), 'servidores', -4.0, 4.1);


  /* ── Agentes ── */
  const agentes = new Map();
  const clicables = [];
  ORDEN.forEach((id) => {
    const p = PUESTOS[id];
    const [wx, wz] = zonaMundo(p.zona, p.asiento[0], p.asiento[1]);
    const esc3 = escritorio({ ancho: p.ancho, colorSilla: color2(id), decorado: true });
    esc3.grupo.position.set(wx, PISO_Y, wz);
    mundo.add(esc3.grupo);
    const bot = crearBot(p.forma, COLORES[id]);
    const casa = new T.Vector3(wx - 0.5, BOT_Y, wz - 0.05);
    const [cx, cz] = zonaMundo('servidores', ...CAMAS[ORDEN.indexOf(id)]);
    const camaPos = new T.Vector3(cx, PISO_Y + 1.35, cz + 0.1);
    bot.raiz.position.copy(casa);
    mundo.add(bot.raiz);
    [esc3.grupo, bot.raiz].forEach((o) => {
      o.traverse((h) => { h.userData.agente = id; });
      clicables.push(o);
    });
    const a = {
      id, p, bot, casa, cama: camaPos, matPantalla: esc3.matPantalla,
      pos: casa.clone(), vuelo: null, salto: -10, fase: (ORDEN.indexOf(id) * 1.7) % 6,
      reservas: 0, ocupado: false, enChat: false, enCafe: false, sueno: 0,
      datos: { nombre: p.nombre, emoji: p.emoji, rol: '', n8n: '' },
      ultima: null, act: null, estado: 'activo',
    };
    a.tag = etiqueta('o3d-tag', `<i></i>${p.emoji}<span>${esc(p.nombre)}</span>`, () => a.pos.clone().add(new T.Vector3(0, -1.25, 0)), 'translate(-50%, 0)');
    a.globo = etiqueta('o3d-globo', '', () => a.pos.clone().add(new T.Vector3(0, 1.45, 0)), 'translate(-50%, -100%)');
    a.zzz = etiqueta('o3d-zzz', '<i>z</i><i>z</i><i>Z</i>', () => a.pos.clone().add(new T.Vector3(0.5, 0.75, 0)), 'translate(-50%, -100%)');
    agentes.set(id, a);
  });
  agentes.forEach((a) => a.pos.copy(hogar(a))); // si se abre de noche, ya están acostados

  /* ── Estados y colores ── */
  function calcularEstado(a) {
    if (a.enChat) return 'trabajando'; // le hablamos: se despierta
    if (!despierto(a.p)) return 'durmiendo';
    const u = a.ultima;
    if (u && u.estado === 'error' && Date.now() - new Date(u.created_at) < 24 * 3600e3) return 'alerta';
    if (u && Date.now() - new Date(u.created_at) < 15 * 60e3) return 'trabajando';
    return 'activo';
  }
  function aplicarEstados() {
    agentes.forEach((a) => {
      const estado = calcularEstado(a);
      a.estado = estado;
      const color = new T.Color(ESTADOS[estado].color);
      [a.bot.ojoMat, a.bot.puntaMat, a.bot.anilloMat].forEach((m) => { m.color.copy(color); m.emissive.copy(color); });
      const prendida = estado !== 'durmiendo';
      a.matPantalla.color.set(prendida ? ESTADOS[estado].color : PALETA.grisSuave);
      a.matPantalla.emissive.set(prendida ? ESTADOS[estado].color : '#000000');
      a.matPantalla.emissiveIntensity = prendida ? 0.55 : 0;
      a.tag.dataset.estado = estado;
      a.zzz.classList.toggle('on', estado === 'durmiendo');
      // Al cambiar de turno (8 y 18 h) vuela solo a su escritorio o a su cama.
      if (!a.reservas && !a.ocupado && !a.vuelo && !a.enChat && a.pos.distanceTo(hogar(a)) > 0.3) volar(a, hogar(a), 2.6);
    });
    refrescarFicha();
  }

  /* ── Globitos: uno solo a la vez para que no se choquen ──
     Los comentarios de rutina esperan a que no haya otro en pantalla; los
     importantes (chat o una acción nueva de la bitácora) lo reemplazan. */
  let hablando = null;
  function callar(a) {
    clearTimeout(a.globoTimer);
    a.globo.classList.remove('on');
    if (hablando === a) hablando = null;
  }
  function decir(a, texto, ms = 3500, importante = false) {
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

  /* ── Vuelo ── */
  function volar(a, destino, dur = 1.9) {
    return new Promise((res) => {
      if (reduce) {
        a.pos.copy(destino);
        a.vuelo = null;
        res();
        return;
      }
      a.vuelo = { desde: a.pos.clone(), hasta: destino.clone(), t0: performance.now() / 1000, dur: dur + Math.random() * 0.5, res };
    });
  }
  const volverACasa = (a) => volar(a, hogar(a));
  const reservar = (a) => { a.reservas++; };
  const liberar = (a) => {
    a.reservas = Math.max(0, a.reservas - 1);
    if (a.reservas) return Promise.resolve();
    return volverACasa(a);
  };
  const asientoMesa = (i) => {
    // 0 = cabecera (el Coordinador, al fondo); el resto alrededor, hacia la cámara.
    const angulos = [Math.PI * 1.25, Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.75, 0, Math.PI * 0.5];
    const ang = angulos[i % angulos.length];
    return new T.Vector3(MESA[0] + Math.sin(ang) * 1.9, PISO_Y + 2.35, MESA[1] + Math.cos(ang) * 1.9);
  };

  /* ── Vida de la oficina (cuando no hay chat) ── */
  let chatOcupado = false;
  const textoAccion = (u) => `${ACCION_EMOJI[u.estado] || '✅'} ${u.accion}${u.cantidad > 1 ? ' · ' + fmt(u.cantidad) : ''}`;
  async function rutina() {
    if (chatOcupado) return;
    // Los que duermen no hacen nada hasta que les hablen por el chat.
    const libres = [...agentes.values()].filter((a) => a.estado !== 'durmiendo' && !a.reservas && !a.ocupado && !a.vuelo);
    if (!libres.length) return;
    const a = azar(libres);
    a.ocupado = true;
    try {
      const r = Math.random();
      if (r < 0.3 || reduce) {
        decir(a, a.ultima && Math.random() < 0.65 ? `${textoAccion(a.ultima)} (${SB.hace(a.ultima.created_at)})` : azar(a.p.frases));
      } else if (r < 0.65) {
        await tomarCafe(a);
      } else if (r < 0.85) {
        const otro = azar([...agentes.values()].filter((o) => o !== a && !o.reservas && o.estado !== 'durmiendo'));
        if (!otro) return;
        await volar(a, otro.casa.clone().add(new T.Vector3(1.4, 0.1, 1.0)));
        decir(a, azar(['¿Cómo venís?', '¿Me pasás los números?', 'Tengo algo para vos', '¿Lo vemos juntos?']), 2800);
        await espera(3400);
        if (!a.reservas) await volverACasa(a);
      } else {
        await volar(a, new T.Vector3(RACKS[0], PISO_Y + 2.9, RACKS[1]));
        decir(a, azar(['🔧 Chequeo los servidores', '🟢 n8n y Supabase en orden']), 2800);
        await espera(3200);
        if (!a.reservas) await volverACasa(a);
      }
    } finally {
      a.ocupado = false;
    }
  }
  async function tomarCafe(a) {
    const enLaBarra = [...agentes.values()].filter((o) => o.enCafe).length;
    a.enCafe = true;
    await volar(a, new T.Vector3(CAFE[0], PISO_Y + 2.05, CAFE[1] + (enLaBarra % 2 ? 0.7 : -0.7)));
    decir(a, azar(['☕ Un cafecito', '☕ Recargando energía', '☕ ¿Alguien quiere uno?']), 2800);
    await espera(4500);
    a.bot.taza.visible = true;
    a.enCafe = false;
    if (!a.reservas) await volverACasa(a);
    setTimeout(() => { a.bot.taza.visible = false; }, 20000);
  }
  setInterval(rutina, 7000);

  /* ── Datos reales ── */
  let ultimoId = 0;
  async function leerAgentes() {
    try {
      const filas = await SB.pedir('agentes?select=id,nombre,emoji,rol,n8n_agent_id&order=orden.asc');
      filas.forEach((f) => {
        const a = agentes.get(f.id);
        if (!a) return;
        a.datos = { nombre: f.nombre || a.p.nombre, emoji: f.emoji || a.p.emoji, rol: f.rol || '', n8n: f.n8n_agent_id || '' };
        a.tag.innerHTML = `<i></i>${esc(a.datos.emoji)}<span>${esc(a.datos.nombre)}</span>`;
      });
      refrescarFicha();
    } catch (e) {
      console.warn('No se pudo leer la ficha de los agentes', e);
    }
  }
  async function leerBitacora(primeraVez) {
    try {
      const [acciones, act] = await Promise.all([
        SB.pedir('rpc/oficina_ultimas_acciones', { limite: 40 }),
        SB.pedir('rpc/oficina_actividad', { dias: 1 }),
      ]);
      acciones.forEach((x) => {
        const a = agentes.get(x.agente_id);
        if (a && (!a.ultima || x.id > a.ultima.id)) a.ultima = x;
      });
      agentes.forEach((a) => { a.act = act.find((x) => x.agente_id === a.id) || null; });
      if (!primeraVez) {
        // Si el agente duerme no se mueve ni habla: la acción queda en su ficha.
        const nuevas = acciones.filter((x) => x.id > ultimoId && agentes.has(x.agente_id) && agentes.get(x.agente_id).estado !== 'durmiendo');
        nuevas.forEach((x) => { agentes.get(x.agente_id).salto = performance.now() / 1000; });
        const x = nuevas[0]; // la más reciente es la única que habla
        if (x) decir(agentes.get(x.agente_id), `✨ ${x.accion}${x.cantidad > 1 ? ' · ' + fmt(x.cantidad) : ''}`, 5000, true);
      }
      if (acciones.length) ultimoId = Math.max(ultimoId, ...acciones.map((x) => x.id));
      aplicarEstados();
    } catch (e) {
      console.warn('No se pudo leer la bitácora', e);
    }
  }

  /* ── Ficha (tooltip) ── */
  const ficha = document.createElement('div');
  ficha.className = 'o3d-ficha';
  ficha.setAttribute('role', 'dialog');
  ficha.hidden = true;
  capa.appendChild(ficha);
  let sobre = null; // agente bajo el cursor
  let fijado = null; // agente con la ficha fija (clic)

  function refrescarFicha() {
    const id = fijado || sobre;
    if (!id) {
      ficha.hidden = true;
      return;
    }
    const a = agentes.get(id);
    const u = a.ultima;
    const act = a.act;
    const est = ESTADOS[a.estado];
    ficha.classList.toggle('fija', !!fijado);
    ficha.innerHTML = `
      <div class="o3d-ficha-head">
        <span class="o3d-ficha-emoji">${esc(a.datos.emoji)}</span>
        <div><strong>${esc(a.datos.nombre)}</strong><small>${esc(ZONA_POR_ID[a.p.zona].nombre)} · ${esc(textoHorario(a.p))}</small></div>
        <span class="o3d-pill" data-estado="${a.estado}">${esc(est.label)}</span>
      </div>
      ${a.datos.rol ? `<p class="o3d-ficha-rol">${esc(a.datos.rol)}</p>` : ''}
      <div class="o3d-ficha-box">
        <span>Última acción</span>
        <p>${u ? `${esc(textoAccion(u))} <em>${esc(SB.hace(u.created_at))}</em>` : 'Todavía sin actividad registrada'}</p>
      </div>
      <div class="o3d-ficha-stats">
        <div><b>${fmt(act ? act.acciones : 0)}</b><span>acciones 24 h</span></div>
        <div><b>${fmt(act ? act.items : 0)}</b><span>ítems 24 h</span></div>
        <div><b>${fmt(Math.round(act ? act.minutos : 0))}</b><span>min ahorrados</span></div>
      </div>
      ${fijado
        ? `<div class="o3d-ficha-acciones">
            <button type="button" class="o3d-btn" data-preguntar="${esc(a.p.pregunta)}">Preguntale →</button>
            ${a.datos.n8n ? `<a class="o3d-btn is-soft" href="${N8N_AGENTES + encodeURIComponent(a.datos.n8n)}" target="_blank" rel="noopener noreferrer">Abrir en n8n ↗</a>` : ''}
          </div>`
        : '<p class="o3d-ficha-hint">Hacé clic para fijar la ficha y preguntarle</p>'}`;
    ficha.hidden = false;
  }
  ficha.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preguntar]');
    if (!b) return;
    document.dispatchEvent(new CustomEvent('oficina:preguntar', { detail: { texto: b.dataset.preguntar } }));
    fijado = null;
    refrescarFicha();
  });

  /* ── Puntero: hover, clic y tacto ── */
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  let pendiente = null;
  let abajo = null;
  const agenteEn = (clientX, clientY) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camara);
    const hit = raycaster.intersectObjects(clicables, true)[0];
    return hit ? hit.object.userData.agente || null : null;
  };
  const lienzo = renderer.domElement;
  lienzo.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pendiente = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerleave', () => { pendiente = null; if (sobre) { sobre = null; lienzo.style.cursor = ''; refrescarFicha(); } });
  lienzo.addEventListener('pointerdown', (e) => { abajo = [e.clientX, e.clientY]; });
  lienzo.addEventListener('pointerup', (e) => {
    if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 6) return;
    const id = agenteEn(e.clientX, e.clientY);
    fijado = id && id !== fijado ? id : null;
    refrescarFicha();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fijado) { fijado = null; refrescarFicha(); }
  });

  /* ── Chat (eventos de oficina-viva.js) ── */
  document.addEventListener('oficina:consulta', () => {
    const c = agentes.get('coordinador');
    const dormia = c.estado === 'durmiendo';
    chatOcupado = true;
    c.enChat = true;
    reservar(c);
    aplicarEstados();
    volar(c, asientoMesa(0)).then(() => { if (chatOcupado) decir(c, dormia ? '🥱 ¡Me despertaron! Pensando…' : '💭 Pensando…', 20000, true); });
  });
  // Vuelve a su escritorio y recién ahí deja el chat (si es de noche, se duerme).
  const terminar = (a) => liberar(a).then(() => {
    if (a.reservas) return;
    a.enChat = false;
    aplicarEstados();
  });

  document.addEventListener('oficina:respuesta', async (e) => {
    const { agentes: ids = [], anoto = false, ok = true, motivo } = e.detail || {};
    const c = agentes.get('coordinador');
    chatOcupado = false;
    if (!ok) {
      decir(c, motivo === 'codigo' ? '🔒 Necesito el código del equipo' : '😵 No pude responder, probá de nuevo', 3500, true);
      terminar(c);
      return;
    }
    if (anoto) {
      await volar(c, new T.Vector3(PIZARRA[0] + 1.3, PISO_Y + 2.2, PIZARRA[1]));
      decir(c, '📝 ¡Anotado por 7 días!', 3500, true);
      await espera(3800);
      terminar(c);
      return;
    }
    const ayudantes = ids.filter((id) => id !== 'coordinador').map((id) => agentes.get(id)).filter(Boolean);
    ayudantes.forEach((a) => { a.enChat = true; reservar(a); });
    aplicarEstados();
    await Promise.all(ayudantes.map((a, i) => volar(a, asientoMesa(i + 1))));
    decir(c, ayudantes.length ? '💡 ¡Ya está! Gracias, equipo' : '💡 ¡Ya está!', 3000, true);
    await espera(4000);
    [c, ...ayudantes].forEach(terminar);
  });

  /* ── Tamaño, cámara y visibilidad ── */
  let ancho = 1;
  let alto = 1;
  function ajustar() {
    ancho = Math.max(1, escena.clientWidth);
    alto = Math.max(1, escena.clientHeight);
    renderer.setSize(ancho, alto);
    Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: alto / 2, bottom: -alto / 2 });
    // La maqueta proyectada mide ≈ 31 u × 22,5 u (se recortan las puntas vacías del zócalo).
    // En pantallas angostas se recorta más (≈ 22 u × 17 u): entran todos los agentes y se ven más grandes.
    const angosta = ancho < 600;
    camara.zoom = angosta ? Math.max(6, Math.min(ancho / 22, alto / 17)) : Math.max(6, Math.min(ancho / 31, alto / 22.5));
    // En angosto, la vista sube un poco (sobre el eje "arriba" de la cámara) para que entre Selección.
    const centro = new T.Vector3(-1, 2, -1).normalize().multiplyScalar(angosta ? 1.2 : 0);
    camara.position.set(30, 30, 30).add(centro);
    camara.lookAt(centro);
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(escena);
  ajustar();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(escena);

  /* ── Loop ── */
  const v = new T.Vector3();
  const proyectar = (pos) => {
    v.copy(pos).project(camara);
    return [((v.x + 1) / 2) * ancho, ((1 - v.y) / 2) * alto];
  };
  function posicionarOverlays() {
    anclas.forEach((x) => {
      const [px, py] = proyectar(typeof x.pos === 'function' ? x.pos() : x.pos);
      x.el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) ${x.ajuste}`;
    });
    const id = fijado || sobre;
    if (id && !ficha.hidden) {
      const a = agentes.get(id);
      const [px, py] = proyectar(a.pos.clone().add(new T.Vector3(0, 1.3, 0)));
      const w = ficha.offsetWidth;
      const h = ficha.offsetHeight;
      const abajoDelBot = py - h - 14 < 0;
      const x = Math.min(Math.max(px - w / 2, 8), ancho - w - 8);
      const y = abajoDelBot ? proyectar(a.pos.clone().add(new T.Vector3(0, -1.0, 0)))[1] + 12 : py - h - 14;
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
      const id = agenteEn(pendiente[0], pendiente[1]);
      pendiente = null;
      if (id !== sobre) {
        sobre = id;
        lienzo.style.cursor = id ? 'pointer' : '';
        refrescarFicha();
      }
    }

    agentes.forEach((a) => {
      if (a.vuelo) {
        const k = Math.min(1, (ahora - a.vuelo.t0) / a.vuelo.dur);
        a.pos.lerpVectors(a.vuelo.desde, a.vuelo.hasta, suave(k));
        a.pos.y += Math.sin(Math.PI * k) * 1.1;
        if (k >= 1) {
          const res = a.vuelo.res;
          a.vuelo = null;
          res();
        }
      }
      // Dormido: baja hasta el escritorio, cabecea, cierra los ojos y respira lento.
      a.sueno = T.MathUtils.damp(a.sueno, a.estado === 'durmiendo' ? 1 : 0, 2.5, dt);
      const quieto = a.sueno > 0.5;
      const amp = reduce ? 0.02 : 0.13 * (1 - 0.85 * a.sueno);
      const bob = Math.sin(t * (1.7 - 1.1 * a.sueno) + a.fase) * amp;
      a.bot.raiz.position.set(a.pos.x, a.pos.y + bob - 0.32 * a.sueno, a.pos.z);
      a.bot.flota.rotation.y = reduce ? 0 : Math.sin(t * 0.6 + a.fase) * 0.28 * (1 - a.sueno);
      a.bot.flota.rotation.z = (a.pos.distanceToSquared(a.cama) < 0.1 ? 0.42 : 0.24) * a.sueno; // en la cama se recuesta más
      const desde = ahora - a.salto;
      const salto = !reduce && desde < 0.9 ? Math.abs(Math.sin((desde / 0.9) * Math.PI * 2)) * 0.5 : 0;
      a.bot.flota.position.y = salto;
      const objetivo = (fijado === a.id || sobre === a.id ? 1.12 : 1);
      a.bot.flota.scale.setScalar(T.MathUtils.damp(a.bot.flota.scale.x, objetivo, 12, dt));
      a.bot.ojos.scale.y = quieto ? 0.12 : (t + a.fase) % 4 < 0.12 ? 0.15 : 1;
      if (!reduce && !quieto) a.bot.anillo.rotation.z += dt * (a.estado === 'trabajando' ? 2.4 : 0.6);
      a.bot.puntaMat.emissiveIntensity = a.estado === 'trabajando' ? 0.7 + 0.6 * Math.abs(Math.sin(t * 4 + a.fase)) : quieto ? 0.05 : 0.9;
    });

    leds.forEach((l) => { l.mat.emissiveIntensity = reduce || Math.sin(t * l.vel + l.fase) > 0.15 ? 1.1 : 0.12; });

    renderer.render(mundo, camara);
    posicionarOverlays();
  }

  /* ── Arranque ── */
  aplicarEstados();
  await Promise.all([leerAgentes(), leerBitacora(true)]);
  setInterval(() => leerBitacora(false), 30000);
  setInterval(aplicarEstados, 30000);
  requestAnimationFrame(loop);
  window.__oficina3d = 'ok';
}
