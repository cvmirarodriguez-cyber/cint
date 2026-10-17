// Etiquetas y reglas de negocio compartidas.

export const CARGOS = [
  { value: 'supervisor', label: 'Supervisor de terreno', corto: 'Supervisor' },
  { value: 'capataz', label: 'Capataz', corto: 'Capataz' },
  { value: 'maestro_primera', label: 'Maestro primera', corto: 'M. primera' },
  { value: 'maestro_segunda', label: 'Maestro segunda', corto: 'M. segunda' },
  { value: 'jornal', label: 'Jornal', corto: 'Jornal' },
];
export const cargoLabel = (v) => CARGOS.find((c) => c.value === v)?.label ?? v ?? '—';

export const ESPECIALIDADES = [
  'Obra gruesa', 'Enfierradura', 'Moldaje', 'Carpintería', 'Albañilería', 'Hormigón',
  'Electricidad', 'Gasfitería', 'Terminaciones', 'Pintura', 'Cerámica', 'Yesería', 'Soldadura', 'Otra',
];

export const NOTAS = ['', 'Deficiente', 'Bajo', 'Cumple', 'Bueno', 'Destacado'];

export const AD = {
  sin_observaciones: { label: 'Sin observaciones', tono: 'ok' },
  sospecha: { label: 'Sospecha / reporte', tono: 'warn' },
  confirmado: { label: 'Incidente confirmado', tono: 'bad' },
};

export const RECONTRATAR = {
  si: { label: 'Sí', tono: 'ok' },
  con_reservas: { label: 'Con reservas', tono: 'warn' },
  no: { label: 'No', tono: 'bad' },
};

// Interpreta un texto libre de cargo (planillas existentes) al enum.
export function cargoDesdeTexto(texto = '') {
  const t = texto.toLowerCase();
  if (t.includes('super')) return 'supervisor';
  if (t.includes('capat')) return 'capataz';
  if (t.includes('primera') || /\b1(ra|°|º)?\b/.test(t)) return 'maestro_primera';
  if (t.includes('segunda') || /\b2(da|°|º)?\b/.test(t)) return 'maestro_segunda';
  if (t.includes('maestro')) return 'maestro_segunda';
  return 'jornal';
}

export const nota = (e) => (e.desempeno + e.responsabilidad) / 2;

// Resumen del historial de un trabajador a partir de sus evaluaciones.
export function resumen(evals = []) {
  if (!evals.length) return { n: 0, promedio: null, desempeno: null, responsabilidad: null, alerta: null, noRecontratar: 0, veredicto: 'sin_historial' };
  const avg = (k) => evals.reduce((s, e) => s + (e[k] || 0), 0) / evals.length;
  const confirmados = evals.filter((e) => e.alcohol_drogas === 'confirmado').length;
  const sospechas = evals.filter((e) => e.alcohol_drogas === 'sospecha').length;
  const noRecontratar = evals.filter((e) => e.recontratar === 'no').length;
  const promedio = (avg('desempeno') + avg('responsabilidad')) / 2;
  const alerta = confirmados ? 'confirmado' : sospechas ? 'sospecha' : null;
  let veredicto = 'recomendado';
  if (confirmados || noRecontratar >= 2 || promedio < 2.5) veredicto = 'no_recomendado';
  else if (sospechas || noRecontratar || promedio < 3.5) veredicto = 'revisar';
  return { n: evals.length, promedio, desempeno: avg('desempeno'), responsabilidad: avg('responsabilidad'), alerta, confirmados, sospechas, noRecontratar, veredicto };
}

export const VEREDICTO = {
  recomendado: { label: 'Recomendado', tono: 'ok' },
  revisar: { label: 'Revisar antes', tono: 'warn' },
  no_recomendado: { label: 'No recomendado', tono: 'bad' },
  sin_historial: { label: 'Sin historial', tono: 'muted' },
};

export const ROL = { admin: 'Jefe de personal', user: 'Jefe de obra' };

export function fecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export function iniciales(nombre = '') {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Busca sin importar tildes ni mayúsculas.
export const plano = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
