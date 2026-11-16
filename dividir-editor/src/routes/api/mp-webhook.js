// Aviso de Mercado Pago (notification_url). No confiamos en el contenido del aviso:
// solo tomamos el id y volvemos a consultar el pago a la API con nuestro token.
import { createFileRoute } from "@tanstack/react-router";
import { aplicarPagoMP, mp } from "@/lib/backend.server";

async function procesar({ request, context }) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const tipo = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const id = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    if (tipo === "payment" && id && /^\d{1,20}$/.test(String(id))) {
      const pagoMP = await mp(`/v1/payments/${id}`);
      await aplicarPagoMP(context.getBase44().asServiceRole, pagoMP);
    }
  } catch (e) {
    console.error("mp-webhook", e?.message);
  }
  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/mp-webhook")({
  server: { handlers: { POST: procesar, GET: procesar } },
});
