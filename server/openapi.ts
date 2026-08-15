export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'TramIA API',
    version: '0.11.0',
    description: 'API pública versionada para el catálogo y los futuros expedientes de TramIA.',
  },
  servers: [
    { url: '/api', description: 'Servidor actual' },
  ],
  tags: [
    { name: 'Sistema' },
    { name: 'Inteligencia artificial' },
    { name: 'Catálogo' },
    { name: 'Gestiones' },
    { name: 'Asesores' },
    { name: 'Documentos' },
    { name: 'Mensajería' },
    { name: 'Notificaciones' },
    { name: 'Perfiles' },
    { name: 'Configuración' },
    { name: 'Administración' },
    { name: 'Pagos simulados' },
  ],
  paths: {
    '/v1/ai/chat': { post:{tags:['Inteligencia artificial'],summary:'Conversar con TramIA Bot usando contexto seguro de Neon',description:'Responde exclusivamente sobre trámites y servicios de TramIA. El servidor selecciona el contexto autorizado y persiste un historial limitado; el modelo no tiene acceso directo a SQL ni a datos sensibles.',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['message'],properties:{message:{type:'string',minLength:2,maxLength:1000},conversationId:{type:'string',format:'uuid'},procedureSlug:{type:'string'},userProcedureId:{type:'string',format:'uuid'},visitorKey:{type:'string'}}}}}},responses:{'200':{description:'Respuesta contextual y sugerencias'},'400':{description:'Mensaje inválido'},'403':{description:'Conversación o gestión no autorizada'},'429':{description:'Límite temporal alcanzado'},'503':{description:'Servicio de IA no disponible'}}} },
    '/v1/ai/chat/{conversationId}': { get:{tags:['Inteligencia artificial'],summary:'Recuperar el historial reciente de TramIA Bot',parameters:[{name:'conversationId',in:'path',required:true,schema:{type:'string',format:'uuid'}},{name:'X-TramIA-Visitor',in:'header',required:false,schema:{type:'string'},description:'Identificador local para conversaciones anónimas.'}],responses:{'200':{description:'Hasta 40 mensajes recientes'},'403':{description:'Conversación no autorizada'},'404':{description:'Conversación no encontrada'}}} },
    '/v1/ai/search/interpret': { post:{tags:['Inteligencia artificial'],summary:'Convertir una necesidad ciudadana en una palabra clave y categoría del catálogo',description:'Usa OpenAI cuando está configurado y conserva una interpretación determinística como respaldo. No ejecuta consultas SQL generadas por el modelo.',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['query'],properties:{query:{type:'string',minLength:3,maxLength:300}}}}}},responses:{'200':{description:'Interpretación segura de la búsqueda'},'400':{description:'Consulta inválida'}}} },
    '/v1/payments/{id}/receipt.pdf': { get:{tags:['Pagos simulados'],summary:'Descargar la boleta de venta de un pago confirmado',parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],responses:{'200':{description:'Comprobante PDF'},'404':{description:'Pago no encontrado'},'409':{description:'Pago todavía no confirmado'}}} },
    '/v1/my-procedures/{id}/delegated-tracking': { get:{tags:['Gestiones'],summary:'Consultar el avance de solo lectura de una gestión delegada',responses:{'200':{description:'Caso, asesor asignado y secuencia de pasos'},'409':{description:'Delegación sin pago confirmado'}}} },
    '/v1/advisor/cases/{id}/steps/{stepInstanceId}/complete': { post:{tags:['Asesores'],summary:'Completar en orden el siguiente paso de una gestión delegada',parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}},{name:'stepInstanceId',in:'path',required:true,schema:{type:'string',format:'uuid'}}],responses:{'200':{description:'Avance actualizado y ciudadano notificado'},'409':{description:'Existe un paso anterior pendiente'}}} },
    '/v1/admin/advisors/{id}/password': { patch:{tags:['Administración'],summary:'Cambiar la contraseña de un asesor y cerrar sus sesiones',parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],responses:{'200':{description:'Contraseña actualizada'},'400':{description:'Contraseña no válida'},'404':{description:'Asesor no encontrado'}}} },
    '/v1/payment-methods': { get:{tags:['Pagos simulados'],summary:'Listar medios de pago ficticios tokenizados',responses:{'200':{description:'Tarjetas simuladas sin PAN ni CVV'}}} },
    '/v1/payment-methods/simulated': { post:{tags:['Pagos simulados'],summary:'Crear una tarjeta completamente ficticia',responses:{'201':{description:'Token simulado creado'}}} },
    '/v1/payment-methods/{id}/default': { patch:{tags:['Pagos simulados'],summary:'Definir tarjeta ficticia predeterminada',responses:{'200':{description:'Preferencia actualizada'}}} },
    '/v1/payments/history': { get:{tags:['Pagos simulados'],summary:'Listar recibos y pagos simulados de la cuenta',responses:{'200':{description:'Historial de pagos'}}} },
    '/v1/my-procedures/{id}/delegation-prerequisites': { get:{tags:['Gestiones'],summary:'Consultar pasos personales obligatorios antes de delegar',responses:{'200':{description:'Checklist y disponibilidad de delegación'}}} },
    '/v1/my-procedures/{caseId}/steps/{stepId}/complete': { post:{tags:['Gestiones'],summary:'Completar y bloquear una acción del checklist',responses:{'200':{description:'Paso finalizado'},'409':{description:'Paso ya finalizado'}}} },
    '/v1/advisor/profile': { get:{tags:['Asesores'],summary:'Consultar perfil profesional propio',responses:{'200':{description:'Perfil de asesor'}}},patch:{tags:['Asesores'],summary:'Actualizar disponibilidad, capacidad y tarifa',responses:{'200':{description:'Perfil actualizado'}}} },
    '/v1/profile/avatar': { post:{tags:['Perfiles'],summary:'Cargar foto de perfil',responses:{'200':{description:'Foto actualizada'}}} },
    '/v1/public/settings': { get:{tags:['Configuración'],summary:'Consultar configuración pública del sitio',responses:{'200':{description:'Configuración pública'}}} },
    '/health': {
      get: {
        tags: ['Sistema'],
          summary: 'Comprobar disponibilidad, base de datos y variables de entorno',
        responses: {
          '200': { description: 'Servicio disponible' },
          '503': { description: 'Servicio degradado' },
        },
      },
    },
    '/v1/catalog/categories': {
      get: {
        tags: ['Catálogo'],
        summary: 'Listar categorías activas',
        responses: {
          '200': {
            description: 'Listado de categorías',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryListResponse' } } },
          },
        },
      },
    },
    '/v1/catalog/procedures': {
      get: {
        tags: ['Catálogo'],
        summary: 'Listar trámites publicados',
        responses: {
          '200': {
            description: 'Listado resumido de trámites',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ProcedureSummary' } } } } } },
          },
        },
      },
    },
    '/v1/catalog/bootstrap': {
      get: {
        tags: ['Catálogo'],
        summary: 'Inicializar el catálogo completo para clientes web y móviles',
        description: 'Entrega en una sola respuesta trámites, pasos, requisitos, fuentes y reglas de delegación.',
        responses: {
          '200': { description: 'Catálogo completo' },
          '503': { description: 'Catálogo temporalmente no disponible' },
        },
      },
    },
    '/v1/catalog/procedures/{slug}': {
      get: {
        tags: ['Catálogo'],
        summary: 'Consultar el detalle de un trámite',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Detalle del trámite' },
          '404': { description: 'Trámite no encontrado' },
        },
      },
    },
    '/v1/my-procedures': { get: { tags:['Gestiones'],summary:'Listar las gestiones de la sesión',responses:{'200':{description:'Gestiones activas e historial'},'401':{description:'Sesión requerida'}} }, post:{tags:['Gestiones'],summary:'Iniciar una gestión de forma idempotente',responses:{'201':{description:'Gestión creada'},'401':{description:'Sesión requerida'}}} },
    '/v1/advisor/cases': { get:{tags:['Asesores'],summary:'Listar casos asignados al asesor',responses:{'200':{description:'Casos y resumen'},'403':{description:'Rol de asesor requerido'}}} },
    '/v1/advisor/cases/{id}': { get:{tags:['Asesores'],summary:'Consultar ficha operativa de un caso',parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],responses:{'200':{description:'Caso, pasos y requisitos'},'404':{description:'Caso no encontrado'}}} },
    '/v1/procedure-cases/{id}/messages': { get:{tags:['Mensajería'],summary:'Listar mensajes privados de una gestión',responses:{'200':{description:'Conversación'}}},post:{tags:['Mensajería'],summary:'Enviar mensaje al usuario o asesor',responses:{'201':{description:'Mensaje enviado'}}} },
    '/v1/procedure-cases/{id}/documents': { get:{tags:['Documentos'],summary:'Listar documentos de una gestión',responses:{'200':{description:'Metadatos de documentos'}}},post:{tags:['Documentos'],summary:'Subir PDF, JPG o PNG de hasta 8 MB',description:'El binario se almacena en Netlify Blobs; Postgres conserva únicamente metadatos y la clave.',responses:{'201':{description:'Documento almacenado'},'400':{description:'Archivo inválido'}}} },
    '/v1/notifications': { get:{tags:['Notificaciones'],summary:'Listar notificaciones de la sesión',responses:{'200':{description:'Notificaciones y contador no leído'}}} },
  },
  components: {
    schemas: {
      Category: {
        type: 'object',
        required: ['id', 'slug', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
        },
      },
      CategoryListResponse: {
        type: 'object',
        properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Category' } } },
      },
      ProcedureSummary: {
        type: 'object',
        required: ['id', 'slug', 'title', 'shortDescription'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          title: { type: 'string' },
          shortDescription: { type: 'string' },
          modality: { type: 'string', enum: ['virtual', 'presencial', 'mixta'] },
          difficulty: { type: 'string', enum: ['baja', 'media', 'alta'] },
          dataClassification: { type: 'string' },
          sourceVerifiedAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
    },
  },
} as const;
