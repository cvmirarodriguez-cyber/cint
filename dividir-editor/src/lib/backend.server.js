// Lógica del servidor compartida por las funciones de src/lib/server-fns.js. Solo servidor.
import { secrets } from "base44:runtime";
import { calcularMesa } from "@/lib/calculo";

// Únicos orígenes a los que Mercado Pago puede devolver al invitado (evita redirecciones a sitios ajenos).
// Si la app usa un dominio propio, agrégalo aquí.
export const ORIGENES = ["https://dividir-bd1a5762.base44.app"];
export const origenValido = (o) =>
  typeof o === "string" && (ORIGENES.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o));

// Clave por teléfono: al tomar un nombre, el invitado recibe una clave aleatoria; solo guardamos su hash.
export function nuevaClave() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function hashClave(clave) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(clave)));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
// true si la persona no tiene dueño todavía o si la clave coincide.
export async function claveOk(persona, clave) {
  if (!persona?.clave_hash) return true;
  if (typeof clave !== "string" || clave.length < 16) return false;
  return (await hashClave(clave)) === persona.clave_hash;
}

export async function mesaPorCodigo(sr, codigo) {
  if (typeof codigo !== "string" || !/^[A-Z0-9]{4,10}$/.test(codigo)) return null;
  const mesas = await sr.entities.Mesa.filter({ codigo });
  // Un código duplicado nunca debe resolver a una mesa ambigua.
  return mesas.length === 1 ? mesas[0] : null;
}

// Vista pública de la mesa: lo que un invitado necesita para elegir lo suyo y pagar (sin claves).
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
      tomada: !!p.clave_hash,
      monto: calc.porPersona[p.id]?.total || 0,
      detalle: calc.porPersona[p.id]?.items || [],
      pago: pagoDe[p.id] || null,
    })),
    total: calc.total,
    sin_asignar: calc.sinAsignar,
  };
}

function mpToken() {
  const t = secrets.get("MP_ACCESS_TOKEN");
  if (!t) throw new Error("Falta configurar MP_ACCESS_TOKEN (Mercado Pago) en los secretos de la app");
  return t;
}

export async function mp(path, init = {}) {
  const r = await fetch("https://api.mercadopago.com" + path, {
    ...init,
    headers: { Authorization: `Bearer ${mpToken()}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${data.message || "error"}`);
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

// Usuario actual o null (sin lanzar si no hay sesión).
export async function usuarioActual(base44) {
  return base44.auth.me().catch((e) => {
    if (e?.status === 401 || e?.status === 403) return null;
    throw e;
  });
}
