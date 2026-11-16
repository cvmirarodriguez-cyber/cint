// Cálculo de la división de una mesa. Lo usan el frontend y las funciones del backend
// (el backend siempre recalcula: nunca se confía en el monto que manda el cliente).
// Montos en CLP enteros. Reparto por "mayor resto" para que la suma cuadre exacto con el total.

export function repartir(total, pesos) {
  const suma = pesos.reduce((a, b) => a + b, 0);
  if (suma <= 0 || total <= 0) return pesos.map(() => 0);
  const exactos = pesos.map((p) => (total * p) / suma);
  const base = exactos.map(Math.floor);
  let resto = Math.round(total - base.reduce((a, b) => a + b, 0));
  const orden = exactos
    .map((e, i) => ({ i, f: e - Math.floor(e) }))
    .sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; resto > 0 && orden.length; k = (k + 1) % orden.length, resto--) base[orden[k].i]++;
  return base;
}

export function totalItem(it) {
  return Math.round((Number(it.precio_unitario) || 0) * (Number(it.cantidad) || 1));
}

// Devuelve { porPersona: {id: {consumo, propina, total, items:[{nombre, monto}]}}, subtotal, propina, total, sinAsignar }
export function calcularMesa(mesa) {
  const personas = mesa.personas || [];
  const items = mesa.items || [];
  const ids = personas.map((p) => p.id);
  const res = {};
  for (const id of ids) res[id] = { consumo: 0, propina: 0, total: 0, items: [] };

  const subtotal = items.reduce((a, it) => a + totalItem(it), 0);
  let sinAsignar = 0;

  if (ids.length) {
    if (mesa.modo === "igual") {
      repartir(subtotal, ids.map(() => 1)).forEach((m, i) => (res[ids[i]].consumo = m));
    } else {
      for (const it of items) {
        const monto = totalItem(it);
        const quienes = (it.asignados || []).filter((id) => res[id]);
        if (!quienes.length) {
          sinAsignar += monto;
          continue;
        }
        repartir(monto, quienes.map(() => 1)).forEach((m, i) => {
          res[quienes[i]].consumo += m;
          res[quienes[i]].items.push({ nombre: it.nombre, monto: m, compartido: quienes.length > 1 });
        });
      }
    }
  }

  const pct = Number(mesa.propina_pct ?? 10) || 0;
  const consumos = ids.map((id) => res[id].consumo);
  const asignado = consumos.reduce((a, b) => a + b, 0);
  const propinaTotal = Math.round((asignado * pct) / 100);
  repartir(propinaTotal, consumos).forEach((m, i) => {
    res[ids[i]].propina = m;
    res[ids[i]].total = res[ids[i]].consumo + m;
  });

  return {
    porPersona: res,
    subtotal,
    propina: Math.round((subtotal * pct) / 100),
    total: subtotal + Math.round((subtotal * pct) / 100),
    sinAsignar,
  };
}

export function clp(n) {
  return "$" + Math.round(n || 0).toLocaleString("es-CL");
}
