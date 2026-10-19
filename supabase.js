// supabase.js — lectura de los datos que n8n copia desde las hojas de Drive.
// Usa la clave publicable: solo puede LEER las tablas equipo_* y la ficha de
// los agentes (sin datos personales de candidatos). n8n las reemplaza cada
// 30 minutos con el contenido de Tareas grupales y TAREAS GRUPALES
// (Solicitudes Sabores/Extremas).
window.SB = (() => {
  const BASE = 'https://gkotckcvookkbbtbctyp.supabase.co';
  const URL = BASE + '/rest/v1/';
  const KEY = 'sb_publishable_iu66s54UVbg5AsF-AoekPA_6qKUevVH';

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
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const primerNombre = (s) => norm(s).split(/\s+/)[0] || '';

  // BASE y KEY: también los usa sala.js para la sala multijugador (Realtime).
  return { pedir, hace, norm, primerNombre, BASE, KEY };
})();
