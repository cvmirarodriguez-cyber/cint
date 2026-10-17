// Gestión de tema claro/oscuro. Persiste en localStorage y aplica la clase en <html>.
const CLAVE = 'cuadrilla-tema';
const APLICAR = 'light';

export const getTema = () => {
  if (typeof window === 'undefined') return 'dark';
  const guardado = localStorage.getItem(CLAVE);
  if (guardado === 'light' || guardado === 'dark') return guardado;
  return 'dark';
};

export const setTema = (modo) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLAVE, modo);
  const root = document.documentElement;
  if (modo === 'light') root.classList.add(APLICAR);
  else root.classList.remove(APLICAR);
  // Actualiza el theme-color del navegador
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', modo === 'light' ? '#f5f4ef' : '#0c0d0f');
};

export const toggleTema = () => {
  const actual = getTema();
  const nuevo = actual === 'dark' ? 'light' : 'dark';
  setTema(nuevo);
  return nuevo;
};

// Aplica el tema guardado lo antes posible (evita parpadeo).
export const initTema = () => setTema(getTema());