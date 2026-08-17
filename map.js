// map.js — mapa de locales/zonales (panel de Kevin, equipo completo).
//
// Geocodifica las direcciones de window.LOCALES_DATA con Nominatim
// (OpenStreetMap, gratis, sin API key) la primera vez que se abre el panel
// en cada navegador, y cachea el resultado en localStorage para que las
// visitas siguientes carguen el mapa al instante. Nominatim pide máximo
// 1 solicitud por segundo, por eso el primer armado del mapa tarda unos
// minutos (con las ~190 direcciones únicas de la planilla, ~4 minutos);
// después queda guardado en el navegador y no se vuelve a pedir.
//
// Solo corre en el panel sin filtrar (sin ?miembro=), que es el que ve
// Kevin como coordinador — en las vistas de cada integrante la sección
// del mapa queda oculta.
(() => {
  const section = document.getElementById('mapaLocalesCard');
  if (!section) return;

  const member = new URLSearchParams(location.search).get('miembro');
  if (member) { section.style.display = 'none'; return; }

  const DATA = window.LOCALES_DATA || [];
  if (!DATA.length || typeof L === 'undefined') return;

  // v2: la v1 geocodificaba con solo ", Argentina" (sin provincia/ciudad), lo que
  // hacía que calles con nombre común (San Martín, Rivadavia...) pudieran matchear
  // en cualquier provincia del país. Se cambia la clave para forzar un re-geocodeo
  // con la región correcta en los navegadores que ya tenían la v1 cacheada.
  const CACHE_KEY = 'tortuguitas_geocode_cache_v2';
  const MARCA_COLOR = { Sabores: '#4c7cf0', Extremas: '#a9c4f7' };
  const MARCA_LABEL = { Sabores: 'Sabores Express', Extremas: 'Hamburguesas Extremas' };
  const GEOCODE_DELAY_MS = 1100; // Nominatim: máx. 1 solicitud/seg

  // Casi todos los locales son de Ciudad/Provincia de Buenos Aires, salvo un
  // puñado en Rosario, Mar del Plata ("Mdq") y La Plata (identificables por el
  // nombre del local). Sin esta región, direcciones con nombre de calle común
  // (San Martín, Rivadavia, Córdoba...) pueden matchear en cualquier provincia.
  // viewbox = izquierda,arriba,derecha,abajo (lon,lat) — solo como preferencia
  // (sin bounded=1), para no descartar resultados válidos justo en el borde.
  const REGIONES = [
    { test: /\brosario\b/i, region: 'Rosario, Santa Fe, Argentina', viewbox: '-60.75,-32.85,-60.55,-33.05' },
    { test: /mar del plata|\bmdq\b/i, region: 'Mar del Plata, Buenos Aires, Argentina', viewbox: '-57.65,-37.90,-57.50,-38.10' },
    { test: /\bla plata\b/i, region: 'La Plata, Buenos Aires, Argentina', viewbox: '-57.98,-34.85,-57.85,-35.00' },
  ];
  const REGION_DEFAULT = { region: 'Buenos Aires, Argentina', viewbox: '-59.30,-34.20,-57.90,-35.30' };
  function regionFor(item) {
    const texto = `${item.local} ${item.direccion}`;
    const match = REGIONES.find(r => r.test.test(texto));
    return match || REGION_DEFAULT;
  }

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* localStorage no disponible */ }
  }

  const statusEl = document.getElementById('mapaLocalesStatus');
  const countEl = document.getElementById('mapaLocalesCount');
  const failEl = document.getElementById('mapaLocalesFallidos');

  const map = L.map('mapaLocales', { scrollWheelZoom: false }).setView([-34.62, -58.55], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = Object.keys(MARCA_LABEL).map(k =>
      `<span><span class="dot" style="background:${MARCA_COLOR[k]}"></span>${MARCA_LABEL[k]}</span>`
    ).join('');
    return div;
  };
  legend.addTo(map);

  const bounds = [];
  let ubicados = 0;
  const fallidos = [];

  function addMarker(item, lat, lon) {
    const color = MARCA_COLOR[item.marca] || '#8a94a6';
    L.circleMarker([lat, lon], {
      radius: 7, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.9,
    })
      .addTo(map)
      .bindPopup(`<strong>${item.local}</strong><br>${MARCA_LABEL[item.marca] || item.marca}<br>${item.direccion}`);
    bounds.push([lat, lon]);
    ubicados++;
    updateCount();
  }

  function updateCount() {
    countEl.textContent = `${ubicados}/${DATA.length} locales ubicados en el mapa`;
    if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  }

  function renderFallidos() {
    if (!fallidos.length) { failEl.style.display = 'none'; return; }
    failEl.style.display = 'block';
    failEl.innerHTML = `<strong>${fallidos.length} direcciones no se pudieron ubicar:</strong> ` +
      fallidos.map(f => `${f.local} (${f.direccion})`).join(' · ');
  }

  // Direcciones repetidas (mismo texto) comparten resultado de geocodificación.
  const cache = loadCache();
  const pending = [];
  const seenPending = new Set();
  DATA.forEach(item => {
    const key = item.direccion;
    const cached = cache[key];
    if (cached) {
      if (cached.lat != null) addMarker(item, cached.lat, cached.lon);
      else fallidos.push(item);
    } else if (!seenPending.has(key)) {
      seenPending.add(key);
      pending.push(item);
    }
  });
  renderFallidos();

  if (!pending.length) {
    statusEl.style.display = 'none';
    return;
  }

  statusEl.style.display = 'block';
  let i = 0;
  function geocodeNext() {
    if (i >= pending.length) {
      statusEl.style.display = 'none';
      renderFallidos();
      return;
    }
    const item = pending[i];
    statusEl.textContent =
      `Ubicando direcciones en el mapa… ${i + 1}/${pending.length} (se hace una sola vez; después queda guardado en este navegador)`;
    const { region, viewbox } = regionFor(item);
    const q = encodeURIComponent(`${item.direccion}, ${region}`);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&viewbox=${viewbox}&q=${q}`)
      .then(r => r.ok ? r.json() : [])
      .then(results => {
        const sameAddr = DATA.filter(d => d.direccion === item.direccion);
        if (results && results[0]) {
          const lat = parseFloat(results[0].lat), lon = parseFloat(results[0].lon);
          cache[item.direccion] = { lat, lon };
          sameAddr.forEach(d => addMarker(d, lat, lon));
        } else {
          cache[item.direccion] = { lat: null, lon: null };
          fallidos.push(...sameAddr);
        }
      })
      .catch(() => {
        cache[item.direccion] = { lat: null, lon: null };
        fallidos.push(...DATA.filter(d => d.direccion === item.direccion));
      })
      .finally(() => {
        i++;
        saveCache(cache); // progresivo: si se recarga a mitad de camino, no repite lo ya geocodificado
        setTimeout(geocodeNext, GEOCODE_DELAY_MS);
      });
  }
  geocodeNext();
})();
