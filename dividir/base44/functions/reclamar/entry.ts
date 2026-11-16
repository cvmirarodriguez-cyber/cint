// Invitado se suma a la mesa (con su nombre) y marca lo que consumió.
// Los ítems compartidos se reparten entre todos los que los marcan.
import { createClientFromRequest } from "npm:@base44/sdk";
import { json, leerBody, mesaPorCodigo, vistaPublica } from "../../shared/backend.js";

export default async function (req: Request): Promise<Response> {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const { codigo, persona_id, nombre, item_ids } = await leerBody(req);
    const mesa = await mesaPorCodigo(sr, codigo);
    if (!mesa) return json({ error: "No encontramos esa mesa" }, 404);
    if (mesa.estado === "cerrada") return json({ error: "Esta mesa ya está cerrada" }, 409);

    const personas = [...(mesa.personas || [])];
    let pid = typeof persona_id === "string" ? persona_id : null;
    if (pid && !personas.some((p) => p.id === pid)) return json({ error: "Persona no encontrada" }, 404);

    if (!pid) {
      const limpio = String(nombre || "").trim().slice(0, 30);
      if (!limpio) return json({ error: "Escribe tu nombre" }, 400);
      if (personas.length >= 40) return json({ error: "La mesa está llena" }, 409);
      const existente = personas.find((p) => p.nombre.toLowerCase() === limpio.toLowerCase());
      if (existente) pid = existente.id;
      else {
        pid = crypto.randomUUID().slice(0, 8);
        personas.push({ id: pid, nombre: limpio });
      }
    }

    const pagos = await sr.entities.Pago.filter({ mesa_id: mesa.id, persona_id: pid });
    const yaPago = pagos.some((p) => p.estado === "pagado");

    let items = mesa.items || [];
    if (Array.isArray(item_ids) && !yaPago && mesa.modo !== "igual") {
      const marcados = new Set(item_ids.filter((x) => typeof x === "string"));
      items = items.map((it) => {
        const set = new Set(it.asignados || []);
        if (marcados.has(it.id)) set.add(pid!);
        else set.delete(pid!);
        return { ...it, asignados: [...set] };
      });
    }

    const actualizada = await sr.entities.Mesa.update(mesa.id, { personas, items });
    const todos = await sr.entities.Pago.filter({ mesa_id: mesa.id });
    return json({ persona_id: pid, mesa: vistaPublica({ ...mesa, ...actualizada, personas, items }, todos) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
