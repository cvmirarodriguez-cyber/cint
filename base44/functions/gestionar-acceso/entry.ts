import { createClientFromRequest } from "npm:@base44/sdk";

// Solo el jefe de personal de obra (admin) lista usuarios y aprueba o revoca su acceso.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  const miPerfil = yo?.perfil ?? yo?.data?.perfil;
  if (!yo || yo.role !== "admin" || !["gerente_rrhh", "jefe_personal"].includes(miPerfil)) {
    return Response.json({ error: "Solo el gerente o un jefe de personal de obra pueden gestionar accesos" }, { status: 403 });
  }

  const { accion, userId, acceso, perfil } = await req.json();

  if (accion === "listar") {
    const usuarios = await base44.asServiceRole.entities.User.list("-created_date", 500);
    return Response.json({
      usuarios: usuarios.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        acceso: u.role === "admin" || u.acceso === true || u.data?.acceso === true,
        perfil: u.perfil ?? u.data?.perfil ?? (u.role === "admin" ? "jefe_personal" : "jefe_obra"),
        created_date: u.created_date,
      })),
    });
  }

  if (accion === "cambiar" && userId) {
    if (userId === yo.id) return Response.json({ error: "No puedes cambiar tu propio acceso" }, { status: 400 });
    // El jefe de personal de obra solo aprueba o revoca jefes de obra.
    if (miPerfil !== "gerente_rrhh") {
      const otro = await base44.asServiceRole.entities.User.get(userId);
      if (otro?.role === "admin") return Response.json({ error: "Solo el gerente de RRHH gestiona a otros jefes de personal de obra" }, { status: 403 });
    }
    await base44.asServiceRole.entities.User.update(userId, { acceso: !!acceso });
    return Response.json({ ok: true });
  }

  // Cambia el cargo entre los perfiles de acceso total (no cambia el rol de Base44).
  if (accion === "perfil" && userId) {
    if (miPerfil !== "gerente_rrhh") return Response.json({ error: "Solo el gerente de RRHH cambia cargos" }, { status: 403 });
    if (!["gerente_rrhh", "jefe_personal"].includes(perfil)) return Response.json({ error: "Perfil no válido" }, { status: 400 });
    await base44.asServiceRole.entities.User.update(userId, { perfil });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
