// IA del organizador: 1) leer la foto de la boleta, 2) dividir según lo que cuente el usuario.
// Las integraciones de IA solo se pueden llamar desde el backend (cada llamada gasta créditos
// de la app), por eso exige sesión iniciada.
import { createClientFromRequest } from "npm:@base44/sdk";
import { json, leerBody } from "../../shared/backend.js";

const PROMPT_BOLETA = `Eres experto leyendo boletas y cuentas de restoranes en Chile (pesos chilenos, CLP).
Lee la imagen y devuelve cada línea consumida (platos, bebidas, postres, etc.).
Reglas:
- precio_unitario en pesos chilenos, número entero sin puntos (ej: "$12.990" => 12990).
- Si una línea dice "2 x Pisco Sour 5.500" o "2 Pisco Sour 11.000", cantidad=2 y precio_unitario=5500.
- NO incluyas como ítems: subtotal, total, IVA, neto, propina, "propina sugerida", servicio, descuentos de medios de pago.
- Si hay un descuento aplicado a un producto, inclúyelo como ítem con precio negativo.
- Corrige errores evidentes de OCR en los nombres; escríbelos con mayúscula inicial.
- total_impreso: el total a pagar SIN propina (subtotal), si aparece. propina_sugerida_pct: el % de propina sugerida si aparece.
- Si la imagen no es una boleta, devuelve items vacío.`;

const ESQUEMA_BOLETA = {
  type: "object",
  properties: {
    restoran: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          cantidad: { type: "number" },
          precio_unitario: { type: "number" },
        },
        required: ["nombre", "cantidad", "precio_unitario"],
      },
    },
    total_impreso: { type: "number" },
    propina_sugerida_pct: { type: "number" },
  },
  required: ["items"],
};

const ESQUEMA_DIVISION = {
  type: "object",
  properties: {
    asignaciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          personas: { type: "array", items: { type: "string" } },
        },
        required: ["item_id", "personas"],
      },
    },
    resumen: { type: "string", description: "Una frase corta explicando cómo quedó" },
  },
  required: ["asignaciones"],
};

type Item = { id: string; nombre: string; cantidad: number; precio_unitario: number };
type Persona = { id: string; nombre: string };

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json({ error: "Inicia sesión" }, 401);
    const Core = base44.asServiceRole.integrations.Core;
    const body = await leerBody(req);

    if (body.accion === "leer-boleta") {
      const url = String(body.file_url || "");
      if (!/^https:\/\//.test(url)) return json({ error: "Falta la foto" }, 400);
      const r = await Core.InvokeLLM({ prompt: PROMPT_BOLETA, file_urls: [url], response_json_schema: ESQUEMA_BOLETA });
      return json(r);
    }

    if (body.accion === "dividir") {
      const items: Item[] = (Array.isArray(body.items) ? body.items : []).slice(0, 80);
      const personas: Persona[] = (Array.isArray(body.personas) ? body.personas : []).slice(0, 40);
      const instruccion = String(body.instruccion || "").slice(0, 1500);
      if (!items.length || !instruccion.trim()) return json({ error: "Faltan datos" }, 400);
      const prompt = `Ayudas a dividir la cuenta de un restorán. Asigna cada ítem a quienes lo consumieron.
Si un ítem lo compartieron varios, ponlos a todos (se divide en partes iguales).
Si la instrucción dice "el resto lo dividimos entre todos" o similar, asigna esos ítems a todas las personas.
Si un ítem no se menciona y no hay regla general, déjalo con personas vacío.
"yo"/"mío"/"me" se refiere a ${String(body.organizador || personas[0]?.nombre || "el organizador")}.
Usa los nombres tal como aparecen en la lista de personas; si se menciona a alguien nuevo, usa su nombre como lo escribió el usuario.

PERSONAS: ${JSON.stringify(personas.map((p) => String(p.nombre).slice(0, 30)))}
ÍTEMS: ${JSON.stringify(items.map((it) => ({ id: String(it.id), nombre: String(it.nombre).slice(0, 80), cantidad: it.cantidad, precio_unitario: it.precio_unitario })))}

INSTRUCCIÓN DEL USUARIO: """${instruccion}"""`;
      const r = await Core.InvokeLLM({ prompt, response_json_schema: ESQUEMA_DIVISION });
      return json(r);
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
