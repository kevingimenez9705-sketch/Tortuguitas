// app.js — filtros de período y agregaciones sobre window.ALTAS_DATA
(() => {
  const DATA = window.ALTAS_DATA;
  const ALTAS = DATA.altas;
  const CUMPL = DATA.cumplimiento;

  const MES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthLabel = (m) => {
    const [y, mm] = m.split('-');
    return `${MES_ABBR[parseInt(mm, 10) - 1]} ${y.slice(2)}`;
  };

  const SELECTOR_COLORS = {};
  const PALETTE = ['#0f1c3f', '#7c5cf0', '#e05263', '#4c7cf0', '#f0a94c', '#3fbf7f', '#8a94a6', '#c74fb0'];
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

  function pct(n, d) { return d > 0 ? n / d : 0; }
  function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }
  function fmtInt(x) { return x.toLocaleString('es-AR'); }

  // ---------- Render ----------
  function render() {
    const months = activeMonths();
    const monthSet = new Set(months);
    const altasF = ALTAS.filter(r => monthSet.has(r.mes));

    renderKpis(altasF);
    renderAltasMes(months, altasF);
    renderAltasMarcaMes(months, altasF);
    renderDistribucionMarca(altasF);
    renderNoPresentados(months, altasF);
    renderTops(altasF);
    renderPorSelector(altasF);
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

    document.getElementById('kpis').innerHTML = kpis.map(k => `
      <div class="kpi ${k.cls}">
        <div class="label">${k.label}</div>
        <div class="value">${k.value}</div>
        <div class="sub">${k.sub}</div>
      </div>`).join('');
  }

  function renderAltasMes(months, altasF) {
    const counts = groupCount(altasF, r => r.mes);
    const data = months.map(m => counts.get(m) || 0);
    Charts.line('chartAltasMes', months.map(monthLabel), data, { color: Charts.COLORS.blue });
  }

  function renderAltasMarcaMes(months, altasF) {
    const sab = months.map(m => altasF.filter(r => r.mes === m && r.marca === 'Sabores').length);
    const ext = months.map(m => altasF.filter(r => r.mes === m && r.marca === 'Extremas').length);
    Charts.stackedBar('chartAltasMarcaMes', months.map(monthLabel), [
      { label: 'Sabores', data: sab, color: Charts.COLORS.blue },
      { label: 'Extremas', data: ext, color: Charts.COLORS.blueLight },
    ]);
  }

  function renderDistribucionMarca(altasF) {
    const sabores = altasF.filter(r => r.marca === 'Sabores').length;
    const extremas = altasF.filter(r => r.marca === 'Extremas').length;
    Charts.donut('chartDistMarca', ['Sabores', 'Extremas'], [sabores, extremas],
      [Charts.COLORS.blue, Charts.COLORS.blueLight]);
  }

  function renderNoPresentados(months, altasF) {
    const data = months.map(m => {
      const rows = altasF.filter(r => r.mes === m);
      return rows.length ? (100 - pct(rows.filter(r => r.presente).length, rows.length) * 100) : 0;
    });
    Charts.line('chartNoPresentados', months.map(monthLabel), data, { color: Charts.COLORS.grey });
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

    Charts.horizontalBar('chartTopZonalSabores', tz1.map(x => x[0]), tz1.map(x => x[1]), Charts.COLORS.blue);
    Charts.horizontalBar('chartTopZonalExtremas', tz2.map(x => x[0]), tz2.map(x => x[1]), Charts.COLORS.blueLight);
    Charts.horizontalBar('chartTopLocalSabores', tl1.map(x => x[0]), tl1.map(x => x[1]), Charts.COLORS.blue);
    Charts.horizontalBar('chartTopLocalExtremas', tl2.map(x => x[0]), tl2.map(x => x[1]), Charts.COLORS.blueLight);
  }

  function renderPorSelector(altasF) {
    const selectores = [...new Set(altasF.map(r => r.selector))];
    const totals = selectores.map(s => altasF.filter(r => r.selector === s).length);
    const order = selectores.map((s, i) => [s, totals[i]]).sort((a, b) => b[1] - a[1]);
    const names = order.map(x => x[0]);
    const vals = order.map(x => x[1]);
    const total = vals.reduce((a, b) => a + b, 0);

    // Mezcla de marca por selector
    const sabD = names.map(s => altasF.filter(r => r.selector === s && r.marca === 'Sabores').length);
    const extD = names.map(s => altasF.filter(r => r.selector === s && r.marca === 'Extremas').length);
    Charts.stackedBar('chartMezclaSelector', names, [
      { label: 'Sabores', data: sabD, color: Charts.COLORS.blue },
      { label: 'Extremas', data: extD, color: Charts.COLORS.blueLight },
    ]);

    // Participación por selector
    const colors = names.map(colorFor);
    Charts.donut('chartParticipacionSelector', names, vals, colors);
    document.getElementById('legendParticipacion').innerHTML = names.map((n, i) => `
      <li><span><span class="dot" style="background:${colors[i]}"></span>${n}</span><span>${fmtPct(pct(vals[i], total))}</span></li>
    `).join('');

    // Ranking de selectores
    const maxVal = Math.max(...vals, 1);
    document.getElementById('rankSelectores').innerHTML = names.map((n, i) => `
      <li>
        <span class="idx">${i + 1}</span>
        <span class="name">${n}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(vals[i] / maxVal) * 100}%;background:${colorFor(n)}"></span></span>
        <span class="val">${fmtInt(vals[i])}</span>
      </li>`).join('');

    // Presentismo por selector
    const presentismo = names.map(s => {
      const rows = altasF.filter(r => r.selector === s);
      return pct(rows.filter(r => r.presente).length, rows.length);
    });
    const order2 = names.map((n, i) => [n, presentismo[i]]).sort((a, b) => b[1] - a[1]);
    document.getElementById('rankPresentismo').innerHTML = order2.map(([n, p]) => `
      <li>
        <span class="name" style="width:90px;">${n}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${p * 100}%;background:${Charts.COLORS.green}"></span></span>
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
      return pct(env, tot) * 100;
    });
    Charts.line('chartCumplimientoMes', cumMonths.map(monthLabel), dataByMonth, { color: Charts.COLORS.purple });

    const selectores = [...new Set(cumF.map(r => r.selector))];
    const ranking = selectores.map(s => {
      const rows = cumF.filter(r => r.selector === s);
      const env = rows.reduce((a, r) => a + (r.enviados || 0), 0);
      const tot = rows.reduce((a, r) => a + (r.total || 0), 0);
      return [s, pct(env, tot)];
    }).sort((a, b) => b[1] - a[1]);

    document.getElementById('rankCumplimiento').innerHTML = ranking.map(([n, p], i) => `
      <li>
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
