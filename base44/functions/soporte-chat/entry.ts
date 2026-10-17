import { createClientFromRequest } from "npm:@base44/sdk";

// Chat de soporte de la pantalla de entrada (sin sesión). Solo responde sobre el uso de Cuadrilla;
// nunca entrega datos de trabajadores. Si no sabe, pide derivar a soporte humano por WhatsApp.
const CONOCIMIENTO = `
Cuadrilla es la app interna de una constructora chilena para guardar el historial de desempeño del personal de terreno
(supervisores, capataces, maestros primera, maestros segunda y jornales). Dirección: cuadrilla.base44.app.

ACCESO
- Es de uso interno y solo por invitación. Nadie puede registrarse libremente.
- Se entra con "Continuar con Google" o con correo y contraseña.
- Si te invitaron por correo y no tienes contraseña: en la pantalla de entrada usa "¿Te invitaron por correo? Activa tu acceso", con el mismo correo de la invitación; llega un código de verificación al correo.
- Si ves "Acceso solo por invitación", tu correo no tiene invitación: pide al gerente de RRHH o a tu jefe de personal de obra que te invite (con ese mismo correo).
- Si ves "Cuenta suspendida", el gerente de RRHH pausó tu acceso: solo él puede reactivarla.
- Si olvidaste la contraseña o no llega el código, revisa spam; si sigue sin funcionar, se deriva a soporte.
- Si Google entra con otra cuenta, cierra sesión y elige la cuenta del correo invitado.

CARGOS
- Gerente de RRHH: acceso total. Crea obras, designa al jefe de personal de obra de cada una, invita a todo el equipo, cambia cargos, suspende o elimina cuentas, importa planillas Excel y currículums.
- Jefe de personal de obra: ve la base de personal y los historiales; en las obras que le asigna el gerente arma la cuadrilla, elige al jefe de obra y marca los términos de contrato. Solo invita jefes de obra.
- Jefe de obra: evalúa a los trabajadores de su obra cuando termina su contrato y ve sus propias evaluaciones.
- Soporte: equipo técnico de la app, acceso total.

USO
- Evaluar: al término de un contrato aparece en "Por evaluar". Se califica desempeño y responsabilidad de 1 a 5, alcohol y drogas (sin observaciones, sospecha, incidente confirmado), si lo recontratarías y un comentario. Toma menos de un minuto.
- Antes de contratar, en Personal se busca por nombre o RUT para ver la ficha e historial en todas las obras.
- Importar (solo gerente): planilla Excel (.xlsx) o CSV con nombre, RUT, cargo, especialidad, teléfono y obra; también currículums en PDF, Word o foto, que la app lee y guarda en la ficha del trabajador.
- Recomendar: asistente con IA que propone trabajadores bien evaluados para una obra nueva (gerente y jefes de personal de obra).
- Funciona en celular y computador. Los datos de alcohol y drogas son confidenciales.
`;

const LIMITE_TEXTO = 600;
const LIMITE_TURNOS = 12;

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const { mensajes } = await req.json().catch(() => ({ mensajes: [] }));
  if (!Array.isArray(mensajes) || !mensajes.length) return Response.json({ error: "Falta la pregunta" }, { status: 400 });

  const historial = mensajes.slice(-LIMITE_TURNOS).map((m: any) => ({
    rol: m?.rol === "asistente" ? "Asistente" : "Usuario",
    texto: String(m?.texto ?? "").slice(0, LIMITE_TEXTO),
  }));
  if (historial[historial.length - 1].rol !== "Usuario") return Response.json({ error: "Falta la pregunta" }, { status: 400 });

  const prompt = `Eres el asistente de soporte de la app web Cuadrilla. Tu trabajo es ayudar a las personas con TODO lo relacionado con la app:
cómo entrar, invitaciones, cargos y permisos, cómo evaluar, buscar trabajadores, obras y cuadrillas, importar planillas y currículums,
el asistente que recomienda trabajadores, uso en celular, y cualquier duda de uso. Respondes en español de Chile, cálido y claro,
en pasos concretos y en máximo 5 frases cortas. Usa la información de abajo; si la pregunta es sobre la app y puedes deducir la respuesta
de esa información, respóndela completa.
No tienes acceso a datos de trabajadores, evaluaciones ni cuentas: si te piden datos de una persona, explica que deben entrar a la app con su cuenta.
No inventes funciones que no estén descritas.
Marca "derivar" en true y dile que puede escribirle directamente a soporte con el botón verde de WhatsApp que aparece abajo (no digas que harás la gestión tú) cuando: la pregunta esté fuera de tu alcance o no tenga relación con la app,
no puedas responderla con esta información, sea un problema técnico que no se resuelve con estos pasos (errores, algo que no carga, códigos que no llegan
después de revisar spam), o la persona pida hablar con alguien.

INFORMACIÓN DE CUADRILLA:
${CONOCIMIENTO}

CONVERSACIÓN:
${historial.map((m: any) => `${m.rol}: ${m.texto}`).join("\n")}
Asistente:`;

  try {
    const r: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          respuesta: { type: "string" },
          derivar: { type: "boolean", description: "true si no sabes o el caso requiere una persona de soporte" },
        },
        required: ["respuesta", "derivar"],
      },
    });
    const respuesta = String(r?.respuesta ?? "").slice(0, 1200) || "No tengo esa respuesta. Te conecto con soporte.";
    return Response.json({ respuesta, derivar: !!r?.derivar || !r?.respuesta });
  } catch (_e) {
    return Response.json({ respuesta: "No pude responder en este momento. Te conecto con soporte por WhatsApp.", derivar: true });
  }
}
