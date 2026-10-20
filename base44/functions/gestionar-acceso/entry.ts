import { createClientFromRequest } from "npm:@base44/sdk";

// Gestión de cuentas del equipo.
// - Gerente de RRHH, Gerente general y Soporte: todo (cargos, suspender, eliminar).
// - Jefe de personal de obra: listar y aprobar/revocar jefes de terreno.
// Nadie puede actuar sobre sí mismo, y la cuenta de Soporte solo la toca Soporte.
const TOTAL = ["gerente_rrhh", "gerente_general", "soporte"];
const perfilDe = (u: any) => u?.perfil ?? u?.data?.perfil ?? null;
// Cargo real aunque esté suspendido (el cargo "suspendido" no da acceso a nada).
const cargoReal = (u: any) => { const p = perfilDe(u); return p && p !== "suspendido" ? p : (u?.perfil_previo ?? null); };

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const yo = await base44.auth.me().catch(() => null);
  const miPerfil = perfilDe(yo);
  if (!yo || yo.role !== "admin" || ![...TOTAL, "jefe_personal"].includes(miPerfil)) {
    return Response.json({ error: "Solo el gerente o un jefe de personal de obra pueden gestionar accesos" }, { status: 403 });
  }
  const total = TOTAL.includes(miPerfil);
  const Users = base44.asServiceRole.entities.User;

  const { accion, userId, acceso, perfil, suspender } = await req.json();

  if (accion === "listar") {
    const usuarios = await Users.list("-created_date", 500);
    return Response.json({
      usuarios: usuarios.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        acceso: !u.suspendido && (u.role === "admin" || u.acceso === true || u.data?.acceso === true),
        perfil: cargoReal(u) ?? (u.role === "admin" ? "jefe_personal" : "jefe_obra"),
        suspendido: u.suspendido === true || u.data?.suspendido === true,
        created_date: u.created_date,
      })),
    });
  }

  if (!userId) return Response.json({ error: "Falta el usuario" }, { status: 400 });
  if (userId === yo.id) return Response.json({ error: "No puedes cambiar tu propia cuenta" }, { status: 400 });
  const otro: any = await Users.get(userId).catch(() => null);
  if (!otro) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  const perfilOtro = cargoReal(otro);
  if (perfilOtro === "soporte" && miPerfil !== "soporte") {
    return Response.json({ error: "La cuenta de Soporte no se puede modificar" }, { status: 403 });
  }

  if (accion === "cambiar") {
    // El jefe de personal de obra solo aprueba o revoca jefes de terreno.
    if (!total && otro.role === "admin") return Response.json({ error: "Solo el gerente de RRHH gestiona a los jefes de personal de obra" }, { status: 403 });
    await Users.update(userId, { acceso: !!acceso });
    return Response.json({ ok: true });
  }

  // Desde aquí, solo gerente de RRHH o Soporte.
  if (!total) return Response.json({ error: "Solo el gerente de RRHH puede hacer esto" }, { status: 403 });

  if (accion === "perfil") {
    if (!["gerente_rrhh", "gerente_general", "jefe_personal"].includes(perfil)) return Response.json({ error: "Perfil no válido" }, { status: 400 });
    await Users.update(userId, { perfil });
    return Response.json({ ok: true });
  }

  // Solo se suspende o elimina a jefes de personal de obra y jefes de terreno.
  const suspendible = otro.role !== "admin" || perfilOtro === "jefe_personal";
  if ((accion === "suspender" || accion === "eliminar") && !suspendible) {
    return Response.json({ error: "Solo se puede suspender o eliminar a jefes de personal de obra y jefes de terreno" }, { status: 403 });
  }

  if (accion === "suspender") {
    if (suspender) {
      // Sin cargo ni acceso, las reglas del servidor no le muestran ningún dato.
      const previo = cargoReal(otro);
      await Users.update(userId, { suspendido: true, acceso: false, perfil: "suspendido", ...(previo ? { perfil_previo: previo } : {}) });
    } else {
      const restaurar: any = { suspendido: false, acceso: true };
      restaurar.perfil = otro.perfil_previo || (otro.role === "admin" ? "jefe_personal" : "jefe_obra");
      await Users.update(userId, restaurar);
    }
    return Response.json({ ok: true });
  }

  if (accion === "eliminar") {
    // Primero se le quita todo acceso; luego se borra la cuenta y su invitación.
    await Users.update(userId, { suspendido: true, acceso: false, perfil: "suspendido" });
    // Con los permisos de quien elimina (gerente o Soporte), que son los que pueden borrar invitaciones.
    const invitaciones = await base44.entities.Autorizado.filter({ email: String(otro.email).toLowerCase() });
    for (const inv of invitaciones) await base44.entities.Autorizado.delete(inv.id);
    try {
      await Users.delete(userId);
    } catch (_e) {
      return Response.json({ ok: true, eliminado: false, aviso: "La cuenta quedó suspendida y sin invitación, pero Base44 no permitió borrarla del todo." });
    }
    const sigue = await Users.get(userId).catch(() => null);
    return Response.json({ ok: true, eliminado: !sigue, aviso: sigue ? "La cuenta quedó suspendida y sin invitación; Base44 la mantiene registrada." : null });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
