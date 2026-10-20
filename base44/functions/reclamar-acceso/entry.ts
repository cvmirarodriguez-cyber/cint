import { createClientFromRequest } from "npm:@base44/sdk";

// La llama la app al entrar: si el correo fue invitado, aplica su perfil y, si es jefe de terreno, le da acceso.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  if (!yo) return Response.json({ error: "Sin sesión" }, { status: 401 });

  // Una cuenta suspendida no se reactiva con su invitación: solo el gerente la reactiva.
  if (yo.suspendido === true || yo.data?.suspendido === true) return Response.json({ acceso: false, perfil: null, suspendido: true });

  const perfilActual = yo.perfil ?? yo.data?.perfil;
  const accesoActual = yo.role === "admin" || yo.acceso === true || yo.data?.acceso === true;
  if (accesoActual && perfilActual) return Response.json({ acceso: true, perfil: perfilActual });

  const email = String(yo.email || "").toLowerCase();
  const [invitacion] = await base44.asServiceRole.entities.Autorizado.filter({ email });
  if (!invitacion) return Response.json({ acceso: accesoActual, perfil: perfilActual ?? null });

  const perfil = invitacion.perfil || (yo.role === "admin" ? "jefe_personal" : "jefe_obra");
  await base44.asServiceRole.entities.User.update(yo.id, { acceso: true, perfil });
  return Response.json({ acceso: true, perfil });
}
