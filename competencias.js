// competencias.js — datos de "Perfil de competencias" (radar autoevaluación
// vs. evaluación real) por integrante. Cada entrada de COMPETENCIAS_DATA usa
// la misma key que MEMBER_MAP en app.js (?miembro=agustina, ?miembro=rafael,
// etc.), y 'kevin' para el panel sin filtrar (dashboard.html sin ?miembro=).
// Si un integrante no tiene entrada acá (p. ej. "otros"), la sección de
// competencias directamente no se muestra en su dashboard — ver
// renderCompetencias en app.js.
//
// Las 10 competencias son siempre las mismas y en el mismo orden para todos,
// así que se definen una sola vez acá.
window.COMPETENCIAS_CATEGORIAS = [
  { key: 'adaptabilidad', label: 'Adaptabilidad' },
  { key: 'decisiones', label: 'Toma de decisiones' },
  { key: 'planificacion', label: 'Planificación' },
  { key: 'equipo', label: 'Trabajo en equipo' },
  { key: 'liderazgo', label: 'Liderazgo' },
  { key: 'conflictos', label: 'Resolución de conflictos' },
  { key: 'innovacion', label: 'Innovación' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'problemas', label: 'Resolución de problemas' },
  { key: 'creatividad', label: 'Creatividad' },
];

window.COMPETENCIAS_DATA = {
  agustin: {
    nombre: 'Agustín Márquez',
    // "Uno mismo": autoevaluación.
    autoevaluacion: [9, 9, 8, 9, 9, 9, 10, 8, 9, 10],
    // "Real": vista externa/evaluación real.
    real: [8, 7.5, 8.5, 7.5, 7, 7.5, 9, 8, 7.5, 8],
  },
  agustina: {
    nombre: 'Agustina Castillo',
    autoevaluacion: [7.5, 7, 10, 8, 7, 7, 9, 8.5, 8, 10],
    real: [6, 5, 6, 9, 5, 4, 8, 5, 5, 10],
  },
  rafael: {
    nombre: 'Rafael Barberi',
    autoevaluacion: [7.5, 6.5, 8.5, 9, 5, 7, 8, 9, 7, 6.5],
    real: [8.5, 7.5, 8.5, 9, 6, 7.5, 7, 8.5, 8, 6.5],
  },
  gustavo: {
    nombre: 'Gustavo Sotelo',
    autoevaluacion: [9, 8, 8.5, 9, 8.5, 8, 8, 9, 8, 8],
    real: [9, 9, 7, 10, 8, 8, 6, 7, 8, 7],
  },
  kevin: {
    nombre: 'Kevin García',
    autoevaluacion: [8.5, 8.5, 9, 8, 9.5, 9, 7, 7.5, 9, 6.5],
    // Todavía no se cargó su evaluación real: el botón "Ver evaluación
    // real" queda deshabilitado hasta que se sume ese dato (ver app.js).
  },
};
