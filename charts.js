// charts.js — helpers genéricos para instanciar/actualizar gráficos Chart.js
const Charts = (() => {
  const instances = {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = {
    blue: '#4c7cf0',
    blueLight: '#a9c4f7',
    navy: '#0f1c3f',
    green: '#3fbf7f',
    purple: '#7c5cf0',
    red: '#e05263',
    orange: '#f0a94c',
    grey: '#c7ceda',
  };

  // ---------- Estilo global ----------
  // Misma tipografía que la página y tooltips oscuros redondeados, para que
  // los gráficos no se vean como el "default" de Chart.js.
  const FONT = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.family = FONT;
  Chart.defaults.color = '#6b7280';
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: 'rgba(15,28,63,.94)',
    padding: 10,
    cornerRadius: 8,
    caretSize: 6,
    boxPadding: 4,
    usePointStyle: true,
    titleFont: { weight: '700' },
  });
  Chart.defaults.animation.duration = reduce ? 0 : 900;
  Chart.defaults.animation.easing = 'easeOutQuart';

  // Acepta '#rrggbb' o 'rgb(r,g,b)' (los tonos claros de THEME vienen así).
  function rgba(color, a) {
    let r, g, b;
    if (color[0] === '#') {
      const n = parseInt(color.slice(1), 16);
      r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
    } else {
      [r, g, b] = color.match(/\d+/g).map(Number);
    }
    return `rgba(${r},${g},${b},${a})`;
  }
  // Degradado vertical (área bajo la línea) u horizontal (barras de los Top 5).
  function gradient(color, from, to, horizontal) {
    return (ctx) => {
      const { chart } = ctx;
      const area = chart.chartArea;
      if (!area) return rgba(color, to);
      const g = horizontal
        ? chart.ctx.createLinearGradient(area.left, 0, area.right, 0)
        : chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      g.addColorStop(0, rgba(color, from));
      g.addColorStop(1, rgba(color, to));
      return g;
    };
  }
  // Entrada escalonada: cada punto/barra arranca un poco después del anterior.
  function stagger(step) {
    return {
      delay: (ctx) => (ctx.type === 'data' && ctx.mode === 'default' && !reduce)
        ? ctx.dataIndex * step + ctx.datasetIndex * (step / 2) : 0,
    };
  }
  // Porcentajes siempre con 1 decimal (como los KPIs: 89.0%); cantidades
  // enteras con separador de miles (1.501).
  function fmtNum(v, suffix = '') {
    const s = (suffix === '%' || !Number.isInteger(v)) ? v.toFixed(1) : v.toLocaleString('es-AR');
    return s + suffix;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- Plugins propios ----------
  // Líneas: marca el mes más alto (pastilla "Máx") y el promedio del período
  // (línea punteada), más una guía vertical al pasar el mouse. Todo se
  // calcula sobre los mismos datos que ya grafica el chart, no agrega datos.
  Chart.register({
    id: 'insights',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.enabled) return;
      const data = chart.data.datasets[0].data;
      const meta = chart.getDatasetMeta(0);
      if (!data || data.length < 2 || !meta.data.length) return;
      const { ctx: c, chartArea: area, scales: { y } } = chart;
      const color = opts.color;
      c.save();

      // Guía vertical en el punto activo
      const active = chart.tooltip && chart.tooltip.getActiveElements();
      const hovering = !!(active && active.length);
      if (hovering) {
        const x = active[0].element.x;
        c.strokeStyle = rgba(color, 0.35);
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, area.top); c.lineTo(x, area.bottom); c.stroke();
      }

      // Máximo: pastilla sobre el punto más alto (se dibuja al final, arriba
      // de la línea del promedio).
      let mi = 0;
      data.forEach((v, i) => { if (v > data[mi]) mi = i; });
      const pt = meta.data[mi];
      let pill = null;
      if (data[mi] > 0 && pt && !hovering) { // con tooltip abierto se oculta para no taparlo
        const text = `Máx ${fmtNum(data[mi], opts.suffix)}`;
        c.font = `800 11px ${FONT}`;
        const w = c.measureText(text).width + 14;
        const h = 20;
        const x = Math.max(area.left, Math.min(area.right - w, pt.x - w / 2));
        let yTop = pt.y - h - 12;
        if (yTop < 2) yTop = pt.y + 12; // sin lugar arriba: va debajo
        pill = { text, x, y: yTop, w, h };
      }

      // Promedio: opts.avg cuando el gráfico tiene un promedio "oficial"
      // (el mismo del KPI y del ranking: total enviados / total vacantes,
      // no el promedio simple de los % de cada mes, que da otro número).
      const avg = opts.avg != null ? opts.avg : data.reduce((a, b) => a + b, 0) / data.length;
      const yAvg = y.getPixelForValue(avg);
      c.setLineDash([5, 5]);
      c.strokeStyle = rgba(color, 0.5);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(area.left, yAvg); c.lineTo(area.right, yAvg); c.stroke();
      c.setLineDash([]);
      // Etiqueta del promedio afuera del área del gráfico (margen derecho),
      // como marca del eje: así nunca se pisa con la línea ni con "Máx".
      const label = fmtNum(Math.round(avg * 10) / 10, opts.suffix);
      c.font = `800 10px ${FONT}`;
      const lw = c.measureText(label).width + 10;
      const lx = area.right + 6;
      c.fillStyle = rgba(color, 0.14);
      roundRect(c, lx, yAvg - 9, lw, 18, 9);
      c.fill();
      c.fillStyle = color;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(label, lx + 5, yAvg + 0.5);
      c.font = `700 9px ${FONT}`;
      c.fillStyle = rgba(color, 0.75);
      c.textBaseline = 'top';
      c.fillText('PROM.', lx + 2, yAvg + 11);

      if (pill) {
        c.font = `800 11px ${FONT}`;
        c.fillStyle = color;
        c.shadowColor = 'rgba(15,28,63,.25)';
        c.shadowBlur = 6;
        roundRect(c, pill.x, pill.y, pill.w, pill.h, 10);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(pill.text, pill.x + pill.w / 2, pill.y + pill.h / 2 + 0.5);
      }
      c.restore();
    },
  });

  // Barras horizontales: el valor escrito al final de cada barra.
  Chart.register({
    id: 'barValues',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.enabled) return;
      const c = chart.ctx;
      const data = chart.data.datasets[0].data;
      c.save();
      c.font = `800 11px ${FONT}`;
      c.fillStyle = '#1c2333';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        c.fillText(fmtNum(data[i]), bar.x + 6, bar.y);
      });
      c.restore();
    },
  });

  // ---------- Montaje diferido ----------
  // Los gráficos que todavía no se ven se crean recién cuando entran en
  // pantalla: así la animación de entrada se ve en vez de pasar "debajo"
  // del scroll. Una vez visto, cada re-render (cambio de período) lo crea
  // de inmediato.
  const seen = new Set();
  const pending = {};
  const io = ('IntersectionObserver' in window && !reduce)
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      io.unobserve(e.target);
      seen.add(id);
      if (pending[id]) {
        instances[id] = new Chart(e.target.getContext('2d'), pending[id]);
        delete pending[id];
      }
    }), { threshold: 0.25 })
    : null;

  function mount(id, config, eager) {
    destroy(id);
    const canvas = document.getElementById(id);
    if (eager || !io || seen.has(id)) {
      seen.add(id);
      instances[id] = new Chart(canvas.getContext('2d'), config);
      return instances[id];
    }
    if (!pending[id]) io.observe(canvas);
    pending[id] = config;
    return null;
  }

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  // opts: { color, suffix ('%'), avg (promedio a marcar; si no, el simple),
  //         insights (false para apagar Máx/Prom.) }
  function line(id, labels, data, opts = {}) {
    const color = opts.color || COLORS.blue;
    const suffix = opts.suffix || '';
    const base = baseOptions(opts);
    return mount(id, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: gradient(color, 0.32, 0),
          fill: true,
          tension: 0.38,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        }],
      },
      options: {
        ...base,
        // top: lugar para la pastilla "Máx"; right: etiqueta del promedio.
        layout: { padding: { top: 34, right: opts.insights === false ? 0 : 58 } },
        interaction: { mode: 'index', intersect: false },
        animation: stagger(60),
        plugins: {
          ...base.plugins,
          tooltip: { callbacks: { label: (ctx) => ' ' + fmtNum(ctx.parsed.y, suffix) } },
          insights: { enabled: opts.insights !== false, color, suffix, avg: opts.avg },
        },
      },
    });
  }

  function horizontalBar(id, labels, data, color = COLORS.blue, opts = {}) {
    return mount(id, {
      type: 'bar',
      // El chart-wrap.small ahora es más alto para que el "Top 5" respire
      // más — categoryPercentage más bajo que 0.95 le devuelve separación
      // real entre barras en vez de quedar todas pegadas.
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: gradient(color, 0.55, 1, true),
          hoverBackgroundColor: color,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.85,
          categoryPercentage: 0.7,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 34 } },
        animation: stagger(90),
        plugins: { legend: { display: false }, tooltip: { enabled: true }, barValues: { enabled: true } },
        scales: {
          x: { grid: { color: '#eef1f6' } },
          y: { grid: { display: false } },
        },
        ...opts,
      },
    });
  }

  // Radar (spider) chart — usado para el "Perfil de competencias" (autoevaluación
  // vs. evaluación real superpuestas). datasets: [{ label, data, color, dashed, hidden }]
  // Se monta siempre de inmediato: app.js usa la instancia para el botón
  // "Ver evaluación real".
  function radar(id, labels, datasets, opts = {}) {
    return mount(id, {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map(d => ({
          label: d.label,
          data: d.data,
          borderColor: d.color,
          backgroundColor: d.color + '2e',
          borderWidth: 2,
          borderDash: d.dashed ? [6, 4] : [],
          pointBackgroundColor: d.color,
          pointRadius: 3,
          pointHoverRadius: 6,
          hidden: !!d.hidden,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: { enabled: true },
        },
        scales: {
          r: {
            min: 0,
            max: opts.max || 10,
            ticks: { stepSize: opts.step || 2, backdropColor: 'transparent' },
            // #e4e8f0 (el gris original) quedaba casi invisible contra el
            // fondo del chart-wrap (#e4e9f2, prácticamente el mismo tono) —
            // se oscurece para que las líneas de referencia se sigan viendo.
            grid: { color: '#b7c0d6' },
            angleLines: { color: '#b7c0d6' },
            pointLabels: { font: { size: 11 } },
          },
        },
      },
    }, true);
  }

  function baseOptions(opts = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: !!opts.legend, position: 'bottom' },
        tooltip: { enabled: true },
      },
      scales: opts.noScales ? {} : {
        x: { grid: { display: false } },
        y: { grid: { color: '#eef1f6' }, beginAtZero: true },
      },
    };
  }

  return { line, horizontalBar, radar, COLORS };
})();
