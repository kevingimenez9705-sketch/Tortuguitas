/* =========================================================
   BOTONERA · las funciones de Citaciones Tortus como botones
   Para la Ruta del ingresante (Tortuguitas · oficina.html).

   Va en un proyecto de Apps Script APARTE: el de la planilla no se toca.
   Archivos del proyecto:
     - Codigo.gs y Citacion.html → copia exacta de los de Citaciones-Gustavo
       (no copiar PanelB.gs ni Panel.html: tienen su propio doGet).
     - Botonera.gs (este) y Pantalla.html → los botones. (Apps Script no deja
       dos archivos con el mismo nombre, aunque uno sea .gs y el otro .html.)

   Hace lo mismo que el menú de la planilla, con las funciones de Codigo.gs:
     vista "citar"        → 📞 Citar por zona · 🗑️ Eliminar filas ENVIADO
     vista "confirmados"  → 📋 Recopilar confirmados · 📩 Organizar confirmaciones en Gmail
   Las ventanas del menú (ui.alert) pasan a la pantalla de la botonera; el resto
   es igual. La recopilación automática se sigue activando desde el menú.

   Implementar > Nueva implementación > Aplicación web
     Ejecutar como: Usuario que accede a la aplicación web
     Quién tiene acceso: Cualquier usuario con una cuenta de Google
   Así cada uno cita desde su Gmail y recopila de su casilla, como hoy.
   ========================================================= */

const PLANILLA_CITACIONES = '1HF7Hpj6tQ6yd0FDC1TTvK0hG2xOhdELCYiGy80fZhhI';


/* =========================================================
   ENTRADA WEB
   ========================================================= */

function doGet(e) {
  const pedida = e && e.parameter ? e.parameter.vista : '';
  const template = HtmlService.createTemplateFromFile('Pantalla');
  template.vista = pedida === 'confirmados' ? 'confirmados' : 'citar';

  return template
    .evaluate()
    .setTitle('Botonera · Citaciones Tortus')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// En la planilla el script la toma como "activa"; acá se abre por ID.
// Los confirmados van a la misma planilla, hoja "Confirmados".
function libroCitaciones_() {
  CONFIG.PLANILLA_CONFIRMADOS = PLANILLA_CITACIONES;
  return SpreadsheetApp.openById(PLANILLA_CITACIONES);
}

function pestanaCitaciones_(nombre) {
  const hoja = libroCitaciones_().getSheetByName(String(nombre || ''));

  if (!hoja || !esHojaCitaciones_(hoja.getName())) {
    throw new Error(`No encontré la pestaña "${nombre}".`);
  }
  return hoja;
}

function zonaPedida_(zona) {
  return zona && CONFIG.ZONAS[zona] ? zona : '';
}


/* =========================================================
   1. CITAR POR ZONA
   ========================================================= */

// Lo que muestran los botones: pendientes por pestaña y zona (misma regla que el menú)
function estadoCitar() {
  const libro = libroCitaciones_();
  const yo = citador_();

  const pestanas = libro.getSheets()
    .filter(hoja => esHojaCitaciones_(hoja.getName()))
    .map(hoja => {
      try {
        const lectura = leerPendientes_(hoja, '');
        const porZona = {};
        lectura.items.forEach(item => {
          porZona[item.zona] = (porZona[item.zona] || 0) + 1;
        });

        return {
          nombre: hoja.getName(),
          porZona: porZona,
          total: lectura.items.length,
          sinZona: lectura.filasSinZona.length,
          enviadas: contarEnviadas_(hoja, lectura.col.estado)
        };
      } catch (error) {
        return { nombre: hoja.getName(), error: error.message };
      }
    });

  return {
    cita: yo.nombre,
    cupo: MailApp.getRemainingDailyQuota(),
    zonas: CONFIG.ZONAS,
    pestanas: pestanas
  };
}

function contarEnviadas_(hoja, colEstado) {
  return hoja.getDataRange().getDisplayValues().slice(1)
    .filter(fila => String(fila[colEstado] || '').trim().toUpperCase() === 'ENVIADO')
    .length;
}

// Lo mismo que muestra el menú antes de "¿Continuar?", más la lista para revisar
function vistaPreviaCitar(pestana, zona) {
  validarConfig_();

  const hoja = pestanaCitaciones_(pestana);
  const zonaFiltro = zonaPedida_(zona);
  const lectura = leerPendientes_(hoja, zonaFiltro);

  const resumen = {};
  lectura.items.forEach(item => {
    const clave = `${item.zona} → ${item.sede}`;
    resumen[clave] = (resumen[clave] || 0) + 1;
  });

  return {
    pestana: hoja.getName(),
    zona: zonaFiltro,
    titulo: zonaFiltro ? `Citar ${zonaFiltro} → ${CONFIG.ZONAS[zonaFiltro]}` : 'Citar todas las zonas',
    cita: citador_().nombre,
    cupo: MailApp.getRemainingDailyQuota(),
    resumen: resumen,
    total: lectura.items.length,
    sinZona: lectura.filasSinZona,
    claves: lectura.items.map(item => item.clave),
    filas: lectura.items.map(item => ({
      fila: item.numeroFila,
      nombre: item.nombre,
      puesto: item.puesto,
      fecha: item.fechaEntrevista,
      hora: item.horaEntrevista,
      sede: item.sede
    }))
  };
}

// El envío de enviarCitaciones_() después de "Sí": solo lo aprobado en la vista previa
function citar(pestana, zona, claves) {
  validarConfig_();

  const hoja = pestanaCitaciones_(pestana);
  const zonaFiltro = zonaPedida_(zona);
  const citador = citador_();
  const pedidas = Array.isArray(claves) ? claves : [];

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Hay otro envío o recopilación en curso. Probá de nuevo en un minuto.');
  }

  let enviados = 0;
  let errores = 0;
  let salteados = 0;

  try {
    // Se relee con el bloqueo tomado: si otra persona ya envió o borró filas
    // mientras estaba abierta la vista previa, no se duplica ni se marca otra fila
    const aprobadas = {};
    pedidas.forEach(clave => {
      aprobadas[clave] = (aprobadas[clave] || 0) + 1;
    });

    const actual = leerPendientes_(hoja, zonaFiltro);
    const col = actual.col;

    const aEnviar = actual.items.filter(item => {
      if (!aprobadas[item.clave]) return false;
      aprobadas[item.clave]--;
      return true;
    });

    salteados = pedidas.length - aEnviar.length;

    aEnviar.forEach(item => {
      // El menú de la planilla usa otro bloqueo: justo antes de mandar se mira
      // que la fila siga siendo la misma persona y siga sin ENVIADO
      const fila = hoja.getRange(item.numeroFila, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
      const mismaPersona = String(fila[col.email] || '').trim().toLowerCase() === item.email.toLowerCase();
      const yaEnviada = String(fila[col.estado] || '').trim().toUpperCase() === 'ENVIADO';

      if (!mismaPersona || yaEnviada) {
        salteados++;
        return;
      }

      try {
        MailApp.sendEmail({
          to: item.email,
          subject: asuntoCitacion_(item.sede),
          name: CONFIG.SENDER_NAME,
          htmlBody: generarHtml(item),
          body:
            `Citación a Entrevista Presencial - SABORES EXTREMAS\n\n` +
            `Hola ${item.nombre}, te citamos a la entrevista presencial.\n\n` +
            `Puesto: ${item.puesto}\n` +
            `Fecha: ${item.fechaEntrevista}\n` +
            `Hora: ${item.horaEntrevista} HS\n` +
            `Sede: ${item.sede} - ${direccionTexto_(item.sede)}.`
        });

        hoja.getRange(item.numeroFila, col.estado + 1).setValue('ENVIADO');

        if (col.fechaEnvio !== undefined) {
          hoja.getRange(item.numeroFila, col.fechaEnvio + 1).setValue(new Date());
        }
        if (col.sede !== undefined) {
          hoja.getRange(item.numeroFila, col.sede + 1).setValue(item.sede);
        }
        if (col.cito !== undefined) {
          hoja.getRange(item.numeroFila, col.cito + 1).setValue(citador.nombre);
        }

        enviados++;

      } catch (error) {
        hoja
          .getRange(item.numeroFila, col.estado + 1)
          .setValue('ERROR: ' + error.message);

        console.error(error);
        errores++;
      }
    });

    SpreadsheetApp.flush();

  } finally {
    lock.releaseLock();
  }

  return { enviados: enviados, errores: errores, salteados: salteados };
}


/* =========================================================
   2. ELIMINAR FILAS CON ESTADO ENVIADO (de una pestaña)
   ========================================================= */

function eliminarEnviadas(pestana) {
  const hoja = pestanaCitaciones_(pestana);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Hay otro envío o recopilación en curso. Probá de nuevo en un minuto.');
  }

  let eliminadas = 0;

  try {
    const vis = hoja.getDataRange().getDisplayValues();
    const colEstado = buscar_(mapaColumnas_(vis[0] || []), ['estado envio']);

    if (colEstado === undefined) {
      throw new Error('Falta la columna "Estado Envio" en la pestaña.');
    }

    const enviado = i => String(vis[i][colEstado] || '').trim().toUpperCase() === 'ENVIADO';

    // De abajo hacia arriba, borrando bloques de filas seguidas
    let i = vis.length - 1;
    while (i >= 1) {
      if (!enviado(i)) {
        i--;
        continue;
      }

      const fin = i;
      while (i >= 1 && enviado(i)) i--;
      const cantidad = fin - i;

      // Sheets no deja borrar todas las filas no inmovilizadas
      if (hoja.getMaxRows() - cantidad <= hoja.getFrozenRows()) {
        hoja.insertRowAfter(hoja.getMaxRows());
      }

      hoja.deleteRows(i + 2, cantidad);
      eliminadas += cantidad;
    }

    SpreadsheetApp.flush();

  } finally {
    lock.releaseLock();
  }

  return { pestana: hoja.getName(), eliminadas: eliminadas };
}


/* =========================================================
   3. RECOPILAR CONFIRMADOS (como "📋 Recopilar confirmados")
   Lee los "Confirmo" de la casilla de quien lo usa, últimos
   CONFIG.DIAS_ATRAS días, y los suma a "Confirmados" sin duplicar.
   ========================================================= */

function estadoConfirmados() {
  libroCitaciones_();
  const destino = obtenerHojaConfirmados_();

  return {
    casilla: citador_().email,
    planilla: destino.libro.getName(),
    hoja: destino.hoja.getName(),
    filas: Math.max(0, destino.hoja.getLastRow() - 1),
    diasAtras: CONFIG.DIAS_ATRAS
  };
}

// Copia de recopilar_(true) de Codigo.gs: cambia solo de dónde lee las citaciones
function recopilar() {
  libroCitaciones_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Hay otro envío o recopilación en curso. Probá de nuevo en un minuto.');
  }

  try {
    const ahora = Math.floor(Date.now() / 1000);
    const inicio = inicioListado_();
    const desde = Math.max(ahora - CONFIG.DIAS_ATRAS * 86400, inicio);

    const yo = citador_();
    const casillaComun = String(CONFIG.CASILLA_CONFIRMACIONES || '').trim().toLowerCase();
    const leoCasillaComun = !!casillaComun && casillaComun === yo.email;

    const mensajes = leerConfirmaciones_(desde, inicio, yo.email);
    const destino = obtenerHojaConfirmados_();
    const claves = clavesConfirmados_(destino);
    const citas = citasPorEmailBotonera_();

    const filas = [];
    const porSede = {};
    let sinDato = 0;

    mensajes.forEach(mensaje => {
      const cita = citas[mensaje.email];

      // Lo que el mail no trae se completa con la pestaña de citaciones
      if (cita) {
        if (mensaje.fecha === CONFIG.SIN_DATO) mensaje.fecha = cita.fecha;
        if (mensaje.hora === CONFIG.SIN_DATO) mensaje.hora = cita.hora;
        if (!mensaje.sede) mensaje.sede = cita.sede;
        if (!mensaje.nombre || mensaje.nombre === CONFIG.SIN_DATO) {
          mensaje.nombre = cita.nombre || mensaje.nombre;
        }
      }

      mensaje.sede = mensaje.sede || CONFIG.SIN_DATO;
      mensaje.nombre = mensaje.nombre || CONFIG.SIN_DATO;

      // La confirmación llega a quien citó; en la casilla común se toma de la citación
      mensaje.cito = leoCasillaComun
        ? ((cita && cita.cito) || CONFIG.SIN_DATO)
        : yo.nombre;

      const clave = [mensaje.email, mensaje.fecha, mensaje.hora].join('|');
      if (claves[clave]) {
        return; // ya estaba en el listado (o confirmó dos veces)
      }
      claves[clave] = true;

      if (mensaje.fecha === CONFIG.SIN_DATO || mensaje.hora === CONFIG.SIN_DATO) {
        sinDato++;
      }

      porSede[mensaje.sede] = (porSede[mensaje.sede] || 0) + 1;
      filas.push(mensaje);
    });

    escribirConfirmados_(destino, filas);
    SpreadsheetApp.flush();

    return {
      casilla: yo.email,
      leidos: mensajes.length,
      nuevos: filas.length,
      sinDato: sinDato,
      porSede: porSede,
      hoja: destino.hoja.getName(),
      planilla: destino.libro.getName()
    };

  } finally {
    lock.releaseLock();
  }
}

// Copia de citasPorEmail_() de Codigo.gs, con la planilla abierta por ID
function citasPorEmailBotonera_() {
  const citas = {};

  libroCitaciones_().getSheets().forEach(hoja => {
    if (!esHojaCitaciones_(hoja.getName())) return;

    const vis = hoja.getDataRange().getDisplayValues();
    if (vis.length < 2) return;

    const mapa = mapaColumnas_(vis[0]);
    const c = {
      email: buscar_(mapa, ALIAS.email),
      nombre: buscar_(mapa, ALIAS.nombre),
      fecha: buscar_(mapa, ['fecha entrevista']),
      hora: buscar_(mapa, ['hora entrevista']),
      zona: buscar_(mapa, ['zona']),
      sede: buscar_(mapa, ['sede']),
      cito: buscar_(mapa, ALIAS.cito)
    };

    if (c.email === undefined) return;

    for (let i = 1; i < vis.length; i++) {
      const fila = vis[i];
      const email = celda_(fila, c.email).toLowerCase();
      if (!email) continue;

      const sede =
        sedeCanonica_(celda_(fila, c.sede)) ||
        CONFIG.ZONAS[zonaCanonica_(celda_(fila, c.zona))] ||
        '';

      citas[email] = {
        nombre: celda_(fila, c.nombre),
        fecha: fechaDeCelda_(celda_(fila, c.fecha)),
        hora: horaDeCelda_(celda_(fila, c.hora)),
        sede: sede,
        cito: celda_(fila, c.cito)
      };
    }
  });

  return citas;
}


/* =========================================================
   4. ORGANIZAR CONFIRMACIONES EN GMAIL
   Copia de procesarConfirmaciones(): etiqueta por sede y archiva.
   ========================================================= */

function organizarGmail() {
  const BUSQUEDA = 'subject:(Confirmacion OR Confirmación OR ENTREVISTA) label:inbox';
  const etiquetas = {};

  const etiqueta = nombre => {
    if (!etiquetas[nombre]) {
      etiquetas[nombre] = GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre);
    }
    return etiquetas[nombre];
  };

  etiqueta(CONFIG.ETIQUETA_GMAIL);

  let total = 0;
  const porSede = {};

  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const hilos = GmailApp.search(BUSQUEDA, 0, 100);
    if (hilos.length === 0) break;

    const grupos = {};
    hilos.forEach(hilo => {
      const sede = sedeDelMensaje_(hilo.getFirstMessageSubject()) || 'Sin sede';
      (grupos[sede] = grupos[sede] || []).push(hilo);
    });

    Object.keys(grupos).forEach(sede => {
      etiqueta(`${CONFIG.ETIQUETA_GMAIL}/${sede}`).addToThreads(grupos[sede]);
      porSede[sede] = (porSede[sede] || 0) + grupos[sede].length;
    });

    GmailApp.moveThreadsToArchive(hilos);
    total += hilos.length;

    if (hilos.length < 100) break;
  }

  return { casilla: citador_().email, total: total, porSede: porSede };
}
