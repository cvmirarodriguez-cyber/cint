// Tema: 'sistema' (sigue al teléfono), 'claro' u 'oscuro'. Se guarda en este dispositivo.
const CLAVE = 'dividir:tema';
const COLOR_BARRA = { claro: '#f3f1ec', oscuro: '#11110f' };
const medio = () => window.matchMedia('(prefers-color-scheme: dark)');

export function leerPreferencia() {
  try { return localStorage.getItem(CLAVE) || 'sistema'; } catch { return 'sistema'; }
}

export function aplicarTema(pref = leerPreferencia()) {
  const efectivo = pref === 'sistema' ? (medio().matches ? 'oscuro' : 'claro') : pref;
  document.documentElement.dataset.tema = efectivo;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[efectivo]);
  return efectivo;
}

export function guardarPreferencia(pref) {
  try { localStorage.setItem(CLAVE, pref); } catch { /* sin almacenamiento */ }
  const html = document.documentElement;
  html.classList.add('transicion');
  aplicarTema(pref);
  setTimeout(() => html.classList.remove('transicion'), 300);
}

export function iniciarTema() {
  aplicarTema();
  medio().addEventListener?.('change', () => { if (leerPreferencia() === 'sistema') aplicarTema('sistema'); });
}
