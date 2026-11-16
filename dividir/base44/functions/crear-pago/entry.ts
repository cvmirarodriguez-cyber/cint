// Crea (o reutiliza) el cobro de Mercado Pago por la parte de una persona.
// El monto SIEMPRE se calcula aquí, a partir de la mesa guardada.
import { createClientFromRequest } from "npm:@base44/sdk";
import { calcularMesa } from "../../shared/calculo.js";
import { json, leerBody, mesaPorCodigo, mp } from "../../shared/backend.js";

const ORIGEN_OK = /^(https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.base44\.app|https?:\/\/localhost(:\d+)?)$/;

export default async function (req: Request): Promise<Response> {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const { codigo, persona_id, origen } = await leerBody(req);
    const mesa = await mesaPorCodigo(sr, codigo);
    if (!mesa) return json({ error: "No encontramos esa mesa" }, 404);
    if (mesa.estado !== "cobrando") return json({ error: "El organizador todavía no abre el cobro" }, 409);

    const persona = (mesa.personas || []).find((p) => p.id === persona_id);
    if (!persona) return json({ error: "Persona no encontrada" }, 404);
    if (persona.id === mesa.organizador_persona_id)
      return json({ error: "El organizador paga directo al restorán" }, 409);

    const monto = calcularMesa(mesa).porPersona[persona.id]?.total || 0;
    if (monto < 50) return json({ error: "No tienes nada que pagar" }, 400);

    const previos = await sr.entities.Pago.filter({ mesa_id: mesa.id, persona_id: persona.id });
    if (previos.some((p) => p.estado === "pagado")) return json({ error: "Ya pagaste tu parte 🎉" }, 409);
    const reutilizable = previos.find((p) => p.estado === "pendiente" && p.monto === monto && p.link_pago);
    if (reutilizable) return json({ link_pago: reutilizable.link_pago, monto, pago_id: reutilizable.id });

    const pago = await sr.entities.Pago.create({
      mesa_id: mesa.id,
      organizador_email: mesa.created_by,
      persona_id: persona.id,
      persona_nombre: persona.nombre,
      monto,
      estado: "pendiente",
      medio: "mercadopago",
    });

    const base = typeof origen === "string" && ORIGEN_OK.test(origen) ? origen : null;
    const volver = base ? `${base}/m/${mesa.codigo}?p=${persona.id}` : undefined;
    const pref = await mp("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            title: `Tu parte en ${mesa.restoran || "la mesa"}`,
            quantity: 1,
            unit_price: monto,
            currency_id: "CLP",
          },
        ],
        external_reference: pago.id,
        statement_descriptor: "DIVIDIR CUENTA",
        ...(volver
          ? { back_urls: { success: volver, pending: volver, failure: volver }, auto_return: "approved" }
          : {}),
        ...(base && base.startsWith("https://") ? { notification_url: `${base}/functions/mp-webhook` } : {}),
      }),
    });

    await sr.entities.Pago.update(pago.id, { mp_preference_id: pref.id, link_pago: pref.init_point });
    return json({ link_pago: pref.init_point, monto, pago_id: pago.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
