import { Procedure, ActiveProcedure, ExpirationReminder, HistoryRecord, Advisor, TramiteOption } from './types';

export const GESTORES_VERIFICADOS: Advisor[] = [
  {
    name: "Dr. Rodrigo Peralta",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop",
    status: "Disponible ahora • Experto en RENIEC y Migraciones",
    rating: 4.9,
    casesCompleted: 1420,
    colegiatura: "Colegiatura CAL N° 49129",
    fee: "S/. 80.00"
  },
  {
    name: "Dra. Eliana Torres",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop",
    status: "Disponible ahora • Especialista Corporativa SUNARP",
    rating: 4.8,
    casesCompleted: 1840,
    colegiatura: "Colegiatura CAL N° 35123",
    fee: "S/. 120.00"
  },
  {
    name: "Agente Marcos Benavides",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
    status: "Activo • Especialista en Tránsito MTC",
    rating: 4.7,
    casesCompleted: 950,
    colegiatura: "Acreditado MTC N° 0914",
    fee: "S/. 65.00"
  }
];

export const MOCK_ADVISOR = GESTORES_VERIFICADOS[0];

export const PROCEDURES: TramiteOption[] = [
  {
    id: "renovar-dni",
    title: "Renovación o duplicado de DNI Electrónico",
    category: "Identidad",
    entity: "RENIEC",
    modality: "Mixta",
    complexity: "Baja",
    estimatedCost: "S/. 30.00 (Azul) / S/. 41.00 (DNIe)",
    duration: "10 a 15 días hábiles",
    estimatedDuration: "10 a 15 días hábiles",
    coPilotAdvice: "TramIA recomienda validar tu DNIe para trámites digitales complejos sin firmas manuscritas.",
    actionLabel: "Verificar Requisitos",
    description: "Renovación por caducidad o duplicado por robo/pérdida del DNI en RENIEC con fotografía biométrica digital.",
    popular: true,
    timeSavedText: "10 horas libres de trámites",
    avoidedQueuesText: "Evitas hasta 2 visitas a oficinas de RENIEC",
    feeAmount: "S/. 65.00",
    steps: [
      { id: "step-1", title: "Pago de Tasa Especial", description: "Pagar la tasa correspondiente de S/. 30.00 (Código 02119 para azul) o S/. 41.00 (Código 05214 para DNIe) en Pagalo.pe o Banco de la Nación.", status: "PENDIENTE", order: 1 },
      { id: "step-2", title: "Fotografía Facial Certificada", description: "Tomarse una fotografía facial adecuada con fondo blanco usando la app oficial DNI Bio Facial o cargándola aquí para verificar.", status: "PENDIENTE", order: 2 },
      { id: "step-3", title: "Presentación Online / Presencial", description: "Llenar el formulario web en RENIEC o asistir si requiere actualización mayor de huellas.", status: "PENDIENTE", order: 3 },
      { id: "step-4", title: "Recoger DNI en la oficina correspondiente", description: "Acudir presencialmente a la oficina o agencia de RENIEC seleccionada para la entrega de tu DNI con verificación biométrica.", status: "PENDIENTE", order: 4 }
    ],
    requirements: [
      {
        id: "req-dni-pago",
        name: "Voucher de Pago (Tasa Pagalo.pe)",
        description: "Comprobante de pago con código de tasa 02119 o 05214. El número de recibo debe coincidir con tu DNI.",
        code: "Cód. 02119 / 05214",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-dni-foto",
        name: "Fotografía Biométrica Certificada",
        description: "Imagen de rostro neutral, primer plano, fondo blanco mate, buena iluminación, orejas y frente descubiertos. Sin lentes.",
        code: "Dimensiones pasaporte",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-2",
        imageQuality: "Mala",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-dni-solicitud",
        name: "Formulario de Solicitud Firmado",
        description: "Declaración jurada de datos opcional para cambio de estado civil o de domicilio habitual.",
        code: "Formato RENIEC",
        status: "Pendiente",
        critical: false,
        requiredForStepId: "step-3",
        isValidated: false,
        isRequired: false
      }
    ]
  },
  {
    id: "rectificacion-partida",
    title: "Rectificación de Partida de Nacimiento",
    category: "Identidad",
    entity: "RENIEC / Municipalidad",
    modality: "Mixta",
    complexity: "Media",
    estimatedCost: "S/. 24.50 (Tasa administrativa / notarial)",
    duration: "5 a 10 días hábiles",
    estimatedDuration: "5 a 10 días hábiles",
    coPilotAdvice: "Si el error es ortográfico o de tipeo, se efectúa por la vía administrativa sin necesidad de un juicio judicial.",
    actionLabel: "Corregir Partida",
    description: "Corrección de errores u omisiones en nombres, apellidos o fechas en tu acta de nacimiento.",
    popular: false,
    timeSavedText: "12 horas ahorradas",
    avoidedQueuesText: "TramIA evalúa el procedimiento óptimo sin ir al juzgado",
    feeAmount: "S/. 90.00",
    steps: [
      { id: "step-rec-1", title: "Pago de Tasa de Rectificación", description: "Abono de la tasa administrativa correspondiente en Pagalo.pe o Banco de la Nación.", status: "PENDIENTE", order: 1 },
      { id: "step-rec-2", title: "Presentación de Solicitud y Documentos de Sustento", description: "Ingreso de la solicitud formal junto con la partida errónea y documentos probatorios que acrediten la corrección.", status: "PENDIENTE", order: 2 },
      { id: "step-rec-3", title: "Emisión y Descarga del Acta Rectificada", description: "Procesamiento por RENIEC o la municipalidad y expedición de la nueva partida oficial corregida.", status: "PENDIENTE", order: 3 }
    ],
    requirements: [
      {
        id: "req-rec-partida",
        name: "Partida de Nacimiento Errónea",
        description: "Copia certificada actual de la partida que contiene el error u omisión de datos.",
        code: "Copia Certificada",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-rec-2",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-rec-sustento",
        name: "Documento Oficial de Sustento",
        description: "Fe de bautismo, DNI de los padres o documento oficial antiguo que demuestre la grafía correcta.",
        code: "Sustento de Prueba",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-rec-2",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "ruc-persona-natural",
    title: "Inscripción al RUC para Persona Natural con Negocio",
    category: "Negocios",
    entity: "SUNAT",
    modality: "Virtual",
    complexity: "Baja",
    estimatedCost: "Gratuito",
    duration: "1 día hábil",
    estimatedDuration: "1 día hábil",
    coPilotAdvice: "Inscríbete en el RUC con tu DNI para emitir boletas y facturas electrónicas desde la App SUNAT.",
    actionLabel: "Obtener RUC",
    description: "Inscripción tributaria de 10 dígitos y Clave SOL ante SUNAT para personas naturales que inician negocios.",
    popular: true,
    timeSavedText: "6 horas ahorradas",
    avoidedQueuesText: "Tramita tu RUC 100% digital sin ir al centro de atención SUNAT",
    feeAmount: "S/. 50.00",
    steps: [
      { id: "step-ruc-1", title: "Declaración de Domicilio Fiscal y Actividades", description: "Llenado de datos de dirección tributaria y código de actividad económica (CIIU) en la App SUNAT o portal web.", status: "PENDIENTE", order: 1 },
      { id: "step-ruc-2", title: "Generación de RUC y Clave SOL SUNAT", description: "Activación del RUC de 10 dígitos y recepción de credenciales SOL para facturación electrónica.", status: "PENDIENTE", order: 2 }
    ],
    requirements: [
      {
        id: "req-ruc-dni",
        name: "DNI Físico Vigente",
        description: "Documento nacional de identidad vigente sin multas electorales pendientes.",
        code: "DNI Titular",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-ruc-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-ruc-recibo",
        name: "Recibo de Servicios de Domicilio Fiscal",
        description: "Recibo de luz, agua o teléfono fijo con antigüedad menor a 2 meses que respalde el domicilio tributario.",
        code: "Recibo de Servicio",
        status: "Pendiente",
        critical: false,
        requiredForStepId: "step-ruc-1",
        isValidated: false,
        isRequired: false
      }
    ]
  },
  {
    id: "crear-empresa",
    title: "Constitución de Empresa en Línea vía SID",
    category: "Negocios",
    entity: "SUNARP",
    modality: "Mixta",
    complexity: "Alta",
    estimatedCost: "S/. 350.00 (Tasas) + Capital Inicial",
    duration: "7 a 14 días hábiles",
    estimatedDuration: "7 a 14 días hábiles",
    coPilotAdvice: "Definir bien el objeto social y la estructura del directorio agiliza la aprobación notarial ante la SUNARP.",
    actionLabel: "Iniciar Constitución",
    description: "Constitución formal de empresa (S.A.C., E.I.R.L.) vía SID-SUNARP con reserva de nombre, escritura notarial e inscripción registral.",
    popular: true,
    timeSavedText: "32 horas de pura burocracia ahorradas",
    avoidedQueuesText: "TramIA gestiona la notaría y el registro registral por ti",
    feeAmount: "S/. 250.00",
    steps: [
      { id: "step-emp-1", title: "Reserva de Nombre SUNARP", description: "Verificación de homonimia y reserva oficial de razón social en SUNARP.", status: "PENDIENTE", order: 1 },
      { id: "step-emp-2", title: "Minuta de Constitución", description: "Elaboración de estatutos, objeto social y reparto de acciones elaborado por abogado.", status: "PENDIENTE", order: 2 },
      { id: "step-emp-3", title: "Firma de Escritura Pública", description: "Suscripción ante notaría autorizada con huellas dactilares.", status: "PENDIENTE", order: 3 },
      { id: "step-emp-4", title: "Recoger RUC y Clave SOL en la oficina de SUNAT / Notaría", description: "Obtención y recojo presencial de los accesos definitivos de la empresa y RUC en Notaría o SUNAT.", status: "PENDIENTE", order: 4 }
    ],
    requirements: [
      {
        id: "req-emp-reserva",
        name: "Reserva de Nombre SUNARP",
        description: "Documento oficial que acredita que el nombre de Fantasía o Social se encuentra reservado a tu favor.",
        code: "SUNARP N° 12489",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-emp-1",
        imageQuality: "Buena",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-emp-minuta",
        name: "Minuta Elaborada y Visada",
        description: "Estatutos debidamente visados por un abogado colegiado en el Perú.",
        code: "Acto Constitutivo PDF",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-emp-2",
        imageQuality: "Buena",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-emp-dni",
        name: "DNI de todos los Socios Fundadores",
        description: "Copia legible de los socios y sus respectivos cónyuges de ser el caso.",
        code: "Copia simple a color",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-emp-3",
        imageQuality: "Buena",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-emp-capital",
        name: "Voucher de Apertura de Cuenta o Declaración de Bienes",
        description: "Depósito bancario del aporte financiero de los socios o inventario de bienes.",
        code: "Sustento de Capital",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-emp-3",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "licencia-conducir",
    title: "Primera Licencia de Conducir Particular (A-I)",
    category: "Transporte",
    entity: "MTC / Touring",
    modality: "Mixta",
    complexity: "Alta",
    estimatedCost: "S/. 24.50 (Examen) + S/. 150.00 aprox (Médico)",
    duration: "3 a 5 días hábiles",
    estimatedDuration: "3 a 5 días hábiles",
    coPilotAdvice: "El examen médico approved por un centro autorizado es indispensable antes de programar las reglas y el manejo en el Touring.",
    actionLabel: "Iniciar Brevete",
    description: "Obtención del Brevete Particular (A-I) con examen médico psicosomático, prueba de reglas y práctica en Touring.",
    popular: true,
    timeSavedText: "18 horas optimizadas",
    avoidedQueuesText: "TramIA coordina tus citas y verifica tus resultados con el MTC",
    feeAmount: "S/. 120.00",
    steps: [
      { id: "step-lic-1", title: "Certificado de Examen Médico", description: "Evaluación psicométrica y física aprobada en un centro autorizado por el MTC.", status: "PENDIENTE", order: 1 },
      { id: "step-lic-2", title: "Examen de Conocimiento (Reglas)", description: "Rendir el examen teórico sobre normas de tránsito y señales viales.", status: "PENDIENTE", order: 2 },
      { id: "step-lic-3", title: "Examen de Habilidad (Manejo)", description: "Evaluación práctica de destreza al volante en el circuito de Touring.", status: "PENDIENTE", order: 3 },
      { id: "step-lic-4", title: "Recoger Licencia en la oficina del MTC / MAC", description: "Abono por derecho de emisión y recojo presencial del brevete en la sede del MTC o Centro MAC.", status: "PENDIENTE", order: 4 }
    ],
    requirements: [
      {
        id: "req-lic-medico",
        name: "Examen Médico Aprobado",
        description: "Evaluación psicosomática registrada digitalmente en el MTC por centro médico oficial habilitado.",
        code: "Registro MTC",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-lic-1",
        imageQuality: "Buena",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-lic-pago",
        name: "Certificado co-oficial de destreza de manejo",
        description: "Derecho a rendir exámenes de reglas y manejo en la sede del Touring Conchán o Lince.",
        code: "Mapeo de Pago S/. 67.30",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-lic-2",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "traspaso-vehiculo",
    title: "Traspaso de Propiedad de Vehículo",
    category: "Transporte",
    entity: "SUNARP / Notaría",
    modality: "Presencial",
    complexity: "Media",
    estimatedCost: "S/. 75.00 (Tasa SUNARP) + Gastos Notariales",
    duration: "2 a 4 días hábiles",
    estimatedDuration: "2 a 4 días hábiles",
    coPilotAdvice: "Ambas partes deben acudir a la notaría con sus documentos de identidad vigentes para firmar el acta de transferencia vehicular.",
    actionLabel: "Transferir Vehículo",
    description: "Inscripción registral de transferencia vehicular en SUNARP con firma biométrica del acta notarial.",
    popular: true,
    timeSavedText: "15 horas ahorradas",
    avoidedQueuesText: "Coordinación directa de firma biométrica en notaría",
    feeAmount: "S/. 110.00",
    steps: [
      { id: "step-trans-1", title: "Firma de Acta en Notaría", description: "Comprador y vendedor firman el Acta Notarial de transferencia vehicular con validación biométrica.", status: "PENDIENTE", order: 1 },
      { id: "step-trans-2", title: "Pago de Derechos Registrales", description: "Abono de la tasa de inscripción registral de S/. 75.00 en SUNARP.", status: "PENDIENTE", order: 2 },
      { id: "step-trans-3", title: "Inscripción y Emisión de TIVE en SUNARP", description: "SUNARP procesa la transferencia y emite la nueva Tarjeta de Identificación Vehicular (TIVE) a nombre del comprador.", status: "PENDIENTE", order: 3 }
    ],
    requirements: [
      {
        id: "req-trans-tive",
        name: "Tarjeta de Identificación Vehicular (TIVE)",
        description: "Tarjeta física o digital del vehículo que acredite la propiedad actual del vendedor.",
        code: "TIVE Digital / Física",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-trans-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-trans-dnis",
        name: "DNI de Comprador y Vendedor",
        description: "Copia a color legible de los documentos nacionales de identidad de ambas partes.",
        code: "Documentos de Identidad",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-trans-1",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "sacar-pasaporte",
    title: "Obtención de Pasaporte Electrónico Ordinario",
    category: "Viajes",
    entity: "Migraciones",
    modality: "Mixta",
    complexity: "Media",
    estimatedCost: "S/. 120.90",
    duration: "1 día (Entrega inmediata tras cita)",
    estimatedDuration: "1 día (Entrega inmediata tras cita)",
    coPilotAdvice: "El pasaporte peruano ahora cuenta con 10 años de vigencia. Asegúrate de pagar la tasa con el DNI correcto del solicitante en pagalo.pe.",
    actionLabel: "Iniciar Pasaporte",
    description: "Obtención del pasaporte biométrico de 10 años en Migraciones tras pago de tasa y cita presencial.",
    popular: true,
    timeSavedText: "14 horas de colas ahorradas",
    avoidedQueuesText: "Olvídate de colas a la madrugada en Migraciones",
    feeAmount: "S/. 95.00",
    steps: [
      { id: "step-pass-1", title: "Pago de Tasa Especial", description: "Pago de S/. 120.90 bajo el código 01810 en Pagalo.pe con el DNI del titular.", status: "PENDIENTE", order: 1 },
      { id: "step-pass-2", title: "Programación de Cita Web", description: "Reservar un cupo con el número de voucher en la plataforma de citas de Migraciones.", status: "PENDIENTE", order: 2 },
      { id: "step-pass-3", title: "Captura de Datos y Biometría", description: "Asistir a la oficina seleccionada. Toma personal de foto de pasaporte, huellas dactilares y firma biométrica.", status: "PENDIENTE", order: 3 },
      { id: "step-pass-4", title: "Recoger Pasaporte en la oficina de Migraciones", description: "Impresión, entrega y recojo presencial del librillo biométrico en la sede de Migraciones.", status: "PENDIENTE", order: 4 }
    ],
    requirements: [
      {
        id: "req-pass-pago",
        name: "Comprobante de Pago (Cód. 01810)",
        description: "Pago de S/. 120.90 efectuado a favor del Ministerio del Interior. Debe registrar el DNI del solicitante.",
        code: "Código Tasa 01810",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-pass-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-pass-dni",
        name: "DNI Vigente sin Multas Electorales",
        description: "El DNI físico o digital debe estar vigente al día de la cita y no presentar deudas de votación en el JNE.",
        code: "Original físico",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-pass-2",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-pass-cita",
        name: "Constancia de Cita Legalizada",
        description: "PDF oficial emitido por el portal de Migraciones una vez fijado el día, hora y sede del trámite.",
        code: "Formato Digital PDF",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-pass-2",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "visa-eeuu",
    title: "Visa de Turismo para EE.UU. (B1/B2)",
    category: "Viajes",
    entity: "Embajada de EE.UU.",
    modality: "Mixta",
    complexity: "Alta",
    estimatedCost: "$185 USD (Tasa MRV)",
    duration: "Según disponibilidad consular",
    estimatedDuration: "Según disponibilidad consular",
    coPilotAdvice: "Llenar con precisión el formulario DS-160 es la clave para la aprobación en la entrevista consular.",
    actionLabel: "Solicitar Visa",
    description: "Solicitud de visa de visitante B1/B2 para viajes de turismo o negocios a EE.UU. con formulario DS-160 y entrevista.",
    popular: true,
    timeSavedText: "25 horas de asesoría",
    avoidedQueuesText: "TramIA audita tu DS-160 antes de enviarlo a la embajada",
    feeAmount: "S/. 180.00",
    steps: [
      { id: "step-visa-1", title: "Llenado de Formulario DS-160", description: "Completar la solicitud electrónica de visa de no inmigrante en el sistema del Departamento de Estado.", status: "PENDIENTE", order: 1 },
      { id: "step-visa-2", title: "Pago de Tasa Consular MRV ($185 USD)", description: "Abonar los $185 USD en el banco autorizados o tarjeta en la plataforma de citas.", status: "PENDIENTE", order: 2 },
      { id: "step-visa-3", title: "Programación de Citas (CAS y Entrevista)", description: "Agendar citas para toma de huellas y foto en el CAS y entrevista presencial en la Embajada.", status: "PENDIENTE", order: 3 }
    ],
    requirements: [
      {
        id: "req-visa-ds160",
        name: "Hoja de Confirmación DS-160",
        description: "Código de barras que confirma el envío del formulario DS-160.",
        code: "DS-160 Confirmation",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-visa-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-visa-pasaporte",
        name: "Pasaporte Biométrico Vigente",
        description: "Pasaporte con vigencia mínima de 6 meses posteriores a la fecha prevista de viaje.",
        code: "Pasaporte Vigente",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-visa-1",
        isValidated: false,
        isRequired: true
      }
    ]
  },
  {
    id: "matrimonio-civil",
    title: "Matrimonio Civil Municipal",
    category: "Estado Civil",
    entity: "Municipalidad Distrital",
    modality: "Presencial",
    complexity: "Media",
    estimatedCost: "Desde S/. 120.00 (según Municipio)",
    duration: "15 a 30 días hábiles (varía según municipio)",
    estimatedDuration: "15 a 30 días hábiles (varía según municipio)",
    coPilotAdvice: "Abre tu pliego matrimonial con anticipación para cumplir con la publicación del edicto civil en el periódico.",
    actionLabel: "Iniciar Matrimonio",
    description: "Apertura del expediente matrimonial, publicación de edicto civil y ceremonia ante la municipalidad distrital.",
    popular: false,
    timeSavedText: "20 horas de trámites",
    avoidedQueuesText: "TramIA gestiona edictos y recopilación de documentos",
    feeAmount: "S/. 150.00",
    steps: [
      { id: "step-mat-1", title: "Apertura de Expediente Matrimonial", description: "Presentar las partidas de nacimiento de ambos contrayentes, DNI y certificados de salud.", status: "PENDIENTE", order: 1 },
      { id: "step-mat-2", title: "Publicación de Edicto Matrimonial", description: "Difusión del edicto en el periódico local o mural municipal durante 8 días hábiles.", status: "PENDIENTE", order: 2 },
      { id: "step-mat-3", title: "Programación y Ceremonia Civil", description: "Celebración del matrimonio civil y suscripción del acta con los dos testigos.", status: "PENDIENTE", order: 3 }
    ],
    requirements: [
      {
        id: "req-mat-partidas",
        name: "Partidas de Nacimiento Actualizadas",
        description: "Partidas emitidas por RENIEC con antigüedad no mayor a 3 meses.",
        code: "Acta de Nacimiento",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-mat-1",
        isValidated: false,
        isRequired: true
      },
      {
        id: "req-mat-medico",
        name: "Certificados Médicos Prenupciales",
        description: "Certificado de salud integral emitido por centro médico oficial.",
        code: "Examen Prenupcial",
        status: "Pendiente",
        critical: true,
        requiredForStepId: "step-mat-1",
        isValidated: false,
        isRequired: true
      }
    ]
  }
];

export const LISTA_TRAMITES = PROCEDURES;

export const INITIAL_ACTIVE_PROCEDURES: ActiveProcedure[] = [];

export const EXPIRATION_REMINDERS: ExpirationReminder[] = [];

export const RECORDATORIOS_VENCIMIENTO = EXPIRATION_REMINDERS;

export const MOCK_HISTORY: HistoryRecord[] = [];

