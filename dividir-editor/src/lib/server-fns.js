// Funciones del servidor de Dividir. Todas son endpoints públicos: validan la entrada y revisan permisos.
//
// Modelo de acceso:
// - Organizador (admin, con sesión): crea y edita sus mesas directo con el SDK (las reglas de la
//   entidad Mesa lo limitan a las suyas). Aquí solo usa `marcarEfectivo`, `verificarPago` (toda la mesa) e `ia`.
// - Invitado (sin cuenta): entra con el código de la mesa, que funciona como llave. Cada nombre queda
//   ligado al primer teléfono que lo toma mediante una clave aleatoria (solo guardamos su hash).
//   Por eso estas funciones leen/escriben como la app (asServiceRole) después de validar código y clave.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcularMesa } from "@/lib/calculo";
import {
  aplicarPagoMP, claveOk, hashClave, mesaPorCodigo, mp, nuevaClave, origenValido, usuarioActual, vistaPublica,
} from "@/lib/backend.server";

const codigo = z.string().max(12);
const id = z.string().max(64);
const clave = z.string().max(64).optional();
const err = (error) => ({ error });

// Invitado abre /m/<codigo>: la mesa con lo que debe cada uno.
export const mesaPublica = createServerFn({ method: "POST" })
  .validator(z.object({ codigo }))
  .handler(async ({ data, context }) => {
    const sr = context.getBase44().asServiceRole;
    const mesa = await mesaPorCodigo(sr, data.codigo);
    if (!mesa) return err("No encontramos esa mesa");
    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return vistaPublica(mesa, pagos);
  });

// Invitado se suma (con su nombre) o retoma su nombre, y marca lo que consumió.
export const reclamar = createServerFn({ method: "POST" })
  .validator(z.object({
    codigo,
    persona_id: id.optional(),
    nombre: z.string().max(60).optional(),
    item_ids: z.array(id).max(200).optional(),
    clave,
  }))
  .handler(async ({ data, context }) => {
    const sr = context.getBase44().asServiceRole;
    const mesa = await mesaPorCodigo(sr, data.codigo);
    if (!mesa) return err("No encontramos esa mesa");
    if (mesa.estado === "cerrada") return err("Esta mesa ya está cerrada");

    let personas = [...(mesa.personas || [])];
    let pid = data.persona_id || null;
    if (pid && !personas.some((p) => p.id === pid)) return err("Persona no encontrada");
    if (pid && pid === mesa.organizador_persona_id) return err("Ese es el organizador");

    if (!pid) {
      const limpio = String(data.nombre || "").trim().slice(0, 30);
      if (!limpio) return err("Escribe tu nombre");
      if (personas.length >= 40) return err("La mesa está llena");
      const existente = personas.find((p) => p.nombre.toLowerCase() === limpio.toLowerCase());
      if (existente) {
        if (existente.id === mesa.organizador_persona_id) return err("Ese nombre ya está en la mesa");
        pid = existente.id;
      } else {
        pid = crypto.randomUUID().slice(0, 8);
        personas.push({ id: pid, nombre: limpio });
      }
    }

    // Cada nombre queda ligado al primer teléfono que lo toma.
    const persona = personas.find((p) => p.id === pid);
    let claveNueva = null;
    if (persona.clave_hash) {
      if (!(await claveOk(persona, data.clave)))
        return err("Ese nombre ya lo tomó otro teléfono. Si eres tú, pídele al organizador que te marque.");
    } else {
      claveNueva = nuevaClave();
      const h = await hashClave(claveNueva);
      personas = personas.map((p) => (p.id === pid ? { ...p, clave_hash: h } : p));
    }

    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id, persona_id: pid });
    const yaPago = pagos.some((p) => p.estado === "pagado");

    let items = mesa.items || [];
    if (Array.isArray(data.item_ids) && !yaPago && mesa.modo !== "igual") {
      const marcados = new Set(data.item_ids);
      items = items.map((it) => {
        const set = new Set(it.asignados || []);
        if (marcados.has(it.id)) set.add(pid);
        else set.delete(pid);
        return { ...it, asignados: [...set] };
      });
    }

    await sr.entities.Mesa.update(mesa.id, { personas, items });
    const todos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return { persona_id: pid, clave: claveNueva || data.clave, mesa: vistaPublica({ ...mesa, personas, items }, todos) };
  });

// Crea (o reutiliza) el cobro de Mercado Pago por la parte de una persona.
// El monto SIEMPRE se calcula aquí, a partir de la mesa guardada.
export const crearPago = createServerFn({ method: "POST" })
  .validator(z.object({ codigo, persona_id: id, origen: z.string().max(200).optional(), clave }))
  .handler(async ({ data, context }) => {
    const sr = context.getBase44().asServiceRole;
    const mesa = await mesaPorCodigo(sr, data.codigo);
    if (!mesa) return err("No encontramos esa mesa");
    if (mesa.estado !== "cobrando") return err("El organizador todavía no abre el cobro");

    const persona = (mesa.personas || []).find((p) => p.id === data.persona_id);
    if (!persona) return err("Persona no encontrada");
    if (persona.id === mesa.organizador_persona_id) return err("El organizador paga directo al restorán");
    if (!(await claveOk(persona, data.clave))) return err("Ese nombre lo tomó otro teléfono");

    const monto = calcularMesa(mesa).porPersona[persona.id]?.total || 0;
    if (monto < 50) return err("No tienes nada que pagar");

    const previos = await sr.entities.Pago.filter({ mesa_id: mesa.id, persona_id: persona.id });
    if (previos.some((p) => p.estado === "pagado")) return err("Ya pagaste tu parte 🎉");
    const reutilizable = previos.find((p) => p.estado === "pendiente" && p.monto === monto && p.link_pago);
    if (reutilizable) return { link_pago: reutilizable.link_pago, monto, pago_id: reutilizable.id };

    const pago = await sr.entities.Pago.create({
      mesa_id: mesa.id,
      organizador_id: mesa.created_by_id,
      persona_id: persona.id,
      persona_nombre: persona.nombre,
      monto,
      estado: "pendiente",
      medio: "mercadopago",
    });

    const base = origenValido(data.origen) ? data.origen : null;
    const volver = base ? `${base}/m/${mesa.codigo}?p=${persona.id}` : undefined;
    const pref = await mp("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [{ title: `Tu parte en ${mesa.restoran || "la mesa"}`, quantity: 1, unit_price: monto, currency_id: "CLP" }],
        external_reference: pago.id,
        statement_descriptor: "DIVIDIR CUENTA",
        ...(volver ? { back_urls: { success: volver, pending: volver, failure: volver }, auto_return: "approved" } : {}),
        ...(base && base.startsWith("https://") ? { notification_url: `${base}/api/mp-webhook` } : {}),
      }),
    });

    await sr.entities.Pago.update(pago.id, { mp_preference_id: pref.id, link_pago: pref.init_point });
    return { link_pago: pref.init_point, monto, pago_id: pago.id };
  });

// Consulta a Mercado Pago si los cobros pendientes ya se aprobaron (respaldo del webhook).
// Un invitado solo verifica lo suyo; revisar toda la mesa es solo para el organizador.
export const verificarPago = createServerFn({ method: "POST" })
  .validator(z.object({ codigo, persona_id: id.optional() }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const sr = base44.asServiceRole;
    const mesa = await mesaPorCodigo(sr, data.codigo);
    if (!mesa) return err("No encontramos esa mesa");
    if (!data.persona_id) {
      const user = await usuarioActual(base44);
      if (!user || user.id !== mesa.created_by_id) return err("No autorizado");
    } else if (!(mesa.personas || []).some((p) => p.id === data.persona_id)) {
      return err("Persona no encontrada");
    }

    const filtro = { mesa_id: mesa.id, estado: "pendiente" };
    if (data.persona_id) filtro.persona_id = data.persona_id;
    const pendientes = (await sr.entities.Pago.filter(filtro)).slice(0, 20);
    for (const p of pendientes) {
      const r = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(p.id)}&sort=date_created&criteria=desc`);
      const resultados = r.results || [];
      const aprobado = resultados.find((x) => x.status === "approved");
      if (aprobado || resultados[0]) await aplicarPagoMP(sr, aprobado || resultados[0]);
    }
    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return vistaPublica(mesa, pagos);
  });

// El organizador marca que alguien le pagó en efectivo o transferencia (o lo deshace).
export const marcarEfectivo = createServerFn({ method: "POST" })
  .validator(z.object({ mesa_id: id, persona_id: id, deshacer: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const user = await usuarioActual(base44);
    if (!user) return err("Inicia sesión");
    const sr = base44.asServiceRole;
    const mesa = await sr.entities.Mesa.get(data.mesa_id).catch(() => null);
    if (!mesa || mesa.created_by_id !== user.id) return err("Mesa no encontrada");
    const persona = (mesa.personas || []).find((p) => p.id === data.persona_id);
    if (!persona) return err("Persona no encontrada");

    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id, persona_id: persona.id });
    if (data.deshacer) {
      for (const p of pagos) if (p.medio === "efectivo") await sr.entities.Pago.delete(p.id);
      return { ok: true };
    }
    if (pagos.some((p) => p.estado === "pagado")) return { ok: true };
    await sr.entities.Pago.create({
      mesa_id: mesa.id,
      organizador_id: user.id,
      persona_id: persona.id,
      persona_nombre: persona.nombre,
      monto: calcularMesa(mesa).porPersona[persona.id]?.total || 0,
      estado: "pagado",
      medio: "efectivo",
      pagado_en: new Date().toISOString(),
    });
    return { ok: true };
  });

/* ---------------- IA (solo admin: cada llamada gasta créditos de la app) ---------------- */

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
        properties: { nombre: { type: "string" }, cantidad: { type: "number" }, precio_unitario: { type: "number" } },
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
        properties: { item_id: { type: "string" }, personas: { type: "array", items: { type: "string" } } },
        required: ["item_id", "personas"],
      },
    },
    resumen: { type: "string", description: "Una frase corta explicando cómo quedó" },
  },
  required: ["asignaciones"],
};

export const ia = createServerFn({ method: "POST" })
  .validator(z.object({
    accion: z.enum(["leer-boleta", "dividir"]),
    file_url: z.string().url().max(500).optional(),
    items: z.array(z.object({ id, nombre: z.string().max(80), cantidad: z.number(), precio_unitario: z.number() }).passthrough()).max(80).optional(),
    personas: z.array(z.object({ id, nombre: z.string().max(30) }).passthrough()).max(40).optional(),
    instruccion: z.string().max(1500).optional(),
    organizador: z.string().max(30).optional(),
  }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const user = await usuarioActual(base44);
    if (!user) return err("Inicia sesión");
    if (user.role !== "admin") return err("Solo el administrador puede usar la IA");
    const Core = base44.asServiceRole.integrations.Core;

    if (data.accion === "leer-boleta") {
      if (!data.file_url?.startsWith("https://")) return err("Falta la foto");
      return Core.InvokeLLM({ prompt: PROMPT_BOLETA, file_urls: [data.file_url], response_json_schema: ESQUEMA_BOLETA });
    }

    const items = data.items || [];
    const personas = data.personas || [];
    if (!items.length || !data.instruccion?.trim()) return err("Faltan datos");
    const prompt = `Ayudas a dividir la cuenta de un restorán. Asigna cada ítem a quienes lo consumieron.
Si un ítem lo compartieron varios, ponlos a todos (se divide en partes iguales).
Si la instrucción dice "el resto lo dividimos entre todos" o similar, asigna esos ítems a todas las personas.
Si un ítem no se menciona y no hay regla general, déjalo con personas vacío.
"yo"/"mío"/"me" se refiere a ${data.organizador || personas[0]?.nombre || "el organizador"}.
Usa los nombres tal como aparecen en la lista de personas; si se menciona a alguien nuevo, usa su nombre como lo escribió el usuario.

PERSONAS: ${JSON.stringify(personas.map((p) => p.nombre))}
ÍTEMS: ${JSON.stringify(items.map((it) => ({ id: it.id, nombre: it.nombre, cantidad: it.cantidad, precio_unitario: it.precio_unitario })))}

INSTRUCCIÓN DEL USUARIO: """${data.instruccion}"""`;
    return Core.InvokeLLM({ prompt, response_json_schema: ESQUEMA_DIVISION });
  });
