// charts.js — helpers genéricos para instanciar/actualizar gráficos Chart.js
const Charts = (() => {
  const instances = {};

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

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function line(id, labels, data, opts = {}) {
    destroy(id);
    const ctx = document.getElementById(id).getContext('2d');
    instances[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: opts.color || COLORS.blue,
          backgroundColor: (opts.color || COLORS.blue) + '22',
          fill: !!opts.fill,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: opts.color || COLORS.blue,
        }],
      },
      options: baseOptions(opts),
    });
    return instances[id];
  }

  function stackedBar(id, labels, series, opts = {}) {
    destroy(id);
    const ctx = document.getElementById(id).getContext('2d');
    instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: series.map(s => ({
          label: s.label,
          data: s.data,
          backgroundColor: s.color,
          stack: 'stack1',
          borderRadius: 4,
        })),
      },
      options: {
        ...baseOptions(opts),
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: '#eef1f6' } },
        },
      },
    });
    return instances[id];
  }

  function horizontalBar(id, labels, data, color = COLORS.blue, opts = {}) {
    destroy(id);
    const ctx = document.getElementById(id).getContext('2d');
    instances[id] = new Chart(ctx, {
      type: 'bar',
      // categoryPercentage alto: con solo 5 categorías (Top 5) el chart-wrap
      // quedaba con huecos grandes entre barras — así ocupan más del alto
      // disponible.
      data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 4, barPercentage: 0.9, categoryPercentage: 0.95 }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { grid: { color: '#eef1f6' } },
          y: { grid: { display: false } },
        },
        ...opts,
      },
    });
    return instances[id];
  }

  function donut(id, labels, data, colors, opts = {}) {
    destroy(id);
    const ctx = document.getElementById(id).getContext('2d');
    instances[id] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        ...opts,
      },
    });
    return instances[id];
  }

  // Radar (spider) chart — usado para el "Perfil de competencias" (autoevaluación
  // vs. evaluación real superpuestas). datasets: [{ label, data, color, dashed, hidden }]
  function radar(id, labels, datasets, opts = {}) {
    destroy(id);
    const ctx = document.getElementById(id).getContext('2d');
    instances[id] = new Chart(ctx, {
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
    });
    return instances[id];
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

  return { line, stackedBar, horizontalBar, donut, radar, COLORS };
})();
