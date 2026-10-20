// cementerio.js — minijuego "Bajar al cementerio" de la azotea (personajes.js).
// Un cementerio de noche con niebla, tumbas, árboles secos, rejas y un
// mausoleo. De las tumbas salen los fantasmas de los que ya no están en el
// equipo (los selectores de "Otros"), con su nombre y sus frases, y te
// persiguen: hay que aguantar DURACION segundos sin que te alcancen, o te
// quedás con ellos. personajes.js mueve al personaje, la cámara y la
// pantalla; acá van la escena, los fantasmas y el reloj.
export const DURACION = 60;
export const FANTASMAS = [
  { nombre: 'Araceli', color: '#e05d8a' },
  { nombre: 'Mariano', color: '#7b6cf0' },
  { nombre: 'Alexis', color: '#e8c53a' },
  { nombre: 'Luana', color: '#5fd4b0' },
  { nombre: 'Facundo', color: '#3fbf6f' },
  { nombre: 'Emiliano', color: '#2ec4e6' },
  { nombre: 'Giselle', color: '#f2994a' },
  { nombre: 'Agustin Monte', color: '#3a8fd9' },
  { nombre: 'Balbina', color: '#d14fc4' },
];
export const FRASES = [
  'Vamos a OP', 'Abrimos una cafetería', 'Champio li', 'Yo siempre llegaba al 100%', 'Yo en Mostaza...',
  'Estoy cansado', 'Caminamos en el infierno y no salimos', 'El equipo me maltrataba', 'Me olvidé el paraguas', 'Hoy tenemos ONB',
];
export const BORDE = 13; // el jugador camina entre -BORDE y BORDE
const ATRAPA = 0.72; // distancia a la que te agarra un fantasma

const suave = (k) => k * k * (3 - 2 * k);
const azar = (a, b) => a + Math.random() * (b - a);

/**
 * armarCementerio(h): h trae three.js y los ayudantes de personajes.js
 * ({ T, malla, caja, cil, esfera, rot, grupo, fantasma, animarCuerpo, capa }).
 * Devuelve { escena, obstaculos, salida, reiniciar, animar, etiquetas, decir, callar }.
 */
export function armarCementerio(h) {
  const { T, malla, caja, cil, esfera, rot, grupo, capa } = h;
  const escena = new T.Scene();
  escena.background = new T.Color('#070b16');
  escena.fog = new T.FogExp2('#0b1324', 0.04);
  const obstaculos = [];
  const salida = { x: 0, z: BORDE - 1.6 }; // por donde se entra (abajo, cerca de la cámara)

  /* ── Luz ── */
  escena.add(new T.AmbientLight('#7c8fc4', 0.55));
  escena.add(new T.HemisphereLight('#8aa0dc', '#16201a', 0.7));
  const luna = new T.DirectionalLight('#d6e2ff', 1.25);
  luna.position.set(12, 20, -14);
  luna.castShadow = true;
  luna.shadow.mapSize.set(1024, 1024);
  luna.shadow.bias = -0.0005;
  luna.shadow.normalBias = 0.03;
  Object.assign(luna.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
  escena.add(luna);
  const linterna = new T.PointLight('#ffd9a8', 9, 7, 2); // sigue al jugador
  escena.add(linterna);

  /* ── Piso, camino y niebla ── */
  const piso = malla(new T.PlaneGeometry(60, 60), '#1b2820', 0, 0, 0, false);
  piso.rotation.x = -Math.PI / 2;
  escena.add(piso);
  for (let z = BORDE; z > -9; z -= 1.15) {
    escena.add(rot(caja(azar(1.3, 1.6), 0.05, 0.9, '#3a3f4b', azar(-0.12, 0.12), 0.025, z, 0.02), 0, azar(-0.15, 0.15)));
  }
  const niebla = document.createElement('canvas');
  niebla.width = niebla.height = 128;
  const nc = niebla.getContext('2d');
  const grad = nc.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(190,215,235,.55)');
  grad.addColorStop(1, 'rgba(190,215,235,0)');
  nc.fillStyle = grad;
  nc.fillRect(0, 0, 128, 128);
  const nieblaMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(niebla), transparent: true, opacity: 0.32, depthWrite: false });
  const nubes = [];
  for (let i = 0; i < 9; i++) {
    const n = malla(new T.PlaneGeometry(9, 9), nieblaMat, azar(-12, 12), 0.25 + i * 0.03, azar(-12, 12), false);
    n.rotation.x = -Math.PI / 2;
    n.userData.v = azar(0.15, 0.35) * (i % 2 ? 1 : -1);
    escena.add(n);
    nubes.push(n);
  }

  /* ── Luna ── */
  const lunaMat = new T.MeshBasicMaterial({ color: '#eef3ff', fog: false });
  escena.add(esfera(4, lunaMat, -30, 26, -48, 24));
  const halo = document.createElement('canvas');
  halo.width = halo.height = 128;
  const hc = halo.getContext('2d');
  const hg = hc.createRadialGradient(64, 64, 10, 64, 64, 64);
  hg.addColorStop(0, 'rgba(200,220,255,.5)');
  hg.addColorStop(1, 'rgba(200,220,255,0)');
  hc.fillStyle = hg;
  hc.fillRect(0, 0, 128, 128);
  const brillo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(halo), transparent: true, depthWrite: false, fog: false }));
  brillo.position.set(-30, 26, -48.5);
  brillo.scale.setScalar(26);
  escena.add(brillo);

  /* ── Rejas al fondo y a los costados (adelante no: taparían la cámara) ── */
  const L = BORDE + 1;
  const barras = [];
  for (let a = -L; a <= L; a += 0.5) barras.push([a, -L], [-L, a], [L, a]);
  const hierro = new T.MeshStandardMaterial({ color: '#2a2d36', roughness: 0.6, metalness: 0.4 });
  const barra = new T.InstancedMesh(new T.CylinderGeometry(0.03, 0.03, 1.5, 6), hierro, barras.length);
  const punta = new T.InstancedMesh(new T.ConeGeometry(0.06, 0.18, 6), hierro, barras.length);
  const m4 = new T.Matrix4();
  barras.forEach(([x, z], i) => {
    barra.setMatrixAt(i, m4.makeTranslation(x, 0.75, z));
    punta.setMatrixAt(i, m4.makeTranslation(x, 1.58, z));
  });
  escena.add(barra, punta);
  for (const y of [0.35, 1.3]) {
    escena.add(caja(2 * L, 0.05, 0.05, hierro, 0, y, -L, 0.01));
    for (const s of [-1, 1]) escena.add(caja(0.05, 0.05, 2 * L, hierro, s * L, y, 0, 0.01));
  }
  const cartel = document.createElement('canvas');
  cartel.width = 512;
  cartel.height = 96;
  const cc = cartel.getContext('2d');
  cc.fillStyle = '#20232c';
  cc.fillRect(0, 0, 512, 96);
  cc.strokeStyle = '#8b8f9c';
  cc.lineWidth = 6;
  cc.strokeRect(5, 5, 502, 86);
  cc.fillStyle = '#c9d6c2';
  cc.font = '700 54px Georgia, serif';
  cc.textAlign = 'center';
  cc.textBaseline = 'middle';
  cc.fillText('CEMENTERIO', 256, 52);
  const cartelTex = new T.CanvasTexture(cartel);
  cartelTex.colorSpace = T.SRGBColorSpace;

  /* ── Mausoleo al fondo, con el cartel ── */
  const piedra = '#5a5e6c';
  const mausoleo = grupo(0, 0, -BORDE + 2.2);
  mausoleo.add(caja(4.6, 0.3, 3.4, '#474b58', 0, 0.15, 0, 0.04));
  mausoleo.add(caja(4, 3, 3, piedra, 0, 1.8, -0.1, 0.05));
  const techo = rot(malla(new T.ConeGeometry(3.4, 1.6, 4), '#3f4250', 0, 4.1, -0.1), 0, Math.PI / 4);
  techo.scale.set(1, 1, 0.75);
  mausoleo.add(techo);
  mausoleo.add(caja(1.3, 2.1, 0.1, '#14161d', 0, 1.35, 1.42, 0.02));
  mausoleo.add(malla(new T.PlaneGeometry(2.5, 0.47), new T.MeshStandardMaterial({ map: cartelTex }), 0, 2.85, 1.42, false));
  for (const s of [-1, 1]) mausoleo.add(cil(0.2, 0.22, 3, '#6a6e7c', 1.55 * s, 1.8, 1.55, 14));
  mausoleo.add(cil(0.04, 0.04, 0.9, '#9aa0ad', 0, 3.6, 1.6, 6));
  mausoleo.add(caja(0.5, 0.06, 0.06, '#9aa0ad', 0, 3.75, 1.6, 0.01));
  escena.add(mausoleo);
  for (const x of [-1.6, 0, 1.6]) obstaculos.push({ x, z: -BORDE + 2.2, r: 1.5 });

  /* ── Faroles verdes ── */
  const verde = new T.MeshStandardMaterial({ color: '#5dff9a', emissive: '#5dff9a', emissiveIntensity: 2 });
  for (const [x, z] of [[-3, -9.2], [3, -9.2], [-2.2, 9.5], [2.2, 9.5]]) {
    escena.add(cil(0.06, 0.08, 1.8, '#2a2d36', x, 0.9, z, 8));
    escena.add(caja(0.3, 0.36, 0.3, verde, x, 1.95, z, 0.04));
    const l = new T.PointLight('#5dff9a', 5, 7, 2);
    l.position.set(x, 2, z);
    escena.add(l);
    obstaculos.push({ x, z, r: 0.2 });
  }

  /* ── Árboles secos ── */
  const corteza = '#2e2620';
  for (const [x, z, s] of [[-10, -6, 1.1], [10.5, -2, 1.3], [-9.5, 7.5, 1.2], [9, 9, 1], [-4.5, -1.5, 0.9], [5.5, 3.5, 1]]) {
    const g = grupo(x, 0, z);
    g.add(cil(0.12 * s, 0.22 * s, 2.6 * s, corteza, 0, 1.3 * s, 0, 8));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + azar(0, 0.6);
      const rama = cil(0.03 * s, 0.07 * s, 1.3 * s, corteza, Math.sin(a) * 0.45 * s, (1.9 + i * 0.22) * s, Math.cos(a) * 0.45 * s, 6);
      rama.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
      g.add(rama);
    }
    escena.add(g);
    obstaculos.push({ x, z, r: 0.35 * s });
  }

  /* ── Tumbas: las de los fantasmas tienen su nombre ── */
  const lapidaTex = (nombre) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#767b88';
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#5f6370';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 128, Math.random() * 160, 3, 3);
    g.fillStyle = '#2d3039';
    g.textAlign = 'center';
    g.font = '700 26px Georgia, serif';
    g.fillText('R.I.P.', 64, 52);
    const partes = nombre.split(' ');
    g.font = `700 ${partes.some((p) => p.length > 7) ? 19 : 22}px Georgia, serif`;
    partes.forEach((p, i) => g.fillText(p, 64, 92 + i * 24));
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  };
  const gris = new T.MeshStandardMaterial({ color: '#767b88', roughness: 0.9 });
  function lapida(x, z, tipo, nombre) {
    const g = grupo(x, 0, z);
    g.rotation.y = azar(-0.12, 0.12);
    if (tipo === 'cruz') {
      g.add(caja(0.16, 1.1, 0.14, gris, 0, 0.55, 0, 0.02));
      g.add(caja(0.6, 0.15, 0.14, gris, 0, 0.78, 0, 0.02));
    } else {
      g.add(caja(0.8, 0.8, 0.2, gris, 0, 0.4, 0, 0.03));
      g.add(rot(cil(0.4, 0.4, 0.2, gris, 0, 0.8, 0, 20), Math.PI / 2));
      if (nombre) {
        const frente = malla(new T.PlaneGeometry(0.66, 0.82), new T.MeshStandardMaterial({ map: lapidaTex(nombre), roughness: 0.9 }), 0, 0.62, 0.105, false);
        g.add(frente);
      }
    }
    g.add(caja(0.9, 0.08, 0.4, '#5d6170', 0, 0.04, 0.05, 0.02));
    if (nombre) { // tierra removida adelante: de ahí sale
      const tierra = esfera(0.6, '#2f2418', 0, 0, 0.85, 14);
      tierra.scale.set(0.9, 0.18, 1.1);
      g.add(tierra);
    }
    g.rotation.x = tipo === 'vieja' ? -0.12 : 0;
    escena.add(g);
    obstaculos.push({ x, z, r: 0.42 });
    return g;
  }
  const tumbas = [];
  const lugaresNombre = [[-7.8, -6], [-2.6, -6], [5.2, -6], [-10.4, 0.5], [-5.2, 0.5], [7.8, 0.5], [-7.8, 5.5], [2.6, 5.5], [10.4, 5.5]];
  FANTASMAS.forEach((f, i) => {
    const [x, z] = lugaresNombre[i];
    lapida(x, z, 'nombre', f.nombre);
    tumbas.push({ x, z: z + 0.95 });
  });
  for (const z of [-6, -3, 0.5, 3, 5.5, 8.5]) {
    for (let x = -10.4; x <= 10.5; x += 2.6) {
      if (Math.abs(x) < 1.5) continue; // el camino del medio queda libre
      if (lugaresNombre.some(([a, b]) => Math.abs(a - x) < 0.5 && Math.abs(b - z) < 0.5)) continue;
      if (Math.random() < 0.35) continue;
      if (obstaculos.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1)) continue;
      lapida(x + azar(-0.3, 0.3), z + azar(-0.2, 0.2), ['cruz', 'vieja', 'comun'][Math.floor(Math.random() * 3)]);
    }
  }

  /* ── Fantasmas ── */
  const fantasmas = FANTASMAS.map((f, i) => {
    const Q = h.fantasma({ color: f.color });
    Q.raiz.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.contorno; });
    Q.raiz.visible = false;
    escena.add(Q.raiz);
    const el = document.createElement('div');
    el.className = 'pj-cem-nombre';
    el.innerHTML = `<i style="background:${f.color}"></i>${f.nombre}`;
    el.hidden = true;
    capa.appendChild(el);
    const globo = document.createElement('div');
    globo.className = 'pj-globo pj-cem-globo';
    globo.hidden = true;
    capa.appendChild(globo);
    return { ...f, Q, el, globo, tumba: tumbas[i], x: 0, z: 0, y: -2, yaw: 0, estado: 'dormido', k: 0, despierta: 0, dash: 0, recarga: 0, hasta: 0, vx: 0, vz: 0 };
  });
  let proximaFrase = 0;

  // Todos a su tumba; se levantan de a uno (orden al azar).
  function reiniciar() {
    const orden = [...fantasmas].sort(() => Math.random() - 0.5);
    orden.forEach((f, i) => {
      f.estado = 'dormido';
      f.despierta = 0.6 + i * 1.6;
      f.x = f.tumba.x;
      f.z = f.tumba.z;
      f.y = -2;
      f.k = 0;
      f.dash = f.recarga = 0;
      f.hasta = 0;
      f.vx = f.vz = 0;
      f.yaw = Math.random() * Math.PI * 2;
      f.Q.raiz.visible = false;
      f.el.hidden = f.globo.hidden = true;
    });
    proximaFrase = 2.5;
  }

  /**
   * Un cuadro. tiempo: segundos corridos desde el "¡Corré!" (null = todavía
   * no empezó o ya terminó: se quedan donde están). Devuelve el fantasma que
   * te agarró, o null.
   */
  function animar(t, dt, jugador, tiempo) {
    linterna.position.set(jugador.x, 2.6, jugador.z + 1.2);
    for (const n of nubes) {
      n.position.x += n.userData.v * dt;
      if (n.position.x > 16) n.position.x = -16;
      if (n.position.x < -16) n.position.x = 16;
    }
    const corre = tiempo !== null;
    const ritmo = corre ? Math.min(1, tiempo / DURACION) : 0;
    let atrapo = null;
    for (const f of fantasmas) {
      if (f.estado === 'dormido') {
        if (corre && tiempo >= f.despierta) { f.estado = 'sube'; f.k = 0; f.Q.raiz.visible = true; f.el.hidden = false; }
      } else if (f.estado === 'sube') {
        f.k = Math.min(1, f.k + dt / 1.3);
        f.y = -2 + 2 * suave(f.k);
        if (f.k >= 1) f.estado = 'caza';
      } else if (corre) {
        // Te persiguen cada vez más rápido (siempre un poco menos que vos) y,
        // de cerca, cada tanto pegan un envión.
        const dx = jugador.x - f.x, dz = jugador.z - f.z;
        const d = Math.hypot(dx, dz) || 1;
        f.recarga = Math.max(0, f.recarga - dt);
        if (d < 3.2 && !f.recarga) { f.dash = 0.45; f.recarga = azar(3, 4.5); }
        f.dash = Math.max(0, f.dash - dt);
        const vel = (1.9 + 1.9 * ritmo) * (f.dash ? 1.75 : 1);
        let ax = dx / d, az = dz / d;
        for (const o of fantasmas) { // que no se amontonen
          if (o === f || o.estado === 'dormido') continue;
          const sx = f.x - o.x, sz = f.z - o.z;
          const s = Math.hypot(sx, sz);
          if (s < 1.3 && s > 0.001) { ax += (sx / s) * (1.3 - s) * 1.4; az += (sz / s) * (1.3 - s) * 1.4; }
        }
        const l = Math.hypot(ax, az) || 1;
        const fv = 1 - Math.exp(-dt * 4); // giran con algo de inercia
        f.vx += ((ax / l) * vel - f.vx) * fv;
        f.vz += ((az / l) * vel - f.vz) * fv;
        f.x = Math.max(-BORDE - 0.5, Math.min(BORDE + 0.5, f.x + f.vx * dt));
        f.z = Math.max(-BORDE - 0.5, Math.min(BORDE + 0.5, f.z + f.vz * dt));
        f.yaw = Math.atan2(f.vx, f.vz);
        if (!atrapo && Math.hypot(jugador.x - f.x, jugador.z - f.z) < ATRAPA) atrapo = f;
      }
      if (f.estado === 'dormido') continue;
      h.animarCuerpo(f.Q, t, dt, false);
      f.Q.raiz.position.set(f.x, f.y, f.z);
      f.Q.raiz.rotation.y += (Math.atan2(Math.sin(f.yaw - f.Q.raiz.rotation.y), Math.cos(f.yaw - f.Q.raiz.rotation.y))) * (1 - Math.exp(-dt * 8));
      if (f.hasta && t > f.hasta) { f.globo.hidden = true; f.hasta = 0; }
    }
    // Frases: uno a la vez, de los que andan cerca.
    if (corre && tiempo > proximaFrase) {
      const cerca = fantasmas.filter((f) => f.estado === 'caza' && !f.hasta && Math.hypot(jugador.x - f.x, jugador.z - f.z) < 11);
      if (cerca.length) {
        const f = cerca[Math.floor(Math.random() * cerca.length)];
        decir(f, FRASES[Math.floor(Math.random() * FRASES.length)], t);
      }
      proximaFrase = tiempo + azar(1.6, 2.8);
    }
    return atrapo;
  }
  function decir(f, texto, t, seg = 2.8) {
    f.globo.textContent = texto;
    f.globo.hidden = false;
    f.globo.style.animation = 'none';
    void f.globo.offsetWidth;
    f.globo.style.animation = '';
    f.hasta = t + seg;
  }
  function callar() { for (const f of fantasmas) { f.globo.hidden = true; f.hasta = 0; } }

  // Carteles con el nombre y globitos, proyectados sobre la pantalla.
  const v = new T.Vector3();
  function etiquetas(camara, r) {
    for (const f of fantasmas) {
      for (const [el, alto] of [[f.el, 1.85], [f.globo, 2.35]]) {
        if (el.hidden) continue;
        v.set(f.x, f.y + alto, f.z).project(camara);
        const fuera = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
        el.style.visibility = fuera ? 'hidden' : '';
        if (fuera) continue;
        const x = ((v.x + 1) / 2) * r.width;
        const y = Math.max(el.offsetHeight + 4, ((1 - v.y) / 2) * r.height);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
  }

  return { escena, obstaculos, salida, reiniciar, animar, etiquetas, decir, callar };
}
