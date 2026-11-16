// Utilidades compartidas por las funciones del backend.
import { secrets } from "base44:runtime";
import { calcularMesa } from "./calculo.js";

export const json = (data, status = 200) => Response.json(data, { status });

export async function leerBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function mesaPorCodigo(sr, codigo) {
  if (typeof codigo !== "string" || !/^[A-Z0-9]{4,10}$/.test(codigo)) return null;
  const [mesa] = await sr.entities.Mesa.filter({ codigo });
  return mesa || null;
}

// Vista pública de la mesa: lo que un invitado necesita para elegir lo suyo y pagar.
export function vistaPublica(mesa, pagos) {
  const calc = calcularMesa(mesa);
  const pagoDe = {};
  for (const p of pagos) {
    if (p.estado === "pagado" || !pagoDe[p.persona_id]) pagoDe[p.persona_id] = p.estado;
  }
  return {
    codigo: mesa.codigo,
    restoran: mesa.restoran || "Mesa",
    estado: mesa.estado,
    modo: mesa.modo,
    propina_pct: mesa.propina_pct ?? 10,
    organizador_persona_id: mesa.organizador_persona_id || null,
    items: (mesa.items || []).map((it) => ({
      id: it.id,
      nombre: it.nombre,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      asignados: it.asignados || [],
    })),
    personas: (mesa.personas || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      monto: calc.porPersona[p.id]?.total || 0,
      detalle: calc.porPersona[p.id]?.items || [],
      pago: pagoDe[p.id] || null,
    })),
    total: calc.total,
    sin_asignar: calc.sinAsignar,
  };
}

export function mpToken() {
  const t = secrets.get("MP_ACCESS_TOKEN");
  if (!t) throw new Error("Falta configurar MP_ACCESS_TOKEN (Mercado Pago) en los secretos de la app");
  return t;
}

export async function mp(path, init = {}) {
  const r = await fetch("https://api.mercadopago.com" + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${mpToken()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

// Aplica el estado de un pago de Mercado Pago (siempre consultado a la API, nunca desde el aviso)
// sobre nuestro registro Pago, identificado por external_reference = Pago.id.
export async function aplicarPagoMP(sr, pagoMP) {
  const ref = pagoMP?.external_reference;
  if (!ref) return null;
  const pago = await sr.entities.Pago.get(ref).catch(() => null);
  if (!pago) return null;
  if (pago.estado === "pagado") return pago;

  const montoOk = Math.round(Number(pagoMP.transaction_amount)) >= Math.round(pago.monto);
  const monedaOk = !pagoMP.currency_id || pagoMP.currency_id === "CLP";
  let estado = pago.estado;
  if (pagoMP.status === "approved" && montoOk && monedaOk) estado = "pagado";
  else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pagoMP.status)) estado = "rechazado";
  if (estado === pago.estado) return pago;

  return sr.entities.Pago.update(pago.id, {
    estado,
    mp_payment_id: String(pagoMP.id),
    ...(estado === "pagado" ? { pagado_en: new Date().toISOString() } : {}),
  });
}
