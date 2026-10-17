// Utilidades de RUT chileno (módulo 11).

export function limpiarRut(valor = '') {
  return String(valor).replace(/[^0-9kK]/g, '').toUpperCase();
}

export function dvRut(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

export function rutValido(valor) {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return dvRut(cuerpo) === limpio.slice(-1);
}

// Forma canónica para guardar: 12345678-9
export function normalizarRut(valor) {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

// Forma para mostrar: 12.345.678-9
export function formatearRut(valor) {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}
