import { createClientFromRequest } from "npm:@base44/sdk";

// Solo el jefe de personal (admin) lista usuarios y aprueba o revoca su acceso.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  if (!yo || yo.role !== "admin") {
    return Response.json({ error: "Solo el jefe de personal puede gestionar accesos" }, { status: 403 });
  }

  const { accion, userId, acceso } = await req.json();

  if (accion === "listar") {
    const usuarios = await base44.asServiceRole.entities.User.list("-created_date", 500);
    return Response.json({
      usuarios: usuarios.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        acceso: u.role === "admin" || u.acceso === true || u.data?.acceso === true,
        created_date: u.created_date,
      })),
    });
  }

  if (accion === "cambiar" && userId) {
    if (userId === yo.id) return Response.json({ error: "No puedes cambiar tu propio acceso" }, { status: 400 });
    await base44.asServiceRole.entities.User.update(userId, { acceso: !!acceso });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
