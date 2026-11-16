export { calcularMesa, clp, totalItem } from '../../base44/shared/calculo.js';

export const nuevoId = () => Math.random().toString(36).slice(2, 10);

// Código para compartir: sin letras confundibles (0/O, 1/I).
export function nuevoCodigo() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(arr, (n) => abc[n % abc.length]).join('');
}

export const linkMesa = (codigo) => `${window.location.origin}/m/${codigo}`;

export function errorTexto(e) {
  return e?.response?.data?.error || e?.data?.error || e?.data?.message || e?.message || 'Algo salió mal';
}
