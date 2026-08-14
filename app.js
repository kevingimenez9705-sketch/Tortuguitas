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
  const MEMBER_MAP = {
    agustin: { label: 'Agustín Márquez', selectors: ['Agustin'], color: '#5b2d78' },
    agustina: { label: 'Agustina Castillo', selectors: ['Agustina'], color: '#cc2f2f' },
    rafael: { label: 'Rafael Barberi', selectors: [], color: '#e2721f' },
    gustavo: { label: 'Gustavo Sotelo', selectors: [], color: '#4f8fc9' },
    otros: { label: 'Otros', selectors: ['Emiliano', 'Mariano', 'Facundo', 'Seleccion'], color: '#a9714a' },
  };
  const KEVIN_COLOR = '#5c2430';

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
    const color = member ? member.color : KEVIN_COLOR;
    hero.style.background = `linear-gradient(135deg, ${color}, ${darken(color, 0.6)})`;
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

    renderKpis(altasF);
    renderAltasMes(months, altasF);
    renderAltasMarcaMes(months, altasF);
    renderDistribucionMarca(altasF);
    renderNoPresentados(months, altasF);
    renderTops(altasF);
    renderPorSelector(months, altasF, allAltasF);
    renderCumplimiento(months);

    document.getElementById('fuenteNote').textContent = 'Fuente: ' + DATA.fuente;
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
