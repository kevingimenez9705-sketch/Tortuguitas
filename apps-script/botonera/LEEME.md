# Botonera · las funciones de Citaciones Tortus como botones

Pone las funciones del menú de la planilla Citaciones Tortus como botones dentro de las oficinas de la Ruta (`oficina.html`):

- **Citados** → 📞 Citar por zona (CABA y Norte → Florida, Sur → Adrogué, Oeste → Merlo, o todas), con vista previa antes de mandar, y 🗑️ Eliminar filas ENVIADO.
- **Confirmaron** → 📋 Recopilar confirmados y 📩 Organizar confirmaciones en Gmail.

Usa el mismo código de la planilla (`Codigo.gs` y `Citacion.html`) en un **proyecto aparte**: el de la planilla no se toca. Corre con la cuenta de quien la usa, así que la citación sale de su Gmail y la recopilación lee su casilla, igual que con el menú. La recopilación automática se sigue activando desde el menú de la planilla.

## Cómo publicarla (una sola vez)

1. Entrá a [script.google.com](https://script.google.com) → **Nuevo proyecto**. Nombre: `Botonera Citaciones`.
2. ⚙️ **Configuración del proyecto** → Zona horaria: **(GMT-03:00) Buenos Aires**.
3. En el editor:
   - Renombrá `Código.gs` a `Codigo` y pegá **el mismo** `Codigo.gs` del proyecto Citaciones-Gustavo.
   - **+ → HTML** → `Citacion` → pegá el mismo `Citacion.html`.
   - **+ → Secuencia de comandos** → `Botonera` → pegá [`Botonera.gs`](Botonera.gs).
   - **+ → HTML** → `Botonera` → pegá [`Botonera.html`](Botonera.html).
   - No copies `PanelB.gs` ni `Panel.html`: tienen su propio `doGet`.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con una cuenta de Google**
5. **Implementar** → autorizá los permisos → copiá la URL que termina en `/exec` y pegala en `BOTONERA_URL` de `ruta.js`.

Cada persona del equipo abre esa URL **una vez** en una pestaña para dar permiso con su cuenta; después los botones andan dentro de la página. Solo puede usarla quien tiene acceso a la planilla.

Si cambia `Codigo.gs` en la planilla, pegá la versión nueva acá también y hacé **Implementar → Gestionar implementaciones → Editar → Nueva versión** (la URL no cambia).
