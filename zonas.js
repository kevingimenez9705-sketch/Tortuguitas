// zonas.js — a qué zona del mapa (Zona Norte, Oeste, Sur, Capital Federal u
// "Otros") pertenece cada local, y el contorno de cada zona. Lo usan el mapa
// de zonas del dashboard (app.js) y el mapa 3D de la terminal de la azotea
// (personajes.js). Script clásico: deja todo en window.ZONAS.
(function () {
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

  // Contorno de cada zona en las coordenadas del SVG del dashboard
  // (viewBox 0 0 500 480, dashboard.html): mismos puntos que sus <path>.
  const FORMAS = {
    norte: [[145, 15], [250, 8], [330, 50], [300, 95], [355, 130], [340, 165], [295, 145], [250, 180], [200, 150], [160, 180], [120, 145], [95, 130], [100, 70]],
    oeste: [[95, 130], [120, 145], [160, 180], [200, 150], [250, 180], [270, 230], [240, 270], [280, 310], [250, 350], [290, 390], [260, 420], [250, 460], [215, 420], [175, 445], [130, 400], [150, 350], [95, 330], [110, 280], [55, 250], [70, 200], [30, 165], [60, 110]],
    sur: [[270, 230], [300, 255], [330, 235], [350, 270], [385, 245], [385, 210], [440, 235], [470, 290], [460, 345], [410, 330], [420, 380], [370, 420], [330, 400], [300, 440], [250, 460], [260, 420], [290, 390], [250, 350], [280, 310], [240, 270]],
    capital: [[250, 180], [295, 145], [340, 165], [355, 130], [410, 175], [385, 210], [385, 245], [350, 270], [330, 235], [300, 255], [270, 230]],
  };
  const NOMBRES = { norte: 'Zona Norte', oeste: 'Zona Oeste', sur: 'Zona Sur', capital: 'Capital Federal', otros: 'Otros (fuera de zona)' };

  window.ZONAS = { zonaFor, normalizeLocal, FORMAS, NOMBRES, ORDEN: ['norte', 'oeste', 'sur', 'capital'] };
})();
