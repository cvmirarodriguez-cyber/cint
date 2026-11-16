// El organizador marca que alguien le pagó en efectivo o transferencia (o lo deshace).
import { createClientFromRequest } from "npm:@base44/sdk";
import { calcularMesa } from "../../shared/calculo.js";
import { json, leerBody } from "../../shared/backend.js";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json({ error: "Inicia sesión" }, 401);
    const { mesa_id, persona_id, deshacer } = await leerBody(req);
    const sr = base44.asServiceRole;

    const mesa = await sr.entities.Mesa.get(mesa_id).catch(() => null);
    if (!mesa || mesa.created_by !== user.email) return json({ error: "Mesa no encontrada" }, 404);
    const persona = (mesa.personas || []).find((p: { id: string }) => p.id === persona_id);
    if (!persona) return json({ error: "Persona no encontrada" }, 404);

    const pagos = await sr.entities.Pago.filter({ mesa_id, persona_id });
    if (deshacer) {
      for (const p of pagos) if (p.medio === "efectivo") await sr.entities.Pago.delete(p.id);
      return json({ ok: true });
    }
    if (pagos.some((p) => p.estado === "pagado")) return json({ ok: true });
    await sr.entities.Pago.create({
      mesa_id,
      organizador_email: user.email,
      persona_id,
      persona_nombre: persona.nombre,
      monto: calcularMesa(mesa).porPersona[persona_id]?.total || 0,
      estado: "pagado",
      medio: "efectivo",
      pagado_en: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
