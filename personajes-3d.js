// personajes-3d.js — los personajes del equipo en 3D (three.js, sin build):
// las tortugas con su bandana y su arma, Splinter (la rata), April y el
// fantasma ninja, con sombreado de dibujo animado y contorno. Los usan la
// azotea de personajes.js y los referentes de cada oficina de la Ruta (ruta-3d.js).
//
// crearPersonajes(T) recibe three.js ya cargado y devuelve PERSONAJES (un
// constructor por tipo: tortuga, rata, april, fantasma; reciben { color, arma })
// y los helpers de geometría que también usa la azotea. Cada constructor
// devuelve el esqueleto { raiz, torso, piernas, brazos, mano, flota }.
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(c) { return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function mezclar(h, t, con = '#ffffff') { const a = rgb(h), b = rgb(con); return hex(a.map((v, i) => v + (b[i] - v) * t)); }

export function crearPersonajes(T) {
  // Helpers de geometría (estilo "arcilla" mate, como ruta-3d.js).
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

  return { mate, brilla, malla, esfera, ovoide, caja, cil, anillo, rot, grupo, PERSONAJES };
}
