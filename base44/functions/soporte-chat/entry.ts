import { createClientFromRequest } from "npm:@base44/sdk";

// Chat de soporte de Cuadrilla. Funciona sin sesión (pantalla de entrada) y dentro de la app.
// Dentro de la app detecta el cargo de quien pregunta y responde con la guía de ese cargo.
// Nunca entrega datos de trabajadores. Si algo queda fuera de su alcance, deriva a WhatsApp.

const GENERAL = `
Cuadrilla es la app web interna de una constructora chilena para guardar el historial de desempeño del personal de terreno
(supervisores, capataces, maestros primera, maestros segunda y jornales). Dirección: cuadrilla.base44.app. Funciona en celular y computador.
En computador el menú está a la izquierda; en celular, abajo (y arriba a la derecha están Soporte y Salir).
Los datos de alcohol y drogas son confidenciales.

ACCESO (para todos)
- Uso interno y solo por invitación; nadie se registra libremente.
- Se entra con "Continuar con Google" o con correo y contraseña.
- Invitado sin contraseña: en la entrada, "¿Te invitaron por correo? Activa tu acceso", con el mismo correo de la invitación; llega un código al correo (revisar spam).
- "Acceso solo por invitación": ese correo no tiene invitación; pedir al gerente de RRHH o al jefe de personal de obra que lo invite con ese correo.
- "Cuenta suspendida": la pausó el gerente de RRHH; solo él la reactiva.
- Si Google entra con otra cuenta: cerrar sesión (botón Salir) y elegir la cuenta del correo invitado.
- Cargos: Gerente de RRHH (acceso total), Jefe de personal de obra (sus obras), Jefe de obra (evalúa), Soporte (equipo técnico, acceso total).
`;

const GUIA_EVALUAR = `
EVALUAR UN TÉRMINO DE CONTRATO (paso a paso)
1. Abrir el trabajador desde "Por evaluar" / "Evaluar" o desde la obra (botón Evaluar).
2. Revisar obra, cargo en la obra y fecha de término.
3. Desempeño de 1 a 5 (calidad, rendimiento, oficio): 1 Deficiente, 2 Bajo, 3 Cumple, 4 Bueno, 5 Destacado.
4. Responsabilidad de 1 a 5 (puntualidad, asistencia, normas de seguridad).
5. Alcohol y drogas: Sin observaciones, Sospecha/reporte o Incidente confirmado (si no es "sin observaciones", explicar en el comentario).
6. ¿Lo volverías a contratar?: Sí, Con reservas o No.
7. Comentario breve opcional (máx. 500 caracteres) y "Guardar evaluación". Al guardar, el contrato queda como evaluado y puede pasar al siguiente pendiente.
`;

const GUIA_TOTAL = `
MENÚ: Panel, Personal, Evaluar, Obras, Asistente, Recomendar, Importar y Equipo (en celular: Panel, Personal, Evaluar, Obras y Asistente).
- PANEL: saludo con la obra 3D, contadores (personal, evaluaciones, pendientes, alertas de alcohol/drogas), pendientes de evaluar, últimas evaluaciones, "Revisar antes de recontratar" y "Mejor evaluados".
- PERSONAL: buscar por nombre o RUT y filtrar por cargo. "Agregar" crea un trabajador (nombre, RUT válido, cargo, especialidad, teléfono). Al abrir uno se ve su ficha: nota promedio, veredicto (Recomendado / Revisar antes / No recomendado), desempeño y responsabilidad, historial por obra con comentarios, y la sección Documentos (ver el currículum o "Adjuntar" otro documento; los archivos son privados).
- EVALUAR: lista de términos pendientes de todas las obras; se puede evaluar a cualquiera.${GUIA_EVALUAR}
- OBRAS: "Nueva obra" (nombre, código, ubicación, fechas). Al abrir una obra (tocar su tarjeta), el botón "Editar" permite designar al "Jefe de personal de obra a cargo" y al jefe de obra (correo y nombre). Al cambiar al jefe de personal, toda la cuadrilla y su historial pasan a él; al cambiar al jefe de obra, los contratos abiertos pasan al nuevo para que los evalúe.
  Dentro de una obra: "Sumar personal" (buscar y marcar trabajadores, fecha de inicio, "Agregar"), "Terminar" un contrato (queda pendiente de evaluación para el jefe de obra), "Terminar todos" y "Evaluar".
- ASISTENTE: chat general con IA para el día a día. Acepta texto, archivos (planillas, currículums, PDF, fotos; se suben privados con el clip) y dictado por voz (botón micrófono). Consulta el personal, evaluaciones, contratos y obras para resumir, comparar, redactar correos o reportes y guiar en la app. Solo lee datos: no modifica nada. "Nueva conversación" empieza de cero.
- RECOMENDAR: asistente con IA. Se le pide, por ejemplo, "1 capataz y 4 maestros primera de enfierradura para la obra X" y revisa evaluaciones, experiencia y disponibilidad para proponer a los mejores, advirtiendo a quién revisar antes. Tarda cerca de un minuto. "Nueva consulta" empieza de cero.
- IMPORTAR (pestaña "Planilla Excel"): subir .xlsx o .csv, o pegar desde Excel. Reconoce columnas nombre (o nombres y apellidos), RUT, cargo, especialidad, teléfono y obra; si hay una hoja por obra con su nombre, usa esa obra; o se elige "Sumar a la cuadrilla de". Muestra vista previa (nuevo, ya existe, RUT inválido, repetido) y "Cargar". Los RUT existentes no se duplican pero sí se suman a la obra.
  Pestaña "Currículums": "Elegir archivos" (varios PDF, Word o fotos). La app lee cada uno con IA (nombre, RUT, oficio, experiencia), lo une al trabajador por RUT o nombre o lo crea; se pueden corregir nombre, RUT y cargo antes de "Guardar". Si no se pudo leer, se completan a mano. Opcional: sumarlos a una obra.
  Si hay datos de demostración, aparece "Borrar demo" (solo borra lo de demo).
- EQUIPO: lista de usuarios con su cargo. Invitar: correo + cargo (Gerente de RRHH, Jefe de personal de obra o Jefe de obra) y "Enviar invitación"; el invitado recibe su cargo y acceso al crear su cuenta. Interruptor para aprobar o quitar acceso a jefes de obra. Selector para cambiar entre Gerente de RRHH y Jefe de personal de obra. Botón de pausa para suspender o reactivar a jefes de personal de obra y jefes de obra (su historial se conserva) y papelera para eliminar la cuenta (pierde acceso e invitación; sus evaluaciones se conservan).
`;

const GUIAS: Record<string, string> = {
  gerente_rrhh: `QUIEN PREGUNTA ES GERENTE DE RRHH: tiene acceso total.\n${GUIA_TOTAL}`,
  soporte: `QUIEN PREGUNTA ES DEL EQUIPO DE SOPORTE: tiene acceso total, igual que el gerente de RRHH.\n${GUIA_TOTAL}`,
  jefe_personal: `QUIEN PREGUNTA ES JEFE DE PERSONAL DE OBRA.
MENÚ: Panel, Personal, Evaluar, Obras, Asistente, Recomendar y Equipo. No tiene Importar (eso lo hace el gerente de RRHH).
- PANEL: igual que el gerente, pero los pendientes son de sus obras.
- PERSONAL: ve toda la base de personal y los historiales para elegir a los mejores. Puede "Agregar" trabajadores y ver documentos de la ficha.
- OBRAS: solo ve las obras que le asignó el gerente de RRHH (si no tiene, aparece "Aún no tienes obras asignadas"; debe pedírselo al gerente). No crea obras.
  Al abrir su obra, en "Editar" designa al jefe de obra (correo y nombre); nombre, código y fechas los define el gerente. Dentro de la obra: "Sumar personal" para elegir trabajadores, "Terminar" o "Terminar todos" los contratos (quedan pendientes de evaluar) y "Evaluar".
- EVALUAR: también puede evaluar los términos de sus obras.${GUIA_EVALUAR}
- ASISTENTE: chat general con IA (texto, archivos y voz) que consulta personal, evaluaciones y sus obras para resumir, comparar o redactar; solo lee datos.
- RECOMENDAR: asistente con IA que propone trabajadores bien evaluados para su obra (ej. "3 jornales y 2 maestros segunda de hormigón").
- EQUIPO: puede invitar solo jefes de obra (quedan aprobados al crear su cuenta) y aprobar o quitar acceso a jefes de obra. No cambia cargos ni suspende cuentas (eso es del gerente de RRHH).
`,
  jefe_obra: `QUIEN PREGUNTA ES JEFE DE OBRA.
MENÚ: "Por evaluar" y "Mis evaluaciones".
- POR EVALUAR: los trabajadores de sus obras cuyo contrato terminó, agrupados por obra; botón "Empezar a evaluar" o "Evaluar" en cada uno. Si no hay nada, aparece "Todo al día" (el jefe de personal de obra marca los términos).${GUIA_EVALUAR}
- MIS EVALUACIONES: las evaluaciones que él mismo registró.
- No ve la base de personal, el historial completo ni otras obras; no invita gente. Si necesita algo de eso, debe pedirlo a su jefe de personal de obra o al gerente de RRHH.
`,
};

const PANTALLAS: Record<string, string> = {
  "/": "Panel / inicio", "/trabajadores": "Personal", "/evaluar": "Evaluar", "/obras": "Obras", "/importar": "Importar",
  "/equipo": "Equipo", "/recomendar": "Recomendar", "/mis-evaluaciones": "Mis evaluaciones",
};

const LIMITE_TEXTO = 600;
const LIMITE_TURNOS = 12;

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const { mensajes, pantalla } = await req.json().catch(() => ({ mensajes: [] }));
  if (!Array.isArray(mensajes) || !mensajes.length) return Response.json({ error: "Falta la pregunta" }, { status: 400 });

  // Si viene con sesión, se usa su cargo real (no lo que diga el mensaje).
  const yo: any = await base44.auth.me().catch(() => null);
  const cargo = yo ? (yo.perfil ?? yo.data?.perfil ?? (yo.role === "admin" ? null : "jefe_obra")) : null;
  const suspendido = yo?.suspendido === true || yo?.data?.suspendido === true;
  const guia = !yo ? "QUIEN PREGUNTA NO HA INICIADO SESIÓN: ayúdale sobre todo a entrar y explícale qué hace cada cargo."
    : suspendido || cargo === "suspendido" ? "QUIEN PREGUNTA TIENE LA CUENTA SUSPENDIDA: solo el gerente de RRHH la puede reactivar."
    : GUIAS[cargo ?? ""] ?? "QUIEN PREGUNTA AÚN NO TIENE CARGO ASIGNADO: debe pedir al gerente de RRHH que lo invite o le asigne un cargo.";
  const ruta = typeof pantalla === "string" ? pantalla.replace(/\/[A-Za-z0-9_-]{12,}$/, "") : "";
  const dondeEsta = PANTALLAS[ruta] || (ruta.startsWith("/trabajadores") ? "Ficha de un trabajador" : ruta.startsWith("/obras") ? "Detalle de una obra" : "");

  const historial = mensajes.slice(-LIMITE_TURNOS).map((m: any) => ({
    rol: m?.rol === "asistente" ? "Asistente" : "Usuario",
    texto: String(m?.texto ?? "").slice(0, LIMITE_TEXTO),
  }));
  if (historial[historial.length - 1].rol !== "Usuario") return Response.json({ error: "Falta la pregunta" }, { status: 400 });

  const prompt = `Eres el asistente de soporte de la app web Cuadrilla, entrenado en todas sus funciones. Ayudas a las personas con TODO lo relacionado
con la app, según el cargo de quien pregunta. Respondes en español de Chile, cálido y claro. Cuando expliquen cómo hacer algo, da los pasos
concretos con los nombres exactos de menús y botones (máximo 6 pasos o 5 frases cortas), cada paso numerado en su propia línea. Si la persona pregunta por algo que su cargo no puede hacer,
explícale quién lo hace (por ejemplo, el gerente de RRHH) en vez de derivar. Si preguntan "qué puedo hacer", resume las funciones de su cargo.
No tienes acceso a datos de trabajadores, evaluaciones ni cuentas: si te piden datos de una persona, explica dónde verlos en la app según su cargo.
No inventes funciones que no estén descritas.
Marca "derivar" en true y dile que puede escribirle directamente a soporte con el botón verde de WhatsApp que aparece abajo (no digas que harás la gestión tú) cuando:
la pregunta esté fuera de tu alcance o no tenga relación con la app, no puedas responderla con esta información, sea un problema técnico que no se resuelve
con estos pasos (errores, algo que no carga, códigos que no llegan después de revisar spam), o la persona pida hablar con alguien.

INFORMACIÓN GENERAL:
${GENERAL}

${guia}
${dondeEsta ? `\nLA PERSONA ESTÁ AHORA EN LA PANTALLA: ${dondeEsta}.` : ""}

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
          derivar: { type: "boolean", description: "true si está fuera de tu alcance o requiere una persona de soporte" },
        },
        required: ["respuesta", "derivar"],
      },
    });
    const respuesta = String(r?.respuesta ?? "").slice(0, 1500) || "No tengo esa respuesta. Puedes escribir a soporte con el botón de WhatsApp.";
    return Response.json({ respuesta, derivar: !!r?.derivar || !r?.respuesta });
  } catch (_e) {
    return Response.json({ respuesta: "No pude responder en este momento. Puedes escribir a soporte con el botón verde de WhatsApp.", derivar: true });
  }
}
