// Puente entre las pantallas y las funciones del servidor (src/lib/server-fns.js).
// Devuelve { data } como antes y lanza un Error con el mensaje del servidor si algo falla.
import * as fns from '@/lib/server-fns';

const MAPA = {
  'mesa-publica': fns.mesaPublica,
  reclamar: fns.reclamar,
  'crear-pago': fns.crearPago,
  'verificar-pago': fns.verificarPago,
  'marcar-efectivo': fns.marcarEfectivo,
  ia: fns.ia,
};

export async function invocar(nombre, datos = {}) {
  const fn = MAPA[nombre];
  if (!fn) throw new Error(`Función desconocida: ${nombre}`);
  const data = await fn({ data: datos });
  if (data && typeof data === 'object' && data.error) throw new Error(data.error);
  return { data };
}
