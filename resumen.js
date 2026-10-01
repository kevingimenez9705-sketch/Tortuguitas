// resumen.js — "Resumen de tu año": historia a pantalla completa con
// estética de resumen anual tipo stories (slides que avanzan solos con
// barras de progreso, tocar a la derecha/izquierda para avanzar/volver,
// mantener apretado para pausar) y una base musical generada en el navegador.
//
// Solo LEE los mismos datos que ya usa el dashboard (window.ALTAS_DATA y
// COMPETENCIAS_DATA): no modifica nada. Período fijo: enero a diciembre
// 2026 (YEAR). Los textos hablan del trabajo en sí: altas, mejor mes,
// regional, local y zonal con más altas, marca, presentismo y ranking.
// No hay slide por día de la semana a propósito: en varios meses la fecha
// de las altas viene cargada como día 1 del mes, así que daría un dato falso.
//
// app.js llama a ResumenAnual.init(ctx) después del primer render.
window.ResumenAnual = (() => {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const YEAR = '2026'; // el resumen cubre enero a diciembre de este año
  const DUR = 7000; // ms por slide
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtInt = (n) => n.toLocaleString('es-AR');
  const fmtPct = (x) => (x * 100).toFixed(1) + '%'; // mismo formato que app.js
  const pct = (n, d) => (d > 0 ? Math.min(1, n / d) : 0); // mismo clamp que app.js
  const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const titleCase = (s) => String(s).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
  function countBy(rows, keyFn) {
    const m = new Map();
    rows.forEach(r => { const k = keyFn(r); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }
  // Aura de cada integrante (definida por el equipo): estilo de percepción
  // + dos rasgos. El estilo elige la paleta de la slide.
  const AURAS = {
    agustina: ['Kinestésica', 'Organizadora', 'Amable'],
    agustin: ['Visual', 'Perfeccionista', 'Correcto'],
    kevin: ['Visual', 'Serio', 'Resolutivo'],
    rafael: ['Auditivo', 'Reservado', 'Paciente'],
    gustavo: ['Visual', 'Carismático', 'Colaborador'],
    albana: ['Auditiva', 'Tranquila', 'Independiente'],
  };
  // Íconos del aura (SVG de trazo): ojo = visual, oreja = auditivo,
  // corazón = kinestésico.
  const AURA_ICONS = {
    visual: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/>',
    auditivo: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9.5a2 2 0 0 1 4 0"/><path d="M19.5 6.5a7 7 0 0 1 0 6M21.8 4.5a10 10 0 0 1 0 10"/>',
    kinestesico: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z"/>',
  };
  const auraIcon = (estilo, cls) => {
    const e = estilo.toLowerCase();
    const k = e.startsWith('audit') ? 'auditivo' : e.startsWith('kinest') ? 'kinestesico' : 'visual';
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AURA_ICONS[k]}</svg>`;
  };
  function auraEstilo(estilo) {
    const e = estilo.toLowerCase();
    if (e.startsWith('audit')) return { bg: ['#00b894', '#03261f'], aura: '#00d4a4, #3a86ff, #c4f000, #7fffd4, #00d4a4' };
    if (e.startsWith('kinest')) return { bg: ['#ff7a59', '#3b0a2a'], aura: '#ff8fd8, #ff6b35, #ffd23f, #ff4f9a, #ff8fd8' };
    return { bg: ['#5b6cff', '#120a3a'], aura: '#3a86ff, #7b2ff7, #00d4ff, #c4b5fd, #3a86ff' }; // visual
  }
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

  // ---------- Números del año ----------
  function compute(ctx) {
    const D = ctx.data;
    const year = YEAR;
    const inYear = (r) => r.mes.startsWith(year + '-');
    const yearAltas = D.altas.filter(inYear);
    const set = ctx.selectors ? new Set(ctx.selectors) : null;
    const mine = set ? yearAltas.filter(r => set.has(r.selector)) : yearAltas;
    if (!mine.length) return null;

    // Los 12 meses del año, aunque alguno todavía no tenga altas cargadas.
    const months = MES_ABBR.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const perMonth = months.map(m => [m, mine.filter(r => r.mes === m).length]);
    const best = perMonth.reduce((a, b) => (b[1] > a[1] ? b : a));
    const activeMonths = perMonth.filter(([, n]) => n > 0).length;

    const conDato = mine.filter(r => r.presente !== null);
    const sabores = mine.filter(r => r.marca === 'Sabores').length;
    const extremas = mine.filter(r => r.marca === 'Extremas').length;

    // Rankings del equipo en el año (mismo criterio que los de app.js).
    const sels = [...new Set(yearAltas.map(r => r.selector))];
    const rankVol = sels.map(s => [s, yearAltas.filter(r => r.selector === s).length]).sort((a, b) => b[1] - a[1]);
    const rankPres = sels.map(s => {
      const rows = yearAltas.filter(r => r.selector === s && r.presente !== null);
      return [s, pct(rows.filter(r => r.presente).length, rows.length)];
    }).sort((a, b) => b[1] - a[1]);
    const cumYear = D.cumplimiento.filter(inYear);
    const rankCum = [...new Set(cumYear.map(r => r.selector))].map(s => {
      const rows = cumYear.filter(r => r.selector === s);
      return [s, pct(sum(rows, 'enviados'), sum(rows, 'total'))];
    }).sort((a, b) => b[1] - a[1]);
    const mineCum = set ? cumYear.filter(r => set.has(r.selector)) : cumYear;
    const single = set && set.size === 1;
    const pos = (arr) => (single ? arr.findIndex(([n]) => set.has(n)) : -1);

    return {
      year,
      rangeLabel: `Ene–Dic ${year}`,
      total: mine.length,
      perMonth,
      best,
      activeMonths,
      avgMonth: Math.round(mine.length / Math.max(1, activeMonths)),
      regionales: countBy(mine, r => r.regional).slice(0, 4),
      locales: countBy(mine, r => r.local).slice(0, 5),
      zonales: countBy(mine, r => r.zonal).slice(0, 3),
      sabores,
      extremas,
      presentismo: pct(conDato.filter(r => r.presente).length, conDato.length),
      cumplimiento: mineCum.length ? pct(sum(mineCum, 'enviados'), sum(mineCum, 'total')) : null,
      single,
      rankVol, rankPres, rankCum,
      posVol: pos(rankVol), posPres: pos(rankPres), posCum: pos(rankCum),
      ranking: (set ? rankVol.filter(([n]) => set.has(n)) : rankVol).slice(0, 8),
    };
  }

  // ---------- Slides ----------
  // Cada slide: { bg: [color1, color2], dark (texto oscuro), html }.
  // .wr-anim + --d: entrada escalonada cuando la slide se activa.
  function buildSlides(s, ctx) {
    const team = !ctx.selectors;      // panel de Kevin: todo el equipo
    const group = !team && !s.single;  // "Otros": varios selectores
    // Sujeto de las frases: "vos" (selector) o tercera persona (equipo/grupo).
    const who = team ? 'el equipo' : group ? 'el grupo' : null;
    const slides = [];

    const de = who === 'el equipo' ? 'del equipo' : 'del grupo'; // "el mejor mes del equipo"

    // 1. Intro: foto con aro de color girando
    const label = ctx.avatar
      ? `<div class="wr-portrait-img" style="background-image:url('${esc(ctx.avatar)}')"></div>`
      : `<div class="wr-portrait-img wr-portrait-img--txt">${esc(ctx.name.slice(0, 2))}</div>`;
    slides.push({
      bg: [ctx.color, '#0b0b14'],
      photo: ctx.tortuga,
      html: `
        <div class="wr-center">
          <div class="wr-portrait wr-anim" style="--d:.1s">${label}</div>
          <p class="wr-anim wr-kicker" style="--d:.35s">Resumen de tu año · Enero a diciembre</p>
          <h1 class="wr-anim wr-huge" style="--d:.5s">${s.year}</h1>
          <p class="wr-anim wr-lead" style="--d:.7s">${group ? `Este es el año del grupo ${esc(ctx.label)}` : `${esc(ctx.name)}, este es ${team ? 'el año de tu equipo' : 'tu año'}`} en Selección.</p>
          <p class="wr-anim wr-hint" style="--d:1.1s">Tocá para avanzar ▸</p>
        </div>`,
    });

    // 2. Total de altas
    slides.push({
      bg: ['#ff4f9a', '#6a1bd1'],
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">En ${s.year} ${who ? `${who} concretó` : 'concretaste'}</p>
          <div class="wr-anim wr-giant" style="--d:.3s" data-count="${s.total}">0</div>
          <p class="wr-anim wr-big" style="--d:.5s">altas</p>
          <p class="wr-anim wr-lead" style="--d:.9s">Un promedio de <b>${fmtInt(s.avgMonth)}</b> por mes, en <b>${s.activeMonths}</b> ${s.activeMonths === 1 ? 'mes con altas' : 'meses con altas'}.</p>
        </div>`,
    });

    // 3. Mejor mes: barras con las altas de cada mes del año
    const maxM = Math.max(...s.perMonth.map(([, n]) => n), 1);
    const bestIdx = s.perMonth.indexOf(s.best);
    slides.push({
      bg: ['#ffd23f', '#ff6b35'],
      dark: true,
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">${who ? 'El mes más productivo' : 'Tu mes más productivo'}</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${cap(MESES[+s.best[0].slice(5) - 1])}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s"><b>${fmtInt(s.best[1])}</b> altas: ${who ? `el mejor mes ${de}` : 'tu mejor mes del año'}.</p>
        </div>
        <div class="wr-eq">
          ${s.perMonth.map(([m, n], i) => `
            <div class="wr-eq-col ${i === bestIdx ? 'is-best' : ''} ${n ? '' : 'is-empty'}" style="--d:${(0.45 + i * 0.07).toFixed(2)}s">
              <span class="wr-eq-val">${n ? fmtInt(n) : ''}</span>
              <span class="wr-eq-bar" style="--h:${Math.max(4, n / maxM * 100)}%"></span>
              <span class="wr-eq-lbl">${MES_ABBR[+m.slice(5) - 1]}</span>
            </div>`).join('')}
        </div>`,
    });

    // 4. Regional del año: regional con más altas
    const maxR = Math.max(...s.regionales.map(([, v]) => v), 1);
    slides.push({
      bg: ['#00d4a4', '#064e3b'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">${who ? 'Regional del año' : 'Tu regional del año'}</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${esc(titleCase(s.regionales[0][0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">El regional con el que más altas ${who ? `concretó ${who}` : 'concretaste'}: <b>${fmtInt(s.regionales[0][1])}</b> altas.</p>
        </div>
        <ul class="wr-band wr-band--light">
          ${s.regionales.map(([n, v], i) => `
            <li class="wr-anim" style="--d:${(0.5 + i * 0.12).toFixed(2)}s">
              <span>${i + 1}</span><b>${esc(titleCase(n))}</b>
              <span class="wr-band-bar"><i style="--w:${v / maxR * 100}%;--d:${(0.65 + i * 0.12).toFixed(2)}s"></i></span>
              <small>${fmtInt(v)}</small>
            </li>`).join('')}
        </ul>`,
    });

    // 5. Local del año + top 5 de locales
    slides.push({
      bg: ['#3a86ff', '#0a1550'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">${who ? 'Local del año' : 'Tu local del año'}</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${esc(titleCase(s.locales[0][0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">El local donde más altas ${who ? `concretó ${who}` : 'concretaste'}: <b>${fmtInt(s.locales[0][1])}</b> altas.</p>
        </div>
        <ol class="wr-playlist">
          ${s.locales.map(([n, v], i) => `
            <li class="wr-anim" style="--d:${0.6 + i * 0.12}s">
              <span class="wr-track-n">${i + 1}</span>
              <span class="wr-cover" style="--hue:${(i * 57 + 200) % 360}">${esc(n.slice(0, 1))}</span>
              <span class="wr-track"><b>${esc(titleCase(n))}</b><small>${fmtInt(v)} altas</small></span>
              ${i === 0 ? '<span class="wr-top1">★ #1</span>' : ''}
            </li>`).join('')}
        </ol>`,
    });

    // 6. Zonal del año: zonal con más altas
    const [z1, ...zRest] = s.zonales;
    slides.push({
      bg: ['#c4f000', '#2b3a00'],
      dark: true,
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">${who ? 'Zonal del año' : 'Tu zonal del año'}</p>
          <div class="wr-anim wr-artist" style="--d:.3s">${esc(z1[0].split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
          <h2 class="wr-anim wr-title" style="--d:.5s">${esc(titleCase(z1[0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.7s"><b>${fmtInt(z1[1])}</b> altas trabajando juntos.</p>
          ${zRest.length ? `<p class="wr-anim wr-small" style="--d:1s">Le siguen: ${zRest.map(([n]) => esc(titleCase(n))).join(' y ')}.</p>` : ''}
        </div>`,
    });

    // 7. Marca del año: marca predominante
    const tot = s.sabores + s.extremas;
    const pS = pct(s.sabores, tot), pE = pct(s.extremas, tot);
    const top = pS >= pE ? ['Sabores Express', pS] : ['Hamburguesas Extremas', pE];
    slides.push({
      bg: ['#ff5d5d', '#5c0b2e'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">${who ? 'Marca del año' : 'Tu marca del año'}</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${top[0]}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">El <b>${fmtPct(top[1])}</b> de ${who ? `las altas ${de}` : 'tus altas'} fue para ${top[0]}.</p>
        </div>
        <div class="wr-bubbles">
          <div class="wr-bubble" style="--s:${0.45 + pS * 0.55};--d:.6s"><b>${fmtPct(pS)}</b><span>Sabores</span></div>
          <div class="wr-bubble wr-bubble--alt" style="--s:${0.45 + pE * 0.55};--d:.8s"><b>${fmtPct(pE)}</b><span>Extremas</span></div>
        </div>`,
    });

    // 8. Presentismo día 1
    const R = 70, C = 2 * Math.PI * R;
    slides.push({
      bg: ['#7b2ff7', '#12063a'],
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">Presentismo día 1</p>
          <div class="wr-anim wr-ring" style="--d:.3s">
            <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${R}" class="wr-ring-bg"/><circle cx="80" cy="80" r="${R}" class="wr-ring-fg" style="--c:${C};--off:${C * (1 - s.presentismo)}"/></svg>
            <span data-count="${s.presentismo}" data-fmt="pct">0%</span>
          </div>
          <p class="wr-anim wr-lead" style="--d:.7s">De ${who ? `las altas ${de}` : 'tus altas'}, el <b>${fmtPct(s.presentismo)}</b> se presentó el primer día.</p>
        </div>`,
    });

    // 9. Ranking (selector) o ranking de altas del equipo / grupo
    if (s.single) {
      const rows = [
        ['Volumen de altas', s.posVol, s.rankVol.length],
        ['Presentismo', s.posPres, s.rankPres.length],
        ['Cumplimiento', s.posCum, s.rankCum.length],
      ].filter(([, p]) => p > -1);
      const bestPos = Math.min(...rows.map(([, p]) => p));
      slides.push({
        bg: ['#ffb703', '#7a3b00'],
        dark: true,
        html: `
          <div class="wr-center">
            <p class="wr-anim wr-kicker" style="--d:.1s">Tu lugar en el equipo</p>
            <div class="wr-anim wr-medal" style="--d:.3s">${medal(bestPos)}</div>
            <h2 class="wr-anim wr-title" style="--d:.5s">${bestPos === 0 ? 'Top 1 del equipo' : `Top ${bestPos + 1} del equipo`}</h2>
            <ul class="wr-ranks">
              ${rows.map(([l, p, n], i) => `<li class="wr-anim" style="--d:${0.7 + i * 0.15}s"><span>${medal(p)}</span><b>${l}</b><small>de ${n}</small></li>`).join('')}
            </ul>
          </div>`,
      });
    } else {
      const maxB = Math.max(...s.ranking.map(([, v]) => v), 1);
      slides.push({
        bg: ['#ffb703', '#7a3b00'],
        dark: true,
        html: `
          <div class="wr-top-copy">
            <p class="wr-anim wr-kicker" style="--d:.1s">${team ? 'Tu equipo' : 'El grupo'}</p>
            <h2 class="wr-anim wr-title" style="--d:.25s">Ranking de altas</h2>
          </div>
          <ul class="wr-band">
            ${s.ranking.map(([n, v], i) => `
              <li class="wr-anim" style="--d:${0.45 + i * 0.12}s">
                <span>${medal(i)}</span><b>${esc(n)}</b>
                <span class="wr-band-bar"><i style="--w:${v / maxB * 100}%;--d:${(0.6 + i * 0.12).toFixed(2)}s"></i></span>
                <small>${fmtInt(v)}</small>
              </li>`).join('')}
          </ul>`,
      });
    }

    // 10. Aura: estilo + rasgos (AURAS) y, si hay datos, la competencia
    // más fuerte de la autoevaluación. Sin aura cargada, queda solo la
    // slide de competencia.
    const aura = AURAS[ctx.key];
    const cats = window.COMPETENCIAS_CATEGORIAS || [];
    const self = (ctx.comp && ctx.comp.autoevaluacion) || [];
    const top3 = self.map((v, i) => [cats[i] ? cats[i].label : '', v]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (aura) {
      const st = auraEstilo(aura[0]);
      slides.push({
        bg: st.bg,
        html: `
          <div class="wr-center">
            <p class="wr-anim wr-kicker" style="--d:.1s">Tu aura</p>
            <div class="wr-anim wr-aura" style="--d:.3s;--aura:${st.aura}">${auraIcon(aura[0], 'wr-aura-icon')}</div>
            <div class="wr-aura-words">
              ${aura.map((w, i) => `<span class="wr-anim" style="--d:${(0.5 + i * 0.22).toFixed(2)}s">${esc(w)}</span>`).join('')}
            </div>
            ${top3.length ? `<p class="wr-anim wr-lead" style="--d:1.2s">Tu competencia más fuerte según tu autoevaluación: <b>${esc(top3[0][0])} (${top3[0][1]}/10)</b>.</p>` : ''}
          </div>`,
      });
    } else if (top3.length) {
      slides.push({
        bg: ['#ff8fd8', '#3b0a45'],
        html: `
          <div class="wr-center">
            <p class="wr-anim wr-kicker" style="--d:.1s">Tu competencia del año</p>
            <div class="wr-anim wr-aura" style="--d:.3s"></div>
            <h2 class="wr-anim wr-title" style="--d:.5s">${esc(top3[0][0])}</h2>
            <p class="wr-anim wr-lead" style="--d:.7s">Tu competencia más fuerte según tu autoevaluación: <b>${top3[0][1]}/10</b>.</p>
            <div class="wr-chips">${top3.map(([l, v], i) => `<span class="wr-anim" style="--d:${0.9 + i * 0.12}s">${esc(l)} · ${v}</span>`).join('')}</div>
          </div>`,
      });
    }

    // 11. Tarjeta final
    const cells = [
      ['Altas', fmtInt(s.total)],
      ['Mejor mes', cap(MESES[+s.best[0].slice(5) - 1])],
      ['Local', titleCase(s.locales[0][0])],
      ['Zonal', titleCase(z1[0])],
      ['Marca', top[0] === 'Sabores Express' ? 'Sabores' : 'Extremas'],
      ['Presentismo', fmtPct(s.presentismo)],
    ];
    if (s.single && s.posVol > -1) cells.push(['Ranking', `${medal(s.posVol)} en volumen`]);
    else if (s.cumplimiento != null) cells.push(['Cumplimiento', fmtPct(s.cumplimiento)]);
    // Celdas de ancho completo: el aura (arriba) y la última si quedó sola.
    if (cells.length % 2) cells[cells.length - 1].push(true);
    if (aura) cells.unshift(['Aura', aura.join(' · '), true, auraIcon(aura[0], 'wr-cell-icon')]);
    slides.push({
      bg: [ctx.color, '#0b0b14'],
      final: true,
      html: `
        <div class="wr-final">
          <div class="wr-card wr-anim" style="--d:.1s">
            <div class="wr-card-head">
              ${ctx.avatar ? `<img src="${esc(ctx.avatar)}" alt="" />` : `<span class="wr-card-ph">${esc(ctx.name.slice(0, 2))}</span>`}
              <div><small>Resumen de tu año</small><b>${esc(ctx.label)} · ${s.year}</b></div>
            </div>
            <div class="wr-card-grid">
              ${cells.map(([k, v, wide, icon], i) => `<div class="wr-anim${wide ? ' wr-wide' : ''}" style="--d:${(0.3 + i * 0.08).toFixed(2)}s"><small>${k}</small><b>${icon || ''}${esc(v)}</b></div>`).join('')}
            </div>
            <div class="wr-card-foot">Las Tortuguitas Ninja · Selección · ${s.rangeLabel}</div>
          </div>
          <div class="wr-final-actions wr-anim" style="--d:.9s">
            <button type="button" class="wr-pill" data-act="restart">↺ Ver de nuevo</button>
            <button type="button" class="wr-pill wr-pill--solid" data-act="close">Volver al informe</button>
          </div>
        </div>`,
    });
    return slides;
  }

  // ---------- Música (Web Audio, sin archivos) ----------
  // Cada integrante tiene su propio tema, armado según su perfil (ver
  // PERFILES): tempo, tonalidad, timbre y ritmo distintos. Se genera en
  // vivo en el navegador y arranca con el clic del botón (los navegadores no
  // dejan reproducir audio sin un gesto del usuario).
  // Patrones en una grilla de 16 semicorcheas por compás; bass: 1 = raíz,
  // 2 = raíz una octava arriba.
  const TEMAS = {
    // Visual, serio, resolutivo: menor, firme, graves marcados.
    kevin: {
      bpm: 90, prog: [[60, 63, 67, 70], [56, 60, 63, 67], [55, 58, 63, 67], [58, 62, 65, 70]],
      pad: 'sawtooth', padGain: 0.022, padCut: 900,
      kick: [0, 8, 10], snare: [4, 12], hat: 2, hatGain: 0.025,
      bass: [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0], bassWave: 'square', bassGain: 0.08,
      arp: { wave: 'sine', gain: 0.03, oct: 1, steps: [0, 4, 8, 12], order: 'down', len: 3 },
    },
    // Visual, perfeccionista, correcto: arpegio de semicorcheas exacto, sin swing.
    agustin: {
      bpm: 100, prog: [[62, 65, 69, 72], [58, 62, 65, 69], [53, 57, 60, 64], [55, 60, 64, 67]],
      pad: 'triangle', padGain: 0.035, padCut: 1800,
      kick: [0, 4, 8, 12], snare: [4, 12], hat: 1, hatGain: 0.018,
      bass: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], bassWave: 'sine', bassGain: 0.2,
      arp: { wave: 'sine', gain: 0.025, oct: 1, steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], order: 'up', len: 0.9 },
    },
    // Kinestésica, organizadora, amable: mayor, cálido, con groove y swing.
    agustina: {
      bpm: 104, swing: 0.16, prog: [[53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 62], [57, 60, 64, 67]],
      pad: 'triangle', padGain: 0.04, padCut: 2200,
      kick: [0, 6, 8], snare: [4, 12], hat: 1, hatGain: 0.03,
      bass: [1, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0, 2, 0], bassWave: 'triangle', bassGain: 0.2,
      arp: { wave: 'triangle', gain: 0.035, oct: 1, steps: [0, 2, 3, 6, 8, 10, 11, 14], order: 'updown', len: 1.5 },
    },
    // Auditivo, reservado, paciente: lento, espacioso, notas largas.
    rafael: {
      bpm: 72, prog: [[63, 67, 70, 74], [60, 63, 67, 70], [56, 60, 63, 67], [58, 62, 65, 67]],
      pad: 'sine', padGain: 0.05, padCut: 1400,
      kick: [0], snare: [12], snareGain: 0.06, hat: 4, hatGain: 0.015,
      bass: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bassWave: 'sine', bassGain: 0.2, bassLen: 14,
      arp: { wave: 'sine', gain: 0.035, oct: 1, steps: [0, 6, 10], order: 'up', len: 6 },
    },
    // Visual, carismático, colaborador: mayor, funky, alegre.
    gustavo: {
      bpm: 112, prog: [[55, 59, 62, 67], [57, 62, 66, 69], [55, 59, 64, 67], [55, 60, 64, 67]],
      pad: 'triangle', padGain: 0.03, padCut: 2400,
      kick: [0, 3, 8, 11], snare: [4, 12], clap: true, hat: 1, hatGain: 0.025,
      bass: [1, 0, 2, 0, 0, 1, 0, 2, 1, 0, 2, 0, 0, 1, 2, 0], bassWave: 'square', bassGain: 0.07,
      arp: { wave: 'square', gain: 0.018, oct: 1, steps: [2, 6, 7, 10, 14, 15], order: 'random', len: 0.6 },
    },
    // Auditiva, tranquila, independiente: suave, aireado, sin apuro.
    albana: {
      bpm: 76, prog: [[57, 61, 64, 68], [54, 57, 61, 64], [50, 54, 57, 61], [52, 57, 59, 64]],
      pad: 'sine', padGain: 0.05, padCut: 1600,
      kick: [0, 10], snare: [], hat: 4, hatGain: 0.02,
      bass: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], bassWave: 'sine', bassGain: 0.18, bassLen: 8,
      arp: { wave: 'triangle', gain: 0.03, oct: 1, steps: [0, 3, 6, 9, 12], order: 'random', len: 4 },
    },
    // "Otros" y cualquier otro caso: base lo-fi neutra.
    default: {
      bpm: 92, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],
      pad: 'triangle', padGain: 0.045, padCut: 1600,
      kick: [0, 10], snare: [4, 12], hat: 2, hatGain: 0.035,
      bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], bassWave: 'sine', bassGain: 0.22,
      arp: { wave: 'triangle', gain: 0.03, oct: 1, steps: [2, 6, 10, 14], order: 'up', len: 3 },
    },
  };

  const Music = (() => {
    let ac = null, master = null, pad = null, noiseBuf = null, timer = null, nextT = 0, step = 0, on = false;
    let T = TEMAS.default;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function tone(t, f, dur, type, gain, dest) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(t, dur, gain, freq) {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = freq;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.02);
    }
    function kick(t) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
    }
    let arpN = 0;
    function arpNote(chord) {
      const n = chord.length, k = arpN++;
      if (T.arp.order === 'down') return chord[n - 1 - (k % n)];
      if (T.arp.order === 'updown') { const seq = [0, 1, 2, 3, 2, 1]; return chord[seq[k % seq.length] % n]; }
      if (T.arp.order === 'random') return chord[(k * 7 + (k >> 2) * 3) % n]; // "aleatorio" pero repetible
      return chord[k % n];
    }
    function play(s, t0) {
      const S = 60 / T.bpm / 4;
      const s16 = s % 16;
      const t = t0 + (T.swing && s16 % 4 === 2 ? T.swing * S : 0);
      const chord = T.prog[Math.floor(s / 16) % T.prog.length];
      if (s16 === 0) chord.forEach(n => tone(t, hz(n), S * 16, T.pad, T.padGain, pad));
      if (T.kick.includes(s16)) kick(t);
      if (T.snare.includes(s16)) {
        noise(t, 0.16, T.snareGain || 0.12, 1200);
        if (T.clap) noise(t + 0.012, 0.1, 0.08, 1800);
      }
      if (T.hat && s16 % T.hat === 0) noise(t, 0.035, T.hatGain * (s16 % 4 === 0 ? 1 : 0.6), 7000);
      if (T.bass[s16]) {
        let r = chord[0];
        while (r > 45) r -= 12;
        tone(t, hz(r + (T.bass[s16] === 2 ? 12 : 0)), S * (T.bassLen || 2.5), T.bassWave, T.bassGain);
      }
      if (T.arp.steps.includes(s16)) tone(t, hz(arpNote(chord) + 12 * T.arp.oct), S * T.arp.len, T.arp.wave, T.arp.gain, pad);
    }
    function tick() {
      while (nextT < ac.currentTime + 0.12) { play(step, nextT); nextT += 60 / T.bpm / 4; step++; }
    }
    function start(key) {
      if (key) T = TEMAS[key] || TEMAS.default;
      try {
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          const comp = ac.createDynamicsCompressor();
          master = ac.createGain(); master.gain.value = 0;
          pad = ac.createBiquadFilter(); pad.type = 'lowpass'; pad.connect(master);
          master.connect(comp); comp.connect(ac.destination);
          noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
          const ch = noiseBuf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        }
        ac.resume();
        pad.frequency.value = T.padCut;
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(0.55, ac.currentTime, 0.4);
        nextT = ac.currentTime + 0.05; step = 0; arpN = 0;
        clearInterval(timer); timer = setInterval(tick, 25);
        on = true;
      } catch (e) { on = false; }
      return on;
    }
    function stop() {
      on = false;
      if (!ac) return;
      master.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      setTimeout(() => { if (!on) clearInterval(timer); }, 400);
    }
    return { start, stop, isOn: () => on };
  })();

  // ---------- Historia ----------
  let root = null, slides = [], idx = 0, elapsed = 0, paused = false, raf = 0, last = 0, launcher = null, ctxRef = null;

  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const isPct = el.dataset.fmt === 'pct';
    const f = (v) => (isPct ? fmtPct(v) : fmtInt(Math.round(v)));
    if (reduce) { el.textContent = f(to); return; }
    const t0 = performance.now(), dur = 1400;
    const stepFn = (t) => {
      if (!root) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = f(k < 1 ? to * e : to);
      if (k < 1) requestAnimationFrame(stepFn);
    };
    requestAnimationFrame(stepFn);
  }

  function go(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    elapsed = 0;
    const secs = root.querySelectorAll('.wr-slide');
    secs.forEach((el, j) => {
      el.classList.toggle('is-active', j === idx);
      el.setAttribute('aria-hidden', String(j !== idx));
    });
    const active = secs[idx];
    // Reiniciar animaciones de entrada (si se vuelve a una slide ya vista)
    active.querySelectorAll('.wr-anim, .wr-eq-bar, .wr-eq-val, .wr-bubble, .wr-band-bar i, .wr-ring-fg').forEach(n => {
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
    });
    active.querySelectorAll('[data-count]').forEach(countUp);
    root.querySelectorAll('.wr-bars i').forEach((b, j) => { b.style.width = j < idx ? '100%' : '0%'; });
    root.classList.toggle('wr--final', !!slides[idx].final);
  }

  function loop(t) {
    if (!root) return;
    const dt = last ? t - last : 0;
    last = t;
    if (!paused && !slides[idx].final) {
      elapsed += dt;
      const bar = root.querySelectorAll('.wr-bars i')[idx];
      if (bar) bar.style.width = Math.min(100, elapsed / DUR * 100) + '%';
      if (elapsed >= DUR) go(idx + 1);
    }
    raf = requestAnimationFrame(loop);
  }

  function setSoundBtn() {
    const b = root && root.querySelector('.wr-sound');
    if (!b) return;
    const on = Music.isOn();
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Silenciar música' : 'Activar música');
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === ' ') { e.preventDefault(); paused = !paused; root.classList.toggle('wr--paused', paused); }
  }

  function open() {
    const stats = compute(ctxRef);
    if (!stats) return;
    slides = buildSlides(stats, ctxRef);
    root = document.createElement('div');
    root.className = 'wr';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Resumen de tu año ${stats.year}`);
    root.innerHTML = `
      <div class="wr-stage">
        <div class="wr-bars">${slides.map(() => '<span><i></i></span>').join('')}</div>
        <div class="wr-topbar">
          <span class="wr-brand"><span class="wr-eqicon"><i></i><i></i><i></i></span> Tu año en Selección</span>
          <button type="button" class="wr-icon wr-sound" aria-label="Música">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="wr-wave" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="wr-mute" d="M16 9l6 6M22 9l-6 6"/></svg>
          </button>
          <button type="button" class="wr-icon wr-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="wr-slides">
          ${slides.map(sl => `
            <section class="wr-slide ${sl.dark ? 'wr-dark' : ''}" style="--bg1:${sl.bg[0]};--bg2:${sl.bg[1]}" aria-hidden="true">
              ${sl.photo ? `<div class="wr-photo" style="background-image:url('${esc(sl.photo)}')"></div>` : ''}
              <span class="wr-blob b1"></span><span class="wr-blob b2"></span><span class="wr-blob b3"></span>
              <div class="wr-content">${sl.html}</div>
            </section>`).join('')}
        </div>
        <div class="wr-tap" aria-hidden="true"></div>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add('wr-open');

    // Tocar: derecha avanza, izquierda vuelve; mantener apretado pausa.
    const tap = root.querySelector('.wr-tap');
    let downAt = 0;
    tap.addEventListener('pointerdown', () => { downAt = performance.now(); paused = true; root.classList.add('wr--paused'); });
    tap.addEventListener('pointerup', (e) => {
      paused = false; root.classList.remove('wr--paused');
      if (performance.now() - downAt > 300) return; // fue una pausa, no un toque
      const r = tap.getBoundingClientRect();
      go((e.clientX - r.left) < r.width * 0.3 ? idx - 1 : idx + 1);
    });
    tap.addEventListener('pointercancel', () => { paused = false; root.classList.remove('wr--paused'); });
    root.querySelector('.wr-close').addEventListener('click', close);
    root.querySelector('.wr-sound').addEventListener('click', () => {
      if (Music.isOn()) Music.stop(); else Music.start(ctxRef.key);
      setSoundBtn();
    });
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'restart') go(0);
      else close();
    });
    document.addEventListener('keydown', onKey);

    Music.start(ctxRef.key);
    setSoundBtn();
    idx = 0; last = 0; paused = false;
    requestAnimationFrame(() => { root.classList.add('wr--in'); go(0); });
    raf = requestAnimationFrame(loop);
    root.querySelector('.wr-close').focus({ preventScroll: true });
  }

  function close() {
    if (!root) return;
    Music.stop();
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    const r = root;
    root = null;
    r.classList.remove('wr--in');
    r.classList.add('wr--out');
    setTimeout(() => r.remove(), reduce ? 0 : 350);
    document.body.classList.remove('wr-open');
    if (launcher) launcher.focus({ preventScroll: true });
  }

  // ctx: { key (agustina, kevin...: tema musical y aura), data,
  //        selectors (null = todo el equipo), name, label, color,
  //        avatar, tortuga, comp }
  function init(ctx) {
    ctxRef = ctx;
    if (!compute(ctx)) return; // sin altas en el año: no hay resumen
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('.wr-launch')) return;
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'wr-launch';
    launcher.innerHTML = `<span class="wr-eqicon"><i></i><i></i><i></i></span>${ctx.selectors ? 'Resumen de tu año' : 'Resumen del año del equipo'}`;
    launcher.addEventListener('click', open);
    hero.appendChild(launcher);
  }

  return { init };
})();
