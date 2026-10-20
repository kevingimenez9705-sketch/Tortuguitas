// mapa3d.js — el mapa de zonas del dashboard en 3D, para la terminal de la
// azotea (personajes.js, sección "Mapa de zonas"). Cada zona (zonas.js) es
// una placa con el mismo calor del dashboard: más altas = más alta y más
// roja. Y cuanto más altas, más caos: edificios que tiemblan, fuego y humo,
// sirenas que corren, un resplandor rojo que parpadea. Las zonas tranquilas
// quedan con arbolitos. Gira sola despacio y se puede girar arrastrando.
// Usa su propio renderer (un canvas dentro del panel) y solo dibuja mientras
// se ve.
const CLARO = [0xfd, 0xe4, 0xe1]; // rosado pálido (menos altas)
const OSCURO = [0x7f, 0x1d, 0x1d]; // rojo intenso (más altas)
const ESCALA = 50; // unidades del SVG por unidad 3D

const azar = (a, b) => a + Math.random() * (b - a);
const fmt = new Intl.NumberFormat('es-AR');

function dentro([x, z], pts) {
  let si = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) si = !si;
  }
  return si;
}

export function crearMapa3D(T) {
  const { FORMAS, NOMBRES, ORDEN } = window.ZONAS;
  let renderer = null, escena = null, camara = null, raf = 0, el = null;
  let grupo = null;
  const animar = []; // funciones (t, dt) de cada zona
  const vista = { giro: 0.35, inclina: 0.95, arrastre: null, auto: true };

  function armar() {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    escena = new T.Scene();
    camara = new T.PerspectiveCamera(38, 1, 0.1, 100);
    escena.add(new T.AmbientLight('#b8c6ff', 0.5));
    escena.add(new T.HemisphereLight('#cfe0ff', '#2a1a22', 0.6));
    const sol = new T.DirectionalLight('#ffffff', 1.25);
    sol.position.set(-4, 10, 6);
    escena.add(sol);
    // Arrastrar para girar (sin que el panel cambie de sección).
    const c = renderer.domElement;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => { vista.arrastre = { x: e.clientX, y: e.clientY, giro: vista.giro, inclina: vista.inclina }; vista.auto = false; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!vista.arrastre) return;
      vista.giro = vista.arrastre.giro + (e.clientX - vista.arrastre.x) * 0.01;
      vista.inclina = Math.max(0.45, Math.min(1.35, vista.arrastre.inclina - (e.clientY - vista.arrastre.y) * 0.006));
    });
    const soltar = () => { vista.arrastre = null; };
    c.addEventListener('pointerup', soltar);
    c.addEventListener('pointercancel', soltar);
  }

  function etiqueta(texto, sub) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 110;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,14,30,.82)';
    g.strokeStyle = 'rgba(94,242,255,.7)';
    g.lineWidth = 3;
    g.beginPath();
    if (g.roundRect) g.roundRect(4, 4, 312, 102, 18);
    else g.rect(4, 4, 312, 102);
    g.fill();
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.font = '700 38px system-ui, sans-serif';
    g.fillText(texto, 160, 50);
    g.fillStyle = '#9fe9f5';
    g.font = '600 28px system-ui, sans-serif';
    g.fillText(sub, 160, 88);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(2.6, 0.9, 1);
    s.renderOrder = 10;
    return s;
  }

  function limpiar() {
    if (!grupo) return;
    escena.remove(grupo);
    grupo.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    grupo = null;
    animar.length = 0;
  }

  // counts: { norte, oeste, sur, capital } con las altas de cada zona.
  function construir(counts) {
    limpiar();
    grupo = new T.Group();
    escena.add(grupo);
    const vals = ORDEN.map((z) => counts[z] || 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    for (const z of ORDEN) {
      const n = counts[z] || 0;
      const t = max > min ? (n - min) / (max - min) : max > 0 ? 1 : 0;
      const pts = FORMAS[z].map(([x, y]) => [(x - 250) / ESCALA, (y - 240) / ESCALA]);
      const alto = 0.25 + 1.3 * t;
      const color = new T.Color(...CLARO.map((c, i) => (c + (OSCURO[i] - c) * t) / 255));
      // Placa de la zona: la forma del SVG levantada.
      const forma = new T.Shape(pts.map(([x, zz]) => new T.Vector2(x, -zz)));
      const geo = new T.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
      geo.rotateX(-Math.PI / 2);
      const placa = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.12 }));
      grupo.add(placa);
      // Bordes de holograma; en la zona más caliente, rojos y titilando.
      const bordeMat = new T.LineBasicMaterial({ color: t > 0.85 ? '#ff4d5e' : '#5ef2ff', transparent: true, opacity: 0.55 });
      const bordes = new T.LineSegments(new T.EdgesGeometry(geo, 30), bordeMat);
      grupo.add(bordes);
      // Centro aproximado (promedio de puntos adentro) y puntos al azar adentro.
      const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
      const caja = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      const alAzar = () => { for (let k = 0; k < 60; k++) { const p = [azar(caja[0], caja[1]), azar(caja[2], caja[3])]; if (dentro(p, pts)) return p; } return [(caja[0] + caja[1]) / 2, (caja[2] + caja[3]) / 2]; };
      const muestras = Array.from({ length: 40 }, alAzar);
      const centro = muestras.reduce((a, p) => [a[0] + p[0] / muestras.length, a[1] + p[1] / muestras.length], [0, 0]);
      const cartel = etiqueta(NOMBRES[z], `${fmt.format(n)} altas`);
      cartel.position.set(centro[0], alto + 1.15, centro[1]);
      grupo.add(cartel);

      // Edificios: más y más altos donde hay más altas; tiemblan con el caos.
      const cantidad = Math.round(3 + 22 * t);
      const edificios = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: '#232a42', emissive: '#ffb347', emissiveIntensity: 0.05 + 0.12 * t, roughness: 0.75 }), cantidad);
      const datos = [];
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
      for (let i = 0; i < cantidad; i++) {
        const [x, zz] = alAzar();
        datos.push({ x, z: zz, w: azar(0.14, 0.28), h: azar(0.2, 0.55) * (0.6 + 1.2 * t), ry: azar(0, Math.PI), fase: azar(0, 10) });
      }
      grupo.add(edificios);
      // Arbolitos en las zonas tranquilas.
      const arboles = Math.round(6 * (1 - t));
      for (let i = 0; i < arboles; i++) {
        const [x, zz] = alAzar();
        const a = new T.Mesh(new T.ConeGeometry(0.1, 0.32, 7), new T.MeshStandardMaterial({ color: '#4caf6a', roughness: 0.8 }));
        a.position.set(x, alto + 0.2, zz);
        grupo.add(a);
      }
      // Caos: fuego y humo que suben, sirenas que corren y un resplandor rojo.
      const chispas = Math.round(150 * t * t);
      let fuego = null, humo = null, fp = [], hp = [];
      if (chispas) {
        const mk = (n, color, tam, op, add) => {
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
          const p = new T.Points(g, new T.PointsMaterial({ color, size: tam, transparent: true, opacity: op, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending }));
          grupo.add(p);
          return p;
        };
        const nueva = () => { const d = datos[Math.floor(Math.random() * datos.length)]; return { x: d.x + azar(-0.08, 0.08), y: alto + d.h, z: d.z + azar(-0.08, 0.08), v: azar(0.5, 1.4), vida: azar(0, 1) }; };
        fuego = mk(chispas, '#ff7a2b', 0.11, 0.95, true);
        humo = mk(Math.round(chispas * 0.6), '#6b6f7d', 0.22, 0.4, false);
        fp = Array.from({ length: chispas }, nueva);
        hp = Array.from({ length: Math.round(chispas * 0.6) }, nueva);
        fp.nueva = hp.nueva = nueva;
      }
      const sirenas = [];
      for (let i = 0; i < Math.round(6 * t * t); i++) {
        const m = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), new T.MeshBasicMaterial({ color: '#ff2a3a' }));
        const [x, zz] = alAzar();
        m.position.set(x, alto + 0.08, zz);
        grupo.add(m);
        sirenas.push({ m, destino: alAzar(), fase: azar(0, 6) });
      }
      let brillo = null;
      if (t > 0.6) {
        brillo = new T.PointLight('#ff3b2f', 0, 5, 2);
        brillo.position.set(centro[0], alto + 1, centro[1]);
        grupo.add(brillo);
      }

      animar.push((tt, dt) => {
        // Edificios: en las zonas calientes tiemblan (y la placa también).
        const sacudon = t * t * t;
        for (let i = 0; i < cantidad; i++) {
          const d = datos[i];
          const temblor = sacudon * 0.035 * Math.sin(tt * 38 + d.fase);
          e.set(0, d.ry, sacudon * 0.12 * Math.sin(tt * 23 + d.fase));
          q.setFromEuler(e);
          v.set(d.x + temblor, alto + d.h / 2, d.z + sacudon * 0.03 * Math.cos(tt * 31 + d.fase));
          s.set(d.w, d.h, d.w);
          edificios.setMatrixAt(i, m4.compose(v, q, s));
        }
        edificios.instanceMatrix.needsUpdate = true;
        placa.position.y = bordes.position.y = sacudon * 0.025 * Math.sin(tt * 45);
        for (const [pts2, lista, vel] of [[fuego, fp, 1], [humo, hp, 0.45]]) {
          if (!pts2) continue;
          const arr = pts2.geometry.attributes.position;
          lista.forEach((p, i) => {
            p.vida += dt * p.v * vel;
            if (p.vida > 1) Object.assign(p, lista.nueva(), { vida: 0 });
            arr.setXYZ(i, p.x + Math.sin(tt * 3 + i) * 0.05 * p.vida, p.y + p.vida * (vel === 1 ? 0.7 : 1.4), p.z);
          });
          arr.needsUpdate = true;
        }
        for (const sr of sirenas) {
          const dx = sr.destino[0] - sr.m.position.x, dz = sr.destino[1] - sr.m.position.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.05) sr.destino = alAzar();
          else { sr.m.position.x += (dx / d) * dt * 1.6; sr.m.position.z += (dz / d) * dt * 1.6; }
          sr.m.material.color.set(Math.sin(tt * 14 + sr.fase) > 0 ? '#ff2a3a' : '#3a7bff');
        }
        if (brillo) brillo.intensity = (Math.random() < 0.08 ? 9 : 3 + Math.sin(tt * 9) * 1.5) * t;
        if (t > 0.85) bordeMat.opacity = 0.45 + 0.5 * Math.abs(Math.sin(tt * 6));
      });
    }
  }

  function medir() {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camara.aspect = r.width / r.height;
    camara.updateProjectionMatrix();
  }

  let ultimo = 0;
  let tam = '';
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const r = el.getBoundingClientRect();
    if (`${r.width}x${r.height}` !== tam) { tam = `${r.width}x${r.height}`; medir(); }
    const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000);
    ultimo = ahora;
    const tt = ahora / 1000;
    if (vista.auto) vista.giro = 0.35 + Math.sin(tt * 0.25) * 0.45;
    const lejos = camara.aspect < 1 ? 19 : 13;
    camara.position.set(Math.sin(vista.giro) * lejos * Math.cos(vista.inclina), Math.sin(vista.inclina) * lejos, Math.cos(vista.giro) * lejos * Math.cos(vista.inclina));
    camara.lookAt(0, 0.4, 0.2);
    for (const f of animar) f(tt, dt);
    renderer.render(escena, camara);
  }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    /** Muestra el mapa en el elemento `donde` con las altas por zona. */
    montar(donde, counts) {
      if (!renderer) armar();
      el = donde;
      el.replaceChildren(renderer.domElement);
      construir(counts);
      vista.auto = !reduce;
      tam = '';
      ultimo = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(cuadro);
    },
    desmontar() {
      cancelAnimationFrame(raf);
      raf = 0;
      el = null;
    },
  };
}
