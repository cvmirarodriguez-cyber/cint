import { base44 } from '@/api/base44Client';

// 1) Leer la foto de la boleta
export async function leerBoleta(archivo) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file: archivo });
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Eres experto leyendo boletas y cuentas de restoranes en Chile (pesos chilenos, CLP).
Lee la imagen y devuelve cada línea consumida (platos, bebidas, postres, etc.).
Reglas:
- precio_unitario en pesos chilenos, número entero sin puntos (ej: "$12.990" => 12990).
- Si una línea dice "2 x Pisco Sour 5.500" o "2 Pisco Sour 11.000", cantidad=2 y precio_unitario=5500.
- NO incluyas como ítems: subtotal, total, IVA, neto, propina, "propina sugerida", servicio, descuentos de medios de pago.
- Si hay un descuento aplicado a un producto, inclúyelo como ítem con precio negativo.
- Corrige errores evidentes de OCR en los nombres; escríbelos con mayúscula inicial.
- total_impreso: el total a pagar SIN propina, si aparece. propina_sugerida_pct: el % de propina sugerida si aparece (en Chile suele ser 10).
- Si la imagen no es una boleta, devuelve items vacío.`,
    file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        restoran: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              cantidad: { type: 'number' },
              precio_unitario: { type: 'number' },
            },
            required: ['nombre', 'cantidad', 'precio_unitario'],
          },
        },
        total_impreso: { type: 'number' },
        propina_sugerida_pct: { type: 'number' },
      },
      required: ['items'],
    },
  });
  return { ...r, boleta_url: file_url };
}

// 2) Dividir según lo que cuente el usuario ("Ana y yo compartimos la pizza, Beto las 2 cervezas")
export async function dividirConIA({ items, personas, instruccion }) {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Ayudas a dividir la cuenta de un restorán. Asigna cada ítem a quienes lo consumieron.
Si un ítem lo compartieron varios, ponlos a todos (se divide en partes iguales).
Si la instrucción dice "el resto lo dividimos entre todos" o similar, asigna esos ítems a todas las personas.
Si un ítem no se menciona y no hay regla general, déjalo con personas vacío.
"yo"/"mío" se refiere a ${personas[0]?.nombre || 'el organizador'}.
Usa los nombres tal como aparecen en la lista de personas; si se menciona a alguien nuevo, usa su nombre como lo escribió el usuario.

PERSONAS: ${JSON.stringify(personas.map((p) => p.nombre))}
ÍTEMS: ${JSON.stringify(items.map((it) => ({ id: it.id, nombre: it.nombre, cantidad: it.cantidad, precio_unitario: it.precio_unitario })))}

INSTRUCCIÓN DEL USUARIO: """${instruccion.slice(0, 1500)}"""`,
    response_json_schema: {
      type: 'object',
      properties: {
        asignaciones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item_id: { type: 'string' },
              personas: { type: 'array', items: { type: 'string' } },
            },
            required: ['item_id', 'personas'],
          },
        },
        resumen: { type: 'string', description: 'Una frase corta explicando cómo quedó' },
      },
      required: ['asignaciones'],
    },
  });
  return r;
}
