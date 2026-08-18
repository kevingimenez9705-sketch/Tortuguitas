// app.js — filtros de período y agregaciones sobre window.ALTAS_DATA
(() => {
  const DATA = window.ALTAS_DATA;

  // ---------- Filtro por miembro (?miembro=) ----------
  // Cada integrante del equipo mapea a uno o más "selector" de data.js.
  // selectors: [] => todavía no tiene altas cargadas a su nombre -> pantalla S/D.
  // "otros" agrupa a los selectores que no tienen tarjeta propia en el equipo
  // (Emiliano, Mariano, Facundo) más los registros sin selector asignado
  // ("Seleccion" en la planilla fuente).
  // color: mismo acento que su tarjeta en index.html, para que el header de su
  // dashboard se sienta "de esa persona" (el equipo sin filtrar usa KEVIN_COLOR).
  // avatar/tortuga: mismas fotos que usa index.html (avatar circular chico
  // y la foto "tortuga-*" grande) — se reusan acá como retrato del hero,
  // así el dashboard de cada uno se siente realmente "suyo" y no un molde
  // genérico con el nombre cambiado.
  const MEMBER_MAP = {
    agustin: { label: 'Agustín Márquez', selectors: ['Agustin'], color: '#5b2d78', avatar: 'images/agustin-marquez.jpg', tortuga: 'images/tortuga-agustin.jpg' },
    agustina: { label: 'Agustina Castillo', selectors: ['Agustina'], color: '#cc2f2f', avatar: 'images/agustina-castillo.jpg', tortuga: 'images/tortuga-agustina.jpg' },
    rafael: { label: 'Rafael Barberi', selectors: [], color: '#e2721f', avatar: 'images/rafael-barberi.jpg', tortuga: 'images/tortuga-rafael.jpg' },
    gustavo: { label: 'Gustavo Sotelo', selectors: [], color: '#4f8fc9', avatar: 'images/gustavo-sotelo.jpg', tortuga: 'images/tortuga-gustavo.jpg' },
    otros: { label: 'Otros', selectors: ['Emiliano', 'Mariano', 'Facundo', 'Seleccion'], color: '#a9714a', avatar: null, tortuga: null },
  };
  // Puesto de cada selector agrupado dentro de "Otros" (no tienen tarjeta
  // propia en index.html, pero sí un puesto real dentro del equipo): se usa
  // para armar los badges del hero de su dashboard (ver renderHeroBadges),
  // tomados con el mismo criterio que Agustín/Agustina en el organigrama.
  const OTROS_ROLES = {
    Emiliano: { label: 'Emiliano Pravato', puesto: 'Capacitador' },
    Mariano: { label: 'Mariano', puesto: 'Selector' },
    Facundo: { label: 'Facundo', puesto: 'Selector' },
    Seleccion: { label: 'Selección', puesto: 'Sin selector asignado' },
  };
  const KEVIN_COLOR = '#5c2430';
  // Panel sin filtrar (sin ?miembro=): también es "de alguien" — Kevin.
  const KEVIN = { label: 'Kevin García', color: KEVIN_COLOR, avatar: 'images/kevin-garcia.jpg', tortuga: 'images/tortuga-kevin.jpg' };

  const MIEMBRO_KEY = new URLSearchParams(location.search).get('miembro');
  const member = MIEMBRO_KEY ? MEMBER_MAP[MIEMBRO_KEY] : null;
  const memberSelectorSet = member ? new Set(member.selectors) : null;

  // Tematiza el header con el color de la persona (equipo completo = color de Kevin).
  function darken(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const g = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    return `rgb(${r},${g},${b})`;
  }
  function tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }
  (function themeHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const person = member || KEVIN;
    hero.style.background = `linear-gradient(135deg, ${person.color}, ${darken(person.color, 0.6)})`;
    if (person.tortuga) hero.style.setProperty('--tortuga-bg', `url('${person.tortuga}')`);
    const avatarEl = document.getElementById('heroAvatar');
    if (avatarEl && person.avatar) {
      avatarEl.src = person.avatar;
      avatarEl.alt = person.label;
    }
  })();

  // Paleta del informe: en la vista de un integrante (o "Otros"), todos los
  // gráficos usan tonos de su propio color en vez de la paleta azul/gris
  // genérica, para que todo el informe se sienta "de esa persona". El panel
  // general de Kevin mantiene la paleta multicolor (necesita distinguir
  // selectores entre sí) y usa su color solo en el header.
  const THEME = member ? {
    base: member.color,
    light: tint(member.color, 0.45),
    lighter: tint(member.color, 0.75),
  } : null;
  function col(key) {
    if (!THEME) return Charts.COLORS[key];
    if (key === 'blueLight') return THEME.light;
    if (key === 'grey') return THEME.lighter;
    return THEME.base; // blue, purple, green, navy...
  }

  let ALTAS, CUMPL;
  if (member && member.selectors.length) {
    const set = new Set(member.selectors);
    ALTAS = DATA.altas.filter(r => set.has(r.selector));
    CUMPL = DATA.cumplimiento.filter(r => set.has(r.selector));
  } else if (member) {
    ALTAS = [];
    CUMPL = [];
  } else {
    ALTAS = DATA.altas;
    CUMPL = DATA.cumplimiento;
  }

  // Mapa de zonas: es contexto general del equipo, así que solo se muestra
  // en el panel sin filtrar (Kevin). En la vista de un integrante se oculta
  // junto con su section-label para no ocupar espacio con algo que no aplica
  // a su propio informe.
  if (member) {
    const zonaLabel = document.getElementById('zonaSectionLabel');
    const zonaCard = document.getElementById('zonaMapCard');
    if (zonaLabel) zonaLabel.style.display = 'none';
    if (zonaCard) zonaCard.style.display = 'none';
  }

  if (member) {
    const breadcrumb = document.getElementById('heroBreadcrumb');
    const title = document.getElementById('heroTitle');
    const subtitle = document.getElementById('heroSubtitle');
    if (breadcrumb) breadcrumb.textContent = `Selección · Equipo · ${member.label}`;
    if (title) title.textContent = `Resultados — ${member.label}`;
    if (subtitle) subtitle.textContent = member.label === 'Otros'
      ? 'Altas, presentismo y cumplimiento agrupados: Emiliano, Mariano, Facundo y altas sin selector asignado.'
      : `Altas, presentismo y cumplimiento de ${member.label}.`;
  }

  // Sin ninguna alta ni cumplimiento cargado a su nombre -> pantalla S/D en vez de dashboard vacío.
  if (member && ALTAS.length === 0 && CUMPL.length === 0) {
    document.getElementById('mainContent').style.display = 'none';
    const sd = document.getElementById('sdState');
    document.getElementById('sdMessage').textContent =
      `Todavía no hay altas ni cumplimiento cargados a nombre de ${member.label}. En cuanto se registren datos, los gráficos van a aparecer acá automáticamente.`;
    sd.style.display = 'block';
    return; // no hace falta inicializar el resto del dashboard
  }

  const MES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthLabel = (m) => {
    const [y, mm] = m.split('-');
    return `${MES_ABBR[parseInt(mm, 10) - 1]} ${y.slice(2)}`;
  };

  // Colores fijos por selector (no por orden de aparición): así el color de
  // Agustín/Agustina en "Ranking de selectores", "Participación", etc. es
  // siempre el mismo que el de su propia tarjeta/dashboard, en cualquier
  // página donde aparezcan (Kevin, Otros...).
  const SELECTOR_COLORS = {
    Agustin: '#5b2d78',
    Agustina: '#cc2f2f',
    Seleccion: '#0f1c3f',
    Facundo: '#3fbf7f',
    Mariano: '#f0a94c',
    Emiliano: '#8a94a6',
  };
  const PALETTE = ['#7c5cf0', '#4c7cf0', '#e05263', '#3fbf7f', '#f0a94c', '#8a94a6', '#c74fb0', '#0f1c3f'];
  function colorFor(selector) {
    if (!SELECTOR_COLORS[selector]) {
      const used = Object.keys(SELECTOR_COLORS).length;
      SELECTOR_COLORS[selector] = PALETTE[used % PALETTE.length];
    }
    return SELECTOR_COLORS[selector];
  }

  // ---------- Mapa de zonas (solo panel general de Kevin) ----------
  // data.js no tiene una columna de zona geográfica: "zonal" y "regional" son
  // nombres de personas (zonal/regional manager), no regiones. Para poder
  // mostrar altas reales por zona en el mapa, clasificamos cada "local" por
  // el nombre de la localidad en la que está (Zona Norte/Oeste/Sur/Capital
  // Federal, según los partidos del GBA que integra cada una). Lo que no
  // matchea con ninguna de esas 4 zonas —localidades fuera del área de
  // cobertura habitual, como La Plata, Mar del Plata (MDQ), Rosario o
  // Zárate— cae en "Otros". Si se abren locales nuevos en localidades no
  // contempladas acá, van a aparecer como "Otros" hasta que se agreguen a
  // ZONA_BASE.
  const ZONA_BASE = {
    // Capital Federal (barrios porteños + calles/avenidas del microcentro)
    'BARRACAS': 'capital', 'BELGRANO': 'capital', 'BOEDO': 'capital', 'CABALLITO': 'capital',
    'CALLAO': 'capital', 'CONSTITUCION': 'capital', 'CORRIENTES': 'capital', 'ENTRE RIOS': 'capital',
    'FLORES': 'capital', 'FLORIDA': 'capital', 'LAVALLE': 'capital', 'LINIERS': 'capital', 'LUGANO': 'capital',
    'MATADEROS': 'capital', 'ONCE': 'capital', 'PELLEGRINI': 'capital', 'POMPEYA': 'capital',
    'PUEYRREDON': 'capital', 'RETIRO': 'capital', 'SAAVEDRA': 'capital', 'SAVEEDRA': 'capital',
    'SAN CRISTOBAL': 'capital', 'SAN NICOLAS': 'capital', 'SANTA FE': 'capital', 'TUCUMAN': 'capital',
    'URQUIZA': 'capital', 'VILLA DEL PARQUE': 'capital', 'VILLA LUGANO': 'capital',
    // Zona Norte (San Isidro, Vicente López, San Fernando, Tigre, Escobar, Pilar, San Martín, San Miguel, Malvinas Argentinas, José C. Paz...)
    'BALLESTER': 'norte', 'BANAVIDEZ': 'norte', 'BENAVIDEZ': 'norte', 'BOULOGNE': 'norte',
    'CHILAVERT': 'norte', 'DEL VISO': 'norte', 'DON TORCUATO': 'norte', 'ESCOBAR': 'norte',
    'GARIN': 'norte', 'GRAND BOURG': 'norte', 'JOSE C PAZ': 'norte', 'JOSE LEON SUAREZ': 'norte',
    'LOMA HERMOSA': 'norte', 'LOS POLVORINES': 'norte', 'MANUEL ALBERTI': 'norte',
    'MAQUINISTA SAVIO': 'norte', 'SAVIO': 'norte', 'MARTINEZ': 'norte', 'MASCHWITZ': 'norte',
    'MUNRO': 'norte', 'OLIVOS': 'norte', 'PACHECO': 'norte', 'PILAR': 'norte', 'PTE SAAVEDRA': 'norte',
    'SAN FERNANDO': 'norte', 'SAN ISIDRO': 'norte', 'SAN MARTIN': 'norte', 'SAN MIGUEL': 'norte',
    'TALAR': 'norte', 'TIGRE': 'norte', 'TORTUGUITAS': 'norte', 'ADELINA': 'norte', 'V ADELINA': 'norte',
    'VIRREYES': 'norte', 'VTE LOPEZ': 'norte', 'BELLA VISTA': 'norte',
    // Zona Oeste (Morón, Tres de Febrero, Hurlingham, Ituzaingó, La Matanza, Merlo, Moreno, Luján...)
    'CASEROS': 'oeste', 'CASTELAR': 'oeste', 'CIUDADELA': 'oeste', 'CRUCE CASTELAR': 'oeste',
    'EL PALOMAR': 'oeste', 'PALOMAR': 'oeste', 'GONZALEZ CATAN': 'oeste', 'GRAL RODRIGUEZ': 'oeste',
    'HAEDO': 'oeste', 'HAEDOO': 'oeste', 'HURLINGHAM': 'oeste', 'ITUZAINGO': 'oeste', 'LAFERRERE': 'oeste',
    'LOMAS DEL MIRADOR': 'oeste', 'LUJAN': 'oeste', 'MERLO': 'oeste', 'MORENO': 'oeste', 'MORON': 'oeste',
    'PADUA': 'oeste', 'PASO DEL REY': 'oeste', 'RAFAEL CASTILLO': 'oeste', 'RAMOS MEJIA': 'oeste',
    'SAN JUSTO': 'oeste', 'SANTOS LUGARES': 'oeste', 'SOURDEAUX': 'oeste', 'TAPIALES': 'oeste',
    'W MORRIS': 'oeste',
    // Zona Sur (Avellaneda, Lanús, Lomas de Zamora, Almirante Brown, Ezeiza, Esteban Echeverría, Quilmes, Berazategui, Florencio Varela...)
    'ADROGUE': 'sur', 'E ADROGUE': 'sur', 'AVELLANEDA': 'sur', 'BANFIELD': 'sur', 'BERAZATEGUI': 'sur',
    'CLAYPOLE': 'sur', 'CROVARA': 'sur', 'CRUCE VARELA': 'sur', 'EZEIZA': 'sur', 'GERLI': 'sur',
    'GLEW': 'sur', 'JAGUEL': 'sur', 'LANUS': 'sur', 'LEZAMA': 'sur', 'LOMAS': 'sur', 'MONTE GRANDE': 'sur',
    'QUILMES': 'sur', 'SOLANO': 'sur', 'TEMPERLEY': 'sur', 'TRISTAN SUAREZ': 'sur', 'VARELA': 'sur',
    'WILDE': 'sur',
    // Otros: fuera de las 4 zonas de cobertura habitual (otras ciudades/provincias)
    'LA PLATA': 'otros', 'CITY BELL': 'otros', 'MDQ': 'otros', 'ROSARIO': 'otros', 'ZARATE': 'otros',
  };
  function normalizeLocal(local) {
    let s = (local || '').trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // saca acentos
    s = s.replace(/^APER\s+/, '');   // "APER EZEIZA" -> "EZEIZA" (misma localidad, apertura reciente)
    s = s.replace(/\./g, '');        // "VTE. LOPEZ" -> "VTE LOPEZ"
    s = s.replace(/\s+\d+$/, '');    // "PILAR 1" -> "PILAR"
    s = s.replace(/(\D)\d+$/, '$1'); // "PILAR2" -> "PILAR"
    return s.trim();
  }
  function zonaFor(local) { return ZONA_BASE[normalizeLocal(local)] || 'otros'; }
  const ZONA_INFO = {
    norte: { label: 'Zona Norte', pathClass: 'zona-norte', svgId: 'zonaSvgNorte' },
    oeste: { label: 'Zona Oeste', pathClass: 'zona-oeste', svgId: 'zonaSvgOeste' },
    sur: { label: 'Zona Sur', pathClass: 'zona-sur', svgId: 'zonaSvgSur' },
    capital: { label: 'Capital Federal', pathClass: 'zona-capital', svgId: 'zonaSvgCapital' },
    otros: { label: 'Otros (fuera de zona)', pathClass: null, svgId: null },
  };
  // Mapa de calor: rojo más intenso = más altas, más pálido = menos. La
  // escala se recalcula en cada render() contra el mín/máx de las 4 zonas
  // del período activo (no incluye "Otros", que no tiene forma en el mapa
  // y se mantiene gris neutro en la leyenda, como categoría aparte).
  const ZONA_HEAT_LIGHT = { r: 0xfd, g: 0xe4, b: 0xe1 }; // rosado pálido
  const ZONA_HEAT_DARK = { r: 0x7f, g: 0x1d, b: 0x1d };  // rojo intenso
  const ZONA_OTROS_COLOR = '#94a3b8';
  function heatColor(value, min, max) {
    const t = max > min ? (value - min) / (max - min) : (max > 0 ? 1 : 0);
    const r = Math.round(ZONA_HEAT_LIGHT.r + (ZONA_HEAT_DARK.r - ZONA_HEAT_LIGHT.r) * t);
    const g = Math.round(ZONA_HEAT_LIGHT.g + (ZONA_HEAT_DARK.g - ZONA_HEAT_LIGHT.g) * t);
    const b = Math.round(ZONA_HEAT_LIGHT.b + (ZONA_HEAT_DARK.b - ZONA_HEAT_LIGHT.b) * t);
    return `rgb(${r},${g},${b})`;
  }
  function renderZonas(altasF) {
    if (member) return; // sección oculta para vistas por integrante
    const legend = document.getElementById('zonaLegend');
    if (!legend) return;
    const counts = { norte: 0, oeste: 0, sur: 0, capital: 0, otros: 0 };
    for (const r of altasF) counts[zonaFor(r.local)]++;
    const total = altasF.length;

    const zonaKeys = ['norte', 'oeste', 'sur', 'capital'];
    const zonaVals = zonaKeys.map(z => counts[z]);
    const minVal = Math.min(...zonaVals);
    const maxVal = Math.max(...zonaVals);
    const zonaColors = {};
    zonaKeys.forEach(z => {
      const c = heatColor(counts[z], minVal, maxVal);
      zonaColors[z] = c;
      const path = document.querySelector('.' + ZONA_INFO[z].pathClass);
      if (path) path.style.fill = c;
      const el = document.getElementById(ZONA_INFO[z].svgId);
      if (el) el.textContent = total ? `${fmtInt(counts[z])} altas` : 'sin datos';
    });
    zonaColors.otros = ZONA_OTROS_COLOR;

    legend.innerHTML = ['norte', 'oeste', 'sur', 'capital', 'otros'].map(z => {
      const info = ZONA_INFO[z];
      return `
        <li class="${z === 'otros' ? 'otros' : ''}"><span><span class="dot" style="background:${zonaColors[z]}"></span>${info.label}</span><span>${fmtInt(counts[z])} · ${fmtPct(pct(counts[z], total))}</span></li>`;
    }).join('');
  }

  const ALL_MONTHS = [...new Set(ALTAS.map(r => r.mes))].sort();
  const CUMPL_MONTHS = [...new Set(CUMPL.map(r => r.mes))].sort();

  let periodType = '12';
  let customSelected = new Set();

  function activeMonths() {
    if (periodType === 'historico') return ALL_MONTHS;
    if (periodType === 'custom') return ALL_MONTHS.filter(m => customSelected.has(m)).sort();
    const n = parseInt(periodType, 10);
    return ALL_MONTHS.slice(-n);
  }

  // ---------- Aggregation helpers ----------
  function groupCount(rows, keyFn) {
    const map = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }

  // Clampeado a 100%: algunas filas de la planilla fuente tienen "enviados" >
  // "total" por errores de carga (p. ej. Agustina, jul-2026, semana 1: total=3
  // cuando debería ser mayor). Un cumplimiento no puede superar el 100%.
  function pct(n, d) { return d > 0 ? Math.min(1, n / d) : 0; }
  function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }
  function fmtInt(x) { return x.toLocaleString('es-AR'); }
  function round1(x) { return Math.round(x * 10) / 10; } // 1 decimal para valores que Chart.js grafica/muestra en tooltip

  // ---------- Render ----------
  function render() {
    const months = activeMonths();
    const monthSet = new Set(months);
    const altasF = ALTAS.filter(r => monthSet.has(r.mes));
    // Para "Ranking de selectores" y "Presentismo por selector": si hay un
    // integrante filtrado, esos dos widgets igual se calculan sobre TODO el
    // equipo (no solo sus selectores), para que se vea dónde queda parado
    // respecto al resto en vez de un ranking de una sola fila.
    const allAltasF = member ? DATA.altas.filter(r => monthSet.has(r.mes)) : altasF;

    renderZonas(altasF);
    renderKpis(altasF);
    renderAltasMes(months, altasF);
    renderAltasMarcaMes(months, altasF);
    renderDistribucionMarca(altasF);
    renderNoPresentados(months, altasF);
    renderTops(altasF);
    const { rankVolumen, rankPresentismo } = renderPorSelector(months, altasF, allAltasF);
    const rankCumplimiento = renderCumplimiento(months);
    renderHeroBadges(rankVolumen, rankPresentismo, rankCumplimiento);

    document.getElementById('fuenteNote').textContent = 'Fuente: ' + DATA.fuente;
  }

  // Insignias del hero: en qué puesto queda el integrante (dentro de todo el
  // equipo) en cada uno de los tres rankings. Solo tiene sentido para un
  // selector individual real (no el panel de Kevin ni el grupo "Otros",
  // que mezcla varios selectores sin un puesto propio único).
  function renderHeroBadges(rankVolumen, rankPresentismo, rankCumplimiento) {
    const el = document.getElementById('heroBadges');
    if (!el) return;
    // Grupo con más de un selector (p. ej. "Otros"): no tiene un puesto único
    // en el ranking, así que en vez de medallas mostramos el puesto de cada
    // selector agrupado (ver OTROS_ROLES).
    if (member && member.selectors.length > 1) {
      el.innerHTML = member.selectors
        .map(s => OTROS_ROLES[s])
        .filter(Boolean)
        .map(r => `<span class="hero-badge">${r.label} · ${r.puesto}</span>`)
        .join('');
      return;
    }
    if (!member || member.selectors.length !== 1) { el.innerHTML = ''; return; }
    const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    const findMine = (arr) => arr.findIndex(([n]) => memberSelectorSet.has(n));
    const items = [
      ['volumen de altas', findMine(rankVolumen)],
      ['presentismo', findMine(rankPresentismo)],
      ['cumplimiento', findMine(rankCumplimiento)],
    ];
    el.innerHTML = items
      .filter(([, i]) => i > -1)
      .map(([label, i]) => `<span class="hero-badge">${medal(i)} en ${label}</span>`)
      .join('');
  }

  function renderKpis(altasF) {
    const total = altasF.length;
    const presentes = altasF.filter(r => r.presente).length;
    const noPresentados = total - presentes;
    const sabores = altasF.filter(r => r.marca === 'Sabores').length;
    const extremas = altasF.filter(r => r.marca === 'Extremas').length;

    const cumplRows = CUMPL; // ranking usa el rango disponible de cumplimiento (ver renderCumplimiento)
    const totalEnv = cumplRows.reduce((a, r) => a + (r.enviados || 0), 0);
    const totalVac = cumplRows.reduce((a, r) => a + (r.total || 0), 0);
    const cumplProm = pct(totalEnv, totalVac);

    const kpis = [
      { label: 'ALTAS TOTALES', value: fmtInt(total), sub: '', cls: 'c-blue' },
      { label: 'PRESENTISMO DÍA 1', value: fmtPct(pct(presentes, total)), sub: `${fmtInt(noPresentados)} no presentados`, cls: 'c-green' },
      { label: 'SABORES EXPRESS', value: fmtInt(sabores), sub: `${fmtPct(pct(sabores, total))} del total`, cls: 'c-blue' },
      { label: 'HAMBURGUESAS EXTREMAS', value: fmtInt(extremas), sub: `${fmtPct(pct(extremas, total))} del total`, cls: 'c-blue' },
      { label: 'CUMPLIMIENTO PROMEDIO', value: fmtPct(cumplProm), sub: 'Enviados / vacantes totales', cls: 'c-purple' },
    ];

    // En la vista de un integrante, las 5 tarjetas comparten su color (en vez
    // de azul/verde/violeta genéricos) para que el panel se sienta unificado.
    document.getElementById('kpis').innerHTML = kpis.map(k => `
      <div class="kpi ${k.cls}"${THEME ? ` style="border-top-color:${THEME.base}"` : ''}>
        <div class="label">${k.label}</div>
        <div class="value">${k.value}</div>
        <div class="sub">${k.sub}</div>
      </div>`).join('');
  }

  function renderAltasMes(months, altasF) {
    const counts = groupCount(altasF, r => r.mes);
    const data = months.map(m => counts.get(m) || 0);
    Charts.line('chartAltasMes', months.map(monthLabel), data, { color: col('blue') });
  }

  function renderAltasMarcaMes(months, altasF) {
    const sab = months.map(m => altasF.filter(r => r.mes === m && r.marca === 'Sabores').length);
    const ext = months.map(m => altasF.filter(r => r.mes === m && r.marca === 'Extremas').length);
    Charts.stackedBar('chartAltasMarcaMes', months.map(monthLabel), [
      { label: 'Sabores', data: sab, color: col('blue') },
      { label: 'Extremas', data: ext, color: col('blueLight') },
    ]);
  }

  function renderDistribucionMarca(altasF) {
    const sabores = altasF.filter(r => r.marca === 'Sabores').length;
    const extremas = altasF.filter(r => r.marca === 'Extremas').length;
    const total = sabores + extremas;
    Charts.donut('chartDistMarca', ['Sabores', 'Extremas'], [sabores, extremas],
      [col('blue'), col('blueLight')]);
    const legend = document.getElementById('legendDistMarca');
    if (legend) {
      legend.innerHTML = [
        ['Sabores Express', sabores, col('blue')],
        ['Hamburguesas Extremas', extremas, col('blueLight')],
      ].map(([n, v, c]) => `
        <li><span><span class="dot" style="background:${c}"></span>${n}</span><span>${fmtPct(pct(v, total))}</span></li>
      `).join('');
    }
  }

  function renderNoPresentados(months, altasF) {
    const data = months.map(m => {
      const rows = altasF.filter(r => r.mes === m);
      const val = rows.length ? (100 - pct(rows.filter(r => r.presente).length, rows.length) * 100) : 0;
      return round1(val);
    });
    Charts.line('chartNoPresentados', months.map(monthLabel), data, { color: col('grey') });
  }

  function topN(rows, keyFn, n = 5) {
    const map = groupCount(rows, keyFn);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  function renderTops(altasF) {
    const sab = altasF.filter(r => r.marca === 'Sabores');
    const ext = altasF.filter(r => r.marca === 'Extremas');

    const tz1 = topN(sab, r => r.zonal);
    const tz2 = topN(ext, r => r.zonal);
    const tl1 = topN(sab, r => r.local);
    const tl2 = topN(ext, r => r.local);

    Charts.horizontalBar('chartTopZonalSabores', tz1.map(x => x[0]), tz1.map(x => x[1]), col('blue'));
    Charts.horizontalBar('chartTopZonalExtremas', tz2.map(x => x[0]), tz2.map(x => x[1]), col('blueLight'));
    Charts.horizontalBar('chartTopLocalSabores', tl1.map(x => x[0]), tl1.map(x => x[1]), col('blue'));
    Charts.horizontalBar('chartTopLocalExtremas', tl2.map(x => x[0]), tl2.map(x => x[1]), col('blueLight'));
  }

  function renderPorSelector(months, altasF, allAltasF) {
    const selectores = [...new Set(altasF.map(r => r.selector))];
    const totals = selectores.map(s => altasF.filter(r => r.selector === s).length);
    const order = selectores.map((s, i) => [s, totals[i]]).sort((a, b) => b[1] - a[1]);
    const names = order.map(x => x[0]);
    const vals = order.map(x => x[1]);

    // Mezcla de marca por selector
    const sabD = names.map(s => altasF.filter(r => r.selector === s && r.marca === 'Sabores').length);
    const extD = names.map(s => altasF.filter(r => r.selector === s && r.marca === 'Extremas').length);
    Charts.stackedBar('chartMezclaSelector', names, [
      { label: 'Sabores', data: sabD, color: col('blue') },
      { label: 'Extremas', data: extD, color: col('blueLight') },
    ]);

    // Participación: para el equipo completo (Kevin) se reparte por selector real;
    // para un integrante/grupo filtrado, comparamos contra el resto del equipo
    // (en ese período), que tiene más sentido que un gráfico de una sola porción.
    // "Resto del equipo" queda siempre gris neutro (no es parte de su paleta).
    if (member) {
      const monthSet = new Set(months);
      const restoTotal = DATA.altas.filter(r => monthSet.has(r.mes) && !memberSelectorSet.has(r.selector)).length;
      const miTotal = altasF.length;
      document.getElementById('participacionTitle').textContent = 'Participación vs. resto del equipo';
      document.getElementById('participacionDesc').textContent = `${member.label} comparado con el resto del equipo, en volumen de altas`;
      Charts.donut('chartParticipacionSelector', [member.label, 'Resto del equipo'], [miTotal, restoTotal],
        [THEME.base, Charts.COLORS.grey]);
      const totalTodos = miTotal + restoTotal;
      document.getElementById('legendParticipacion').innerHTML = [
        [member.label, miTotal, THEME.base],
        ['Resto del equipo', restoTotal, Charts.COLORS.grey],
      ].map(([n, v, c]) => `
        <li><span><span class="dot" style="background:${c}"></span>${n}</span><span>${fmtPct(pct(v, totalTodos))}</span></li>
      `).join('');
    } else {
      const total = vals.reduce((a, b) => a + b, 0);
      const colors = names.map(colorFor);
      document.getElementById('participacionTitle').textContent = 'Participación por selector';
      document.getElementById('participacionDesc').textContent = '% del volumen total de altas · equipo completo';
      Charts.donut('chartParticipacionSelector', names, vals, colors);
      document.getElementById('legendParticipacion').innerHTML = names.map((n, i) => `
        <li><span><span class="dot" style="background:${colors[i]}"></span>${n}</span><span>${fmtPct(pct(vals[i], total))}</span></li>
      `).join('');
    }

    // Ranking de selectores (todo el equipo, ver comentario en render())
    const rankOrder = [...new Set(allAltasF.map(r => r.selector))]
      .map(s => [s, allAltasF.filter(r => r.selector === s).length])
      .sort((a, b) => b[1] - a[1]);
    const rankNames = rankOrder.map(x => x[0]);
    const rankVals = rankOrder.map(x => x[1]);
    const isMe = (n) => memberSelectorSet && memberSelectorSet.has(n);
    const maxVal = Math.max(...rankVals, 1);
    document.getElementById('rankSelectores').innerHTML = rankOrder.map(([n, v], i) => `
      <li class="${isMe(n) ? 'me' : ''}">
        <span class="idx">${i + 1}</span>
        <span class="name">${n}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(v / maxVal) * 100}%;background:${colorFor(n)}"></span></span>
        <span class="val">${fmtInt(v)}</span>
      </li>`).join('');

    // Presentismo por selector (todo el equipo)
    const presentismo = rankNames.map(s => {
      const rows = allAltasF.filter(r => r.selector === s);
      return pct(rows.filter(r => r.presente).length, rows.length);
    });
    const order2 = rankNames.map((n, i) => [n, presentismo[i]]).sort((a, b) => b[1] - a[1]);
    document.getElementById('rankPresentismo').innerHTML = order2.map(([n, p]) => `
      <li class="${isMe(n) ? 'me' : ''}">
        <span class="name" style="width:90px;">${n}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${p * 100}%;background:${col('green')}"></span></span>
        <span class="val">${fmtPct(p)}</span>
      </li>`).join('');

    return { rankVolumen: rankOrder, rankPresentismo: order2 };
  }

  function renderCumplimiento(months) {
    const monthSet = new Set(months);
    let cumMonths = CUMPL_MONTHS.filter(m => monthSet.has(m));
    if (cumMonths.length === 0) cumMonths = CUMPL_MONTHS; // fallback: mostrar rango completo disponible

    const rangeLabel = cumMonths.length
      ? `${monthLabel(cumMonths[0])} a ${monthLabel(cumMonths[cumMonths.length - 1])}`
      : 'sin datos';
    document.querySelectorAll('.section-label + p.desc')[0] &&
      (document.querySelectorAll('.section-label + p.desc')[0].textContent =
        `Enviados vs. vacantes totales · datos disponibles solo para ${rangeLabel}`);

    const cumF = CUMPL.filter(r => cumMonths.includes(r.mes));

    const dataByMonth = cumMonths.map(m => {
      const rows = cumF.filter(r => r.mes === m);
      const env = rows.reduce((a, r) => a + (r.enviados || 0), 0);
      const tot = rows.reduce((a, r) => a + (r.total || 0), 0);
      return round1(pct(env, tot) * 100);
    });
    Charts.line('chartCumplimientoMes', cumMonths.map(monthLabel), dataByMonth, { color: col('purple') });

    // Ranking de cumplimiento: todo el equipo en el mismo rango de meses (ver
    // comentario de allAltasF en render() — mismo criterio, para comparar
    // contra el resto en vez de mostrar una sola fila cuando hay un
    // integrante filtrado).
    const allCumF = member ? DATA.cumplimiento.filter(r => cumMonths.includes(r.mes)) : cumF;
    const selectores = [...new Set(allCumF.map(r => r.selector))];
    const ranking = selectores.map(s => {
      const rows = allCumF.filter(r => r.selector === s);
      const env = rows.reduce((a, r) => a + (r.enviados || 0), 0);
      const tot = rows.reduce((a, r) => a + (r.total || 0), 0);
      return [s, pct(env, tot)];
    }).sort((a, b) => b[1] - a[1]);

    document.getElementById('rankCumplimiento').innerHTML = ranking.map(([n, p], i) => `
      <li class="${memberSelectorSet && memberSelectorSet.has(n) ? 'me' : ''}">
        <span class="idx">${i + 1}</span>
        <span class="name">${n}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${p * 100}%;background:${colorFor(n)}"></span></span>
        <span class="val">${fmtPct(p)}</span>
      </li>`).join('');

    return ranking;
  }

  // ---------- Toolbar ----------
  function buildMonthsPicker() {
    const el = document.getElementById('monthsPicker');
    el.innerHTML = ALL_MONTHS.map(m => `<span class="m-chip" data-m="${m}">${monthLabel(m)}</span>`).join('');
    el.querySelectorAll('.m-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const m = chip.dataset.m;
        if (customSelected.has(m)) { customSelected.delete(m); chip.classList.remove('sel'); }
        else { customSelected.add(m); chip.classList.add('sel'); }
        if (periodType === 'custom') render();
      });
    });
  }

  function initToolbar() {
    const chips = document.querySelectorAll('#toolbar .chip[data-period]');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        periodType = chip.dataset.period;
        document.getElementById('monthsPicker').classList.toggle('open', periodType === 'custom');
        if (periodType === 'custom' && customSelected.size === 0) {
          ALL_MONTHS.slice(-6).forEach(m => customSelected.add(m));
          document.querySelectorAll('#monthsPicker .m-chip').forEach(c => {
            if (customSelected.has(c.dataset.m)) c.classList.add('sel');
          });
        }
        render();
      });
    });
    document.querySelector('#toolbar .chip[data-period="12"]').classList.add('active');
  }

  buildMonthsPicker();
  initToolbar();
  render();
})();
