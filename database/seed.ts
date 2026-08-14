import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDrizzleDatabase } from '../server/db/client';
import {
  organizations,
  procedureCategories,
  procedureDelegationRules,
  procedureRequirements,
  procedureSources,
  procedureSteps,
  procedureVersions,
  procedures,
  roles,
  stepRequirements,
  tags,
  procedureTags,
} from '../server/db/schema';

type DemoProcedure = {
  slug: string;
  title: string;
  shortDescription: string;
  category: string;
  organization: string;
  modality: 'virtual' | 'presencial' | 'mixta';
  difficulty: 'baja' | 'media' | 'alta';
  costMin?: string;
  costMax?: string;
  durationMin?: number;
  durationMax?: number;
  featured?: boolean;
  sourceUrl: string;
  tags: string[];
  delegation: 'full' | 'partial' | 'unavailable';
  delegationFeeMinor?: number;
  steps: Array<{
    title: string;
    description: string;
    completionMode?: 'manual' | 'evidence' | 'form' | 'external_check' | 'payment';
    requiresUserPresence?: boolean;
    canBeDelegated?: boolean;
    pointOfNoReturn?: boolean;
    officialUrl?: string;
    requirement?: string;
  }>;
};

const categorySeed = [
  ['identidad', 'Identidad y registro civil', 'DNI, actas y certificación de identidad', 'Fingerprint'],
  ['viajes', 'Viajes y migraciones', 'Pasaportes, permisos y calidad migratoria', 'Plane'],
  ['negocios', 'Negocios y tributación', 'RUC, empresas, licencias y propiedad intelectual', 'BriefcaseBusiness'],
  ['transporte', 'Transporte', 'Licencias, vehículos y antecedentes de tránsito', 'Car'],
  ['familia', 'Familia y estado civil', 'Matrimonio, poderes y relaciones familiares', 'HeartHandshake'],
  ['trabajo-educacion', 'Trabajo y educación', 'Certificados, títulos y antecedentes', 'GraduationCap'],
] as const;

const organizationSeed = [
  ['reniec', 'Registro Nacional de Identificación y Estado Civil', 'RENIEC', 'public_entity', 'https://www.gob.pe/reniec'],
  ['migraciones', 'Superintendencia Nacional de Migraciones', 'Migraciones', 'public_entity', 'https://www.gob.pe/migraciones'],
  ['sunat', 'Superintendencia Nacional de Aduanas y de Administración Tributaria', 'SUNAT', 'public_entity', 'https://www.gob.pe/sunat'],
  ['sunarp', 'Superintendencia Nacional de los Registros Públicos', 'SUNARP', 'public_entity', 'https://www.gob.pe/sunarp'],
  ['mtc', 'Ministerio de Transportes y Comunicaciones', 'MTC', 'ministry', 'https://www.gob.pe/mtc'],
  ['municipalidades', 'Municipalidades del Perú', 'Municipalidad', 'local_government', 'https://www.gob.pe/estado/gobiernos-locales'],
  ['mininter', 'Ministerio del Interior', 'MININTER', 'ministry', 'https://www.gob.pe/mininter'],
  ['mtpe', 'Ministerio de Trabajo y Promoción del Empleo', 'MTPE', 'ministry', 'https://www.gob.pe/mtpe'],
  ['indecopi', 'Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual', 'INDECOPI', 'public_entity', 'https://www.gob.pe/indecopi'],
  ['pnp', 'Policía Nacional del Perú', 'PNP', 'public_entity', 'https://www.gob.pe/pnp'],
  ['rree', 'Ministerio de Relaciones Exteriores', 'Cancillería', 'ministry', 'https://www.gob.pe/rree'],
] as const;

const demoProcedures: DemoProcedure[] = [
  {
    slug: 'duplicado-dni-electronico', title: 'Solicitar duplicado de DNI electrónico', category: 'identidad', organization: 'reniec',
    shortDescription: 'Obtén un duplicado por pérdida, robo o deterioro cuando el documento continúa vigente.',
    modality: 'mixta', difficulty: 'baja', costMin: '30.00', costMax: '35.00', durationMin: 5, durationMax: 15, featured: true,
    sourceUrl: 'https://www.gob.pe/institucion/reniec/pages/224-solicitar-duplicado-de-dni-electronico',
    tags: ['dni', 'duplicado', 'identidad', 'reniec'], delegation: 'partial', delegationFeeMinor: 6500,
    steps: [
      { title: 'Verificar elegibilidad', description: 'Confirma que el DNI esté vigente y que corresponda solicitar un duplicado.', completionMode: 'external_check', canBeDelegated: false },
      { title: 'Realizar el pago', description: 'Genera el ticket y paga el derecho administrativo por un canal autorizado.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Registrar la solicitud', description: 'Completa la solicitud web o presencial y selecciona el lugar de entrega.', completionMode: 'form' },
      { title: 'Recoger el DNI', description: 'La entrega es personal y requiere verificación biométrica.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
    ],
  },
  {
    slug: 'renovacion-dni-mayores', title: 'Renovar DNI para mayores de 17 años', category: 'identidad', organization: 'reniec',
    shortDescription: 'Renueva el DNI desde los 60 días previos a su fecha de caducidad.', modality: 'mixta', difficulty: 'baja',
    costMin: '30.00', durationMin: 7, durationMax: 15, featured: true,
    sourceUrl: 'https://www.gob.pe/231-renovar-dni-para-mayores-de-17-anos', tags: ['dni', 'renovacion', 'identidad'], delegation: 'partial', delegationFeeMinor: 6500,
    steps: [
      { title: 'Validar vigencia y datos', description: 'Revisa la fecha de caducidad y los datos que deban actualizarse.', completionMode: 'external_check', canBeDelegated: false },
      { title: 'Pagar el derecho administrativo', description: 'Realiza el pago con el código correspondiente.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Completar captura y solicitud', description: 'Realiza la verificación facial o acude al centro de atención según corresponda.', completionMode: 'form', requiresUserPresence: true, canBeDelegated: false },
      { title: 'Recoger el documento', description: 'Verifica el estado y recoge personalmente el DNI.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
    ],
  },
  {
    slug: 'copia-certificada-acta-reniec', title: 'Solicitar copia certificada de acta o partida', category: 'identidad', organization: 'reniec',
    shortDescription: 'Obtén una copia certificada de nacimiento, matrimonio o defunción registrada en RENIEC.', modality: 'virtual', difficulty: 'baja',
    costMin: '10.30', durationMin: 1, durationMax: 2, sourceUrl: 'https://www.gob.pe/434-solicitar-copia-certificada-de-acta-o-partida-en-reniec',
    tags: ['partida', 'acta', 'nacimiento', 'matrimonio'], delegation: 'full', delegationFeeMinor: 4000,
    steps: [
      { title: 'Buscar el acta', description: 'Comprueba que el acta se encuentre incorporada en RENIEC.', completionMode: 'external_check' },
      { title: 'Pagar y solicitar', description: 'Paga la tasa y completa la solicitud.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Descargar o recibir el acta', description: 'Obtén la copia certificada por el canal disponible.' },
    ],
  },
  {
    slug: 'pasaporte-electronico-ordinario', title: 'Obtener pasaporte electrónico ordinario', category: 'viajes', organization: 'migraciones',
    shortDescription: 'Solicita el pasaporte biométrico peruano mediante pago, cita y atención presencial.', modality: 'mixta', difficulty: 'media',
    costMin: '120.90', durationMin: 1, durationMax: 15, featured: true,
    sourceUrl: 'https://www.gob.pe/174-sacar-pasaporte-electronico', tags: ['pasaporte', 'viaje', 'migraciones'], delegation: 'partial', delegationFeeMinor: 9500,
    steps: [
      { title: 'Pagar la tasa', description: 'Realiza el pago con los datos del titular.', completionMode: 'payment', requirement: 'Comprobante de pago', officialUrl: 'https://www.pagalo.pe/' },
      { title: 'Programar la cita', description: 'Reserva una fecha, hora y sede en Migraciones.', completionMode: 'external_check', officialUrl: 'https://citaspasaporte.migraciones.gob.pe/citas-pasaporte-v2/' },
      { title: 'Captura biométrica', description: 'Acude personalmente para fotografía, huellas y firma.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
      { title: 'Recoger el pasaporte', description: 'Recibe el pasaporte según la indicación de la sede.', requiresUserPresence: true, canBeDelegated: false },
    ],
  },
  {
    slug: 'permiso-viaje-menor', title: 'Obtener autorización de viaje para menores', category: 'viajes', organization: 'migraciones',
    shortDescription: 'Prepara la autorización requerida cuando un menor viaja solo o con uno de sus padres.', modality: 'presencial', difficulty: 'media',
    durationMin: 1, durationMax: 5, sourceUrl: 'https://www.gob.pe/144-autorizacion-de-viaje-para-menores-de-edad', tags: ['menor', 'viaje', 'permiso', 'notaria'], delegation: 'partial', delegationFeeMinor: 9000,
    steps: [
      { title: 'Identificar el tipo de autorización', description: 'Determina si corresponde autorización notarial, judicial o consular.' },
      { title: 'Reunir documentos', description: 'Presenta documentos de identidad, partida y datos del viaje.', completionMode: 'evidence', requirement: 'Documentos del menor y responsables' },
      { title: 'Firmar la autorización', description: 'Los responsables deben firmar ante la autoridad correspondiente.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
    ],
  },
  {
    slug: 'inscripcion-ruc-persona-natural', title: 'Inscribirse en el RUC como persona natural', category: 'negocios', organization: 'sunat',
    shortDescription: 'Obtén tu número de RUC para iniciar actividades económicas como persona natural.', modality: 'virtual', difficulty: 'baja',
    costMin: '0.00', durationMin: 1, durationMax: 1, featured: true, sourceUrl: 'https://www.gob.pe/284-inscripcion-en-el-ruc',
    tags: ['ruc', 'sunat', 'negocio', 'tributos'], delegation: 'partial', delegationFeeMinor: 5000,
    steps: [
      { title: 'Definir actividad y domicilio fiscal', description: 'Prepara la actividad económica y dirección que registrarás.', completionMode: 'form', canBeDelegated: false },
      { title: 'Validar identidad', description: 'Completa la identificación exigida por SUNAT.', completionMode: 'external_check', requiresUserPresence: true, canBeDelegated: false },
      { title: 'Registrar el RUC', description: 'Envía la solicitud y conserva la constancia de inscripción.', completionMode: 'form', pointOfNoReturn: true },
    ],
  },
  {
    slug: 'constitucion-empresa-sid-sunarp', title: 'Constituir una empresa mediante SID-SUNARP', category: 'negocios', organization: 'sunarp',
    shortDescription: 'Formaliza una sociedad o EIRL mediante reserva de nombre, acto constitutivo, notaría e inscripción.', modality: 'mixta', difficulty: 'alta',
    durationMin: 7, durationMax: 20, featured: true, sourceUrl: 'https://www.gob.pe/269-registrar-o-constituir-una-empresa',
    tags: ['empresa', 'sunarp', 'sid', 'notaria'], delegation: 'partial', delegationFeeMinor: 25000,
    steps: [
      { title: 'Reservar el nombre', description: 'Busca y reserva la denominación de la empresa.', completionMode: 'external_check', requirement: 'Reserva de nombre' },
      { title: 'Preparar el acto constitutivo', description: 'Define socios, aportes, objeto y estatuto.', completionMode: 'form', requirement: 'Acto constitutivo' },
      { title: 'Firmar la escritura pública', description: 'Los socios firman ante notaría.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
      { title: 'Inscripción registral', description: 'La notaría presenta el parte digital mediante SID-SUNARP.' },
    ],
  },
  {
    slug: 'registrar-marca', title: 'Registrar una marca de producto o servicio', category: 'negocios', organization: 'indecopi',
    shortDescription: 'Protege el nombre o signo distintivo de tu negocio ante INDECOPI.', modality: 'virtual', difficulty: 'media',
    durationMin: 45, durationMax: 180, sourceUrl: 'https://www.gob.pe/333-registrar-una-marca', tags: ['marca', 'indecopi', 'negocio'], delegation: 'full', delegationFeeMinor: 18000,
    steps: [
      { title: 'Definir clase y signo', description: 'Selecciona productos o servicios y prepara la representación de la marca.', completionMode: 'form' },
      { title: 'Revisar antecedentes', description: 'Busca signos similares antes de presentar la solicitud.', completionMode: 'external_check' },
      { title: 'Pagar y presentar', description: 'Paga la tasa y presenta la solicitud.', completionMode: 'payment', requirement: 'Comprobante y representación de marca', pointOfNoReturn: true },
      { title: 'Atender observaciones', description: 'Responde dentro del plazo si la autoridad formula observaciones.' },
    ],
  },
  {
    slug: 'primera-licencia-conducir-ai', title: 'Obtener primera licencia de conducir A-I', category: 'transporte', organization: 'mtc',
    shortDescription: 'Completa evaluación médica, examen de reglas, examen de manejo y emisión de licencia.', modality: 'mixta', difficulty: 'alta',
    durationMin: 3, durationMax: 15, featured: true, sourceUrl: 'https://www.gob.pe/180-obtener-licencia-de-conducir-brevete-por-primera-vez',
    tags: ['licencia', 'brevete', 'mtc', 'conducir'], delegation: 'partial', delegationFeeMinor: 12000,
    steps: [
      { title: 'Evaluación médica', description: 'Aprueba el examen médico en un centro autorizado.', requiresUserPresence: true, canBeDelegated: false, requirement: 'Resultado de evaluación médica' },
      { title: 'Examen de reglas', description: 'Rinde y aprueba el examen de conocimientos.', requiresUserPresence: true, canBeDelegated: false },
      { title: 'Examen de manejo', description: 'Rinde y aprueba la evaluación práctica.', requiresUserPresence: true, canBeDelegated: false },
      { title: 'Pagar emisión y solicitar licencia', description: 'Realiza el pago y solicita la emisión.', completionMode: 'payment', pointOfNoReturn: true },
    ],
  },
  {
    slug: 'transferencia-propiedad-vehicular', title: 'Realizar transferencia de propiedad vehicular', category: 'transporte', organization: 'sunarp',
    shortDescription: 'Formaliza la compraventa y registra el nuevo propietario del vehículo.', modality: 'presencial', difficulty: 'media',
    durationMin: 2, durationMax: 10, sourceUrl: 'https://www.gob.pe/457-transferencia-de-propiedad-vehicular', tags: ['vehiculo', 'transferencia', 'sunarp', 'notaria'], delegation: 'partial', delegationFeeMinor: 11000,
    steps: [
      { title: 'Verificar vehículo y participantes', description: 'Revisa titularidad, cargas, multas e identidad de las partes.', completionMode: 'external_check' },
      { title: 'Firmar acta de transferencia', description: 'Comprador y vendedor firman ante notaría.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true, requirement: 'Documentos de comprador y vendedor' },
      { title: 'Inscripción en SUNARP', description: 'La notaría presenta el parte para inscribir la transferencia.' },
    ],
  },
  {
    slug: 'matrimonio-civil-municipal', title: 'Celebrar matrimonio civil municipal', category: 'familia', organization: 'municipalidades',
    shortDescription: 'Abre el expediente matrimonial, publica el edicto y celebra la ceremonia civil.', modality: 'presencial', difficulty: 'media',
    durationMin: 15, durationMax: 30, featured: true, sourceUrl: 'https://www.gob.pe/20411-contraer-matrimonio-civil?child=9621', tags: ['matrimonio', 'municipalidad', 'familia'], delegation: 'partial', delegationFeeMinor: 15000,
    steps: [
      { title: 'Reunir requisitos', description: 'Prepara documentos de identidad, partidas y certificados solicitados.', completionMode: 'evidence', requirement: 'Expediente matrimonial' },
      { title: 'Abrir expediente', description: 'Presenta la solicitud ante la municipalidad elegida.', completionMode: 'form', requiresUserPresence: true, canBeDelegated: false },
      { title: 'Publicar edicto', description: 'Cumple el periodo de publicidad requerido.' },
      { title: 'Celebrar ceremonia', description: 'Contrayentes y testigos asisten a la ceremonia.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
    ],
  },
  {
    slug: 'antecedentes-penales', title: 'Obtener certificado de antecedentes penales', category: 'trabajo-educacion', organization: 'mininter',
    shortDescription: 'Solicita el certificado que informa si una persona registra antecedentes penales.', modality: 'virtual', difficulty: 'baja',
    durationMin: 1, durationMax: 1, sourceUrl: 'https://www.gob.pe/326-certificado-de-antecedentes-penales', tags: ['antecedentes', 'certificado', 'trabajo'], delegation: 'full', delegationFeeMinor: 3500,
    steps: [
      { title: 'Pagar la tasa', description: 'Realiza el pago con los datos del solicitante.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Validar identidad y solicitar', description: 'Completa la validación y envía la solicitud.', completionMode: 'external_check' },
      { title: 'Descargar certificado', description: 'Descarga y conserva el certificado emitido.' },
    ],
  },
  {
    slug: 'certificado-unico-laboral', title: 'Obtener Certificado Único Laboral', category: 'trabajo-educacion', organization: 'mtpe',
    shortDescription: 'Genera gratuitamente información útil para postular a oportunidades laborales.', modality: 'virtual', difficulty: 'baja',
    costMin: '0.00', durationMin: 1, durationMax: 1, sourceUrl: 'https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul', tags: ['trabajo', 'certificado', 'empleo'], delegation: 'full', delegationFeeMinor: 2500,
    steps: [
      { title: 'Acceder al portal de empleo', description: 'Ingresa o crea una cuenta en el servicio oficial.', completionMode: 'external_check' },
      { title: 'Generar el certificado', description: 'Solicita la emisión del Certificado Único Laboral.' },
      { title: 'Descargar el documento', description: 'Descarga y revisa la información generada.' },
    ],
  },
];

demoProcedures.push(
  {
    slug: 'antecedentes-policiales', title: 'Obtener certificado de antecedentes policiales', category: 'trabajo-educacion', organization: 'pnp',
    shortDescription: 'Solicita el certificado de la PNP para uso nacional en formato digital o presencial.', modality: 'mixta', difficulty: 'baja',
    costMin: '5.40', costMax: '8.50', durationMin: 1, durationMax: 1, featured: true,
    sourceUrl: 'https://www.gob.pe/309-certificado-de-antecedentes', tags: ['antecedentes', 'policiales', 'pnp', 'trabajo'], delegation: 'full', delegationFeeMinor: 3500,
    steps: [
      { title: 'Elegir modalidad', description: 'Selecciona emisión digital o atención presencial según tu necesidad.' },
      { title: 'Pagar la tasa', description: 'Realiza el pago con el código oficial y conserva el comprobante.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Validar identidad y solicitar', description: 'Registra tus datos y completa la validación solicitada.', completionMode: 'external_check' },
      { title: 'Descargar o recoger', description: 'Obtén el certificado y verifica su vigencia.' },
    ],
  },
  {
    slug: 'apostilla-documento-digital', title: 'Legalizar un documento digital', category: 'trabajo-educacion', organization: 'rree',
    shortDescription: 'Certifica digitalmente la firma de un funcionario para que el documento sea reconocido en el extranjero.', modality: 'virtual', difficulty: 'media',
    costMin: '18.00', durationMin: 1, durationMax: 5, featured: true, sourceUrl: 'https://www.gob.pe/37302',
    tags: ['legalizacion', 'documento', 'extranjero'], delegation: 'full', delegationFeeMinor: 7000,
    steps: [
      { title: 'Verificar cadena de certificación', description: 'Confirma que el documento y la firma del funcionario cumplan los requisitos.', completionMode: 'external_check' },
      { title: 'Preparar el PDF verificable', description: 'Adjunta un documento digital legible con mecanismo de verificación.', completionMode: 'evidence', requirement: 'Documento digital para legalizar' },
      { title: 'Pagar y registrar solicitud', description: 'Paga el derecho y completa la solicitud en línea.', completionMode: 'payment', requirement: 'Comprobante de pago', pointOfNoReturn: true },
      { title: 'Descargar documento certificado', description: 'Revisa el resultado y descarga el archivo legalizado.' },
    ],
  },
  {
    slug: 'apostilla-atencion-presencial', title: 'Legalizar un documento presencialmente', category: 'trabajo-educacion', organization: 'rree',
    shortDescription: 'Presenta documentos con firma manuscrita o que requieran atención presencial ante Cancillería.', modality: 'presencial', difficulty: 'media',
    durationMin: 1, durationMax: 5, sourceUrl: 'https://www.gob.pe/37299-apostilla-y-legalizacion-atencion-presencial',
    tags: ['legalizacion', 'cancilleria'], delegation: 'partial', delegationFeeMinor: 8000,
    steps: [
      { title: 'Verificar el documento', description: 'Comprueba la cadena de certificaciones que corresponde.' },
      { title: 'Pagar el derecho', description: 'Realiza el pago cuando corresponda y conserva el voucher.', completionMode: 'payment', requirement: 'Comprobante de pago' },
      { title: 'Presentar la solicitud', description: 'Entrega el documento y la hoja de trámite en el punto de atención.', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
      { title: 'Recoger el documento', description: 'Retira el documento certificado con identificación.' },
    ],
  },
);

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
  const db = getDrizzleDatabase();

  await db.insert(roles).values([
    { code: 'citizen', name: 'Ciudadano' },
    { code: 'advisor', name: 'Asesor' },
    { code: 'administrator', name: 'Administrador' },
    { code: 'content_editor', name: 'Editor de contenido' },
    { code: 'support', name: 'Soporte' },
  ]).onConflictDoNothing();

  for (const [slug, name, description, icon] of categorySeed) {
    await db.insert(procedureCategories).values({ slug, name, description, icon }).onConflictDoUpdate({ target: procedureCategories.slug, set: { name, description, icon } });
  }
  for (const [slug, name, shortName, organizationType, officialUrl] of organizationSeed) {
    await db.insert(organizations).values({ slug, name, shortName, organizationType, officialUrl }).onConflictDoUpdate({ target: organizations.slug, set: { name, shortName, organizationType, officialUrl } });
  }

  const categoryRows = await db.select().from(procedureCategories);
  const organizationRows = await db.select().from(organizations);
  const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
  const organizationBySlug = new Map(organizationRows.map((row) => [row.slug, row]));

  for (const item of demoProcedures) {
    const category = categoryBySlug.get(item.category);
    const organization = organizationBySlug.get(item.organization);
    if (!category || !organization) throw new Error(`Maestro faltante para ${item.slug}`);

    const [procedure] = await db.insert(procedures).values({
      slug: item.slug,
      categoryId: category.id,
      organizationId: organization.id,
      title: item.title,
      shortDescription: item.shortDescription,
      isFeatured: item.featured ?? false,
    }).onConflictDoUpdate({
      target: procedures.slug,
      set: { title: item.title, shortDescription: item.shortDescription, categoryId: category.id, organizationId: organization.id, isFeatured: item.featured ?? false },
    }).returning();

    const existingVersions = await db.select().from(procedureVersions).where(eq(procedureVersions.procedureId, procedure.id));
    let version = existingVersions.find((row) => row.versionNumber === 1);
    if (!version) {
      [version] = await db.insert(procedureVersions).values({
        procedureId: procedure.id,
        versionNumber: 1,
        fullDescription: item.shortDescription,
        modality: item.modality,
        difficulty: item.difficulty,
        officialCostMin: item.costMin,
        officialCostMax: item.costMax,
        estimatedDurationMin: item.durationMin,
        estimatedDurationMax: item.durationMax,
        officialUrl: item.sourceUrl,
        sourceVerifiedAt: new Date('2026-08-12T00:00:00-05:00'),
        dataClassification: 'official_reference_demo',
        verificationNotes: 'Contenido estructurado desde una referencia oficial. Confirmar tasas, plazos y condiciones antes de publicar.',
        status: 'reviewed',
      }).returning();
    }

    await db.insert(procedureSources).values({
      procedureVersionId: version.id,
      organizationId: organization.id,
      title: `Fuente oficial: ${organization.shortName ?? organization.name}`,
      url: item.sourceUrl,
      lastCheckedAt: new Date('2026-08-12T00:00:00-05:00'),
      isPrimary: true,
    }).onConflictDoNothing();

    const existingSteps = await db.select().from(procedureSteps).where(eq(procedureSteps.procedureVersionId, version.id));
    if (existingSteps.length === 0) {
      let eligibleAfterStepId: string | undefined;
      for (const [index, step] of item.steps.entries()) {
        const [createdStep] = await db.insert(procedureSteps).values({
          procedureVersionId: version.id,
          position: index + 1,
          title: step.title,
          description: step.description,
          completionMode: step.completionMode ?? (step.requirement ? 'evidence' : 'manual'),
          officialUrl: step.officialUrl,
          requiresUserPresence: step.requiresUserPresence ?? false,
          canBeDelegated: step.canBeDelegated ?? true,
          isPointOfNoReturn: step.pointOfNoReturn ?? false,
        }).returning();
        if (index === 0 && item.delegation === 'partial') eligibleAfterStepId = createdStep.id;

        if (step.requirement) {
          const [requirement] = await db.insert(procedureRequirements).values({
            procedureVersionId: version.id,
            name: step.requirement,
            description: `Evidencia requerida para completar: ${step.title}.`,
            requirementType: 'document',
            allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
            isRequired: true,
            isSensitive: true,
            validationMethod: 'advisor_or_automatic',
          }).returning();
          await db.insert(stepRequirements).values({ stepId: createdStep.id, requirementId: requirement.id }).onConflictDoNothing();
        }
      }

      await db.insert(procedureDelegationRules).values({
        procedureVersionId: version.id,
        type: item.delegation,
        eligibleAfterStepId,
        requiresPriorStepsCompleted: item.delegation === 'partial',
        requiresDocumentsApproved: item.delegation !== 'unavailable',
        serviceFeeMinor: item.delegationFeeMinor,
        cancellationPolicy: 'Se puede cancelar antes del punto de no retorno. Los pagos realizados a entidades pueden no ser reembolsables.',
        refundPolicy: 'La devolución del servicio depende del estado de asignación y del trabajo ya ejecutado por el asesor.',
      });
    }

    for (const tagName of item.tags) {
      const slug = tagName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const [tag] = await db.insert(tags).values({ slug, name: tagName }).onConflictDoUpdate({ target: tags.slug, set: { name: tagName } }).returning();
      await db.insert(procedureTags).values({ procedureId: procedure.id, tagId: tag.id }).onConflictDoNothing();
    }
  }

  console.log(`Seed completado: ${demoProcedures.length} trámites estructurados.`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
