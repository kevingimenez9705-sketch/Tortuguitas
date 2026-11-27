// reparto.js — "Seleccion" no es un selector: son vacantes que cubrió el
// equipo en general (planilla, nov 2026). No se muestra como uno más en los
// gráficos ni en los rankings: se reparte parejo entre los integrantes
// activos (misma semana y mes, enviados/vacantes divididos en partes iguales,
// así el % de cada uno no se distorsiona). Lo usan dashboard.html (también
// sobre el cumplimiento en vivo de El Dojo) y personajes.html.
window.repartirSeleccion = (() => {
  const ACTIVOS = ['Agustin', 'Agustina', 'Rafael', 'Gustavo', 'Albana'];
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const esSeleccion = (s) => norm(s) === 'seleccion';
  const parte = (x) => (x == null ? x : Number(x) / ACTIVOS.length);

  function repartir(filas) {
    return filas.flatMap((r) => !esSeleccion(r.selector) ? [r] : ACTIVOS.map((selector) => ({
      ...r, selector, enviados: parte(r.enviados), restantes: parte(r.restantes), total: parte(r.total),
    })));
  }

  if (window.ALTAS_DATA) window.ALTAS_DATA.cumplimiento = repartir(window.ALTAS_DATA.cumplimiento || []);
  return repartir;
})();
