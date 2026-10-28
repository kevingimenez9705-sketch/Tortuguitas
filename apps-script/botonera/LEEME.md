# Botonera · las funciones de Citaciones Tortus como botones

Pone las funciones del menú de la planilla Citaciones Tortus como botones dentro de las oficinas de la Ruta (`oficina.html`):

- **Citados** → 📞 Citar por zona (CABA y Norte → Florida, Sur → Adrogué, Oeste → Merlo, o todas), con vista previa antes de mandar, y 🗑️ Eliminar filas ENVIADO.
- **Confirmaron** → 📋 Recopilar confirmados y 📩 Organizar confirmaciones en Gmail.

Publicada en `https://script.google.com/macros/s/AKfycbzxs6r4Gt7tBRg1KjaltsDWeBLRxGPkByTbcNaWlWpyQHoXLNbZ019WtKRvYjGg4WMghA/exec` (proyecto "Botonera Citaciones" en el Drive de kevingimenez9705@gmail.com).

Usa el mismo código de la planilla (`Codigo.gs` y `Citacion.html`) en un **proyecto aparte**: el de la planilla no se toca. Corre con la cuenta de quien la usa, así que la citación sale de su Gmail y la recopilación lee su casilla, igual que con el menú. La recopilación automática se sigue activando desde el menú de la planilla.

## Cómo publicarla (una sola vez)

1. Entrá a [script.google.com](https://script.google.com) → **Nuevo proyecto**. Nombre: `Botonera Citaciones`.
2. ⚙️ **Configuración del proyecto** → Zona horaria: **(GMT-03:00) Buenos Aires**.
3. En el editor:
   - Renombrá `Código.gs` a `Codigo` y pegá **el mismo** `Codigo.gs` del proyecto Citaciones-Gustavo.
   - **+ → HTML** → `Citacion` → pegá el mismo `Citacion.html`.
   - **+ → Secuencia de comandos** → `Funciones` → pegá [`Funciones.gs`](Funciones.gs).
   - **+ → HTML** → `Botonera` → pegá [`Botonera.html`](Botonera.html) (no puede llamarse igual que el `.gs`).
   - No copies `PanelB.gs` ni `Panel.html`: tienen su propio `doGet`.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con una cuenta de Google**
5. **Implementar** → autorizá los permisos → copiá la URL que termina en `/exec` y pegala en `BOTONERA_URL` de `ruta.js`.

Cada persona del equipo abre esa URL **una vez** en una pestaña para dar permiso con su cuenta; después los botones andan dentro de la página. Solo puede usarla quien tiene acceso a la planilla.

La zona horaria tiene que ser Buenos Aires: si queda otra (por ejemplo Nueva York), las fechas de entrevista que vienen como fecha de la planilla pueden salir un día antes en el mail.

Si cambia `Codigo.gs` en la planilla, pegá la versión nueva acá también y hacé **Implementar → Gestionar implementaciones → Editar → Nueva versión** (la URL no cambia).
