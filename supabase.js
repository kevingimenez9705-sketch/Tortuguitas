// supabase.js — lectura de los datos que n8n copia desde las hojas de Drive.
// Usa la clave publicable: solo puede LEER las tablas equipo_* y la ficha de
// los agentes (sin datos personales de candidatos). n8n las reemplaza cada
// 30 minutos con el contenido de Tareas grupales, TAREAS GRUPALES
// (Solicitudes Sabores/Extremas) y altas_anual.
window.SB = (() => {
  const URL = 'https://gkotckcvookkbbtbctyp.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_iu66s54UVbg5AsF-AoekPA_6qKUevVH';
  const PAGINA = 1000; // máximo de filas por pedido de la API

  async function pedir(path, body, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(URL + path, {
        method: body ? 'POST' : 'GET',
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  // Trae todas las filas de una tabla, de a PAGINA por pedido.
  async function todo(tabla, select, orden = 'id') {
    const filas = [];
    for (let offset = 0; ; offset += PAGINA) {
      const parte = await pedir(`${tabla}?select=${select}&order=${orden}&limit=${PAGINA}&offset=${offset}`);
      filas.push(...parte);
      if (parte.length < PAGINA) return filas;
    }
  }

  // "hace 5 min", "hace 2 h", "ayer"...
  function hace(iso) {
    if (!iso) return '';
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  }

  // Compara nombres sin tildes ni mayúsculas, por la primera palabra
  // ("Agustín Marquez" y "AGUSTIN" son la misma persona; "Agustina" no).
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const primerNombre = (s) => norm(s).split(/\s+/)[0] || '';

  return { pedir, todo, hace, norm, primerNombre };
})();
