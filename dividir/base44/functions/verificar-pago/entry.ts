// Al volver de Mercado Pago (o al refrescar), consulta a Mercado Pago si los cobros
// pendientes de esta mesa ya se aprobaron. Respaldo por si el webhook se demora.
import { createClientFromRequest } from "npm:@base44/sdk";
import { aplicarPagoMP, json, leerBody, mesaPorCodigo, mp, vistaPublica } from "../../shared/backend.js";

export default async function (req: Request): Promise<Response> {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const { codigo, persona_id } = await leerBody(req);
    const mesa = await mesaPorCodigo(sr, codigo);
    if (!mesa) return json({ error: "No encontramos esa mesa" }, 404);

    const filtro: Record<string, string> = { mesa_id: mesa.id, estado: "pendiente" };
    if (typeof persona_id === "string") filtro.persona_id = persona_id;
    const pendientes = (await sr.entities.Pago.filter(filtro)).slice(0, 20);

    for (const p of pendientes) {
      const r = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(p.id)}&sort=date_created&criteria=desc`);
      const resultados = r.results || [];
      const aprobado = resultados.find((x: { status: string }) => x.status === "approved");
      if (aprobado || resultados[0]) await aplicarPagoMP(sr, aprobado || resultados[0]);
    }

    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return json(vistaPublica(mesa, pagos));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
