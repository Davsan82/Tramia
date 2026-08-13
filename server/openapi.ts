export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'TramIA API',
    version: '0.1.0',
    description: 'API pública versionada para el catálogo y los futuros expedientes de TramIA.',
  },
  servers: [
    { url: '/api', description: 'Servidor actual' },
  ],
  tags: [
    { name: 'Sistema' },
    { name: 'Catálogo' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Comprobar disponibilidad del servicio y la base de datos',
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
