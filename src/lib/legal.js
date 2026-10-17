// Contenido de las políticas de Cuadrilla (web y app móvil).
// Datos del responsable: completar razón social, RUT, domicilio y correo cuando estén definidos;
// las líneas vacías no se muestran.
export const RESPONSABLE = {
  nombre: 'la empresa constructora que utiliza Cuadrilla para gestionar su personal de terreno',
  razonSocial: '',
  rut: '',
  domicilio: '',
  correo: '',
};

export const VIGENCIA = { version: '1.0', fecha: '17 de octubre de 2026' };

export const DOCUMENTOS = {
  privacidad: {
    titulo: 'Política de Privacidad',
    resumen: 'Qué datos trata Cuadrilla, para qué, quién puede verlos y cómo ejercer tus derechos. Aplica a la app web y a la app móvil.',
    secciones: [
      {
        titulo: '1. Alcance',
        parrafos: [
          'Esta política explica cómo se tratan los datos personales en Cuadrilla, la aplicación de uso interno para registrar el historial de desempeño del personal de terreno (supervisores, capataces, maestros y jornales). Aplica a la aplicación web (cuadrilla.base44.app) y a la aplicación móvil para iOS y Android, cuando esté disponible, en adelante "la App".',
          'Se rige por la Ley N° 19.628 sobre Protección de la Vida Privada y, desde su entrada en vigencia, por la Ley N° 21.719 que regula la protección y el tratamiento de los datos personales, además del artículo 154 bis del Código del Trabajo, que obliga a mantener reserva de la información privada de los trabajadores.',
        ],
      },
      {
        titulo: '2. Responsable y proveedores',
        parrafos: [
          'El responsable del tratamiento es {RESPONSABLE}.',
          'La App funciona sobre Base44, plataforma de Wix.com Ltd., que actúa como proveedor (encargado) de alojamiento, base de datos, autenticación, almacenamiento de archivos y servicios de inteligencia artificial. El inicio de sesión con Google es opcional y lo provee Google LLC. Estos proveedores tratan los datos solo para prestar el servicio y bajo sus propias obligaciones de seguridad y confidencialidad.',
        ],
      },
      {
        titulo: '3. Datos que tratamos',
        lista: [
          'Usuarios de la App (gerente de RRHH, jefes de personal de obra, jefes de obra y soporte): nombre, correo electrónico, cargo dentro de la App y registros de acceso.',
          'Trabajadores de terreno: nombre, RUT, cargo, especialidad, teléfono, experiencia, obras en que ha trabajado, fechas de contrato y evaluaciones al término de cada contrato (desempeño, responsabilidad, si se recomienda recontratar y comentarios).',
          'Datos sensibles: las evaluaciones pueden incluir información sobre consumo de alcohol o drogas en faena (sin observaciones, sospecha o incidente confirmado). Se trata como dato sensible: solo lo registran y ven las personas autorizadas, y solo para fines de seguridad laboral.',
          'Currículums y documentos que se adjunten a la ficha de un trabajador, guardados como archivos privados.',
          'Conversaciones con los asistentes de inteligencia artificial y con el chat de soporte.',
          'Datos técnicos que la plataforma registra para operar y proteger el servicio, como dirección IP, tipo de navegador o dispositivo y fecha de acceso.',
        ],
      },
      {
        titulo: '4. Para qué los usamos',
        lista: [
          'Mantener un historial de desempeño del personal de terreno entre obras, para que cada contratación considere experiencias anteriores.',
          'Asignar personal a las obras, gestionar términos de contrato y sus evaluaciones.',
          'Prevenir riesgos y proteger la seguridad de los equipos en faena.',
          'Dar acceso seguro a cada usuario según su cargo y prestar soporte.',
          'Generar reportes de gestión internos.',
        ],
        parrafos: ['Los datos no se venden, no se usan con fines publicitarios y no se comparten con terceros ajenos a la operación de la App.'],
      },
      {
        titulo: '5. Fundamento del tratamiento',
        parrafos: [
          'El tratamiento se basa en la relación laboral o contractual con los trabajadores, en el interés legítimo de la empresa en la seguridad y en la selección de personal, y en el cumplimiento de obligaciones legales de seguridad y salud en el trabajo. Cuando la ley lo exija, se solicitará el consentimiento de la persona.',
          'La información sobre alcohol y drogas solo se registra cuando existe un hecho observado o un reporte por el canal correspondiente, y se usa exclusivamente para decisiones de seguridad. Nunca se publica ni se comparte fuera de las personas autorizadas.',
        ],
      },
      {
        titulo: '6. Quién puede ver los datos',
        lista: [
          'Gerente de RRHH y Soporte: acceso a toda la información, para administrar la App.',
          'Jefe de personal de obra: base de personal e historiales para seleccionar trabajadores, y la gestión de las obras que tiene asignadas.',
          'Jefe de obra: solo los trabajadores de sus obras cuyo contrato terminó, y las evaluaciones que él mismo registró.',
          'Personas sin invitación: no pueden ver ningún dato. Estas reglas se aplican en el servidor, no solo en la pantalla.',
        ],
      },
      {
        titulo: '7. Inteligencia artificial',
        parrafos: [
          'La App usa inteligencia artificial para leer currículums y proponer sus datos, recomendar trabajadores para una obra, asistir en tareas del día a día y responder preguntas de soporte. Estas herramientas solo leen información: no modifican datos.',
          'Las recomendaciones son un apoyo. Las decisiones de contratación las toma siempre una persona, que debe revisarlas. Cualquier trabajador puede pedir que una decisión que lo afecte sea revisada por una persona y conocer los criterios usados.',
        ],
      },
      {
        titulo: '8. Transferencia internacional',
        parrafos: ['Los proveedores de la plataforma pueden almacenar o procesar los datos en servidores ubicados fuera de Chile. En esos casos se exigen garantías de seguridad y confidencialidad equivalentes a las exigidas por la ley chilena.'],
      },
      {
        titulo: '9. Cuánto tiempo los guardamos',
        parrafos: [
          'Los datos de los usuarios se conservan mientras tengan una cuenta activa. Al eliminar una cuenta, se elimina su acceso y su invitación; las evaluaciones que registró se conservan como parte del historial de los trabajadores.',
          'El historial de los trabajadores se conserva mientras sea útil para el fin de la App y hasta 5 años desde su última evaluación, salvo que una obligación legal exija otro plazo o que la persona solicite su eliminación y corresponda aceptarla. Los datos de demostración se eliminan antes de usar la App con datos reales.',
        ],
      },
      {
        titulo: '10. Tus derechos',
        parrafos: ['Tanto usuarios como trabajadores pueden ejercer sus derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, incluido conocer las evaluaciones registradas sobre ellos. Para hacerlo, escribe a soporte (ver Contacto) o al área de RRHH de la empresa, indicando tu nombre, RUT y lo que solicitas. Responderemos en un plazo máximo de 30 días corridos.'],
      },
      {
        titulo: '11. App móvil',
        lista: [
          'Permisos: cámara, fotos y archivos, solo cuando subas un currículum o documento; micrófono, solo si usas el dictado por voz del asistente; notificaciones, solo si las activas. Puedes revocarlos en los ajustes del teléfono.',
          'La App no usa tu ubicación, no muestra publicidad y no rastrea tu actividad en otras apps o sitios.',
          'La sesión se guarda en el dispositivo para no pedirte la contraseña cada vez. Cierra sesión si compartes el teléfono.',
          'Puedes solicitar la eliminación de tu cuenta y de tus datos desde el soporte de la App o al gerente de RRHH.',
        ],
      },
      {
        titulo: '12. Menores de edad',
        parrafos: ['La App está dirigida a trabajadores y equipos de la empresa mayores de 18 años. No se recopilan datos de menores de edad de forma intencional.'],
      },
      {
        titulo: '13. Cambios',
        parrafos: ['Esta política puede actualizarse. La versión vigente y su fecha estarán siempre publicadas en la App. Si los cambios son importantes, se avisará a los usuarios.'],
      },
    ],
  },

  seguridad: {
    titulo: 'Política de Seguridad',
    resumen: 'Cómo se protegen la App y los datos, y qué se espera de cada persona que la usa. Aplica a la app web y a la app móvil.',
    secciones: [
      {
        titulo: '1. Objetivo',
        parrafos: ['Proteger la confidencialidad, integridad y disponibilidad de la información del personal de terreno, en especial los datos sensibles, en la app web y en la app móvil.'],
      },
      {
        titulo: '2. Control de acceso',
        lista: [
          'Uso interno y solo por invitación: no existe registro libre.',
          'Inicio de sesión con Google o con correo y contraseña verificado con un código enviado al correo.',
          'Mínimo privilegio: cada cargo (gerente de RRHH, jefe de personal de obra, jefe de obra y soporte) ve solo lo que necesita. Los permisos se aplican en el servidor.',
          'Solo el gerente de RRHH asigna cargos, suspende o elimina cuentas. Nadie puede subirse de cargo ni reactivarse por su cuenta.',
          'Se revisan periódicamente los accesos y se suspenden de inmediato las cuentas de personas que dejan la empresa o el cargo.',
        ],
      },
      {
        titulo: '3. Protección de la información',
        lista: [
          'Toda la comunicación viaja cifrada (HTTPS).',
          'Currículums y documentos se guardan como archivos privados; solo se abren con enlaces temporales para usuarios autorizados.',
          'Los datos de alcohol y drogas solo los ven el gerente de RRHH, soporte y los jefes de personal de obra, y nunca aparecen en el chat de soporte.',
          'Los asistentes de inteligencia artificial solo pueden leer datos, con los permisos de quien los usa; el chat de soporte de la pantalla de entrada no tiene acceso a datos.',
          'Los textos que ingresan los usuarios se tratan como texto al mostrarlos o exportarlos, para impedir que se ejecute código malicioso.',
        ],
      },
      {
        titulo: '4. Desarrollo y mantenimiento',
        lista: [
          'Revisión del código y de las librerías usadas, con reemplazo de las que presenten vulnerabilidades conocidas.',
          'Cada cambio se prueba antes de publicarse, y se guardan puntos de restauración para volver atrás si algo falla.',
          'Las pruebas se hacen con datos ficticios, separados de los datos reales.',
        ],
      },
      {
        titulo: '5. Responsabilidades de cada usuario',
        lista: [
          'No compartir la cuenta ni la contraseña; cada persona entra con su propio correo.',
          'Cerrar sesión en computadores o teléfonos compartidos, y usar bloqueo de pantalla en el teléfono.',
          'No sacar datos de la App por canales no autorizados (capturas, mensajes o correos personales).',
          'Tratar los reportes descargados (Excel o PDF) como documentos confidenciales: guardarlos en equipos de la empresa y eliminarlos cuando ya no se necesiten.',
          'Avisar de inmediato a soporte o a RRHH ante cualquier acceso sospechoso, pérdida de un dispositivo o error en los datos.',
        ],
      },
      {
        titulo: '6. Incidentes de seguridad',
        parrafos: ['Ante un incidente (acceso no autorizado, pérdida o filtración de datos) se contiene el problema, se evalúa su alcance, se corrige la causa y se registra lo ocurrido. Cuando afecte datos personales en los términos de la ley, se informará a las personas afectadas y, cuando corresponda, a la Agencia de Protección de Datos Personales.'],
      },
      {
        titulo: '7. Respaldo y continuidad',
        parrafos: ['La plataforma mantiene respaldos de la base de datos, y la App guarda versiones restaurables de su código. Ante una falla, el servicio se restablece desde la última versión estable.'],
      },
      {
        titulo: '8. App móvil',
        lista: [
          'Descargar la App solo desde App Store o Google Play.',
          'Mantener la App y el sistema del teléfono actualizados.',
          'No usarla en teléfonos con el sistema modificado (root o jailbreak).',
          'Los permisos del teléfono se piden solo al usar la función que los necesita.',
        ],
      },
      {
        titulo: '9. Reporte de vulnerabilidades',
        parrafos: ['Si detectas una falla de seguridad, repórtala a soporte sin aprovecharla ni divulgarla. La revisaremos con prioridad.'],
      },
      {
        titulo: '10. Revisión',
        parrafos: ['Esta política se revisa al menos una vez al año y cada vez que la App incorpora funciones importantes.'],
      },
    ],
  },

  terminos: {
    titulo: 'Términos de Uso',
    resumen: 'Reglas para usar Cuadrilla y registrar evaluaciones de forma justa y confidencial.',
    secciones: [
      {
        titulo: '1. Aceptación',
        parrafos: ['Al usar la App aceptas estos términos, la Política de Privacidad y la Política de Seguridad. Si no estás de acuerdo, no debes usarla.'],
      },
      {
        titulo: '2. Uso autorizado',
        parrafos: ['La App es de uso interno de {RESPONSABLE} y solo pueden usarla personas invitadas, de acuerdo con su cargo y para fines de su trabajo.'],
      },
      {
        titulo: '3. Cuentas',
        parrafos: ['Cada cuenta es personal e intransferible. Eres responsable de lo que se haga con ella y debes mantener tus credenciales en reserva.'],
      },
      {
        titulo: '4. Evaluaciones',
        lista: [
          'Deben ser objetivas, basadas en hechos observados durante el contrato, y redactadas con respeto.',
          'No se pueden incluir opiniones o datos discriminatorios por raza, sexo, edad, estado civil, sindicación, religión, opinión política, nacionalidad, origen social, discapacidad u otro motivo prohibido por la ley.',
          'La información sobre alcohol o drogas solo se registra cuando existe un hecho observado o un reporte por el canal correspondiente, y debe describirse con prudencia.',
          'Las evaluaciones son confidenciales y no deben compartirse fuera de la App.',
        ],
      },
      {
        titulo: '5. Conductas prohibidas',
        lista: [
          'Acceder o intentar acceder a información que no corresponde a tu cargo.',
          'Cargar datos falsos o documentos de otras personas sin autorización.',
          'Copiar, descargar o difundir datos fuera de los fines de la App.',
          'Intentar vulnerar la seguridad de la App o usarla para fines distintos a la gestión de personal.',
        ],
      },
      {
        titulo: '6. Inteligencia artificial',
        parrafos: ['Los asistentes de IA son una ayuda y pueden equivocarse. Revisa sus recomendaciones y la información que proponen antes de usarlas; las decisiones son siempre de una persona.'],
      },
      {
        titulo: '7. Disponibilidad',
        parrafos: ['Se busca que la App esté disponible en todo momento, pero puede haber interrupciones por mantención o por causas ajenas. Las funciones pueden mejorar o cambiar.'],
      },
      {
        titulo: '8. Suspensión',
        parrafos: ['El gerente de RRHH puede suspender o eliminar una cuenta si deja de corresponder o si se incumplen estos términos. El historial de evaluaciones se conserva.'],
      },
      {
        titulo: '9. Propiedad',
        parrafos: ['La información registrada pertenece a la empresa responsable. El diseño y el software de la App están protegidos por la ley.'],
      },
      {
        titulo: '10. Ley aplicable',
        parrafos: ['Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales ordinarios de justicia competentes.'],
      },
    ],
  },
};

export const CONTACTO = [
  'Soporte de Cuadrilla: chat "Solicitar soporte" en la App o WhatsApp +56 9 5674 5654.',
  'Área de RRHH de la empresa responsable.',
];
