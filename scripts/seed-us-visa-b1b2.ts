import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { closeDrizzleDatabase, getDrizzleDatabase } from '../server/db/client';
import {
  organizations,
  procedureCategories,
  procedureDelegationRules,
  procedureRequirements,
  procedureSources,
  procedureSteps,
  procedureVersions,
  procedures,
  stepRequirements,
  tags,
  procedureTags,
} from '../server/db/schema';

const SLUG = 'visa-turismo-estados-unidos-b1-b2';
const VISITOR_URL = 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html';
const DS160_URL = 'https://ceac.state.gov/GenNIV/Default.aspx';
const FEE_URL = 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html';
const WAIT_TIMES_URL = 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/wait-times.html';

type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; sensitive?: boolean };
type StepSeed = {
  title: string;
  description: string;
  completionMode?: 'manual' | 'evidence' | 'form' | 'external_check' | 'payment';
  officialUrl?: string;
  requiresUserPresence?: boolean;
  canBeDelegated?: boolean;
  isPointOfNoReturn?: boolean;
  helpText?: string;
  whyItMatters?: string;
  nextStepHint?: string;
  dateTrackingEnabled?: boolean;
  dateTrackingType?: string;
  reminderOffsets?: string[];
  fields?: Field[];
  requirement?: { name: string; description: string; isSensitive?: boolean };
};

const steps: StepSeed[] = [
  {
    title: 'Confirma que la visa B1/B2 corresponde a tu viaje',
    description: 'Verifica que tu visita sea temporal y que el motivo corresponda a turismo, visita familiar o negocios permitidos.',
    completionMode: 'form', officialUrl: VISITOR_URL, canBeDelegated: false,
    helpText: 'La visa B1/B2 no autoriza trabajar ni residir permanentemente en Estados Unidos.',
    fields: [
      { key: 'travelPurpose', label: 'Motivo principal del viaje', type: 'select', required: true, options: ['Turismo', 'Visita familiar o de amistades', 'Negocios permitidos', 'Tratamiento médico', 'Otro motivo temporal'] },
      { key: 'temporaryTrip', label: '¿Confirmas que tu viaje será temporal?', type: 'select', required: true, options: ['Sí, será temporal'] },
    ],
  },
  {
    title: 'Revisa la vigencia de tu pasaporte',
    description: 'Registra la fecha de vencimiento y comprueba que el pasaporte tenga vigencia suficiente para el viaje.',
    completionMode: 'form', canBeDelegated: false, dateTrackingEnabled: true, dateTrackingType: 'document_expiration', reminderOffsets: ['15552000', '7776000', '2592000'],
    helpText: 'TramIA te alertará si la fecha registrada está próxima. Confirma siempre el requisito vigente en la fuente oficial.',
    fields: [{ key: 'passportExpirationDate', label: 'Fecha de vencimiento del pasaporte', type: 'date', required: true }],
  },
  {
    title: 'Reúne la información para tu solicitud',
    description: 'Prepara datos personales, laborales, académicos, historial de viajes, contactos y un plan aproximado del viaje.',
    completionMode: 'form', canBeDelegated: false,
    fields: [
      { key: 'personalDataReady', label: 'Datos personales y de contacto', type: 'select', required: true, options: ['Listos'] },
      { key: 'workStudyDataReady', label: 'Información laboral o académica', type: 'select', required: true, options: ['Lista', 'No corresponde'] },
      { key: 'travelHistoryReady', label: 'Historial de viajes', type: 'select', required: true, options: ['Listo', 'No tengo viajes anteriores'] },
      { key: 'tripPlanReady', label: 'Plan aproximado del viaje', type: 'select', required: true, options: ['Listo'] },
    ],
  },
  {
    title: 'Inicia el formulario DS-160',
    description: 'Ingresa al portal oficial, selecciona la ubicación consular correcta e inicia una nueva solicitud.',
    completionMode: 'external_check', officialUrl: DS160_URL, canBeDelegated: false,
    helpText: 'Usa únicamente el portal oficial CEAC. No compartas respuestas sensibles ni credenciales con terceros.',
  },
  {
    title: 'Guarda tu Application ID',
    description: 'Registra el identificador de tu DS-160 para recuperar la solicitud si interrumpes el llenado.',
    completionMode: 'form', canBeDelegated: false,
    helpText: 'Este dato es sensible. No registres aquí tu pregunta o respuesta de seguridad.',
    fields: [{ key: 'applicationId', label: 'Application ID', type: 'password', required: true, sensitive: true }],
  },
  {
    title: 'Completa las secciones del DS-160',
    description: 'Llena todas las secciones aplicables con datos personales, viaje, trabajo, estudios, seguridad y antecedentes.',
    completionMode: 'external_check', officialUrl: DS160_URL, canBeDelegated: false,
  },
  {
    title: 'Revisa que tus respuestas sean veraces y consistentes',
    description: 'Contrasta nombres, fechas, empleos, viajes y demás respuestas antes de enviar el formulario.',
    completionMode: 'form', canBeDelegated: false,
    fields: [
      { key: 'namesReviewed', label: 'Nombres y datos personales revisados', type: 'select', required: true, options: ['Sí, revisados'] },
      { key: 'datesReviewed', label: 'Fechas y antecedentes revisados', type: 'select', required: true, options: ['Sí, revisados'] },
      { key: 'truthfulAnswers', label: 'Confirmo que las respuestas son veraces', type: 'select', required: true, options: ['Sí, confirmo'] },
    ],
  },
  {
    title: 'Envía el formulario DS-160',
    description: 'Firma electrónicamente y envía el DS-160 cuando estés seguro de que la información es correcta.',
    completionMode: 'external_check', officialUrl: DS160_URL, canBeDelegated: false, isPointOfNoReturn: true,
  },
  {
    title: 'Guarda la confirmación del DS-160',
    description: 'Descarga y adjunta la hoja de confirmación que contiene el código de barras.',
    completionMode: 'evidence', canBeDelegated: false,
    requirement: { name: 'Confirmación del DS-160', description: 'Hoja de confirmación con código de barras en PDF, JPG o PNG.', isSensitive: true },
  },
  {
    title: 'Crea tu perfil en el sistema consular',
    description: 'Registra el perfil requerido por el servicio oficial de citas correspondiente a Perú.',
    completionMode: 'external_check', officialUrl: VISITOR_URL, canBeDelegated: false,
  },
  {
    title: 'Paga la tarifa de solicitud',
    description: 'Realiza el pago de la tarifa consular vigente y adjunta el comprobante. El pago no garantiza la aprobación.',
    completionMode: 'evidence', officialUrl: FEE_URL, canBeDelegated: false, isPointOfNoReturn: true,
    helpText: 'La tarifa indicada es US$185 y puede cambiar. Verifica el monto y el canal oficial antes de pagar.',
    requirement: { name: 'Comprobante de pago consular', description: 'Comprobante de la tarifa de solicitud de visa.', isSensitive: true },
  },
  {
    title: 'Programa tu cita consular',
    description: 'Registra la fecha, hora y lugar de tu entrevista. TramIA generará recordatorios de seguimiento.',
    completionMode: 'form', officialUrl: WAIT_TIMES_URL, canBeDelegated: false, dateTrackingEnabled: true, dateTrackingType: 'appointment', reminderOffsets: ['604800', '86400', '7200'],
    fields: [
      { key: 'appointmentDate', label: 'Fecha de la entrevista', type: 'date', required: true },
      { key: 'appointmentTime', label: 'Hora de la entrevista', type: 'time', required: true },
      { key: 'appointmentLocation', label: 'Lugar de la entrevista', type: 'text', required: true },
    ],
  },
  {
    title: 'Guarda la confirmación de la cita',
    description: 'Adjunta la constancia emitida por el sistema de citas.',
    completionMode: 'evidence', canBeDelegated: false,
    requirement: { name: 'Confirmación de cita consular', description: 'Constancia de la cita en PDF, JPG o PNG.', isSensitive: true },
  },
  {
    title: 'Revisa los documentos para la entrevista',
    description: 'Confirma que cuentas con pasaporte, confirmación DS-160, confirmación de cita y documentos adicionales de tu caso.',
    completionMode: 'form', officialUrl: VISITOR_URL, canBeDelegated: false,
    fields: [
      { key: 'passportReady', label: 'Pasaporte disponible', type: 'select', required: true, options: ['Sí'] },
      { key: 'ds160Ready', label: 'Confirmación DS-160 disponible', type: 'select', required: true, options: ['Sí'] },
      { key: 'appointmentReady', label: 'Confirmación de cita disponible', type: 'select', required: true, options: ['Sí'] },
      { key: 'caseDocumentsReady', label: 'Documentos adicionales de tu caso', type: 'select', required: true, options: ['Listos', 'No corresponden'] },
    ],
  },
  {
    title: 'Prepara tus respuestas sobre el viaje',
    description: 'Practica respuestas claras y veraces sobre el propósito, duración, financiamiento y retorno previsto.',
    completionMode: 'form', canBeDelegated: false,
    fields: [
      { key: 'purposePrepared', label: 'Propósito del viaje preparado', type: 'select', required: true, options: ['Sí'] },
      { key: 'durationPrepared', label: 'Duración aproximada preparada', type: 'select', required: true, options: ['Sí'] },
      { key: 'fundingPrepared', label: 'Forma de financiamiento preparada', type: 'select', required: true, options: ['Sí'] },
    ],
  },
  {
    title: 'Asiste a la entrevista consular',
    description: 'Preséntate personalmente, con puntualidad y con la documentación requerida.',
    completionMode: 'manual', requiresUserPresence: true, canBeDelegated: false,
  },
  {
    title: 'Registra el resultado de la entrevista',
    description: 'Selecciona el estado comunicado por la autoridad consular para continuar el seguimiento.',
    completionMode: 'form', canBeDelegated: false,
    fields: [{ key: 'consularResult', label: 'Resultado informado', type: 'select', required: true, options: ['Solicitud presentada', 'Entrevista completada', 'Aprobada', 'En revisión administrativa', 'No aprobada'] }],
  },
  {
    title: 'Recibe tu pasaporte con la visa',
    description: 'Si la visa fue aprobada, confirma la recepción y revisa que los datos impresos sean correctos.',
    completionMode: 'form', canBeDelegated: false,
    helpText: 'No adjuntes una fotografía de la visa ni del pasaporte. Evitamos almacenar información sensible innecesaria.',
    fields: [{ key: 'passportReceived', label: 'Cierre del seguimiento', type: 'select', required: true, options: ['Sí, recibí y revisé el pasaporte', 'No corresponde porque la visa no fue aprobada'] }],
  },
];

async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
  const db = getDrizzleDatabase();

  await db.transaction(async (tx) => {
    const [category] = await tx.insert(procedureCategories).values({
      slug: 'viajes', name: 'Viajes y migraciones', description: 'Pasaportes, permisos, visas y movilidad internacional', icon: 'Plane', isActive: true,
    }).onConflictDoUpdate({ target: procedureCategories.slug, set: { name: 'Viajes y migraciones', description: 'Pasaportes, permisos, visas y movilidad internacional', icon: 'Plane', isActive: true, updatedAt: new Date() } }).returning();

    const [organization] = await tx.insert(organizations).values({
      slug: 'embajada-estados-unidos-peru', name: 'Embajada de los Estados Unidos en el Perú', shortName: 'Embajada de EE. UU.', organizationType: 'foreign_mission', officialUrl: VISITOR_URL, countryCode: 'US', isActive: true,
    }).onConflictDoUpdate({ target: organizations.slug, set: { name: 'Embajada de los Estados Unidos en el Perú', shortName: 'Embajada de EE. UU.', organizationType: 'foreign_mission', officialUrl: VISITOR_URL, countryCode: 'US', isActive: true, updatedAt: new Date() } }).returning();

    const [procedure] = await tx.insert(procedures).values({
      slug: SLUG, categoryId: category.id, organizationId: organization.id,
      title: 'Solicitar visa de turismo para EE. UU. B1/B2',
      shortDescription: 'Prepara el DS-160, el pago y la entrevista para una visita temporal por turismo o negocios.',
      procedureType: 'consular', isFeatured: true, isActive: true,
    }).onConflictDoUpdate({ target: procedures.slug, set: { categoryId: category.id, organizationId: organization.id, title: 'Solicitar visa de turismo para EE. UU. B1/B2', shortDescription: 'Prepara el DS-160, el pago y la entrevista para una visita temporal por turismo o negocios.', procedureType: 'consular', isFeatured: true, isActive: true, updatedAt: new Date() } }).returning();

    let [version] = await tx.select().from(procedureVersions).where(and(eq(procedureVersions.procedureId, procedure.id), eq(procedureVersions.versionNumber, 1))).limit(1);
    const versionValues = {
      fullDescription: 'Guía para solicitar una visa de visitante B1/B2 para viajes temporales por turismo, visita o negocios permitidos. TramIA ayuda a preparar y dar seguimiento al proceso, pero la decisión final corresponde exclusivamente a la autoridad consular de los Estados Unidos.',
      modality: 'mixta' as const, difficulty: 'alta' as const, officialCostMin: '185.00', officialCostMax: '185.00', currency: 'USD',
      estimatedDurationMin: 1, estimatedDurationMax: 180, durationUnit: 'calendar_day', officialUrl: VISITOR_URL,
      sourceVerifiedAt: new Date('2026-08-13T00:00:00-05:00'), dataClassification: 'official_reference',
      verificationNotes: 'El pago no garantiza la aprobación. Las tarifas, tiempos, requisitos y decisiones dependen exclusivamente de las autoridades de los Estados Unidos; deben verificarse antes de actuar.',
      status: 'reviewed' as const, changeSummary: 'Carga inicial de la ruta guiada B1/B2 con formularios, evidencias, cita y alertas.',
    };
    if (!version) [version] = await tx.insert(procedureVersions).values({ procedureId: procedure.id, versionNumber: 1, ...versionValues }).returning();
    else [version] = await tx.update(procedureVersions).set({ ...versionValues, updatedAt: new Date() }).where(eq(procedureVersions.id, version.id)).returning();

    for (const [title, url, isPrimary] of [
      ['Visa de visitante B1/B2', VISITOR_URL, true],
      ['Formulario DS-160', DS160_URL, false],
      ['Tarifas de servicios de visa', FEE_URL, false],
      ['Tiempos de espera para entrevistas', WAIT_TIMES_URL, false],
    ] as const) {
      await tx.insert(procedureSources).values({ procedureVersionId: version.id, organizationId: organization.id, title, url, lastCheckedAt: new Date('2026-08-13T00:00:00-05:00'), isPrimary, status: 'active' }).onConflictDoUpdate({ target: [procedureSources.procedureVersionId, procedureSources.url], set: { title, organizationId: organization.id, lastCheckedAt: new Date('2026-08-13T00:00:00-05:00'), isPrimary, status: 'active' } });
    }

    const stepIds: string[] = [];
    for (const [index, step] of steps.entries()) {
      let [saved] = await tx.select().from(procedureSteps).where(and(eq(procedureSteps.procedureVersionId, version.id), eq(procedureSteps.position, index + 1))).limit(1);
      const values = {
        title: step.title, description: step.description, completionMode: step.completionMode ?? 'manual' as const,
        officialUrl: step.officialUrl ?? null, requiresUserPresence: step.requiresUserPresence ?? false,
        canBeDelegated: step.canBeDelegated ?? true, isPointOfNoReturn: step.isPointOfNoReturn ?? false,
        helpText: step.helpText ?? null, whyItMatters: step.whyItMatters ?? null, nextStepHint: step.nextStepHint ?? null,
        dateTrackingEnabled: step.dateTrackingEnabled ?? false, dateTrackingType: step.dateTrackingType ?? null,
        reminderOffsets: step.reminderOffsets ?? [], actionConfig: { fields: step.fields ?? [] },
      };
      if (!saved) [saved] = await tx.insert(procedureSteps).values({ procedureVersionId: version.id, position: index + 1, ...values }).returning();
      else [saved] = await tx.update(procedureSteps).set({ ...values, updatedAt: new Date() }).where(eq(procedureSteps.id, saved.id)).returning();
      stepIds.push(saved.id);

      if (step.requirement) {
        let [requirement] = await tx.select().from(procedureRequirements).where(and(eq(procedureRequirements.procedureVersionId, version.id), eq(procedureRequirements.name, step.requirement.name))).limit(1);
        const requirementValues = { description: step.requirement.description, requirementType: 'document', allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxFileSizeBytes: 8388608, isRequired: true, isSensitive: step.requirement.isSensitive ?? true, validationMethod: 'manual' };
        if (!requirement) [requirement] = await tx.insert(procedureRequirements).values({ procedureVersionId: version.id, name: step.requirement.name, ...requirementValues }).returning();
        else [requirement] = await tx.update(procedureRequirements).set({ ...requirementValues, updatedAt: new Date() }).where(eq(procedureRequirements.id, requirement.id)).returning();
        await tx.insert(stepRequirements).values({ stepId: saved.id, requirementId: requirement.id }).onConflictDoNothing();
      }
    }

    await tx.insert(procedureDelegationRules).values({
      procedureVersionId: version.id, type: 'partial', eligibleAfterStepId: stepIds[14], requiresPriorStepsCompleted: true,
      requiresDocumentsApproved: true, serviceFeeMinor: 24900, currency: 'PEN',
      cancellationPolicy: 'Puedes cancelar el acompañamiento antes de la asignación. Los pagos consulares ya realizados no dependen de TramIA.',
      refundPolicy: 'La tarifa consular no es reembolsable por TramIA. La devolución del servicio de acompañamiento depende del trabajo ya realizado.',
    }).onConflictDoUpdate({ target: procedureDelegationRules.procedureVersionId, set: { type: 'partial', eligibleAfterStepId: stepIds[14], requiresPriorStepsCompleted: true, requiresDocumentsApproved: true, serviceFeeMinor: 24900, currency: 'PEN', cancellationPolicy: 'Puedes cancelar el acompañamiento antes de la asignación. Los pagos consulares ya realizados no dependen de TramIA.', refundPolicy: 'La tarifa consular no es reembolsable por TramIA. La devolución del servicio de acompañamiento depende del trabajo ya realizado.', updatedAt: new Date() } });

    for (const [slug, name] of [['visa-b1-b2', 'Visa B1/B2'], ['estados-unidos', 'Estados Unidos'], ['turismo', 'Turismo'], ['negocios-temporales', 'Negocios temporales']] as const) {
      const [tag] = await tx.insert(tags).values({ slug, name }).onConflictDoUpdate({ target: tags.slug, set: { name } }).returning();
      await tx.insert(procedureTags).values({ procedureId: procedure.id, tagId: tag.id }).onConflictDoNothing();
    }
  });

  console.log(`Trámite ${SLUG} sincronizado con ${steps.length} pasos.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => closeDrizzleDatabase());
