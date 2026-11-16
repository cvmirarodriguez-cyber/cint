// Invitado (sin cuenta) abre /m/<codigo>: devuelve la mesa con lo que debe cada uno.
import { createClientFromRequest } from "npm:@base44/sdk";
import { json, leerBody, mesaPorCodigo, vistaPublica } from "../../shared/backend.js";

export default async function (req: Request): Promise<Response> {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const { codigo } = await leerBody(req);
    const mesa = await mesaPorCodigo(sr, codigo);
    if (!mesa) return json({ error: "No encontramos esa mesa" }, 404);
    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return json(vistaPublica(mesa, pagos));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
