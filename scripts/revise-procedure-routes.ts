import 'dotenv/config';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { closeDrizzleDatabase, getDrizzleDatabase } from '../server/db/client';
import {
  procedureDelegationRules,
  procedureRequirements,
  procedureSources,
  procedureStepChecklistItems,
  procedureStepDependencies,
  procedureSteps,
  procedureVersions,
  procedures,
  stepRequirements,
} from '../server/db/schema';

const PROTECTED_SLUG = 'visa-turismo-estados-unidos-b1-b2';
const REVISION = 'route-review-2026-08-15';

type StepRevision = {
  title: string;
  description: string;
  sourcePositions: number[];
  checklist: string[];
  completionMode?: 'manual' | 'evidence' | 'form' | 'external_check' | 'payment';
  dateTrackingType?: string;
  requiresUserPresence?: boolean;
  canBeDelegated?: boolean;
  pointOfNoReturn?: boolean;
};

type RouteRevision = {
  delegationEligibleAfter: number;
  steps: StepRevision[];
};

const revisions: Record<string, RouteRevision> = {
  'pasaporte-electronico-ordinario': {
    delegationEligibleAfter: 3,
    steps: [
      { title: 'Prepara tus documentos de identidad', description: 'Revisa que tu DNI esté vigente, en buen estado y verifica si debes declarar un pasaporte anterior.', sourcePositions: [1, 2], checklist: ['Tengo mi último DNI emitido y en buen estado.', 'Revisé si corresponde declarar la pérdida, robo o vigencia de un pasaporte anterior.'], canBeDelegated: false },
      { title: 'Realiza el pago y guarda el comprobante', description: 'Paga el derecho de trámite por un canal autorizado y conserva el número de operación o comprobante.', sourcePositions: [3, 4], checklist: ['Realicé el pago del derecho de trámite.', 'Guardé el número de operación o comprobante.'], completionMode: 'payment', canBeDelegated: false },
      { title: 'Reserva y guarda tu cita', description: 'Selecciona sede, fecha y horario en Migraciones, y guarda la constancia de la reserva.', sourcePositions: [5, 6, 7], checklist: ['Elegí la sede.', 'Reservé la fecha y el horario.', 'Guardé la constancia de la cita.'], dateTrackingType: 'FOLLOW_UP', canBeDelegated: false },
      { title: 'Asiste a Migraciones y completa el registro biométrico', description: 'Acude a la sede con tus documentos para la fotografía, huellas y demás controles biométricos.', sourcePositions: [8, 9], checklist: ['Llegué a la sede indicada con los documentos solicitados.', 'Completé la fotografía y el registro biométrico.'], requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
      { title: 'Revisa y recibe tu pasaporte', description: 'Recibe el documento y comprueba que nombres, número de pasaporte y demás datos sean correctos.', sourcePositions: [10, 11], checklist: ['Recibí mi pasaporte.', 'Verifiqué que todos los datos impresos sean correctos.'], dateTrackingType: 'FOLLOW_UP', requiresUserPresence: true, canBeDelegated: false },
    ],
  },
  'inscripcion-ruc-persona-natural': {
    delegationEligibleAfter: 3,
    steps: [
      { title: 'Confirma que necesitas inscribirte en el RUC', description: 'Verifica que iniciarás una actividad económica como persona natural y que este trámite corresponde a tu caso.', sourcePositions: [1], checklist: ['Voy a iniciar una actividad comercial o negocio como persona natural.'], canBeDelegated: false },
      { title: 'Verifica tu identidad y situación en el RUC', description: 'Ten tu DNI vigente y confirma que no existe otro RUC que debas reactivar o utilizar.', sourcePositions: [2, 3], checklist: ['Tengo mi DNI vigente y con datos correctos.', 'Confirmé que no tengo otro RUC que deba utilizar.'], canBeDelegated: false },
      { title: 'Prepara los datos de tu negocio', description: 'Define actividad económica, domicilio fiscal y datos de contacto antes de iniciar el registro.', sourcePositions: [4, 5, 7], checklist: ['Definí la actividad económica.', 'Tengo la dirección que registraré como domicilio fiscal.', 'Tengo correo y celular activos.'], canBeDelegated: false },
      { title: 'Elige tu régimen tributario', description: 'Revisa las alternativas y selecciona el régimen que corresponde a la actividad y tamaño de tu negocio.', sourcePositions: [6], checklist: ['Revisé las opciones disponibles.', 'Elegí el régimen tributario que corresponde.'], canBeDelegated: false },
      { title: 'Inicia la inscripción y valida tu identidad', description: 'Ingresa al canal oficial, inicia el registro y completa la validación de identidad solicitada por SUNAT.', sourcePositions: [8, 9], checklist: ['Inicié el registro en el canal oficial.', 'Completé la validación de identidad.'], completionMode: 'external_check', canBeDelegated: false },
      { title: 'Completa y envía los datos del negocio', description: 'Registra actividad, domicilio fiscal, régimen tributario y datos de contacto; luego revisa antes de enviar.', sourcePositions: [10], checklist: ['Registré todos los datos solicitados.', 'Revisé la información antes de enviarla.'], completionMode: 'form', pointOfNoReturn: true },
      { title: 'Configura tu acceso y confirma el RUC activo', description: 'Configura tu acceso tributario en SUNAT y verifica el número, los datos y el estado activo del RUC. TramIA no guarda tus credenciales.', sourcePositions: [11, 12], checklist: ['Configuré mi acceso tributario directamente en SUNAT.', 'Verifiqué el número y los datos de mi RUC.', 'Confirmé que el RUC figura como activo.'] },
    ],
  },
  'constitucion-empresa-sid-sunarp': {
    delegationEligibleAfter: 4,
    steps: [
      { title: 'Define socios y tipo de empresa', description: 'Identifica a quienes participarán y elige la forma empresarial adecuada.', sourcePositions: [1, 2], checklist: ['Definí quiénes participarán y tengo sus datos.', 'Elegí el tipo de empresa.'], canBeDelegated: false },
      { title: 'Propón y verifica el nombre', description: 'Prepara varias alternativas y consulta su disponibilidad antes de solicitar la reserva.', sourcePositions: [3, 4], checklist: ['Tengo al menos dos alternativas de nombre.', 'Consulté su disponibilidad.'], completionMode: 'external_check', canBeDelegated: false },
      { title: 'Reserva el nombre', description: 'Solicita la reserva y conserva la constancia de aprobación.', sourcePositions: [5], checklist: ['Reservé el nombre.', 'Guardé la constancia.'], dateTrackingType: 'FOLLOW_UP', canBeDelegated: false },
      { title: 'Define actividad, capital y cargos', description: 'Precisa el objeto de la empresa, aportes de capital y responsables de la administración.', sourcePositions: [6, 7, 8], checklist: ['Definí la actividad de la empresa.', 'Definí el capital y la forma de aporte.', 'Definí gerencia, representantes y cargos aplicables.'], completionMode: 'form', canBeDelegated: false },
      { title: 'Completa y revisa la información', description: 'Registra en SID-SUNARP toda la información requerida y verifica que sea consistente.', sourcePositions: [9], checklist: ['Registré toda la información.', 'Revisé que los datos estén correctos.'], completionMode: 'form' },
      { title: 'Selecciona notaría y firma los documentos', description: 'Coordina con la notaría, revisa los documentos y completa las firmas que correspondan.', sourcePositions: [10, 11], checklist: ['Elegí la notaría.', 'Revisé los documentos.', 'Los participantes completaron las firmas requeridas.'], dateTrackingType: 'FOLLOW_UP', requiresUserPresence: true, canBeDelegated: false, pointOfNoReturn: true },
      { title: 'Realiza y conserva los pagos', description: 'Completa los pagos notariales y registrales, y guarda sus comprobantes.', sourcePositions: [12], checklist: ['Realicé los pagos notariales.', 'Realicé los pagos registrales.', 'Guardé los comprobantes.'], completionMode: 'payment' },
      { title: 'Da seguimiento y confirma la inscripción', description: 'Verifica la presentación ante SUNARP, atiende el seguimiento y confirma que la empresa figure inscrita.', sourcePositions: [13, 14], checklist: ['La solicitud fue presentada a SUNARP.', 'Realicé el seguimiento.', 'Confirmé la inscripción de la empresa.'] },
      { title: 'Verifica el RUC y configura el acceso tributario', description: 'Comprueba el RUC asignado y configura el acceso tributario directamente en SUNAT. TramIA no guarda tus credenciales.', sourcePositions: [15, 16], checklist: ['Verifiqué el RUC de la empresa.', 'Completé la activación correspondiente en SUNAT.', 'Configuré mi acceso tributario de forma segura.'] },
    ],
  },
  'matrimonio-civil-municipal': {
    delegationEligibleAfter: 5,
    steps: [
      { title: 'Elige la municipalidad y revisa tu situación', description: 'Selecciona la municipalidad y confirma la situación civil aplicable a ambos contrayentes.', sourcePositions: [1, 2], checklist: ['Elegimos la municipalidad.', 'Identificamos la situación civil de ambos contrayentes.'], canBeDelegated: false },
      { title: 'Revisa los requisitos municipales', description: 'Consulta la lista vigente de requisitos, plazos y condiciones de la municipalidad elegida.', sourcePositions: [3], checklist: ['Revisamos la lista vigente de requisitos.'], completionMode: 'external_check', canBeDelegated: false },
      { title: 'Reúne partidas y documentos de identidad', description: 'Obtén las partidas requeridas y verifica los documentos de identidad de ambos contrayentes.', sourcePositions: [4, 5], checklist: ['Tenemos las partidas solicitadas.', 'Tenemos los documentos de identidad vigentes.'], completionMode: 'evidence', canBeDelegated: false },
      { title: 'Completa declaraciones y certificados aplicables', description: 'Prepara las declaraciones juradas y certificados médicos que solicite la municipalidad.', sourcePositions: [6, 7], checklist: ['Completamos las declaraciones juradas aplicables.', 'Completamos los certificados solicitados, si corresponde.'], canBeDelegated: false },
      { title: 'Selecciona a los testigos', description: 'Elige a los testigos, verifica que cumplan las condiciones y reúne sus documentos.', sourcePositions: [8], checklist: ['Elegimos a los testigos.', 'Verificamos las condiciones y documentos.'], canBeDelegated: false },
      { title: 'Presenta el expediente matrimonial', description: 'Entrega la solicitud y todos los documentos ante la municipalidad elegida.', sourcePositions: [9], checklist: ['Presentamos el expediente completo.', 'Guardamos la constancia de recepción.'], requiresUserPresence: true, canBeDelegated: false },
      { title: 'Revisa y atiende observaciones', description: 'Espera la revisión municipal y subsana oportunamente cualquier observación.', sourcePositions: [10, 11], checklist: ['Revisamos el estado del expediente.', 'No quedan observaciones pendientes.'] },
      { title: 'Realiza el pago y cumple la publicación', description: 'Paga el derecho municipal, conserva el comprobante y cumple la publicación del edicto si corresponde.', sourcePositions: [12, 13], checklist: ['Realizamos el pago y guardamos el comprobante.', 'Completamos la publicación requerida, si corresponde.'], completionMode: 'payment', dateTrackingType: 'FOLLOW_UP', pointOfNoReturn: true },
      { title: 'Programa la ceremonia', description: 'Selecciona y confirma la fecha, el lugar y el horario de la ceremonia civil.', sourcePositions: [14, 15], checklist: ['Elegimos la fecha.', 'Confirmamos el lugar y el horario.'], dateTrackingType: 'FOLLOW_UP', canBeDelegated: false },
      { title: 'Celebra la ceremonia y verifica el registro', description: 'Asiste con testigos y documentos, firma el acta y luego confirma el registro del matrimonio.', sourcePositions: [16, 17, 18], checklist: ['Asistimos con los documentos y testigos.', 'Firmamos el acta de matrimonio.', 'Confirmamos que el matrimonio fue registrado.'], requiresUserPresence: true, canBeDelegated: false },
    ],
  },
};

const apply = process.argv.includes('--apply');
const db = getDrizzleDatabase();

const [protectedProcedure] = await db.select({ id: procedures.id, title: procedures.title }).from(procedures).where(eq(procedures.slug, PROTECTED_SLUG)).limit(1);
if (!protectedProcedure || protectedProcedure.title !== 'Solicitar visa de turismo para EE. UU. B1/B2') {
  throw new Error('No se pudo confirmar la ruta protegida de VISA AMERICANA. No se aplicará ningún cambio.');
}

for (const [slug, revision] of Object.entries(revisions)) {
  const [procedure] = await db.select().from(procedures).where(eq(procedures.slug, slug)).limit(1);
  if (!procedure) throw new Error(`No existe el trámite ${slug}.`);
  const [latest] = await db.select().from(procedureVersions).where(eq(procedureVersions.procedureId, procedure.id)).orderBy(desc(procedureVersions.versionNumber)).limit(1);
  if (!latest) throw new Error(`El trámite ${slug} no tiene versiones.`);
  if (latest.changeSummary?.includes(REVISION)) {
    console.log(`Sin cambios: ${procedure.title} ya tiene la revisión ${REVISION}.`);
    continue;
  }
  console.log(`${apply ? 'Aplicando' : 'Plan'}: ${procedure.title} · ${revision.steps.length} pasos (desde v${latest.versionNumber}).`);
  if (!apply) continue;

  await db.transaction(async (tx) => {
    const [newVersion] = await tx.insert(procedureVersions).values({
      procedureId: latest.procedureId,
      versionNumber: latest.versionNumber + 1,
      fullDescription: latest.fullDescription,
      modality: latest.modality,
      difficulty: latest.difficulty,
      officialCostMin: latest.officialCostMin,
      officialCostMax: latest.officialCostMax,
      currency: latest.currency,
      estimatedDurationMin: latest.estimatedDurationMin,
      estimatedDurationMax: latest.estimatedDurationMax,
      durationUnit: latest.durationUnit,
      officialUrl: latest.officialUrl,
      sourceVerifiedAt: latest.sourceVerifiedAt,
      dataClassification: latest.dataClassification,
      verificationNotes: latest.verificationNotes,
      validFrom: latest.validFrom,
      validUntil: latest.validUntil,
      changeSummary: `${REVISION}: secuencia revisada, pasos redundantes consolidados y confirmaciones simplificadas.`,
      status: 'reviewed',
    }).returning();

    const [oldSteps, oldSources, oldRequirements, oldRule] = await Promise.all([
      tx.select().from(procedureSteps).where(eq(procedureSteps.procedureVersionId, latest.id)).orderBy(asc(procedureSteps.position)),
      tx.select().from(procedureSources).where(eq(procedureSources.procedureVersionId, latest.id)),
      tx.select().from(procedureRequirements).where(eq(procedureRequirements.procedureVersionId, latest.id)),
      tx.select().from(procedureDelegationRules).where(eq(procedureDelegationRules.procedureVersionId, latest.id)).limit(1),
    ]);
    const oldStepIds = oldSteps.map((step) => step.id);
    const oldChecklist = oldStepIds.length ? await tx.select().from(procedureStepChecklistItems).where(inArray(procedureStepChecklistItems.stepId, oldStepIds)) : [];
    const oldLinks = oldStepIds.length ? await tx.select().from(stepRequirements).where(inArray(stepRequirements.stepId, oldStepIds)) : [];

    for (const source of oldSources) {
      await tx.insert(procedureSources).values({ procedureVersionId: newVersion.id, organizationId: source.organizationId, title: source.title, url: source.url, lastCheckedAt: source.lastCheckedAt, isPrimary: source.isPrimary, status: source.status, nextReviewAt: source.nextReviewAt });
    }

    const requirementMap = new Map<string, string>();
    for (const requirement of oldRequirements) {
      const [created] = await tx.insert(procedureRequirements).values({ procedureVersionId: newVersion.id, name: requirement.name, description: requirement.description, requirementType: requirement.requirementType, allowedFileTypes: requirement.allowedFileTypes, maxFileSizeBytes: requirement.maxFileSizeBytes, isRequired: requirement.isRequired, isSensitive: requirement.isSensitive, expiresAfterDays: requirement.expiresAfterDays, validationMethod: requirement.validationMethod }).returning();
      requirementMap.set(requirement.id, created.id);
    }

    const createdSteps: Array<{ id: string }> = [];
    for (const [index, spec] of revision.steps.entries()) {
      const sources = oldSteps.filter((step) => spec.sourcePositions.includes(step.position));
      if (sources.length !== spec.sourcePositions.length) throw new Error(`No se encontraron todos los pasos fuente de ${slug}: ${spec.sourcePositions.join(', ')}.`);
      const [created] = await tx.insert(procedureSteps).values({
        procedureVersionId: newVersion.id,
        position: index + 1,
        title: spec.title,
        description: spec.description,
        completionMode: spec.completionMode ?? 'manual',
        modality: sources.find((step) => step.modality)?.modality ?? null,
        estimatedDurationHours: null,
        officialUrl: sources.find((step) => step.officialUrl)?.officialUrl ?? latest.officialUrl,
        requiresUserPresence: spec.requiresUserPresence ?? sources.some((step) => step.requiresUserPresence),
        canBeDelegated: spec.canBeDelegated ?? sources.every((step) => step.canBeDelegated),
        isPointOfNoReturn: spec.pointOfNoReturn ?? sources.some((step) => step.isPointOfNoReturn),
        isOptional: sources.every((step) => step.isOptional),
        stepType: sources.some((step) => step.stepType === 'conditional') ? 'conditional' : 'required',
        helpText: spec.description,
        whyItMatters: 'Mantiene el trámite en orden y evita avanzar con información incompleta.',
        nextStepHint: revision.steps[index + 1] ? `Después podrás continuar con: ${revision.steps[index + 1].title}.` : 'Al completar este paso, la ruta quedará finalizada.',
        dateTrackingEnabled: Boolean(spec.dateTrackingType),
        dateTrackingType: spec.dateTrackingType ?? null,
        reminderOffsets: spec.dateTrackingType ? ['P7D', 'P1D'] : [],
        actionConfig: {},
      }).returning({ id: procedureSteps.id });
      createdSteps.push(created);

      if (spec.checklist.length) {
        await tx.insert(procedureStepChecklistItems).values(spec.checklist.map((label, checklistIndex) => ({ stepId: created.id, position: checklistIndex + 1, label, isRequired: true })));
      }

      const sourceIds = new Set(sources.map((step) => step.id));
      const requirementIds = [...new Set(oldLinks.filter((link) => sourceIds.has(link.stepId)).map((link) => requirementMap.get(link.requirementId)).filter((id): id is string => Boolean(id)))];
      for (const requirementId of requirementIds) await tx.insert(stepRequirements).values({ stepId: created.id, requirementId });
    }

    for (let index = 1; index < createdSteps.length; index += 1) {
      await tx.insert(procedureStepDependencies).values({ stepId: createdSteps[index].id, dependsOnStepId: createdSteps[index - 1].id });
    }

    if (oldRule[0]) {
      const rule = oldRule[0];
      await tx.insert(procedureDelegationRules).values({
        procedureVersionId: newVersion.id,
        type: rule.type,
        eligibleAfterStepId: createdSteps[Math.max(0, revision.delegationEligibleAfter - 1)]?.id ?? null,
        requiresPriorStepsCompleted: rule.requiresPriorStepsCompleted,
        requiresDocumentsApproved: rule.requiresDocumentsApproved,
        serviceFeeMinor: rule.serviceFeeMinor,
        currency: rule.currency,
        cancellationPolicy: rule.cancellationPolicy,
        refundPolicy: rule.refundPolicy,
      });
    }

    if (oldChecklist.length === 0 && oldSteps.some((step) => step.completionMode === 'manual')) {
      console.warn(`Aviso: la versión fuente de ${slug} no tenía checklist detallado.`);
    }
  });
}

console.log(apply ? 'Revisión aplicada. La ruta de VISA AMERICANA no fue modificada.' : 'Vista previa completada. Ejecuta con --apply para crear las nuevas versiones.');
await closeDrizzleDatabase();
