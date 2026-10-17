# Cuadrilla

Historial de desempeño del personal directo de terreno (supervisor, capataz, maestro primera/segunda, jornal).
Al término de cada contrato, el jefe de terreno evalúa al trabajador: desempeño, responsabilidad,
alcohol/drogas, si lo recontrataría y un comentario breve.

- App: https://cuadrilla.base44.app (pública: cualquiera crea cuenta, pero no ve datos sin aprobación)
- Dashboard Base44: https://app.base44.com/apps/6ad36e2f40f3daf306b300d5/editor/workspace/overview

## Roles

| Base44 | En la app | Puede |
|---|---|---|
| `admin` | Jefe de personal | Todo: base de personal, historiales, alertas, obras, términos de contrato, importar, aprobar accesos |
| `user` + `acceso` | Jefe de obra | Solo evaluar a los trabajadores de **sus** obras cuando terminan contrato y ver **sus** evaluaciones |

El jefe de obra se asigna por correo en cada obra (Obras → Editar → Correo del jefe de obra).
Al cambiarlo, los contratos abiertos de esa obra pasan al nuevo jefe.

## Flujo

1. **Importar** la base actual (pegar desde Excel o CSV con nombre, RUT, cargo).
2. **Obras** → crear obra con su jefe de obra → *Sumar personal* (contratos vigentes).
3. El jefe de personal marca *Terminar* → queda **pendiente de evaluación** para el jefe de obra.
4. El jefe de obra entra, ve sus pendientes y evalúa en menos de un minuto.
5. Antes de recontratar, el jefe de personal busca por RUT en *Personal* y ve el historial.

## Datos (`base44/entities/`)

`Trabajador`, `Obra`, `Contrato` (vigente → pendiente → evaluado), `Evaluacion`, `User.acceso`.
Permisos (aplicados en el servidor):
- Trabajador: solo admin.
- Obra / Contrato: admin, o jefe de obra con acceso cuyo correo es `jefe_terreno_email`.
  En contratos el jefe solo puede cambiar `estado` y `evaluacion_id` (FLS).
- Evaluacion: admin ve todas; el jefe de obra crea y ve solo las suyas.
- `User.acceso`: solo lo cambia un admin, vía la función `gestionar-acceso` (pantalla Equipo).
- Datos de demo: campo `demo: true`; se borran desde Importar → *Borrar demo*.

## Desarrollo

```bash
npm install
npx base44 dev          # backend local + Vite en http://localhost:5173
npx base44 deploy -y --build
```

Diseño: `src/index.css` (texturas hormigón, grano, planimetría, cinta de peligro),
`src/components/Obra3D.jsx` (escena three.js), `src/components/ui.jsx` (tilt 3D, medidores, anillos).
