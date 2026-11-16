// Aviso de Mercado Pago (notification_url). No confiamos en el contenido del aviso:
// solo usamos el id y volvemos a consultar el pago a la API con nuestro token.
import { createClientFromRequest } from "npm:@base44/sdk";
import { aplicarPagoMP, leerBody, mp } from "../../shared/backend.js";

export default async function (req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const body = await leerBody(req);
    const tipo = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const id = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    if (tipo === "payment" && id && /^\d+$/.test(String(id))) {
      const sr = createClientFromRequest(req).asServiceRole;
      const pagoMP = await mp(`/v1/payments/${id}`);
      await aplicarPagoMP(sr, pagoMP);
    }
  } catch (e) {
    console.error("mp-webhook", (e as Error).message);
  }
  return new Response("ok", { status: 200 });
}
