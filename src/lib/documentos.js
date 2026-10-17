import { base44 } from '@/api/base44Client';

const Core = base44.integrations.Core;

export const TIPOS_CV = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';

// Los documentos de trabajadores son datos personales: se guardan privados y se abren con un enlace temporal.
export async function subirPrivado(file) {
  const { file_uri } = await Core.UploadPrivateFile({ file });
  return file_uri;
}

export async function enlaceTemporal(uri, segundos = 600) {
  const { signed_url } = await Core.CreateFileSignedUrl({ file_uri: uri, expires_in: segundos });
  return signed_url;
}

export async function abrirDocumento(uri) {
  // Se abre la pestaña antes de esperar la URL para que el navegador no la bloquee.
  const ventana = window.open('', '_blank');
  try {
    const url = await enlaceTemporal(uri, 300);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  } catch (e) {
    ventana?.close();
    throw e;
  }
}

const ESQUEMA_CV = {
  type: 'object',
  properties: {
    nombre: { type: 'string', description: 'Nombre completo de la persona' },
    rut: { type: 'string', description: 'RUT chileno, por ejemplo 12.345.678-9. Vacío si no aparece' },
    cargo: { type: 'string', description: 'Cargo u oficio principal: supervisor, capataz, maestro primera, maestro segunda o jornal' },
    especialidad: { type: 'string', description: 'Especialidad de construcción: enfierradura, moldaje, carpintería, albañilería, electricidad, etc.' },
    telefono: { type: 'string' },
    experiencia: { type: 'string', description: 'Resumen breve (máximo 3 frases) de su experiencia en obras: empresas, proyectos y años' },
  },
};

// Sube el currículum y lo lee con IA. Si la lectura falla, el archivo igual queda subido
// para que se completen los datos a mano.
export async function leerCurriculum(file) {
  const uri = await subirPrivado(file);
  try {
    const url = await enlaceTemporal(uri, 900);
    const r = await Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: ESQUEMA_CV });
    if (r?.status && r.status !== 'success') throw new Error(r.details || r.status);
    const datos = r?.output ?? r?.data ?? r ?? {};
    return { uri, datos: (Array.isArray(datos) ? datos[0] : datos) ?? {}, leido: true };
  } catch {
    return { uri, datos: {}, leido: false };
  }
}

export const nuevoDocumento = (nombre, uri, tipo, usuario) => ({
  nombre, uri, tipo, fecha: new Date().toISOString(), subido_por: usuario?.email ?? '',
});
