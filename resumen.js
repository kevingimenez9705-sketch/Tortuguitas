// resumen.js — "Resumen de tu año": historia a pantalla completa con
// estética de resumen musical anual (slides que avanzan solos con barras de
// progreso, tocar a la derecha/izquierda para avanzar/volver, mantener
// apretado para pausar) y una base musical generada en el navegador.
//
// Solo LEE los mismos datos que ya usa el dashboard (window.ALTAS_DATA y
// COMPETENCIAS_DATA): no modifica nada. Las "metáforas musicales" son
// traducciones de métricas reales:
//   canción del año -> local con más altas · artista -> zonal con más altas
//   productor -> regional con más altas · mes en loop -> mes con más altas
//   género -> marca predominante · escuchados hasta el final -> presentismo día 1
// No hay slide por día de la semana a propósito: en varios meses la fecha
// de las altas viene cargada como día 1 del mes, así que daría un dato falso.
//
// app.js llama a ResumenAnual.init(ctx) después del primer render.
window.ResumenAnual = (() => {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

  // ---------- Números del año ----------
  function compute(ctx) {
    const D = ctx.data;
    const year = D.altas.reduce((y, r) => (r.mes > y ? r.mes : y), '').slice(0, 4);
    const inYear = (r) => r.mes.startsWith(year);
    const yearAltas = D.altas.filter(inYear);
    const set = ctx.selectors ? new Set(ctx.selectors) : null;
    const mine = set ? yearAltas.filter(r => set.has(r.selector)) : yearAltas;
    if (!mine.length) return null;

    const months = [...new Set(yearAltas.map(r => r.mes))].sort();
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
      rangeLabel: `${MES_ABBR[+months[0].slice(5) - 1]}–${MES_ABBR[+months[months.length - 1].slice(5) - 1]} ${year}`,
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
      banda: (set ? rankVol.filter(([n]) => set.has(n)) : rankVol).slice(0, 8),
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

    // 1. Intro: vinilo girando con la foto
    const label = ctx.avatar
      ? `<div class="wr-vinyl-label" style="background-image:url('${esc(ctx.avatar)}')"></div>`
      : `<div class="wr-vinyl-label wr-vinyl-label--txt">${esc(ctx.name.slice(0, 2))}</div>`;
    slides.push({
      bg: [ctx.color, '#0b0b14'],
      photo: ctx.tortuga,
      html: `
        <div class="wr-center">
          <div class="wr-vinyl wr-anim" style="--d:.1s">${label}</div>
          <p class="wr-anim wr-kicker" style="--d:.35s">Resumen de tu año · ${s.rangeLabel}</p>
          <h1 class="wr-anim wr-huge" style="--d:.5s">${s.year}</h1>
          <p class="wr-anim wr-lead" style="--d:.7s">${group ? `Le dimos play al año del grupo ${esc(ctx.label)}` : `${esc(ctx.name)}, le dimos play a ${team ? 'tu año con el equipo' : 'tu año'}`} en Selección.</p>
          <p class="wr-anim wr-hint" style="--d:1.1s">Tocá para avanzar ▸</p>
        </div>`,
    });

    // 2. Total de altas
    slides.push({
      bg: ['#ff4f9a', '#6a1bd1'],
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">Este año ${who ? `${who} puso` : 'pusiste'} a sonar</p>
          <div class="wr-anim wr-giant" style="--d:.3s" data-count="${s.total}">0</div>
          <p class="wr-anim wr-big" style="--d:.5s">altas</p>
          <p class="wr-anim wr-lead" style="--d:.9s">Un promedio de <b>${fmtInt(s.avgMonth)}</b> por mes, en <b>${s.activeMonths}</b> ${s.activeMonths === 1 ? 'mes activo' : 'meses activos'}.</p>
        </div>`,
    });

    // 3. Mes en loop: ecualizador con las altas de cada mes
    const maxM = Math.max(...s.perMonth.map(([, n]) => n), 1);
    const bestIdx = s.perMonth.indexOf(s.best);
    slides.push({
      bg: ['#ffd23f', '#ff6b35'],
      dark: true,
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">Tu mes en loop</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${cap(MESES[+s.best[0].slice(5) - 1])}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s"><b>${fmtInt(s.best[1])}</b> altas: ${who ? `el mes que más sonó ${who}` : 'el mes que más te escuchamos'}.</p>
        </div>
        <div class="wr-eq">
          ${s.perMonth.map(([m, n], i) => `
            <div class="wr-eq-col ${i === bestIdx ? 'is-best' : ''}" style="--d:${(0.45 + i * 0.07).toFixed(2)}s">
              <span class="wr-eq-val">${n ? fmtInt(n) : ''}</span>
              <span class="wr-eq-bar" style="--h:${Math.max(4, n / maxM * 100)}%"></span>
              <span class="wr-eq-lbl">${MES_ABBR[+m.slice(5) - 1]}</span>
            </div>`).join('')}
        </div>`,
    });

    // 4. Productor del año: regional con más altas
    const maxR = Math.max(...s.regionales.map(([, v]) => v), 1);
    slides.push({
      bg: ['#00d4a4', '#064e3b'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">Tu productor del año</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${esc(titleCase(s.regionales[0][0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">El regional con el que más ${who ? 'sonó ' + who : 'grabaste'}: <b>${fmtInt(s.regionales[0][1])}</b> altas.</p>
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

    // 5. Canción del año + playlist: locales con más altas
    slides.push({
      bg: ['#3a86ff', '#0a1550'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">Tu canción del año</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${esc(titleCase(s.locales[0][0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">El local que más ${who ? 'sonó' : 'pusiste'}: <b>${fmtInt(s.locales[0][1])}</b> altas.</p>
        </div>
        <ol class="wr-playlist">
          ${s.locales.map(([n, v], i) => `
            <li class="wr-anim" style="--d:${0.6 + i * 0.12}s">
              <span class="wr-track-n">${i + 1}</span>
              <span class="wr-cover" style="--hue:${(i * 57 + 200) % 360}">${esc(n.slice(0, 1))}</span>
              <span class="wr-track"><b>${esc(titleCase(n))}</b><small>${fmtInt(v)} altas</small></span>
              ${i === 0 ? '<span class="wr-playing"><i></i><i></i><i></i></span>' : ''}
            </li>`).join('')}
        </ol>`,
    });

    // 6. Artista del año: zonal con más altas
    const [z1, ...zRest] = s.zonales;
    slides.push({
      bg: ['#c4f000', '#2b3a00'],
      dark: true,
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">Tu artista del año</p>
          <div class="wr-anim wr-artist" style="--d:.3s">${esc(z1[0].split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
          <h2 class="wr-anim wr-title" style="--d:.5s">${esc(titleCase(z1[0]))}</h2>
          <p class="wr-anim wr-lead" style="--d:.7s"><b>${fmtInt(z1[1])}</b> altas juntos.</p>
          ${zRest.length ? `<p class="wr-anim wr-small" style="--d:1s">También en ${who ? `la rotación ${who === 'el equipo' ? 'del equipo' : 'del grupo'}` : 'tu rotación'}: ${zRest.map(([n]) => esc(titleCase(n))).join(' y ')}.</p>` : ''}
        </div>`,
    });

    // 7. Género: marca predominante
    const tot = s.sabores + s.extremas;
    const pS = pct(s.sabores, tot), pE = pct(s.extremas, tot);
    const top = pS >= pE ? ['Sabores Express', pS] : ['Hamburguesas Extremas', pE];
    slides.push({
      bg: ['#ff5d5d', '#5c0b2e'],
      html: `
        <div class="wr-top-copy">
          <p class="wr-anim wr-kicker" style="--d:.1s">Tu género del año</p>
          <h2 class="wr-anim wr-title" style="--d:.25s">${top[0]}</h2>
          <p class="wr-anim wr-lead" style="--d:.4s">${who ? `${cap(who)} es` : 'Sos'} <b>${fmtPct(top[1])}</b> ${top[0]}.</p>
        </div>
        <div class="wr-bubbles">
          <div class="wr-bubble" style="--s:${0.45 + pS * 0.55};--d:.6s"><b>${fmtPct(pS)}</b><span>Sabores</span></div>
          <div class="wr-bubble wr-bubble--alt" style="--s:${0.45 + pE * 0.55};--d:.8s"><b>${fmtPct(pE)}</b><span>Extremas</span></div>
        </div>`,
    });

    // 8. Escuchados hasta el final: presentismo día 1
    const R = 70, C = 2 * Math.PI * R;
    slides.push({
      bg: ['#7b2ff7', '#12063a'],
      html: `
        <div class="wr-center">
          <p class="wr-anim wr-kicker" style="--d:.1s">Escuchados hasta el final</p>
          <div class="wr-anim wr-ring" style="--d:.3s">
            <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${R}" class="wr-ring-bg"/><circle cx="80" cy="80" r="${R}" class="wr-ring-fg" style="--c:${C};--off:${C * (1 - s.presentismo)}"/></svg>
            <span data-count="${s.presentismo}" data-fmt="pct">0%</span>
          </div>
          <p class="wr-anim wr-lead" style="--d:.7s">De ${who ? `las altas ${who === 'el equipo' ? 'del equipo' : 'del grupo'}` : 'tus altas'}, el <b>${fmtPct(s.presentismo)}</b> se presentó el primer día.</p>
        </div>`,
    });

    // 9. Ranking (selector) o "tu banda" (equipo / grupo)
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
      const maxB = Math.max(...s.banda.map(([, v]) => v), 1);
      slides.push({
        bg: ['#ffb703', '#7a3b00'],
        dark: true,
        html: `
          <div class="wr-top-copy">
            <p class="wr-anim wr-kicker" style="--d:.1s">${team ? 'Tu banda' : 'La banda del grupo'}</p>
            <h2 class="wr-anim wr-title" style="--d:.25s">Los que más sonaron</h2>
          </div>
          <ul class="wr-band">
            ${s.banda.map(([n, v], i) => `
              <li class="wr-anim" style="--d:${0.45 + i * 0.12}s">
                <span>${medal(i)}</span><b>${esc(n)}</b>
                <span class="wr-band-bar"><i style="--w:${v / maxB * 100}%;--d:${(0.6 + i * 0.12).toFixed(2)}s"></i></span>
                <small>${fmtInt(v)}</small>
              </li>`).join('')}
          </ul>`,
      });
    }

    // 10. Aura: competencia más alta de la autoevaluación
    if (ctx.comp) {
      const cats = window.COMPETENCIAS_CATEGORIAS || [];
      const self = ctx.comp.autoevaluacion || [];
      const top3 = self.map((v, i) => [cats[i] ? cats[i].label : '', v]).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top3.length) {
        slides.push({
          bg: ['#ff8fd8', '#3b0a45'],
          html: `
            <div class="wr-center">
              <p class="wr-anim wr-kicker" style="--d:.1s">Tu aura del año</p>
              <div class="wr-anim wr-aura" style="--d:.3s"></div>
              <h2 class="wr-anim wr-title" style="--d:.5s">${esc(top3[0][0])}</h2>
              <p class="wr-anim wr-lead" style="--d:.7s">Tu competencia más fuerte según tu autoevaluación: <b>${top3[0][1]}/10</b>.</p>
              <div class="wr-chips">${top3.map(([l, v], i) => `<span class="wr-anim" style="--d:${0.9 + i * 0.12}s">${esc(l)} · ${v}</span>`).join('')}</div>
            </div>`,
        });
      }
    }

    // 11. Tarjeta final
    const cells = [
      ['Altas', fmtInt(s.total)],
      ['Mes en loop', cap(MESES[+s.best[0].slice(5) - 1])],
      ['Canción', titleCase(s.locales[0][0])],
      ['Artista', titleCase(z1[0])],
      ['Género', top[0] === 'Sabores Express' ? 'Sabores' : 'Extremas'],
      ['Presentismo', fmtPct(s.presentismo)],
    ];
    if (s.single && s.posVol > -1) cells.push(['Ranking', `${medal(s.posVol)} en volumen`]);
    else if (s.cumplimiento != null) cells.push(['Cumplimiento', fmtPct(s.cumplimiento)]);
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
              ${cells.map(([k, v], i) => `<div class="wr-anim" style="--d:${0.3 + i * 0.08}s"><small>${k}</small><b>${esc(v)}</b></div>`).join('')}
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
  // Base lo-fi simple a 92 BPM: acordes, bajo, bombo/caja/hi-hat y un
  // arpegio suave. Se genera en vivo, arranca con el clic del botón (los
  // navegadores no dejan reproducir audio sin un gesto del usuario).
  const Music = (() => {
    let ac = null, master = null, pad = null, noiseBuf = null, timer = null, nextT = 0, step = 0, on = false;
    const BPM = 92, S8 = 60 / BPM / 2;
    const PROG = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]; // Am7 Fmaj7 Cmaj7 G7
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
    function play(s, t) {
      const b8 = s % 8, chord = PROG[Math.floor(s / 8) % 4];
      if (b8 === 0) chord.forEach(n => tone(t, hz(n), S8 * 8, 'triangle', 0.045, pad));
      if (b8 === 0 || b8 === 5) kick(t);
      if (b8 === 0 || b8 === 3 || b8 === 4) tone(t, hz(chord[0] - 24), S8 * 2.5, 'sine', 0.22);
      if (b8 === 2 || b8 === 6) noise(t, 0.16, 0.12, 1200);
      noise(t, 0.035, b8 % 2 ? 0.025 : 0.04, 7000);
      if (b8 % 2 === 1) tone(t, hz(chord[(s >> 1) % 4] + 12), S8 * 1.6, 'triangle', 0.03, pad);
    }
    function tick() {
      while (nextT < ac.currentTime + 0.12) { play(step, nextT); nextT += S8; step++; }
    }
    function start() {
      try {
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          const comp = ac.createDynamicsCompressor();
          master = ac.createGain(); master.gain.value = 0;
          pad = ac.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = 1600; pad.connect(master);
          master.connect(comp); comp.connect(ac.destination);
          noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
          const ch = noiseBuf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        }
        ac.resume();
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(0.55, ac.currentTime, 0.4);
        nextT = ac.currentTime + 0.05; step = 0;
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
      if (Music.isOn()) Music.stop(); else Music.start();
      setSoundBtn();
    });
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'restart') go(0);
      else close();
    });
    document.addEventListener('keydown', onKey);

    Music.start();
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

  // ctx: { data, selectors (null = todo el equipo), name, label, color,
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
