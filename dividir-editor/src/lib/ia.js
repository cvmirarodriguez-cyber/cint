import { invocar } from '@/lib/api';
import { base44 } from '@/api/base44Client';

// La IA corre en el backend (función `ia`); aquí solo se sube la foto y se llama.
export async function leerBoleta(archivo) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file: archivo });
  const { data } = await invocar('ia', { accion: 'leer-boleta', file_url });
  return { ...data, boleta_url: file_url };
}

export async function dividirConIA({ items, personas, instruccion, organizador }) {
  const { data } = await invocar('ia', { accion: 'dividir', items, personas, instruccion, organizador });
  return data;
}
