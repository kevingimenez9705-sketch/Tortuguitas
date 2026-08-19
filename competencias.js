// competencias.js — datos de "Perfil de competencias" (radar autoevaluación
// vs. evaluación real) por integrante. Cada entrada usa la misma key que
// MEMBER_MAP en app.js (?miembro=). Si un integrante no tiene entrada acá,
// la sección de competencias directamente no se muestra en su dashboard
// (ver renderCompetencias en app.js).
window.COMPETENCIAS_DATA = {
  agustin: {
    nombre: 'Agustín Márquez',
    categorias: [
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
    ],
    // "Uno mismo": autoevaluación de Agustín.
    autoevaluacion: [9, 9, 8, 9, 9, 9, 10, 8, 9, 10],
    // "Real": vista externa/evaluación real.
    real: [8, 7.5, 8.5, 7.5, 7, 7.5, 9, 8, 7.5, 8],
  },
};
