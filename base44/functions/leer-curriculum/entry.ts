import { createClientFromRequest } from "npm:@base44/sdk";

// Lee un currículum ya subido (archivo privado) y devuelve los datos del trabajador.
// Base44 solo permite la lectura con IA desde el servidor; solo el gerente de RRHH la usa.
const ESQUEMA_CV = {
  type: "object",
  properties: {
    nombre: { type: "string", description: "Nombre completo de la persona" },
    rut: { type: "string", description: "RUT chileno, por ejemplo 12.345.678-9. Vacío si no aparece" },
    cargo: { type: "string", description: "Cargo u oficio principal: supervisor, capataz, maestro primera, maestro segunda o jornal" },
    especialidad: { type: "string", description: "Especialidad de construcción: enfierradura, moldaje, carpintería, albañilería, electricidad, etc." },
    telefono: { type: "string" },
    experiencia: { type: "string", description: "Resumen breve (máximo 3 frases) de su experiencia en obras: empresas, proyectos y años" },
  },
};

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  const perfil = yo?.perfil ?? yo?.data?.perfil;
  if (!yo || yo.role !== "admin" || perfil !== "gerente_rrhh") {
    return Response.json({ error: "Solo el gerente de RRHH puede leer currículums" }, { status: 403 });
  }

  const { file_uri } = await req.json();
  if (!file_uri) return Response.json({ error: "Falta el archivo" }, { status: 400 });

  const Core = base44.asServiceRole.integrations.Core;
  const { signed_url } = await Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
  const r: any = await Core.ExtractDataFromUploadedFile({ file_url: signed_url, json_schema: ESQUEMA_CV });
  if (r?.status && r.status !== "success") {
    return Response.json({ error: "No se pudo leer el documento", detalle: r.details ?? r.status }, { status: 422 });
  }
  const datos = r?.output ?? r?.data ?? r ?? {};
  return Response.json({ datos: Array.isArray(datos) ? datos[0] ?? {} : datos });
}
