# Dividir (versión editor de Base44)

Copia de los archivos propios de la app **Dividir** dentro de la app de Base44 creada para el editor
(`app.base44.com/apps/6afb057849d5af2fbd1a5762`, plantilla TanStack Start). El resto de la plantilla
(auth, kit `components/ui`, `start.js`, `server.js`…) vive en Base44 y no se copia aquí.

- Pantallas: `src/components/pantallas/` · rutas: `src/routes/` (`/`, `/mesa/$id`, `/m/$codigo`, `/api/mp-webhook`)
- Servidor: `src/lib/server-fns.js` (funciones) y `src/lib/backend.server.js` (Mercado Pago, claves, vista pública)
- Datos: `base44/entities/` (Mesa, Pago, User)
- Secreto necesario: `MP_ACCESS_TOKEN`

Los cambios se suben con `npx base44 sandbox write --app-id 6afb057849d5af2fbd1a5762 --overwrite <ruta> < <ruta>`
y se guardan con `npx base44 sandbox checkpoint`. Luego se publica desde el editor.
