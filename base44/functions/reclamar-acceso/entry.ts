import { createClientFromRequest } from "npm:@base44/sdk";

// La llama la pantalla "acceso pendiente": si el correo fue invitado como jefe de obra, se aprueba solo.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  if (!yo) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (yo.role === "admin" || yo.acceso === true || yo.data?.acceso === true) return Response.json({ acceso: true });

  const email = String(yo.email || "").toLowerCase();
  const invitaciones = await base44.asServiceRole.entities.Autorizado.filter({ email });
  if (!invitaciones.length) return Response.json({ acceso: false });

  await base44.asServiceRole.entities.User.update(yo.id, { acceso: true });
  return Response.json({ acceso: true });
}
